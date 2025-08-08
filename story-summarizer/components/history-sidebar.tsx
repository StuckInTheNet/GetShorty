'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { History, X, Trash2, Clock, ExternalLink, ChevronRight } from 'lucide-react'
import { summaryHistory } from '@/lib/history'

interface HistoryEntry {
  id: string
  url: string
  title: string
  summaries: Record<number, string>
  timestamp: number
  favicon?: string
}

interface HistorySidebarProps {
  isOpen: boolean
  onClose: () => void
  onSelectArticle: (entry: HistoryEntry) => void
}

export function HistorySidebar({ isOpen, onClose, onSelectArticle }: HistorySidebarProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([])

  useEffect(() => {
    if (isOpen) {
      setHistory(summaryHistory.getHistory())
    }
  }, [isOpen])

  const handleRemoveEntry = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    summaryHistory.removeEntry(id)
    setHistory(summaryHistory.getHistory())
  }

  const handleClearAll = () => {
    summaryHistory.clearHistory()
    setHistory([])
  }

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const getDomainFromUrl = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return 'Unknown'
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-96 bg-white dark:bg-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <History className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Articles</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{history.length} articles</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                  <History className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No articles yet</h3>
                <p className="text-gray-500 dark:text-gray-400">Summarize your first article to see it here</p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-4 space-y-3">
                  {history.map((entry) => (
                    <Card 
                      key={entry.id}
                      className="cursor-pointer hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                      onClick={() => onSelectArticle(entry)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <img 
                            src={entry.favicon || "/placeholder.svg"} 
                            alt=""
                            className="w-4 h-4 mt-1 flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/abstract-website-design.png'
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 mb-1">
                              {entry.title}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              {getDomainFromUrl(entry.url)}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatTimeAgo(entry.timestamp)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Badge variant="secondary" className="text-xs">
                                  {Object.keys(entry.summaries).length} lengths
                                </Badge>
                                <ChevronRight className="h-3 w-3 text-gray-400" />
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600"
                            onClick={(e) => handleRemoveEntry(entry.id, e)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Footer */}
          {history.length > 0 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All History
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
