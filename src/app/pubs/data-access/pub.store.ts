import { signal, computed, inject, Injectable } from '@angular/core';
import { PubService } from '../../pubs/data-access/pub.service';
import { CacheService } from '../../shared/data-access/cache.service';
import { LocationService } from '../../shared/data-access/location.service';
import { CheckinStore } from '../../check-in/data-access/check-in.store';
import type { Pub } from '../../pubs/utils/pub.models';
import { getDistanceKm } from '../../shared/utils/get-distance';

@Injectable({
  providedIn: 'root',
})
export class PubStore {
  readonly pubs$$ = signal<Pub[]>([]);
  readonly loading$$ = signal(false);
  readonly error$$ = signal<string | null>(null);

  private readonly pubService = inject(PubService);
  private readonly cacheService = inject(CacheService);
  private readonly locationService = inject(LocationService);
  private readonly checkinStore = inject(CheckinStore);

  private hasLoaded = false;

  // ✅ Corrected property name
  readonly userLocation$$ = this.locationService.location$$;

  readonly sortedPubsByDistance$$ = computed(() => {
    const pubs = this.pubs$$();
    const loc = this.userLocation$$();
    if (!loc) return pubs;

    return [...pubs].sort((a, b) => {
      const d1 = getDistanceKm(loc, a.location);
      const d2 = getDistanceKm(loc, b.location);
      return d1 - d2;
    });
  });

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

  getDistanceForPub(pub: Pub): number | undefined {
    const loc = this.userLocation$$();
    return loc ? getDistanceKm(loc, pub.location) : undefined;
  }

  hasCheckedIn(pubId: string): boolean {
    return this.checkinStore.checkins().some(c => c.pubId === pubId);
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
