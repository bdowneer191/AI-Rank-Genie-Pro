
export interface Project {
  id: string;
  user_id: string;
  domain: string;
  target_location: string;
}

export interface Keyword {
  id: string;
  project_id: string;
  term: string;
  last_scan_date?: string;
}

// Result from SerpApi processing
export interface Snapshot {
  id: string;
  keyword_id: string;
  keyword_term: string; // Joined for UI convenience
  organic_rank: number | null;
  gemini_rank: number | null; // New: Rank in Gemini specific search
  ai_overview_present: boolean;
  ai_position: number | null; // 1 if first citation, etc.
  is_cited: boolean;
  sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Not Mentioned';
  raw_ai_text: string;
  screenshot_url?: string; // New: Visual proof of the result
  ai_mode_screenshot_url?: string; // New: Visual proof of the Gemini/AI Mode result
  analysis?: { // New: AI Analysis of the content
    gap: string;
    strategy: string;
    sources?: string[]; // Grounding sources
  };
  created_at: string;
  status: 'scanned' | 'pending' | 'failed';
  ai_mode: 'Cited' | 'Not Cited' | 'Not Found';
}

export interface AnalysisResult {
  sentiment: string;
  gap: string;
  strategy: string;
  sources?: string[];
}

// Queue item for client-side processing
export interface QueueItem {
  keyword: Keyword;
  status: 'queued' | 'processing' | 'completed' | 'failed';
}
