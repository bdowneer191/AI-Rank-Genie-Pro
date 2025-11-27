import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERPAPI_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing required environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set timeout warning at 9 seconds
  const timeoutId = setTimeout(() => {
    console.warn('Function approaching 10s timeout');
  }, 9000);

  const startTime = Date.now();

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { keyword, domain, location = 'United States', keywordId } = req.body;

    if (!keyword || !domain) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Parallel fetch to save time (critical for 10s limit)
    const [organicData, aiOverviewData, geminiData] = await Promise.all([
      fetchOrganicResults(keyword, location),
      fetchAIOverview(keyword, location),
      fetchGeminiSearch(keyword, location)
    ]);

    // Quick ranking extraction
    const organicRank = findDomainRank(organicData, domain);
    const aiOverviewCitation = findAIOverviewCitation(aiOverviewData, domain);
    const geminiCitation = findGeminiCitation(geminiData, domain);

    const scanDuration = Date.now() - startTime;

    // Save to database (non-blocking if possible)
    const snapshot = {
      keyword_id: keywordId,
      domain,
      organic_rank: organicRank?.position || null,
      organic_url: organicRank?.url || null,
      organic_title: organicRank?.title || null,
      ai_overview_cited: aiOverviewCitation.cited,
      ai_overview_position: aiOverviewCitation.position,
      ai_overview_snippet: aiOverviewCitation.snippet,
      gemini_cited: geminiCitation.cited,
      gemini_position: geminiCitation.position,
      gemini_snippet: geminiCitation.snippet,
      scan_duration_ms: scanDuration,
      sentiment_score: null, // Analyzed separately
      content_gaps: null,
      strategy_suggestions: null
    };

    const { data, error } = await supabase
      .from('snapshots')
      .insert(snapshot)
      .select()
      .single();

    if (error) throw error;

    clearTimeout(timeoutId);

    return res.status(200).json({
      success: true,
      snapshot: data,
      duration: scanDuration
    });

  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('Scan error:', error);
    
    return res.status(500).json({
      error: error.message || 'Internal server error',
      duration: Date.now() - startTime
    });
  }
}

// Helper functions
async function fetchOrganicResults(keyword: string, location: string) {
  const params = new URLSearchParams({
    api_key: SERPAPI_KEY!,
    q: keyword,
    location,
    num: '10',
    engine: 'google'
  });

  const response = await fetch(`https://serpapi.com/search?${params}`, {
    signal: AbortSignal.timeout(7000) // 7s max for SerpApi
  });

  if (!response.ok) throw new Error('SerpApi organic search failed');
  return response.json();
}

async function fetchAIOverview(keyword: string, location: string) {
  const params = new URLSearchParams({
    api_key: SERPAPI_KEY!,
    q: keyword,
    location,
    engine: 'google',
    google_domain: 'google.com',
    num: '10'
  });

  const response = await fetch(`https://serpapi.com/search?${params}`, {
    signal: AbortSignal.timeout(7000)
  });

  if (!response.ok) throw new Error('SerpApi AI Overview failed');
  const data = await response.json();
  return data.ai_overview || null;
}

async function fetchGeminiSearch(keyword: string, location: string) {
  const params = new URLSearchParams({
    api_key: SERPAPI_KEY!,
    q: keyword,
    location,
    engine: 'google_gemini'
  });

  const response = await fetch(`https://serpapi.com/search?${params}`, {
    signal: AbortSignal.timeout(7000)
  });

  if (!response.ok) throw new Error('SerpApi Gemini search failed');
  return response.json();
}

function findDomainRank(organicData: any, domain: string) {
  const results = organicData.organic_results || [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const url = result.link || '';

    if (url.includes(domain)) {
      return {
        position: i + 1,
        url: result.link,
        title: result.title
      };
    }
  }

  return null;
}

function findAIOverviewCitation(aiOverview: any, domain: string) {
  if (!aiOverview) {
    return { cited: false, position: null, snippet: null };
  }

  const citations = aiOverview.references || aiOverview.sources || [];

  for (let i = 0; i < citations.length; i++) {
    const citation = citations[i];
    const url = citation.link || citation.url || '';

    if (url.includes(domain)) {
      return {
        cited: true,
        position: i + 1,
        snippet: citation.snippet || citation.text || null
      };
    }
  }

  return { cited: false, position: null, snippet: null };
}

function findGeminiCitation(geminiData: any, domain: string) {
  const results = geminiData.answer_box?.results || geminiData.organic_results || [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const url = result.link || result.url || '';

    if (url.includes(domain)) {
      return {
        cited: true,
        position: i + 1,
        snippet: result.snippet || result.text || null
      };
    }
  }

  return { cited: false, position: null, snippet: null };
}
