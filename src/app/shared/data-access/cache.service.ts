import { inject, Injectable } from '@angular/core';
import { SsrPlatformService } from '../utils/ssr/ssr-platform.service';

export type CacheOptions<T> = {
  key: string;
  ttlMs: number;
  loadFresh: () => Promise<T[]>;
};

@Injectable({ providedIn: 'root' })
export class CacheService {
  private readonly platform = inject(SsrPlatformService);

  async load<T>({
    key,
    ttlMs,
    loadFresh,
  }: CacheOptions<T>): Promise<T[]> {
    const now = Date.now();
    // 1️⃣ Try reading from cache (browser only)
    const raw = this.platform.onlyOnBrowser(() => localStorage.getItem(key));
    if (raw) {
      try {
        const { timestamp, data } = JSON.parse(raw) as {
          timestamp: number;
          data: T[];
        };
        const age = now - timestamp;
        if (age < ttlMs) {
          console.log(
            `[Cache] ⚡ Loaded ${data.length} items from cache (${Math.round(
              age / 1000,
            )}s old)`,
          );
          return data;
        } else {
          console.log(`[Cache] ⏰ Cache expired — fetching fresh data`);
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
        localStorage.setItem(
          key,
          JSON.stringify({ timestamp: now, data: fresh }),
        );
        console.log(
          `[Cache] 🧊 Stored ${fresh.length} items to cache (${key})`,
        );
      } catch (e) {
        console.warn(`[Cache] ⚠️ Failed to write cache for ${key}:`, e);
      }
    });

    return fresh;
  }

  clear(key: string): void {
    this.platform.onlyOnBrowser(() => {
      localStorage.removeItem(key);
      console.log(`[Cache] 🧽 Cleared cache for ${key}`);
    });
  }

}
