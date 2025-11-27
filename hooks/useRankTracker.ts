import { useState } from 'react';
import { Keyword, Snapshot } from '../lib/supabase';

interface ScanProgress {
  total: number;
  completed: number;
  current: string;
}

export function useRankTracker() {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress>({ total: 0, completed: 0, current: '' });
  const [results, setResults] = useState<Snapshot[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  async function scanKeywords(keywords: Keyword[], domain: string) {
    setScanning(true);
    setProgress({ total: keywords.length, completed: 0, current: '' });
    setResults([]);
    setErrors([]);

    const newResults: Snapshot[] = [];
    const newErrors: string[] = [];

    // Process with concurrency limit of 2 (Vercel free tier friendly)
    for (let i = 0; i < keywords.length; i += 2) {
      const batch = keywords.slice(i, i + 2);
      
      const batchPromises = batch.map(async (keyword) => {
        setProgress(prev => ({ ...prev, current: keyword.term }));

        try {
          const response = await fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              keyword: keyword.term,
              domain,
              location: keyword.location,
              keywordId: keyword.id
            })
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();

          if (data.success && data.snapshot) {
            newResults.push(data.snapshot);

            // Trigger async analysis if cited
            if (data.snapshot.ai_overview_cited || data.snapshot.gemini_cited) {
              analyzeSnapshot(data.snapshot);
            }
          }

          setProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
        } catch (error: any) {
          console.error(`Scan failed for "${keyword.term}":`, error);
          newErrors.push(`${keyword.term}: ${error.message}`);
          setProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
        }
      });

      await Promise.all(batchPromises);

      // Small delay between batches to avoid rate limiting
      if (i + 2 < keywords.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setResults(newResults);
    setErrors(newErrors);
    setScanning(false);
  }

  async function analyzeSnapshot(snapshot: Snapshot) {
    try {
      const snippet = snapshot.ai_overview_snippet || snapshot.gemini_snippet;

      if (!snippet) return;

      await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshotId: snapshot.id,
          snippet,
          keyword: snapshot.keyword_id,
          domain: snapshot.domain
        })
      });
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  }

  return {
    scanning,
    progress,
    results,
    errors,
    scanKeywords
  };
}
