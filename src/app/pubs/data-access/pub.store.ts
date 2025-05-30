import { signal } from '@angular/core';
import { Pub } from '../utils/pub.models';
import { inject } from '@angular/core';
import { PubService } from './pub.service';
import { Injectable } from '@angular/core';
import { CacheService } from '../../shared/data-access/cache.service';

@Injectable({
  providedIn: 'root',
})
export class PubStore {
  readonly pubs$$ = signal<Pub[]>([]);
  readonly loading$$ = signal(false);
  readonly error$$ = signal<string | null>(null);

  private readonly pubService = inject(PubService);
  private readonly cacheService = inject(CacheService);
  private hasLoaded = false;

  async loadOnce(): Promise<void> {
    if (this.hasLoaded) {
      console.log('[PubStore] ✅ Already loaded — skipping');
      return;
    }

    await this.load();
  }

  async load(): Promise<void> {
    this.loading$$.set(true);
    this.error$$.set(null);
    try {
      const pubs = await this.cacheService.load({
        key: 'pubs',
        ttlMs: 1000 * 60 * 5,
        loadFresh: () => this.pubService.getAllPubs(),
      });

      this.pubs$$.set(pubs);
      this.hasLoaded = true;
      console.log('[PubStore] 📦 Loaded pubs', pubs);
    } catch (err: any) {
      this.error$$.set(err.message || 'Unknown error');
      console.error('[PubStore] ❌ Error loading pubs:', err);
    } finally {
      this.loading$$.set(false);
    }
  }

  reset(): void {
    this.cacheService.clear('pubs');
    this.pubs$$.set([]);
    this.loading$$.set(false);
    this.error$$.set(null);
    this.hasLoaded = false;
    console.log('[PubStore] 🔄 Reset complete');
  }

}
