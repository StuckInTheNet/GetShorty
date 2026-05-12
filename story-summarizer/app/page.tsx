'use client'

import { useState, useCallback } from 'react'
import { summaryHistory } from '@/lib/history'

const LENGTH_MODES = [
  { key: 'one-liner', label: 'one-liner', sentences: 1 },
  { key: 'brief', label: 'brief', sentences: 3 },
  { key: 'detailed', label: 'detailed', sentences: 5 },
  { key: 'thorough', label: 'thorough', sentences: 8 },
] as const

export default function Home() {
  const [url, setUrl] = useState('')
  const [pastedContent, setPastedContent] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [length, setLength] = useState(3) // matches 'brief' mode
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ title: string; summaries: Record<number, string> } | null>(null)

  const summarize = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim() && !pastedContent.trim()) return

    setLoading(true)
    setError('')
    setResult(null)
    setShowPaste(false)

    try {
      const payload: Record<string, string> = {}
      if (url.trim()) payload.url = url.trim()
      if (pastedContent.trim()) {
        payload.content = pastedContent.trim()
        payload.title = url.trim() || 'Pasted Article'
        if (!payload.url) payload.url = 'pasted-content'
      }

      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        const msg = data.error || 'Failed to summarize'
        // Show paste fallback for access/fetch errors
        if (!pastedContent.trim() && (msg.includes('Paste') || msg.includes('reach') || msg.includes('blocked'))) {
          setShowPaste(true)
        }
        throw new Error(msg)
      }

      setResult(data)
      summaryHistory.addEntry(payload.url, data.title, data.summaries)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [url, pastedContent])

  const currentSummary = result?.summaries[length] || ''

  const points = currentSummary
    ? currentSummary.split(/(?<=\.)\s+/).filter(s => s.trim().length > 5)
    : []

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <main className="w-full max-w-xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            shorty
          </h1>
          <p className="text-muted-foreground text-sm">
            paste a url — or the article text. get the gist.
          </p>
        </header>

        <form onSubmit={summarize} className="space-y-4">
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              disabled={loading}
              className="flex-1 bg-card border border-border rounded-md px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
            <button
              type="submit"
              disabled={loading || (!url.trim() && !pastedContent.trim())}
              className="px-5 py-3 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 bg-primary-foreground rounded-full animate-pulse-dot" />
                  working
                </span>
              ) : (
                'go'
              )}
            </button>
          </div>

          {/* Paste fallback */}
          {showPaste && (
            <div className="animate-fade-up">
              <textarea
                value={pastedContent}
                onChange={(e) => setPastedContent(e.target.value)}
                placeholder="paste article text here, then hit go again..."
                rows={6}
                className="w-full bg-card border border-border rounded-md px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors resize-y"
              />
            </div>
          )}

          {/* Length selector */}
          <div className="flex gap-2">
            {LENGTH_MODES.map((mode) => (
              <button
                key={mode.key}
                type="button"
                onClick={() => setLength(mode.sentences)}
                className={`flex-1 py-2 text-xs font-medium rounded-md border transition-colors ${
                  length === mode.sentences
                    ? 'border-primary text-primary bg-background'
                    : 'border-border text-muted-foreground bg-card hover:text-foreground hover:border-muted-foreground'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-4 py-3 animate-fade-up">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4 animate-fade-up">
            <div className="border-t border-border pt-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-1">
                {result.title}
              </h2>
            </div>

            <div className="space-y-3">
              {points.map((point, i) => (
                <div key={i} className="flex gap-3 text-sm leading-relaxed text-foreground">
                  {points.length > 1 && (
                    <span className="text-primary font-mono text-xs mt-0.5 select-none">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  )}
                  <p>{point}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <span className="text-xs text-muted-foreground">
                {points.length} point{points.length !== 1 ? 's' : ''} &middot; {currentSummary.split(/\s+/).length} words
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(currentSummary)}
                className="text-xs text-muted-foreground hover:text-foreground ml-auto transition-colors"
              >
                copy
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
