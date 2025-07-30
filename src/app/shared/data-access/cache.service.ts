// src/app/shared/data-access/cache.service.ts
import { inject, Injectable } from '@angular/core';
import { SsrPlatformService } from '@fourfold/angular-foundation';

/**
 * Centralized TTL (Time To Live) constants for caching strategy
 *
 * USAGE:
 * - STATIC_* for data that rarely changes (pubs, badges, system config)
 * - COMPETITIVE for real-time data that affects multiple users (leaderboards)
 * - PERSONAL for user-scoped data (user's own check-ins, profile)
 * - NO_CACHE to disable caching entirely
 */
export const CACHE_TTL = {
  // Static data - changes very rarely
  STATIC_VERY_LONG: 7 * 24 * 60 * 60 * 1000, // 7 days (system config, app constants)
  STATIC_LONG: 24 * 60 * 60 * 1000, // 24 hours (badge definitions, game rules)
  STATIC_MEDIUM: 60 * 60 * 1000, // 1 hour (pubs, static reference data)
  STATIC_SHORT: 15 * 60 * 1000, // 15 minutes (badges, achievements)

  // Dynamic competitive data - needs to be fresh for real-time experience
  COMPETITIVE: 30 * 1000, // 30 seconds (leaderboards, global stats)

  // User personal data - can cache longer since user controls changes
  PERSONAL: 5 * 60 * 1000, // 5 minutes (user's own data)

  // Development/testing
  DEVELOPMENT: 10 * 1000, // 10 seconds (for testing cache behavior)
  NO_CACHE: 0, // Disable caching entirely
} as const;

export type CacheOptions<T> = {
  key: string;
  ttlMs: number;
  loadFresh: () => Promise<T[]>;
  userId?: string; // ✅ Optional user context
};

@Injectable({ providedIn: 'root' })
export class CacheService {
  private readonly platform = inject(SsrPlatformService);

  async load<T>({ key, ttlMs, loadFresh, userId }: CacheOptions<T>): Promise<T[]> {
    // ✅ Create user-specific cache key if userId provided
    const cacheKey = userId ? `${key}:${userId}` : key;
    const now = Date.now();

    // 1️⃣ Try reading from cache (browser only)
    const raw = this.platform.onlyOnBrowser(() => localStorage.getItem(cacheKey));
    if (raw) {
      try {
        const { timestamp, data } = JSON.parse(raw) as {
          timestamp: number;
          data: T[];
        };
        const age = now - timestamp;
        if (age < ttlMs) {
          console.log(
            `[Cache] ⚡ Loaded ${data.length} items from cache (${key}, ${Math.round(
              age / 1000
            )}s old)`
          );
          return data;
        } else {
          console.log(`[Cache] ⏰ Cache expired for ${key} — fetching fresh data`);
        }
      } catch (e) {
        console.warn(`[Cache] 🧨 Failed to parse cache for ${key}:`, e);
      }
    } else {
      console.log(`[Cache] 📭 No cache for ${key} — fetching from source`);
    }

    // 2️⃣ Load fresh
    const fresh = await loadFresh();

    // 3️⃣ Write back to cache (browser only)
    this.platform.onlyOnBrowser(() => {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ timestamp: now, data: fresh }));
        console.log(`[Cache] 🧊 Stored ${fresh.length} items to cache (${key})`);
      } catch (e) {
        console.warn(`[Cache] ⚠️ Failed to write cache for ${key}:`, e);
      }
    });

    return fresh;
  }

  /**
   * Clear cache for a specific key
   */
  clear(key: string, userId?: string): void {
    const cacheKey = userId ? `${key}:${userId}` : key;
    this.platform.onlyOnBrowser(() => {
      localStorage.removeItem(cacheKey);
      console.log(`[Cache] 🧽 Cleared cache for ${key}${userId ? ` (user: ${userId})` : ''}`);
    });
  }

  /**
   * Clear all caches for a specific user
   */
  clearUserCaches(userId: string): void {
    this.platform.onlyOnBrowser(() => {
      const keysToRemove: string[] = [];

      // Find all keys that end with this userId
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.endsWith(`:${userId}`)) {
          keysToRemove.push(key);
        }
      }

      // Remove them
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        const baseKey = key.replace(`:${userId}`, '');
        console.log(`[Cache] 🧽 Cleared user cache for ${baseKey} (user: ${userId})`);
      });
    });
  }

  /**
   * Clear all caches (use sparingly)
   */
  clearAll(): void {
    this.platform.onlyOnBrowser(() => {
      localStorage.clear();
      console.log(`[Cache] 🧹 Cleared all caches`);
    });
  }

  /**
   * Get cache info for debugging
   */
  getCacheInfo(): { key: string; size: number; age: number }[] {
    return (
      this.platform.onlyOnBrowser(() => {
        const info: { key: string; size: number; age: number }[] = [];
        const now = Date.now();

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            const value = localStorage.getItem(key);
            if (value) {
              try {
                const parsed = JSON.parse(value);
                if (parsed.timestamp && parsed.data) {
                  info.push({
                    key,
                    size: parsed.data.length,
                    age: Math.round((now - parsed.timestamp) / 1000),
                  });
                }
              } catch {
                // Not a cache entry, skip
              }
            }
          }
        }

        return info;
      }) || []
    );
  }
}
