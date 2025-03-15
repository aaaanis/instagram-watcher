import NodeCache from 'node-cache';

// Default cache TTL and check period (in seconds)
const DEFAULT_TTL = 60 * 115; // 115 minutes - expires 5 minutes before next job run
const CHECK_PERIOD = 60 * 120; // Check for expired keys every 2 hours

// Create a singleton cache instance with default options
const cache = new NodeCache({
  stdTTL: DEFAULT_TTL,
  checkperiod: CHECK_PERIOD,
  useClones: false, // For better performance with large objects
});

/**
 * Get a value from cache by key
 * @param key Cache key
 * @returns Cached value or undefined if not found
 */
export function getCached<T>(key: string): T | undefined {
  return cache.get<T>(key);
}

/**
 * Set a value in cache with optional TTL
 * @param key Cache key
 * @param value Value to cache
 * @param ttl Time to live in seconds (optional, defaults to 5 minutes)
 * @returns true if successful
 */
export function setCached<T>(key: string, value: T, ttl: number = DEFAULT_TTL): boolean {
  return cache.set(key, value, ttl);
}

/**
 * Delete a cached value by key
 * @param key Cache key
 * @returns true if successful, false if item doesn't exist
 */
export function deleteCached(key: string): boolean {
  return cache.del(key) > 0;
}

/**
 * Clear all cache
 */
export function clearCache(): void {
  cache.flushAll();
}

/**
 * Get a value from cache by key, or compute and cache it if not found
 * @param key Cache key
 * @param fn Function to compute the value if not found in cache
 * @param ttl Time to live in seconds (optional, defaults to 5 minutes)
 * @returns Cached or computed value
 */
export async function getCachedOrCompute<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const cachedValue = getCached<T>(key);
  
  if (cachedValue !== undefined) {
    return cachedValue;
  }
  
  // Not in cache, compute the value
  const computedValue = await fn();
  
  // Cache the computed value
  setCached(key, computedValue, ttl);
  
  return computedValue;
}

/**
 * Get cache stats
 */
export function getCacheStats(): {
  keys: number;
  hits: number;
  misses: number;
  ksize: number;
  vsize: number;
} {
  return cache.getStats();
}

export default {
  get: getCached,
  set: setCached,
  delete: deleteCached,
  clear: clearCache,
  getOrCompute: getCachedOrCompute,
  stats: getCacheStats,
}; 