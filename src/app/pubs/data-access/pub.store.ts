import { signal } from '@angular/core';
import { Pub } from '../utils/pub.models';
import { inject } from '@angular/core';
import { PubsService } from './pubs.service';
import { SsrPlatformService } from '../../shared/utils/ssr/ssr-platform.service';
import { Injectable } from '@angular/core';

const CACHE_KEY = 'pubs-cache';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

@Injectable({
  providedIn: 'root',
})
export class PubStore {
  readonly pubs$$ = signal<Pub[]>([]);
  readonly loading$$ = signal(false);
  readonly error$$ = signal<string | null>(null);

  private loaded = false;

  private readonly pubService = inject(PubsService);
  private readonly platform = inject(SsrPlatformService);

  constructor() {
    console.log('[PubStore] 🧵 Bootstrapping...');
  }

  loadOnce() {
    if (this.loaded) {
      console.log('[PubStore] ✅ Already loaded — skipping');
      return;
    }

    this.loaded = true;
    this.loading$$.set(true);

    const cache = localStorage.getItem(CACHE_KEY);
    const now = Date.now();

    if (cache) {
      try {
        const parsed = JSON.parse(cache);
        const age = now - parsed.timestamp;

        if (age < CACHE_TTL_MS) {
          console.log(`[PubStore] ⚡ Loaded ${parsed.data.length} pubs from cache (${Math.round(age / 1000)}s old)`);
          this.pubs$$.set(parsed.data);
          this.loading$$.set(false);
          return;
        } else {
          console.log('[PubStore] ⏰ Cache expired — fetching fresh data');
        }
      } catch (e) {
        console.warn('[PubStore] 🧨 Failed to parse cache:', e);
      }
    } else {
      console.log('[PubStore] 📭 No cache found — fetching from Firestore');
    }

    this.pubService
      .getAllPubs()
      .then((pubs) => {
        console.log(`[PubStore] ✅ Loaded ${pubs.length} pubs from Firestore`);
        this.pubs$$.set(pubs);

        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            timestamp: now,
            data: pubs,
          })
        );
        console.log('[PubStore] 🧊 Cached pubs to localStorage');
      })
      .catch((err) => {
        console.error('[PubStore] ❌ Error loading pubs:', err);
        this.error$$.set('Failed to load pubs');
      })
      .finally(() => {
        this.loading$$.set(false);
      });
  }

  clearCache() {
    localStorage.removeItem(CACHE_KEY);
    console.log('[PubStore] 🧼 Cache cleared');
  }
}
