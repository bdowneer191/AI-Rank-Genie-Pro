
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Warn instead of throw to prevent crash in development/test environments without env vars
  console.warn('Missing Supabase environment variables. Using fallback client.');
}

// Fallback client to prevent white-screen crash
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder');

// Types based on Phase 1 Schema

export interface Project {
  id: string;
  user_id: string;
  domain: string;
  name: string;
  created_at: string;
}

export interface Keyword {
  id: string;
  project_id: string;
  term: string;
  location: string;
  is_active: boolean;
  created_at: string;
}

export interface Snapshot {
  id: string;
  keyword_id: string;
  domain: string; // The domain being tracked

  // Traditional Rankings
  organic_rank: number | null;
  organic_url: string | null;
  organic_title: string | null;

  // AI Overview Rankings
  ai_overview_cited: boolean;
  ai_overview_position: number | null;
  ai_overview_snippet: string | null;

  // Gemini AI Mode Rankings
  gemini_cited: boolean;
  gemini_position: number | null;
  gemini_snippet: string | null;

  // Analysis
  sentiment_score: number | null; // DECIMAL(3,2)
  content_gaps: any; // JSONB
  strategy_suggestions: any; // JSONB

  // Metadata
  scan_duration_ms: number;
  created_at: string;
}

export interface ScanQueueItem {
  id: string;
  keyword_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  retry_count: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}
