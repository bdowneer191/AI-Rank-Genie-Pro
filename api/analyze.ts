import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// genAI might crash if GEMINI_API_KEY is not set, depending on SDK.
// But this is API code, so we expect env vars.
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { snapshotId, snippet, keyword, domain } = req.body;

    if (!snapshotId || !snippet) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `You are an SEO expert analyzing AI-generated search results.

Keyword: "${keyword}"
Domain: "${domain}"
AI Snippet: "${snippet}"

Provide:
1. Sentiment score (0-1): How positively is this domain portrayed?
2. Content gaps: What information is missing that competitors might have?
3. Strategy: 3 specific actions to improve citation likelihood.

Respond in JSON format:
{
  "sentiment": 0.75,
  "gaps": ["gap1", "gap2"],
  "strategy": ["action1", "action2", "action3"]
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    if (!analysis) {
      throw new Error('Failed to parse Gemini response');
    }

    // Update snapshot with analysis
    const { error } = await supabase
      .from('snapshots')
      .update({
        sentiment_score: analysis.sentiment,
        content_gaps: analysis.gaps,
        strategy_suggestions: analysis.strategy
      })
      .eq('id', snapshotId);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      analysis
    });

  } catch (error: any) {
    console.error('Analysis error:', error);
    return res.status(500).json({ error: error.message });
  }
}
