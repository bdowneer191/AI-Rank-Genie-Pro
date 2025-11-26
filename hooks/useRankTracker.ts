
import { useState, useCallback } from 'react';
import { Keyword, Snapshot } from '../types';
import { scanKeywordMock } from '../services/simulationService';

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
          return data;
        } catch (e) {
          console.error(`Failed to scan ${kw.term}`, e);
          // Return a failed snapshot placeholder
          return {
            id: Math.random().toString(36).substring(2, 9),
            keyword_id: kw.id,
            keyword_term: kw.term,
            organic_rank: null,
            gemini_rank: null,
            ai_overview_present: false,
            ai_position: null,
            is_cited: false,
            sentiment: 'Not Mentioned',
            raw_ai_text: '',
            created_at: new Date().toISOString(),
            status: 'failed',
            ai_mode: 'Not Found',
            screenshot_url: ''
          } as Snapshot;
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
