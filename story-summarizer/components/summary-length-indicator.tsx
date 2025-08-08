import { Badge } from '@/components/ui/badge'
import { BarChart3, Clock, FileText } from 'lucide-react'

interface SummaryLengthIndicatorProps {
  length: number
  summary: string
}

export function SummaryLengthIndicator({ length, summary }: SummaryLengthIndicatorProps) {
  const getStats = () => {
    const words = summary.split(/\s+/).filter(w => w.length > 0).length
    const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 0).length
    const readingTime = Math.ceil(words / 200) // Average reading speed
    
    return { words, sentences, readingTime }
  }

  const getLengthColor = (length: number) => {
    if (length <= 2) return 'bg-green-100 text-green-800'
    if (length <= 4) return 'bg-blue-100 text-blue-800'
    if (length <= 6) return 'bg-yellow-100 text-yellow-800'
    if (length <= 8) return 'bg-orange-100 text-orange-800'
    return 'bg-red-100 text-red-800'
  }

  const getLengthLabel = (length: number) => {
    if (length <= 2) return 'Quick Read'
    if (length <= 4) return 'Brief'
    if (length <= 6) return 'Standard'
    if (length <= 8) return 'Detailed'
    return 'Comprehensive'
  }

  const stats = getStats()

  return (
    <div className="flex items-center gap-3 text-sm">
      <Badge className={getLengthColor(length)}>
        {getLengthLabel(length)}
      </Badge>
      
      <div className="flex items-center gap-4 text-gray-600 dark:text-gray-300">
        <span className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {stats.sentences} sentences
        </span>
        
        <span className="flex items-center gap-1">
          <BarChart3 className="h-3 w-3" />
          {stats.words} words
        </span>
        
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {stats.readingTime} min read
        </span>
      </div>
    </div>
  )
}
