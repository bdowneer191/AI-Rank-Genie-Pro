
import { Project, Keyword, Snapshot, ScanQueueItem } from './lib/supabase';

// Re-export types from lib/supabase to maintain a central type definition file if needed,
// or just redirect usages to lib/supabase.
// For now, we'll sync them to avoid breaking imports in other files that use 'types.ts'.

export type { Project, Keyword, Snapshot };

// UI specific extension if needed (e.g., join results)
export interface UIKeyword extends Keyword {
    latestSnapshot?: Snapshot;
}

// Result from analysis (helper type)
export interface AnalysisResult {
  sentiment: string;
  gap: string;
  strategy: string;
  sources?: string[];
}

// Queue item for client-side processing (legacy/hybrid)
export interface QueueItem {
  keyword: Keyword;
  status: 'queued' | 'processing' | 'completed' | 'failed';
}
