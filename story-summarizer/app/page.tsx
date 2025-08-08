'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Loader2, Globe, FileText, Zap, Sparkles, BookOpen, ArrowRight, Link2, Timer, Rocket, History, Download, Brain, CheckCircle, AlertCircle } from 'lucide-react'
import { SetupGuide } from '@/components/setup-guide'
import { FormattedSummary } from '@/components/formatted-summary'
import { SummaryLengthIndicator } from '@/components/summary-length-indicator'
import { ThemeToggle } from '@/components/theme-toggle'
import { HistorySidebar } from '@/components/history-sidebar'
import { summaryHistory } from '@/lib/history'

interface HistoryEntry {
  id: string
  url: string
  title: string
  summaries: Record<number, string>
  timestamp: number
  favicon?: string
}

interface ProgressStep {
  label: string
  icon: React.ComponentType<{ className?: string }>
  progress: number
}

export default function StorySummarizer() {
  const [url, setUrl] = useState('')
  const [summaryLength, setSummaryLength] = useState([4])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSetupGuide, setShowSetupGuide] = useState(false)
  const [summaries, setSummaries] = useState<Record<number, string>>({})
  const [currentSummary, setCurrentSummary] = useState('')
  const [articleTitle, setArticleTitle] = useState('')
  const [processingTime, setProcessingTime] = useState<number | null>(null)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [historyCount, setHistoryCount] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [urlError, setUrlError] = useState('')

  // Progress steps with more natural language
  const progressSteps: ProgressStep[] = [
    { label: 'Reading the article', icon: Download, progress: 15 },
    { label: 'Understanding the content', icon: FileText, progress: 35 },
    { label: 'Thinking through key points', icon: Brain, progress: 75 },
    { label: 'Crafting your summary', icon: Sparkles, progress: 90 },
    { label: 'All done!', icon: CheckCircle, progress: 100 }
  ]

  // Update history count on mount
  useEffect(() => {
    setHistoryCount(summaryHistory.getHistory().length)
  }, [])

  // Validate URL as user types
  useEffect(() => {
    if (url && url.length > 10) {
      try {
        new URL(url)
        setUrlError('')
      } catch {
        setUrlError('Please enter a valid URL')
      }
    } else {
      setUrlError('')
    }
  }, [url])

  // OPTIMIZED: Memoize expensive calculations
  const speedMetrics = useMemo(() => {
    if (!processingTime) return { color: 'bg-slate-500', label: 'Working on it...', icon: Timer }
    
    if (processingTime < 2000) return { 
      color: 'bg-emerald-500', 
      label: 'Lightning fast', 
      icon: Zap 
    }
    if (processingTime < 4000) return { 
      color: 'bg-blue-500', 
      label: 'Pretty quick', 
      icon: Rocket 
    }
    return { 
      color: 'bg-amber-500', 
      label: 'Got there eventually', 
      icon: Timer 
    }
  }, [processingTime])

  // More realistic progress simulation
  const simulateProgress = useCallback(() => {
    setCurrentStep(0)
    setProgress(0)
    
    // Slightly irregular timing to feel more human
    const intervals = [
      { step: 0, delay: 300 + Math.random() * 200 },   
      { step: 1, delay: 600 + Math.random() * 300 },   
      { step: 2, delay: 1200 + Math.random() * 800 },  
      { step: 3, delay: 400 + Math.random() * 200 },   
      { step: 4, delay: 300 }    
    ]
    
    let totalDelay = 0
    intervals.forEach(({ step, delay }) => {
      totalDelay += delay
      setTimeout(() => {
        setCurrentStep(step)
        setProgress(progressSteps[step].progress)
      }, totalDelay)
    })
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim() || urlError) return

    const startTime = Date.now()
    setIsLoading(true)
    setError('')
    setSummaries({})
    setCurrentSummary('')
    setArticleTitle('')
    setProcessingTime(null)
    
    simulateProgress()

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Something went wrong while processing your article')
      }

      const data = await response.json()
      setSummaries(data.summaries)
      setArticleTitle(data.title)
      
      const initialSummary = data.summaries[summaryLength[0]] || data.summaries[1] || 'Summary not available'
      setCurrentSummary(initialSummary)
      
      const totalTime = Date.now() - startTime
      setProcessingTime(totalTime)

      setCurrentStep(4)
      setProgress(100)

      summaryHistory.addEntry(url.trim(), data.title, data.summaries)
      setHistoryCount(summaryHistory.getHistory().length)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to summarize'
      setError(errorMessage)
      
      if (errorMessage.includes('API key')) {
        setShowSetupGuide(true)
      }
    } finally {
      setIsLoading(false)
      setTimeout(() => {
        setProgress(0)
        setCurrentStep(0)
      }, 3000)
    }
  }, [url, summaryLength, simulateProgress, urlError])

  // More nuanced length descriptions
  const lengthDescription = useMemo(() => {
    const length = summaryLength[0]
    if (length <= 2) return 'Just the essentials'
    if (length <= 4) return 'Key highlights'
    if (length <= 6) return 'Comprehensive overview'
    return 'Deep dive'
  }, [summaryLength])

  const handleLengthChange = useCallback((value: number[]) => {
    setSummaryLength(value)
    if (Object.keys(summaries).length > 0) {
      const newSummary = summaries[value[0]] || summaries[1] || 'Summary not available'
      setCurrentSummary(newSummary)
    }
  }, [summaries])

  const handleSelectArticle = useCallback((entry: HistoryEntry) => {
    setUrl(entry.url)
    setArticleTitle(entry.title)
    setSummaries(entry.summaries)
    setCurrentSummary(entry.summaries[summaryLength[0]] || entry.summaries[1] || 'Summary not available')
    setIsHistoryOpen(false)
    setError('')
    setShowSetupGuide(false)
    setUrlError('')
  }, [summaryLength])

  const SpeedIcon = speedMetrics.icon
  const CurrentStepIcon = progressSteps[currentStep]?.icon || Download

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative">
      <ThemeToggle />
      
      {/* History Button with subtle hover effect */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsHistoryOpen(true)}
        className="fixed top-5 right-20 z-40 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg transition-all duration-200 hover:scale-105"
      >
        <div className="relative">
          <History className="h-4 w-4" />
          {historyCount > 0 && (
            <div className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium">
              {historyCount > 9 ? '9+' : historyCount}
            </div>
          )}
        </div>
      </Button>

      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectArticle={handleSelectArticle}
      />

      <div className="relative z-10">
        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* Hero Section with more personality */}
          <div className="text-center mb-20 pt-8">
            <div className="inline-flex items-center gap-2 mb-8 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 rounded-full border border-blue-100 dark:border-blue-900/50">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">AI-powered reading assistant</span>
            </div>
            
            <h1 className="text-7xl md:text-8xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">
              Shorty
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed mb-8">
              Turn any article into a summary that actually makes sense.{' '}
              <span className="text-slate-900 dark:text-white font-semibold">No fluff, just the good stuff.</span>
            </p>
            
            {processingTime && (
              <div className={`inline-flex items-center gap-2 px-4 py-2 ${speedMetrics.color} text-white rounded-full shadow-lg animate-in slide-in-from-bottom-4 duration-500`}>
                <SpeedIcon className="h-4 w-4" />
                <span className="font-medium">{speedMetrics.label} • {(processingTime / 1000).toFixed(1)}s</span>
              </div>
            )}
          </div>

          {showSetupGuide && <SetupGuide />}

          {/* Progress Card with more sophisticated design */}
          {isLoading && (
            <Card className="mb-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 shadow-xl rounded-2xl overflow-hidden animate-in slide-in-from-top-4 duration-300">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <CurrentStepIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {progressSteps[currentStep]?.label || 'Getting started...'}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      This usually takes a few seconds
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {progress}%
                    </div>
                  </div>
                </div>
                
                <Progress 
                  value={progress} 
                  className="h-2 mb-3"
                />
                
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Hang tight...</span>
                  <span>{progress === 100 ? 'Ready!' : `Step ${currentStep + 1} of ${progressSteps.length}`}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Input Card with refined styling */}
          <Card className="mb-12 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 shadow-2xl rounded-3xl overflow-hidden hover:shadow-3xl transition-all duration-500">
            <CardContent className="p-0">
              <div className="p-8 md:p-12">
                <div className="flex items-start gap-4 mb-8">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                    <Link2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">
                      Paste your article link
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 text-base">
                      Works with news articles, blog posts, research papers — you name it
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="relative">
                    <Input
                      type="url"
                      placeholder="https://example.com/interesting-article"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      disabled={isLoading}
                      className={`text-lg p-5 border-2 ${urlError ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-600'} focus:border-blue-400 dark:focus:border-blue-500 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 transition-all duration-200 pr-12`}
                    />
                    <Globe className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    {urlError && (
                      <div className="flex items-center gap-1 mt-2 text-sm text-red-600 dark:text-red-400">
                        <AlertCircle className="h-3 w-3" />
                        {urlError}
                      </div>
                    )}
                  </div>

                  {/* Length Control with better UX */}
                  <div className="bg-slate-50/80 dark:bg-slate-700/50 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-600/60">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                          How detailed should it be?
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">
                          Adjust anytime after we generate your summary
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
                          {summaryLength[0]}
                        </div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-600">
                          {lengthDescription}
                        </div>
                      </div>
                    </div>
                    
                    <Slider
                      min={1}
                      max={8}
                      step={1}
                      value={summaryLength}
                      onValueChange={handleLengthChange}
                      disabled={isLoading}
                      className="w-full mb-3"
                    />
                    
                    <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        Quick scan
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        Full breakdown
                      </span>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isLoading || !url.trim() || !!urlError}
                    className="w-full text-xl py-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg transform transition-all duration-200 hover:scale-[1.02] hover:shadow-xl disabled:hover:scale-100 disabled:opacity-60 group"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                        <span>Working on it...</span>
                      </>
                    ) : (
                      <>
                        <span>Summarize this article</span>
                        <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>

          {error && (
            <Alert className="mb-8 border border-red-200 dark:border-red-800 bg-red-50/80 dark:bg-red-900/20 rounded-2xl p-5 animate-in slide-in-from-top-2 duration-300">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800 dark:text-red-200 font-medium ml-2">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Results Card with enhanced styling */}
          {currentSummary && (
            <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 shadow-2xl rounded-3xl overflow-hidden animate-in slide-in-from-bottom-6 duration-500">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8">
                <CardTitle className="flex items-start gap-4 text-2xl font-bold">
                  <div className="p-2 bg-white/20 rounded-lg mt-1">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-2xl md:text-3xl font-black mb-3 leading-tight">
                      {articleTitle}
                    </div>
                    <SummaryLengthIndicator 
                      length={summaryLength[0]} 
                      summary={currentSummary} 
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <FormattedSummary 
                  summary={currentSummary} 
                  length={summaryLength[0]} 
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
