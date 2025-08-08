interface CacheEntry {
  summaries: Record<number, string>
  title: string
  timestamp: number
}

class TurboCache {
  private cache = new Map<string, CacheEntry>()
  private readonly TTL = 2 * 60 * 60 * 1000 // 2 hours - longer cache for speed
  private readonly MAX_SIZE = 200 // Larger cache

  set(url: string, summaries: Record<number, string>, title: string) {
    // TURBO CACHING: Pre-compute cache key hash for faster lookups
    const cacheKey = this.hashUrl(url)
    
    this.cache.set(cacheKey, {
      summaries,
      title,
      timestamp: Date.now()
    })
    
    // Efficient cache management
    if (this.cache.size > this.MAX_SIZE) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
  }

  get(url: string): CacheEntry | null {
    const cacheKey = this.hashUrl(url)
    const entry = this.cache.get(cacheKey)
    
    if (!entry) return null

    // Fast expiry check
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(cacheKey)
      return null
    }

    return entry
  }

  // Simple hash for faster cache lookups
  private hashUrl(url: string): string {
    return url.toLowerCase().replace(/[?#].*$/, '') // Remove query params for better cache hits
  }

  clear() {
    this.cache.clear()
  }

  // Preload popular sites
  preload(urls: string[]) {
    // Could implement background preloading here
  }
}

export const summaryCache = new TurboCache()
