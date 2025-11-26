
import { Snapshot, Keyword } from '../types';

/**
 * Mocks the /api/scan Vercel function behavior.
 * In production, this would be a fetch call to the backend.
 */
export const scanKeywordMock = async (keyword: Keyword, domain: string): Promise<Snapshot> => {
  // Simulate network latency (slower to simulate dual engine fetch: Google + Gemini + Analysis)
  const delay = Math.random() * 2000 + 1000; 
  await new Promise(resolve => setTimeout(resolve, delay));

  // Randomize results for demonstration
  const organicRank = Math.floor(Math.random() * 20) + 1;
  const hasAI = Math.random() > 0.3; // 70% chance of AI Overview
  const isCited = hasAI && Math.random() > 0.5; // 50% chance of being cited if AI exists
  
  // Mock Gemini Search Rank (separate from Google SGE)
  // 40% chance of being found in Gemini directly
  const geminiRank = Math.random() > 0.6 ? Math.floor(Math.random() * 5) + 1 : null;

  // Mock AI Mode status (independent of AI Overview)
  // Logic: If we rank in Gemini, we are 'Cited' in AI Mode. If we don't rank but search works, 'Not Cited'.
  // For simulation, we assume Gemini search always returns results (so 'Not Found' is rare/error state)
  const aiMode: 'Cited' | 'Not Cited' | 'Not Found' = geminiRank ? 'Cited' : 'Not Cited';

  const sentiment = isCited ? 'Positive' : (hasAI ? 'Not Mentioned' : 'Not Mentioned');

  return {
    id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
    keyword_id: keyword.id,
    keyword_term: keyword.term,
    organic_rank: organicRank,
    gemini_rank: geminiRank,
    ai_overview_present: hasAI,
    is_cited: isCited,
    ai_position: isCited ? Math.floor(Math.random() * 3) + 1 : null,
    sentiment: sentiment,
    raw_ai_text: hasAI 
      ? `Here is a summary about ${keyword.term}. It involves several key factors including price, quality, and support. Top providers include Salesforce, HubSpot, and potentially ${isCited ? domain : 'competitors'}.` 
      : '',
    screenshot_url: hasAI 
      ? `https://placehold.co/600x400/EEE/31343C?text=AI+Overview+Screenshot+for+${encodeURIComponent(keyword.term)}` 
      : `https://placehold.co/600x400/EEE/31343C?text=No+AI+Overview+Found+for+${encodeURIComponent(keyword.term)}`,
    ai_mode_screenshot_url: `https://placehold.co/600x400/e0e7ff/3730a3?text=Gemini+Search+Result+for+${encodeURIComponent(keyword.term)}`,
    created_at: new Date().toISOString(),
    status: 'scanned',
    ai_mode: aiMode,
    analysis: hasAI ? {
      gap: isCited ? "Strengthen competitive comparison tables." : "Missing explicit pricing information which competitors provide.",
      strategy: isCited ? "Add a video testimonial to cement authority." : "Create a pricing comparison chart to get picked up by the AI."
    } : undefined
  };
};
