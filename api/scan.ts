import { getJson } from "serpapi";
import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { keyword, domain, location } = req.body;

  if (!process.env.SERPAPI_KEY) {
    return res.status(500).json({ error: "SERPAPI_KEY not configured" });
  }

  try {
    // Wrap SerpApi getJson in a Promise for async/await usage
    const fetchSerpApi = (params: any) => new Promise<any>((resolve, reject) => {
      getJson(params, (json: any) => {
        if (json.error) reject(new Error(json.error));
        else resolve(json);
      });
    });

    // 1. Fetch Standard Google Results (Organic + AI Overview/SGE)
    const googleParams = {
      engine: "google",
      q: keyword,
      location: location || "United States",
      gl: "us",
      hl: "en",
      api_key: process.env.SERPAPI_KEY,
      screenshot: true // Enable screenshot capture
    };

    // 2. Fetch Gemini Results (Google AI Mode)
    const geminiParams = {
      engine: "google_ai_mode", 
      q: keyword,
      location: location || "United States",
      gl: "us",
      hl: "en",
      api_key: process.env.SERPAPI_KEY,
      screenshot: true // Enable screenshot capture for AI Mode
    };

    const [googleRes, geminiRes] = await Promise.all([
      fetchSerpApi(googleParams),
      fetchSerpApi(geminiParams)
    ]);

    // --- Parse Google Standard (Organic + SGE) ---
    const aiOverview = googleRes.ai_overview;
    let isCited = false;
    let citationRank = null;
    let aiText = "";

    if (aiOverview) {
      aiText = aiOverview.text_blocks?.map((b: any) => b.text).join(' ') || "";
      if (aiOverview.sources) {
        aiOverview.sources.forEach((source: any, index: number) => {
          if (source.link && source.link.includes(domain)) {
            isCited = true;
            if (citationRank === null) citationRank = index + 1;
          }
        });
      }
    }

    let organicRank = null;
    if (googleRes.organic_results) {
        googleRes.organic_results.forEach((result: any) => {
           if (result.link && result.link.includes(domain) && !organicRank) {
             organicRank = result.position;
           }
        });
    }

    // --- Parse Gemini Results ---
    let geminiRank = null;
    if (geminiRes && geminiRes.organic_results && Array.isArray(geminiRes.organic_results)) {
        geminiRes.organic_results.forEach((result: any) => {
            if (result.link && result.link.includes(domain) && !geminiRank) {
                geminiRank = result.position;
            }
        });
    }

    // Determine Statuses
    // AI Mode status logic:
    // - 'Cited': Results exist and domain is found (geminiRank is not null)
    // - 'Not Cited': Results exist but domain is not found
    // - 'Not Found': No organic results returned by Gemini engine
    let aiModeStatus: 'Cited' | 'Not Cited' | 'Not Found' = 'Not Found';
    
    // Check if the Gemini/AI Mode engine returned any organic results (the list of citations)
    if (geminiRes && geminiRes.organic_results && Array.isArray(geminiRes.organic_results) && geminiRes.organic_results.length > 0) {
        // If results exist, check if our domain was found in them (indicated by geminiRank)
        if (geminiRank !== null) {
            aiModeStatus = 'Cited';
        } else {
            aiModeStatus = 'Not Cited';
        }
    } else {
        // If no organic results array exists or it is empty, we consider it "Not Found"
        aiModeStatus = 'Not Found';
    }

    // --- Gemini Analysis (Sentiment & Gaps) ---
    let sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Not Mentioned' = isCited ? 'Positive' : 'Not Mentioned';
    let analysisResult = null;

    if (aiOverview && aiText && process.env.API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `
          Context: I am tracking the keyword "${keyword}" for the domain "${domain}".
          The Google AI Overview text is: "${aiText.substring(0, 1500)}".

          Task:
          1. Analyze Sentiment:
             - STRICTLY "Not Mentioned": If the string "${domain}" is absent from the text.
             - "Neutral": If "${domain}" is present but listed purely as a source or option without qualitative judgment.
             - "Positive": If "${domain}" is associated with words like "best", "top", "excellent", "popular".
             - "Negative": If "${domain}" is associated with warnings, "cons", or negative traits.

          2. Identify Content Gap:
             - Determine what specific content format the AI is favoring (e.g., lists, tables, direct definitions).
             - Identify ONE specific structural element likely missing from the domain's page (e.g., comparison table, schema, user testimonials, pricing data).

          3. Strategy:
             - Provide a 1-sentence actionable fix based on the gap.
             - Use Google Search to verify if competitors are using this element effectively.

          Return strictly JSON: { "sentiment": "...", "gap": "...", "strategy": "..." }
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            tools: [{ googleSearch: {} }] // Enable Google Search Grounding
          }
        });
        
        if (response.text) {
          const parsed = JSON.parse(response.text);
          if (parsed.sentiment) {
            const s = parsed.sentiment.toLowerCase();
            if (s.includes('positive')) sentiment = 'Positive';
            else if (s.includes('negative')) sentiment = 'Negative';
            else if (s.includes('neutral')) sentiment = 'Neutral';
            else sentiment = 'Not Mentioned';
          }
          
          // Extract sources
          const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
          const sources = groundingChunks
            ?.map((c: any) => c.web?.uri)
            .filter((uri: any) => !!uri) as string[] || [];

          analysisResult = {
            gap: parsed.gap || "No specific gap identified.",
            strategy: parsed.strategy || "Maintain current content quality.",
            sources: [...new Set(sources)]
          };
        }
      } catch (genAiError) {
        console.error("Gemini Analysis Error:", genAiError);
        // Fallback to default/calculated values if AI fails
      }
    }

    // Extract screenshot URLs from SerpApi links with safe navigation
    const screenshotUrl = googleRes?.links?.serpapi_screenshot_link || null;
    const aiModeScreenshotUrl = geminiRes?.links?.serpapi_screenshot_link || null;

    const snapshot = {
      keyword_term: keyword,
      organic_rank: organicRank,
      gemini_rank: geminiRank,
      ai_overview_present: !!aiOverview,
      ai_position: citationRank,
      is_cited: isCited,
      raw_ai_text: aiText.substring(0, 500),
      ai_mode: aiModeStatus,
      screenshot_url: screenshotUrl,
      ai_mode_screenshot_url: aiModeScreenshotUrl,
      created_at: new Date().toISOString(),
      status: 'scanned',
      sentiment: sentiment,
      analysis: analysisResult
    };

    res.status(200).json(snapshot);

  } catch (error: any) {
    console.error("Scan Failed:", error);
    res.status(500).json({ error: error.message || "Unknown error" });
  }
}