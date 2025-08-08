import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { summaryCache } from '@/lib/cache'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.' },
        { status: 500 }
      )
    }

    const { url } = await request.json()
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    console.log(`🚀 Processing: ${url}`)

    // Check cache first
    const cached = summaryCache.get(url)
    if (cached) {
      console.log(`⚡ Cache hit: ${Date.now() - startTime}ms`)
      return NextResponse.json({
        summaries: cached.summaries,
        title: cached.title
      })
    }

    // Fetch content
    const { content, title } = await fetchContentTurbo(url)
    console.log(`📄 Content ready: ${Date.now() - startTime}ms`)

    if (!content || content.length < 50) {
      return NextResponse.json({ 
        error: 'Could not extract enough content from this article.' 
      }, { status: 400 })
    }

    // BALANCED APPROACH: Generate 2 AI summaries for quality + speed
    console.log(`🤖 AI processing: ${Date.now() - startTime}ms`)
    
    const [shortResult, longResult] = await Promise.all([
      // Short summary (1-3 sentences)
      generateText({
        model: openai('gpt-3.5-turbo'),
        temperature: 0,
        maxTokens: 80,
        prompt: `Write a concise 2-sentence summary of this article:\n\n${content.slice(0, 600)}`
      }),
      // Long summary (5-7 sentences) 
      generateText({
        model: openai('gpt-3.5-turbo'),
        temperature: 0,
        maxTokens: 200,
        prompt: `Write a detailed 6-sentence summary covering all key points of this article:\n\n${content.slice(0, 1000)}`
      })
    ])

    console.log(`🤖 AI complete: ${Date.now() - startTime}ms`)

    // SMART COMBINATION: Use both AI summaries + content intelligently
    const allSummaries = createQualitySummaries(shortResult.text, longResult.text, content)

    summaryCache.set(url, allSummaries, title)
    
    console.log(`✅ Total: ${Date.now() - startTime}ms`)

    return NextResponse.json({ summaries: allSummaries, title })

  } catch (error) {
    console.error(`❌ Error: ${Date.now() - startTime}ms:`, error)
    return NextResponse.json(
      { error: 'Summarization failed. Please try again.' },
      { status: 500 }
    )
  }
}

async function fetchContentTurbo(url: string) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 2500)
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 
        'User-Agent': 'Mozilla/5.0 (compatible; ShortyBot/1.0)',
        'Accept': 'text/html',
        'Connection': 'keep-alive',
        'Accept-Encoding': 'gzip'
      }
    })
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: HTTP ${response.status}`)
    }
    
    const html = await response.text()
    
    const [content, title] = await Promise.all([
      Promise.resolve(extractContentTurbo(html)),
      Promise.resolve(extractTitleTurbo(html))
    ])
    
    return { content, title }
    
  } catch (error) {
    clearTimeout(timeoutId)
    throw new Error('Failed to fetch the article. Please check the URL.')
  }
}

function extractContentTurbo(html: string): string {
  const content = html
    .replace(/<(?:script|style|nav|header|footer)[^>]*>[\s\S]*?<\/(?:script|style|nav|header|footer)>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:#\d+|#x[\da-f]+|[a-z]+);/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return content.slice(0, 1500)
}

function extractTitleTurbo(html: string): string {
  const match = html.match(/<title[^>]*>([^<]{1,100})<\/title>/i)
  return match?.[1]?.trim() || 'Article Summary'
}

function createQualitySummaries(shortSummary: string, longSummary: string, content: string): Record<number, string> {
  const summaries: Record<number, string> = {}
  
  // Parse both AI summaries into sentences
  const shortSentences = shortSummary
    .split(/[.!?]+/)
    .filter(s => s.trim().length > 10)
    .map(s => s.trim())
  
  const longSentences = longSummary
    .split(/[.!?]+/)
    .filter(s => s.trim().length > 10)
    .map(s => s.trim())
  
  // Extract high-quality content sentences
  const contentSentences = extractBestContentSentences(content)
  
  // Create a prioritized sentence pool
  const sentencePool = createPrioritizedPool(shortSentences, longSentences, contentSentences)
  
  // Generate each length (1-8 only) with bullet points
  for (let i = 1; i <= 8; i++) {
    summaries[i] = createBulletPointSummary(i, sentencePool, shortSentences, longSentences)
  }
  
  return summaries
}

function extractBestContentSentences(content: string): string[] {
  const paragraphs = content.split(/\n\s*\n|\.\s+(?=[A-Z])/)
  const bestSentences: string[] = []
  
  paragraphs.forEach(paragraph => {
    const sentences = paragraph
      .split(/[.!?]+/)
      .filter(s => s.trim().length > 25)
      .map(s => s.trim())
    
    if (sentences.length > 0) {
      bestSentences.push(sentences[0])
    }
  })
  
  return bestSentences.slice(0, 12)
}

function createPrioritizedPool(shortSentences: string[], longSentences: string[], contentSentences: string[]): string[] {
  const pool: string[] = []
  const seen = new Set<string>()
  
  // Priority 1: Short AI summary
  shortSentences.forEach(sentence => {
    const key = sentence.toLowerCase().slice(0, 40)
    if (!seen.has(key)) {
      seen.add(key)
      pool.push(sentence)
    }
  })
  
  // Priority 2: Long AI summary
  longSentences.forEach(sentence => {
    const key = sentence.toLowerCase().slice(0, 40)
    if (!seen.has(key)) {
      seen.add(key)
      pool.push(sentence)
    }
  })
  
  // Priority 3: Best content sentences
  contentSentences.forEach(sentence => {
    const key = sentence.toLowerCase().slice(0, 40)
    if (!seen.has(key) && sentence.length > 25) {
      seen.add(key)
      pool.push(sentence)
    }
  })
  
  return pool
}

function createBulletPointSummary(targetLength: number, sentencePool: string[], shortSentences: string[], longSentences: string[]): string {
  let sentences: string[] = []
  
  if (targetLength <= 3) {
    // Use short AI summary for 1-3 sentences
    sentences = shortSentences.slice(0, targetLength)
    if (sentences.length < targetLength && sentencePool.length > sentences.length) {
      sentences.push(...sentencePool.slice(sentences.length, targetLength))
    }
  } else if (targetLength <= 6) {
    // Use long AI summary for 4-6 sentences
    sentences = longSentences.slice(0, targetLength)
    if (sentences.length < targetLength && sentencePool.length > sentences.length) {
      sentences.push(...sentencePool.slice(sentences.length, targetLength))
    }
  } else {
    // For 7-8, use all available quality sentences
    sentences = sentencePool.slice(0, Math.min(targetLength, sentencePool.length))
  }
  
  // Format as bullet points
  if (sentences.length === 1) {
    // Single sentence - no bullet needed
    return sentences[0] + '.'
  } else {
    // Multiple sentences - use bullet points
    return sentences.map(sentence => `• ${sentence}`).join('\n')
  }
}
