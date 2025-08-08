import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface FormattedSummaryProps {
  summary: string
  length: number
}

export function FormattedSummary({ summary, length }: FormattedSummaryProps) {
  const formatSummary = (text: string) => {
    if (text.includes('•')) {
      const bulletPoints = text.split('\n').filter(line => line.trim().startsWith('•'))
      return bulletPoints.map(point => point.trim())
    } else {
      return [text.trim()]
    }
  }

  const extractKeyPoints = (text: string) => {
    const keyPoints = []
    
    // Numbers and percentages
    const numbers = text.match(/\b\d+(?:,\d{3})*(?:\.\d+)?%?\b/g) || []
    if (numbers.length > 0) {
      keyPoints.push(...numbers.slice(0, 2))
    }
    
    // Dates
    const dates = text.match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December|\d{1,2}\/\d{1,2}\/\d{4}|\d{4})\b/g) || []
    if (dates.length > 0) {
      keyPoints.push(...dates.slice(0, 1))
    }
    
    return keyPoints
  }

  const formattedPoints = formatSummary(summary)
  const keyPoints = extractKeyPoints(summary)

  return (
    <div className="space-y-5">
      {/* Key highlights for longer summaries */}
      {length >= 4 && keyPoints.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
          {keyPoints.map((point, index) => (
            <Badge key={index} variant="secondary" className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
              {point}
            </Badge>
          ))}
        </div>
      )}
      
      {/* Formatted content */}
      <div className="space-y-4">
        {formattedPoints.length === 1 ? (
          // Single sentence - no bullet
          <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-lg font-medium">
            {formattedPoints[0]}
          </p>
        ) : (
          // Multiple points - show as clean bullet list
          <ul className="space-y-4">
            {formattedPoints.map((point, index) => (
              <li key={index} className="flex items-start gap-3 group">
                <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full mt-2.5 flex-shrink-0 group-hover:scale-125 transition-transform duration-200" />
                <p className="text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                  {point.replace(/^•\s*/, '')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Reading indicators for longer summaries */}
      {length >= 5 && (
        <div className="flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-100 dark:border-slate-700">
          <span className="flex items-center gap-1">
            📖 About {Math.ceil(summary.split(' ').length / 200)} min read
          </span>
          <span className="flex items-center gap-1">
            📝 {formattedPoints.length} key {formattedPoints.length === 1 ? 'point' : 'points'}
          </span>
        </div>
      )}
    </div>
  )
}
