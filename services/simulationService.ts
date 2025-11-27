
import { Snapshot, Keyword } from '../types';

/**
 * Mocks the /api/scan Vercel function behavior.
 * Updated to return Phase 1 Schema Snapshot.
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
  const geminiRank = Math.random() > 0.6 ? Math.floor(Math.random() * 5) + 1 : null;
  const geminiCited = !!geminiRank;

  // Sentiment (Mocked as decimal score -1 to 1)
  // isCited -> Positive (>0.5), Not cited -> Neutral (0) or Negative (-0.5)
  const sentimentScore = isCited ? 0.8 : (hasAI ? 0.1 : 0);

  return {
    id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
    keyword_id: keyword.id,
    domain: domain,

    // Traditional
    organic_rank: organicRank,
    organic_url: `https://${domain}/page/${keyword.term.replace(/ /g, '-')}`,
    organic_title: `${keyword.term} - Ultimate Guide | ${domain}`,

    // AI Overview
    ai_overview_cited: isCited,
    ai_overview_position: isCited ? Math.floor(Math.random() * 3) + 1 : null,
    ai_overview_snippet: hasAI
      ? `Here is a summary about ${keyword.term}. Top providers include Salesforce, HubSpot, and potentially ${isCited ? domain : 'competitors'}.`
      : null,

    // Gemini
    gemini_cited: geminiCited,
    gemini_position: geminiRank,
    gemini_snippet: geminiCited ? `Gemini found ${domain} as a top result for ${keyword.term}.` : null,

    // Analysis
    sentiment_score: sentimentScore,
    content_gaps: hasAI ? {
      gap: isCited ? "Strengthen competitive comparison tables." : "Missing explicit pricing information which competitors provide.",
    } : null,
    strategy_suggestions: hasAI ? {
      action: isCited ? "Add a video testimonial to cement authority." : "Create a pricing comparison chart to get picked up by the AI."
    } : null,

    // Metadata
    scan_duration_ms: Math.floor(delay),
    created_at: new Date().toISOString()
  };
};
