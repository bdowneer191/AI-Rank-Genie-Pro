import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AnalysisResult } from '../types';

// Initialize the client using process.env.API_KEY strictly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeContentGap = async (
  domain: string,
  keyword: string,
  snippet: string
): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY is not set. Gemini analysis will be skipped or return mock data.");
    // Return mock data if no key is present for demo purposes
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          sentiment: 'Neutral',
          gap: 'Comparison Table',
          strategy: `Google AI creates a listicle for "${keyword}". Your content is a product page. You need to add a comparison table to your page to get picked up by the AI.`,
          sources: ["https://example.com/competitor-guide", "https://google.com/search-guide"]
        });
      }, 1500);
    });
  }

  try {
    const prompt = `
      Context: I am tracking the keyword "${keyword}" for the domain "${domain}".
      The Google AI Overview says: "${snippet}...".
      
      Task:
      1. Determine sentiment towards ${domain} (Positive/Neutral/Negative/Not Mentioned).
      2. If not mentioned, identify ONE missing topic entity the domain needs to cover to get cited.
      3. Provide a 1-sentence actionable strategy.
      4. Use Google Search to verify recent trends or competitor strategies if the snippet is insufficient.
      
      Return strictly JSON format: { "sentiment": "...", "gap": "...", "strategy": "..." }
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }] // Enable Google Search Grounding
      }
    });

    const text = response.text || "{}";
    const result = JSON.parse(text) as AnalysisResult;

    // Extract grounding sources if available
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = (groundingChunks as any[])
      ?.map((c: any) => c.web?.uri)
      .filter((uri: any): uri is string => typeof uri === 'string') || [];

    return {
      ...result,
      sources: [...new Set(sources)] // Remove duplicates
    };

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return {
      sentiment: "Error",
      gap: "Could not analyze",
      strategy: "Please try again later.",
      sources: []
    };
  }
};