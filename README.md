# GetShorty

**Get the gist of any article.** Paste a URL, pick a length, get a clean summary.

Live at **[getshorty.xyz](https://getshorty.xyz)**

---

## What It Does

GetShorty summarizes web articles using AI. It comes in two forms:

- **Web app** — paste any URL, get a summary. Handles fetch errors gracefully with a paste-the-text fallback.
- **Chrome extension** — summarize the page you're on without leaving the tab. Brings your own API key.

Both share the same four summary lengths:

| Mode | Sentences | Use case |
|------|-----------|----------|
| **one-liner** | 1 | Headlines, quick scan |
| **brief** | 3 | Default. The gist. |
| **detailed** | 5 | Meeting prep, deeper context |
| **thorough** | 8 | Full picture, all key points |

---

## Project Structure

```
GetShorty/
  story-summarizer/       # Next.js web app (deployed to Vercel)
    app/
      api/summarize/       # POST /api/summarize endpoint
      page.tsx             # Main UI
      layout.tsx           # Root layout (JetBrains Mono, dark mode)
    components/            # Radix UI + shadcn-style components
    lib/
      cache.ts             # In-memory summary cache
      history.ts           # Client-side summary history
      utils.ts             # Tailwind merge utilities
    hooks/                 # Custom React hooks

  extension/               # Chrome extension (Manifest V3)
    manifest.json
    popup.html             # Extension popup UI
    popup.js               # All extension logic (vanilla JS)
    icon*.png              # Extension icons
```

---

## Web App

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| UI | Tailwind CSS 3, Radix UI, JetBrains Mono |
| AI | Vercel AI SDK + Anthropic (Claude Haiku 4.5) |
| Hosting | Vercel |

### Getting Started

```bash
cd story-summarizer
pnpm install
cp .env.example .env.local   # Add your API key
pnpm dev                     # http://localhost:3000
```

### Environment Variables

```env
ANTHROPIC_API_KEY=sk-ant-...
```

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Dev server with hot reload |
| `pnpm build` | Production build |
| `pnpm start` | Run production server |
| `pnpm lint` | ESLint |

### API: `POST /api/summarize`

Summarizes a web article by fetching, extracting, and generating an AI summary.

**Request**

```json
{
  "url": "https://example.com/article",
  "content": "optional — pre-extracted article text",
  "title": "optional — article title"
}
```

If `content` is provided (e.g., from the Chrome extension), the server skips fetching the URL.

**Response**

```json
{
  "title": "Article Title",
  "summaries": {
    "1": "One sentence.",
    "2": "Two sentences joined.",
    "3": "Three sentences joined.",
    "...": "...",
    "8": "All eight sentences joined."
  }
}
```

**Errors**

| Status | Reason |
|--------|--------|
| 400 | Missing URL or insufficient content |
| 500 | API key missing, fetch failure, or AI error |

Error messages are user-friendly and suggest paste-the-text fallback when the target site blocks requests.

**Caching** — In-memory by URL. Subsequent requests for the same URL return cached results instantly.

---

## Chrome Extension

A Manifest V3 Chrome extension that summarizes the current tab directly in the browser.

### Features

- **BYOK** — Bring your own API key (Anthropic or OpenAI)
- **Direct API calls** — Calls Anthropic/OpenAI APIs directly from the extension, no middleman server needed
- **Page extraction** — Injects a content script to pull clean article text from the active tab
- **Customizable** — Theme (dark/light), accent color (8 options), font (mono/sans/serif), size (compact/default/large)
- **Persistent settings** — All preferences saved via `chrome.storage.local`

### Install (Development)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `extension/` directory

### How It Works

1. Opens a popup showing the current tab URL
2. Pick a length mode (one-liner / brief / detailed / thorough)
3. Click **summarize this page**
4. Extension extracts page content via `chrome.scripting.executeScript`
5. Sends content directly to your chosen AI provider's API
6. Displays numbered summary points with copy button

### Supported Providers

| Provider | Model | Key format |
|----------|-------|-----------|
| Anthropic | claude-haiku-4-5 | `sk-ant-...` |
| OpenAI | gpt-4o-mini | `sk-...` |

---

## Deployment

The web app is deployed to Vercel with the custom domain **getshorty.xyz**.

```bash
cd story-summarizer
vercel --prod
```

DNS setup (GoDaddy or any registrar):

| Type | Name | Value |
|------|------|-------|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

---

## License

MIT
