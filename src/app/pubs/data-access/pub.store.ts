import { signal } from '@angular/core';
import { Pub } from '../utils/pub.models';
import { inject } from '@angular/core';
import { PubsService } from './pubs.service';
import { Injectable } from '@angular/core';
import { CacheService } from '../../shared/data-access/cache.service';

@Injectable({
  providedIn: 'root',
})
export class PubStore {
  readonly pubs$$ = signal<Pub[]>([]);
  readonly loading$$ = signal(false);
  readonly error$$ = signal<string | null>(null);

  private readonly pubService = inject(PubsService);
  private readonly cacheService = inject(CacheService);


  async loadOnce() {
    if (this.loading$$() || this.pubs$$().length) {
      console.log('[PubStore] ✅ Already loaded — skipping');
      return;
    }

    this.loading$$.set(true);
    try {
      const pubs = await this.cacheService.load({
        key:   'pubs',
        ttlMs: 1000 * 60 * 5, // e.g. 5 minutes
        loadFresh: () =>
          this.pubService.getAllPubs(),
      });
      this.pubs$$.set(pubs);
      console.log('[PubStore] 📦 Loaded pubs', pubs);
    } catch (err: any) {
      this.error$$.set(err.message || 'Unknown error');
      console.error('[PubStore] ❌ Error loading pubs:', err);
    } finally {
      this.loading$$.set(false);
    }
  }
}
