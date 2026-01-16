/**
 * Centralized image cache for student, staff, and course student pictures
 * Prevents duplicate fetches and manages blob URL lifecycle with reference counting
 */

interface CacheEntry {
  blobUrl: string;
  refCount: number;
  fetchPromise: Promise<string> | null;
  timestamp: number; // For LRU eviction
}

type ImageType = 'student' | 'staff' | 'course-student';

class ImageCache {
  private cache = new Map<string, CacheEntry>();
  private maxCacheSize = 200; // Maximum number of cached images
  private readonly CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

  /**
   * Get cache key from entity type, ID, and optional picture path/URL
   */
  private getCacheKey(
    type: ImageType,
    entityId: string,
    picturePath?: string | null
  ): string {
    const path = picturePath || '';
    return `${type}:${entityId}:${path}`;
  }

  /**
   * Get or fetch image for an entity
   * Returns the blob URL, or null if image doesn't exist
   */
  async getImage(
    type: ImageType,
    entityId: string,
    picturePath: string | null | undefined,
    fetchFn: () => Promise<Blob>
  ): Promise<string | null> {
    if (!entityId || !picturePath || picturePath.trim() === '') {
      return null;
    }

    const key = this.getCacheKey(type, entityId, picturePath);
    const existing = this.cache.get(key);

    // If already cached and not expired, increment ref count and return
    if (existing && existing.fetchPromise === null) {
      const age = Date.now() - existing.timestamp;
      if (age < this.CACHE_EXPIRY_MS) {
        existing.refCount++;
        existing.timestamp = Date.now(); // Update timestamp (LRU)
        return existing.blobUrl;
      } else {
        // Expired, remove it
        URL.revokeObjectURL(existing.blobUrl);
        this.cache.delete(key);
      }
    }

    // If fetch is in progress, wait for it
    if (existing?.fetchPromise) {
      try {
        return await existing.fetchPromise;
      } catch {
        return null;
      }
    }

    // Create new entry with fetch promise
    const fetchPromise = (async () => {
      try {
        const blob = await fetchFn();
        const blobUrl = URL.createObjectURL(blob);
        
        const entry: CacheEntry = {
          blobUrl,
          refCount: 1,
          fetchPromise: null,
          timestamp: Date.now(),
        };
        
        this.cache.set(key, entry);
        this.enforceMaxSize();
        
        return blobUrl;
      } catch (error) {
        // Remove failed fetch from cache
        this.cache.delete(key);
        throw error;
      }
    })();

    // Store promise while fetching
    this.cache.set(key, {
      blobUrl: '',
      refCount: 1,
      fetchPromise: fetchPromise as Promise<string>,
      timestamp: Date.now(),
    });

    try {
      return await fetchPromise;
    } catch (error) {
      return null;
    }
  }

  /**
   * Release reference to an image
   * When ref count reaches 0, the image stays cached but can be evicted
   */
  releaseImage(
    type: ImageType,
    entityId: string,
    picturePath: string | null | undefined
  ): void {
    if (!entityId || !picturePath) return;

    const key = this.getCacheKey(type, entityId, picturePath);
    const entry = this.cache.get(key);

    if (entry && entry.refCount > 0) {
      entry.refCount--;
      // Don't revoke immediately - keep in cache for reuse
      // Will be cleaned up by enforceMaxSize if needed
    }
  }

  /**
   * Invalidate a specific image (e.g., after upload)
   */
  invalidateImage(
    type: ImageType,
    entityId: string,
    picturePath?: string | null
  ): void {
    if (!entityId) return;

    // If specific path provided, invalidate that exact entry
    if (picturePath) {
      const key = this.getCacheKey(type, entityId, picturePath);
      const entry = this.cache.get(key);
      if (entry) {
        URL.revokeObjectURL(entry.blobUrl);
        this.cache.delete(key);
      }
    } else {
      // Invalidate all entries for this entity
      const prefix = `${type}:${entityId}:`;
      for (const [key, entry] of this.cache.entries()) {
        if (key.startsWith(prefix)) {
          URL.revokeObjectURL(entry.blobUrl);
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Clear all cached images
   */
  clear(): void {
    for (const entry of this.cache.values()) {
      if (entry.blobUrl) {
        URL.revokeObjectURL(entry.blobUrl);
      }
    }
    this.cache.clear();
  }

  /**
   * Get cache statistics (for debugging)
   */
  getStats() {
    let totalRefs = 0;
    let expiredCount = 0;
    const now = Date.now();

    for (const entry of this.cache.values()) {
      totalRefs += entry.refCount;
      if (now - entry.timestamp > this.CACHE_EXPIRY_MS) {
        expiredCount++;
      }
    }

    return {
      size: this.cache.size,
      totalRefs,
      expiredCount,
      maxSize: this.maxCacheSize,
    };
  }

  /**
   * Enforce maximum cache size by removing least recently used entries
   * Priority: expired entries > entries with refCount = 0 > oldest entries
   */
  private enforceMaxSize(): void {
    if (this.cache.size <= this.maxCacheSize) return;

    const now = Date.now();
    const entriesToRemove: string[] = [];

    // First, collect expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (entry.fetchPromise === null) {
        const age = now - entry.timestamp;
        if (age > this.CACHE_EXPIRY_MS) {
          entriesToRemove.push(key);
        }
      }
    }

    // Then, collect entries with refCount = 0
    if (this.cache.size - entriesToRemove.length > this.maxCacheSize) {
      for (const [key, entry] of this.cache.entries()) {
        if (!entriesToRemove.includes(key) && entry.refCount === 0 && entry.fetchPromise === null) {
          entriesToRemove.push(key);
        }
      }
    }

    // If still over limit, remove oldest entries (LRU)
    let remaining = this.cache.size - entriesToRemove.length;
    if (remaining > this.maxCacheSize) {
      const toRemove = remaining - this.maxCacheSize;
      const sortedEntries = Array.from(this.cache.entries())
        .filter(([key]) => !entriesToRemove.includes(key))
        .filter(([, entry]) => entry.fetchPromise === null)
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)
        .slice(0, toRemove);
      
      for (const [key] of sortedEntries) {
        entriesToRemove.push(key);
      }
    }

    // Remove and revoke
    for (const key of entriesToRemove) {
      const entry = this.cache.get(key);
      if (entry && entry.blobUrl) {
        URL.revokeObjectURL(entry.blobUrl);
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clean up expired entries periodically
   */
  startCleanupInterval(intervalMs: number = 5 * 60 * 1000): () => void {
    const interval = setInterval(() => {
      this.enforceMaxSize();
    }, intervalMs);

    return () => clearInterval(interval);
  }
}

// Singleton instance
export const imageCache = new ImageCache();

// Start cleanup interval (runs every 5 minutes)
if (typeof window !== 'undefined') {
  imageCache.startCleanupInterval();
}
