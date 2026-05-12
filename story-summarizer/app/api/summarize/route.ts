import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { summaryCache } from '@/lib/cache'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders })
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return jsonResponse({ error: 'Anthropic API key is not configured.' }, 500)
    }

    const body = await request.json()
    const url = body.url
    const clientContent = body.content  // optional: extension sends page text directly

    if (!url) {
      return jsonResponse({ error: 'URL is required' }, 400)
    }

    console.log(`Processing: ${url}`)

    const cached = summaryCache.get(url)
    if (cached) {
      console.log(`Cache hit: ${Date.now() - startTime}ms`)
      return jsonResponse({ summaries: cached.summaries, title: cached.title })
    }

    let content: string
    let title: string

    if (clientContent && clientContent.length > 50) {
      // Extension sent page text — skip fetch entirely
      content = clientContent.slice(0, 1500)
      title = body.title || 'Article Summary'
    } else {
      const fetched = await fetchContent(url)
      content = fetched.content
      title = fetched.title
    }

    if (!content || content.length < 50) {
      return jsonResponse({ error: 'Could not extract enough content from this article.' }, 400)
    }

    const result = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      temperature: 0,
      maxTokens: 150,
      prompt: `Summarize in 4 sentences. Do NOT use markdown, headers, hashtags, or labels. Just plain sentences.\n\n${content.slice(0, 600)}`
    })

    const cleaned = result.text
      .replace(/^#{1,6}\s+.*$/gm, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/^\s*[-*]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      .trim()

    const sentences = cleaned
      .split(/(?<=\.)\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 10)

    const summaries: Record<number, string> = {}
    for (let i = 1; i <= 8; i++) {
      const s = sentences.slice(0, Math.min(i, sentences.length))
      summaries[i] = s.length > 0 ? s.join(' ') : 'Summary unavailable.'
    }

    summaryCache.set(url, summaries, title)
    console.log(`Done: ${Date.now() - startTime}ms`)

    return jsonResponse({ summaries, title })

  } catch (error) {
    const raw = error instanceof Error ? error.message : ''
    console.error(`Error: ${Date.now() - startTime}ms:`, raw)

    let msg = 'Something went wrong. Try again in a moment.'
    if (raw.includes('HTTP 403') || raw.includes('HTTP 401')) {
      msg = 'This site blocked us. Paste the article text below instead.'
    } else if (raw.includes('HTTP 404')) {
      msg = 'Page not found. Double-check the URL.'
    } else if (raw.includes('HTTP 5')) {
      msg = 'That site is having issues right now. Try again later.'
    } else if (raw.includes('abort') || raw.includes('timeout')) {
      msg = 'The site took too long to respond. Try again or paste the text.'
    } else if (raw.includes('fetch')) {
      msg = "Couldn't reach that site. Paste the article text below instead."
    } else if (raw.includes('API key')) {
      msg = 'API key missing. Check your .env.local file.'
    }

    return jsonResponse({ error: msg }, 500)
  }
}

async function fetchContent(url: string) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    const content = html
      .replace(/<(?:script|style|nav|header|footer)[^>]*>[\s\S]*?<\/(?:script|style|nav|header|footer)>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&(?:#\d+|#x[\da-f]+|[a-z]+);/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1500)

    const titleMatch = html.match(/<title[^>]*>([^<]{1,100})<\/title>/i)
    const title = titleMatch?.[1]?.trim() || 'Article Summary'

    return { content, title }

  } catch (error) {
    clearTimeout(timeoutId)
    console.error('Fetch error:', error)
    throw new Error(`Failed to fetch the article: ${error instanceof Error ? error.message : 'unknown error'}`)
  }
}
