
import { useState, useCallback } from 'react';
import { Keyword, Snapshot } from '../types';
import { scanKeywordMock } from '../services/simulationService';
import { saveSnapshot } from '../services/db';

interface TrackerState {
  isScanning: boolean;
  progress: number;
  total: number;
  completed: number;
  results: Snapshot[];
}

export const useRankTracker = (domain: string) => {
  const [state, setState] = useState<TrackerState>({
    isScanning: false,
    progress: 0,
    total: 0,
    completed: 0,
    results: [],
  });

  const startScan = useCallback(async (keywords: Keyword[], options: { keepHistory?: boolean } = {}) => {
    setState(prev => ({
      isScanning: true,
      total: keywords.length,
      completed: 0,
      progress: 0,
      results: options.keepHistory ? prev.results : []
    }));

    const concurrency = 3; // Process 3 keywords at a time
    
    // Chunk the array
    for (let i = 0; i < keywords.length; i += concurrency) {
      const chunk = keywords.slice(i, i + concurrency);
      
      // Process chunk in parallel
      const chunkPromises = chunk.map(async (kw) => {
        try {
          // In real app: const res = await fetch('/api/scan', { body: { keyword: kw.term ... }})
          const data = await scanKeywordMock(kw, domain);

          // Save valid scan to DB
          try {
            const saved = await saveSnapshot(data);
            if (saved) return saved;
          } catch (dbError) {
             console.error(`Failed to save snapshot for ${kw.term}`, dbError);
          }

          return data;
        } catch (e) {
          console.error(`Failed to scan ${kw.term}`, e);

          const failedSnapshot: Snapshot = {
            id: Math.random().toString(36).substring(2, 9),
            keyword_id: kw.id,
            domain: domain,

            organic_rank: null,
            organic_url: null,
            organic_title: null,

            ai_overview_cited: false,
            ai_overview_position: null,
            ai_overview_snippet: null,

            gemini_cited: false,
            gemini_position: null,
            gemini_snippet: null,

            sentiment_score: null,
            content_gaps: null,
            strategy_suggestions: null,

            scan_duration_ms: 0,
            created_at: new Date().toISOString()
          };

           return failedSnapshot;
        }
      });

      const chunkResults = await Promise.all(chunkPromises);

      // Update state incrementally
      setState(prev => {
        // Merge new results with previous results
        // If an entry for this keyword already exists, replace it. Otherwise append.
        const mergedResults = [...prev.results];
        
        chunkResults.forEach(newResult => {
          const index = mergedResults.findIndex(r => r.keyword_id === newResult.keyword_id);
          if (index !== -1) {
            mergedResults[index] = newResult;
          } else {
            mergedResults.push(newResult);
          }
        });

        return {
          ...prev,
          completed: prev.completed + chunk.length,
          progress: Math.round(((prev.completed + chunk.length) / prev.total) * 100),
          results: mergedResults
        };
      });
    }

    setState(prev => ({ ...prev, isScanning: false, progress: 100 }));
  }, [domain]);

  return {
    ...state,
    startScan
  };
};
