interface HistoryEntry {
  id: string
  url: string
  title: string
  summaries: Record<number, string>
  timestamp: number
  favicon?: string
}

class SummaryHistory {
  private readonly STORAGE_KEY = 'shorty-history'
  private readonly MAX_ENTRIES = 20

  getHistory(): HistoryEntry[] {
    if (typeof window === 'undefined') return []
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return []
      
      const history = JSON.parse(stored) as HistoryEntry[]
      // Sort by timestamp, newest first
      return history.sort((a, b) => b.timestamp - a.timestamp)
    } catch {
      return []
    }
  }

  addEntry(url: string, title: string, summaries: Record<number, string>): void {
    if (typeof window === 'undefined') return

    const history = this.getHistory()
    
    // Check if URL already exists and update it
    const existingIndex = history.findIndex(entry => entry.url === url)
    
    const newEntry: HistoryEntry = {
      id: this.generateId(url),
      url,
      title,
      summaries,
      timestamp: Date.now(),
      favicon: this.getFaviconUrl(url)
    }

    if (existingIndex >= 0) {
      // Update existing entry
      history[existingIndex] = newEntry
    } else {
      // Add new entry at the beginning
      history.unshift(newEntry)
    }

    // Keep only the most recent entries
    const trimmedHistory = history.slice(0, this.MAX_ENTRIES)
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmedHistory))
    } catch (error) {
      console.warn('Failed to save history:', error)
    }
  }

  removeEntry(id: string): void {
    if (typeof window === 'undefined') return

    const history = this.getHistory().filter(entry => entry.id !== id)
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history))
    } catch (error) {
      console.warn('Failed to remove history entry:', error)
    }
  }

  clearHistory(): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem(this.STORAGE_KEY)
    } catch (error) {
      console.warn('Failed to clear history:', error)
    }
  }

  private generateId(url: string): string {
    return btoa(url).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)
  }

  private getFaviconUrl(url: string): string {
    try {
      const domain = new URL(url).origin
      return `${domain}/favicon.ico`
    } catch {
      return '/abstract-website-design.png'
    }
  }
}

export const summaryHistory = new SummaryHistory()
