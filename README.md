# 🧞‍♂️ AI Rank Genie Pro

**"Don't just rank. Be the Answer."**

AI Rank Genie Pro is a next-generation SEO dashboard designed to track "Answer Engine Optimization" (AEO). Unlike traditional tools that track blue links, this application tracks a brand's visibility within **Google's AI Overviews (SGE)**, **AI Mode (Gemini Search)**, and provides actionable, AI-driven strategies to win those citations.

---

## 🏗️ Technical Architecture

This project is optimized for deployment on the **Vercel Free Tier**, navigating the constraints of serverless execution limits (10-second timeouts) through a smart **Client-Side Queue Architecture**.

### The Stack
- **Frontend:** React 18, Vite, Tailwind CSS, Lucide React, Recharts.
- **Backend:** Vercel Serverless Functions (Node.js).
- **AI & Data:**
  - **SerpApi:** For real-time Google Search & Gemini Search scraping.
  - **Google Gemini 2.5 Flash:** For high-speed sentiment analysis, content gap detection, and strategy generation.
  - **Google Search Grounding:** To verify AI insights against real-time web data.

### Data Flow & Queue System
To avoid hitting Vercel's 10s timeout when scanning 50+ keywords:
1. **User** initiates a scan on the dashboard.
2. **`useRankTracker` Hook** (Frontend) creates a queue of keywords.
3. **Browser** processes the queue in batches (concurrency: 3) to prevent rate limiting.
4. **Vercel Function (`/api/scan`)** processes *one* keyword at a time:
   - Fetches Google Organic + AI Overview data (SerpApi).
   - Fetches Gemini Search "AI Mode" data (SerpApi).
   - analyzes the snippet using Gemini 2.5 Flash (Google GenAI SDK).
5. **Frontend** receives the result and updates the UI in real-time.

---

## 🛠️ Setup & Configuration

### 1. Environment Variables
Create a `.env` file in the root directory (or configure in Vercel Dashboard):

```env
# Required for Search Data (Google & Gemini Results)
# Get key: https://serpapi.com
SERPAPI_KEY=your_serpapi_key_here

# Required for Content Analysis & Strategy
# Get key: https://aistudio.google.com
API_KEY=your_gemini_api_key_here
```

### 2. Installation
```bash
npm install
npm run dev
```

---

## 🧪 Mock Data & Demo Mode (Developer Guide)

The application currently ships in **Demo Mode** to allow immediate testing without API keys. You must modify specific files to switch to Production Mode.

### 1. Keyword Scanning Logic
*   **Current State:** `hooks/useRankTracker.ts` imports `scanKeywordMock` from `services/simulationService.ts`. This generates realistic but fake random data.
*   **To Go Live:**
    1. Open `hooks/useRankTracker.ts`.
    2. Replace the `scanKeywordMock` call with a `fetch` call to your Vercel function:
    ```typescript
    // In hooks/useRankTracker.ts
    // const data = await scanKeywordMock(kw, domain); <-- REMOVE THIS
    
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: kw.term, domain, location: 'United States' })
    });
    const data = await res.json();
    ```

### 2. Gemini Analysis Fallback
*   **Location:** `lib/gemini.ts`
*   **Behavior:** The function `analyzeContentGap` checks for `process.env.API_KEY`. If missing, it returns a hardcoded mock response (lines 14-25) after a 1.5s delay.
*   **To Go Live:** Simply ensure `process.env.API_KEY` is set. The code will automatically switch to using the `GoogleGenAI` SDK.

### 3. Database / Storage
*   **Current State:** `App.tsx` uses `localStorage` to persist keywords and session state for the demo.
*   **Production Plan:** Connect to **Supabase**.
    *   Replace `localStorage` calls in `App.tsx` with `supabase.from('keywords').select('*')`.
    *   Update `api/scan.ts` to save results to Supabase `snapshots` table before returning JSON.

---

## ⚡ Efficiency & Scaling Guide

To make this application "World-Class" and efficient at scale, consider these optimizations:

### 1. Parallel Execution (Implemented)
The `api/scan.ts` function uses `Promise.all` to fetch Google Search results and Gemini Search results simultaneously, cutting the wait time in half compared to sequential requests.

### 2. Caching Strategy (Recommended)
SerpApi is expensive and slow. Implement **Upstash Redis** to cache SERP results:
*   **Key:** `serp:{keyword}:{location}:{date}`
*   **TTL:** 24 hours (Rankings rarely shift drastically intraday).
*   **Logic:** Before calling SerpApi in `api/scan.ts`, check Redis. If hit, return cached snapshot.

### 3. Edge Computing
Move `api/scan.ts` to **Vercel Edge Functions** if possible. *Note:* The `@google/genai` SDK is Node.js optimized. For Edge, ensure you use the appropriate lightweight fetch calls or verify SDK Edge compatibility.

### 4. Database Indexing
When moving to Supabase/PostgreSQL, ensure these indexes exist for dashboard performance:
```sql
CREATE INDEX idx_snapshots_keyword_created ON snapshots(keyword_id, created_at DESC);
CREATE INDEX idx_snapshots_domain_cited ON snapshots(domain, is_cited);
```

---

## 📂 File Structure

*   `api/scan.ts` - **The Brain.** Serverless function that aggregates Search + AI data.
*   `hooks/useRankTracker.ts` - **The Queue.** Manages concurrency and client-side batching.
*   `services/simulationService.ts` - **The Mock.** Generates fake data for demos.
*   `lib/gemini.ts` - **The Analyst.** Wraps Google GenAI SDK for frontend usage.
*   `components/` - **The UI.**
    *   `ContentFixerModal.tsx` - Displays Gemini analysis & strategy.
    *   `ResultPreviewModal.tsx` - Shows Screenshots (Organic & AI Mode).
    *   `DashboardCharts.tsx` - Recharts visualizations.

---

## 🚀 Deployment

1. Push to GitHub.
2. Import project into Vercel.
3. Add Environment Variables (`SERPAPI_KEY`, `API_KEY`).
4. Deploy.
