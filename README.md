# GetShorty

A modern **Next.js 15** application using **React 19**, **Tailwind CSS**, and **Radix UI** to deliver AI-assisted summarization of web content.  
Built with the **Vercel AI SDK** (`ai`) and `@ai-sdk/openai` for seamless LLM integration, and optimized for both speed and quality.

## Features

- **Article Summarization API** (`/api/summarize`) that:
  - Fetches and cleans remote article content.
  - Generates short and long AI summaries.
  - Produces bullet-point summaries from 1–8 sentences.
  - Caches results to improve latency and reduce API costs.
- **Radix UI** primitives and **shadcn-style** components.
- **Dark mode** with `next-themes`.
- **Responsive, accessible design** with Tailwind CSS.
- Fully **TypeScript**-typed, with ESLint and modern DX tooling.


## Tech Stack

- **Framework:** Next.js 15.2.4
- **Language:** TypeScript 5+
- **UI:** Tailwind CSS, Radix UI, lucide-react, vaul
- **AI SDK:** `ai` + `@ai-sdk/openai`
- **Forms & Validation:** react-hook-form + zod
- **Utilities:** class-variance-authority, tailwind-merge, date-fns
- **Other UI Tools:** cmdk, recharts, react-day-picker, embla-carousel-react

## Project Structure

```
.
├── app/                # App Router pages, layouts, API routes
│   └── api/
│       └── summarize/   # Summarization API endpoint
├── components/         # Reusable UI components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions, cache, configs
├── public/             # Static assets
├── styles/             # Global styles, Tailwind layers
├── components.json     # shadcn-style component registry
├── next.config.mjs     # Next.js config
├── package.json        # Project metadata & scripts
├── pnpm-lock.yaml      # Lockfile
├── postcss.config.mjs  # PostCSS config
├── tailwind.config.ts  # Tailwind theme/config
└── tsconfig.json       # TypeScript config
```

## Getting Started

### Prerequisites
- **Node.js** ≥ 18.18 (20 LTS recommended)
- **pnpm** (preferred) or npm/yarn
- **OpenAI API key**

### Installation

```bash
# Clone
git clone https://github.com/StuckInTheNet/GetShorty.git
cd GetShorty

# Install dependencies
pnpm install
# or npm install / yarn install

# Create env file
cp .env.example .env.local
# Add your API keys inside
```

##  Environment Variables

Create `.env.local` in the root:

```env
# Required for AI integration
OPENAI_API_KEY=sk-...

# Optional settings
AI_MODEL=gpt-3.5-turbo
AI_TEMPERATURE=0.0
```

## Development

```bash
pnpm dev
```
Runs the development server at [http://localhost:3000](http://localhost:3000).

## Build & Start

```bash
pnpm build
pnpm start
```
Builds the production bundle and starts the app.

---

## Scripts

| Command       | Description                                |
|---------------|--------------------------------------------|
| `pnpm dev`    | Start dev server with hot reload            |
| `pnpm build`  | Create optimized production build           |
| `pnpm start`  | Run production server                       |
| `pnpm lint`   | Lint the codebase using Next.js ESLint      |


## UI & Styling

- **Tailwind CSS** for styling.
- **Radix UI** for accessible component primitives.
- **shadcn-style** utilities (`class-variance-authority`, `tailwind-merge`) for composable components.
- **Dark mode** via `next-themes`.

##  API: `POST /api/summarize`

Summarizes an arbitrary web article by:
1. Fetching and heuristically extracting title/body.
2. Generating two LLM summaries (short + long).
3. Combining them with top content sentences into 1–8 length bullet variants.
4. Caching results by URL.

**Runtime:** Next.js App Router (Node runtime)  
**Model:** `openai('gpt-3.5-turbo')` via Vercel AI SDK’s `generateText`

### Request

**Endpoint**
```
POST /api/summarize
Content-Type: application/json
```

**Body**
```json
{
  "url": "https://example.com/some-article"
}
```

### Success Response

```json
{
  "summaries": {
    "1": "One-sentence summary.",
    "2": "• Bullet 1\n• Bullet 2",
    "3": "• ... up to 3 items",
    "4": "• ... up to 4 items",
    "5": "• ... up to 5 items",
    "6": "• ... up to 6 items",
    "7": "• ... up to 7 items",
    "8": "• ... up to 8 items"
  },
  "title": "Extracted or fallback title"
}
```

- `summaries[i]` exists for `i ∈ [1,8]`.
- For `i=1`, value is a single sentence (no bullet prefix).
- For `i≥2`, items are newline-delimited bullets.

### Error Responses

- `400` — missing or insufficient input
  ```json
  { "error": "URL is required" }
  ```
  ```json
  { "error": "Could not extract enough content from this article." }
  ```
- `500` — server or configuration error
  ```json
  { "error": "OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables." }
  ```
  ```json
  { "error": "Summarization failed. Please try again." }
  ```

### Example (cURL)

```bash
curl -s -X POST http://localhost:3000/api/summarize   -H "Content-Type: application/json"   -d '{"url":"https://example.com/news/post"}' | jq .
```

### Caching

- Uses `summaryCache` from `@/lib/cache` (in-memory).
- **Lookup flow:** `get(url)` → return cached `{ summaries, title }` immediately if present.
- **Store flow:** `set(url, summaries, title)` after successful generation.

> For persistence across restarts or multiple instances, back `summaryCache` with Redis or KV and add a TTL (e.g., 24h).

### Content Fetch & Extraction

- Fetch timeout: **2.5s** via `AbortController`.
- Strips `<script|style|nav|header|footer>` blocks, tags, entities.
- **Content cap:** first **1,500 chars** of cleaned text.
- Title via `<title>` tag (max ~100 chars), fallback `"Article Summary"`.
- If cleaned `content` is `< 50` chars → returns `400`.

### LLM Strategy

- Executes two parallel generations:
  - **Short**: 1–3 sentences (`maxTokens: 80`, temp `0`) from first 600 chars.
  - **Long**: 5–7 sentences (`maxTokens: 200`, temp `0`) from first 1,000 chars.
- Combines and deduplicates sentences (short → long → content).
- Outputs all variants 1–8 sentences as bullets (except single-sentence variant).

### Client Usage Example (React)

```tsx
"use client";
import { useState } from "react";

export default function SummarizeDemo() {
  const [url, setUrl] = useState("");
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setErr(null);
    setData(null);
    const res = await fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) return setErr(json.error || "Request failed");
    setData(json);
  }

  return (
    <div className="space-y-4">
      <input
        className="w-full border p-2 rounded"
        placeholder="https://example.com/article"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button className="px-3 py-2 border rounded" onClick={submit} disabled={loading}>
        {loading ? "Summarizing..." : "Summarize"}
      </button>

      {err && <p className="text-red-600">{err}</p>}
      {data && (
        <div className="space-y-3">
          <h3 className="font-semibold">{data.title}</h3>
          {Array.from({ length: 8 }, (_, i) => i + 1).map((k) => (
            <div key={k}>
              <div className="text-sm font-medium">Summary ({k})</div>
              <pre className="whitespace-pre-wrap text-sm bg-muted p-3 rounded">
                {data.summaries[k]}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Deployment

### Vercel (recommended)
1. Push to GitHub.
2. Import in [Vercel Dashboard](https://vercel.com).
3. Add environment variables.
4. Deploy.

---

## Security Notes

- Never expose API keys to the client.
- Validate and sanitize all user input.
- Apply rate limiting to API routes handling AI calls.

---

## Roadmap

- Multi-provider AI support.
- Persistent conversation history.
- Vector search + embeddings for recall.
- Admin dashboard for AI usage metrics.

---

## License

MIT © 2025
