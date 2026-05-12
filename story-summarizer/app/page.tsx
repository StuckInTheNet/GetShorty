'use client'

import { useState, useCallback, useEffect } from 'react'
import { summaryHistory } from '@/lib/history'

const LENGTH_MODES = [
  { key: 'one-liner', label: 'one-liner', sentences: 1 },
  { key: 'brief', label: 'brief', sentences: 3 },
  { key: 'detailed', label: 'detailed', sentences: 5 },
  { key: 'thorough', label: 'thorough', sentences: 8 },
] as const

const PROVIDERS = [
  { key: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...', keyUrl: 'https://console.anthropic.com/settings/keys' },
  { key: 'openai', name: 'OpenAI', placeholder: 'sk-...', keyUrl: 'https://platform.openai.com/api-keys' },
] as const

type ProviderKey = typeof PROVIDERS[number]['key']

function getStoredSettings() {
  if (typeof window === 'undefined') return { apiKey: '', provider: 'anthropic' as ProviderKey }
  return {
    apiKey: localStorage.getItem('shorty_api_key') || '',
    provider: (localStorage.getItem('shorty_provider') || 'anthropic') as ProviderKey,
  }
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [pastedContent, setPastedContent] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [length, setLength] = useState(3)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ title: string; summaries: Record<number, string> } | null>(null)

  const [apiKey, setApiKey] = useState('')
  const [provider, setProvider] = useState<ProviderKey>('anthropic')
  const [showSettings, setShowSettings] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const s = getStoredSettings()
    setApiKey(s.apiKey)
    setProvider(s.provider)
    setKeyInput(s.apiKey)
    if (!s.apiKey) setShowSettings(true)
  }, [])

  const providerInfo = PROVIDERS.find(p => p.key === provider) || PROVIDERS[0]

  const saveKey = useCallback(() => {
    const key = keyInput.trim()
    if (!key) return
    localStorage.setItem('shorty_api_key', key)
    localStorage.setItem('shorty_provider', provider)
    setApiKey(key)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
    if (showSettings && !result) setShowSettings(false)
  }, [keyInput, provider, showSettings, result])

  const summarize = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim() && !pastedContent.trim()) return

    if (!apiKey) {
      setShowSettings(true)
      setError('Add your API key to get started.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)
    setShowPaste(false)

    try {
      const payload: Record<string, string> = { apiKey, provider }
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
        if (!pastedContent.trim() && (msg.includes('Paste') || msg.includes('reach') || msg.includes('blocked'))) {
          setShowPaste(true)
        }
        if (msg.includes('API key') || msg.includes('Invalid') || res.status === 401) {
          setShowSettings(true)
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
  }, [url, pastedContent, apiKey, provider])

  const currentSummary = result?.summaries[length] || ''

  const points = currentSummary
    ? currentSummary.split(/(?<=\.)\s+/).filter(s => s.trim().length > 5)
    : []

  const maskKey = (key: string) => {
    if (!key) return ''
    if (key.length <= 12) return '****'
    return key.slice(0, 7) + '...' + key.slice(-4)
  }

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

        {/* Setup prompt when no key */}
        {!apiKey && !showSettings && (
          <button
            onClick={() => setShowSettings(true)}
            className="w-full py-3 text-sm text-muted-foreground border border-border rounded-md hover:text-foreground hover:border-muted-foreground transition-colors"
          >
            connect your AI provider to get started
          </button>
        )}

        {/* Settings panel */}
        {showSettings && (
          <div className="space-y-3 p-4 border border-border rounded-md bg-card animate-fade-up">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">settings</span>
              {apiKey && (
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  close
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs text-muted-foreground shrink-0">provider</label>
              <div className="flex gap-2 flex-1">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      setProvider(p.key)
                      localStorage.setItem('shorty_provider', p.key)
                    }}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                      provider === p.key
                        ? 'border-primary text-primary bg-background'
                        : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveKey()}
                placeholder={providerInfo.placeholder}
                className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
              <button
                onClick={saveKey}
                disabled={!keyInput.trim()}
                className="px-4 py-2 text-sm font-medium rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saved ? 'saved' : 'save'}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground/60">
                get a key from{' '}
                <a
                  href={providerInfo.keyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {providerInfo.name}
                </a>
              </span>
              {apiKey && (
                <span className="text-[11px] text-muted-foreground/60 font-mono">
                  {maskKey(apiKey)}
                </span>
              )}
            </div>
          </div>
        )}

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

        {/* Settings toggle (when key exists) */}
        {apiKey && !showSettings && (
          <div className="flex justify-center">
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              settings
            </button>
          </div>
        )}

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
