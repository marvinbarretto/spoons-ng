// src/app/pubs/data-access/pub.store.ts
import { signal, computed, inject, Injectable, effect } from '@angular/core';
import { PubService } from './pub.service';
import { CacheService } from '../../shared/data-access/cache.service';
import { LocationService } from '../../shared/data-access/location.service';
import { AuthStore } from '../../auth/data-access/auth.store';
import { BaseStore } from '../../shared/data-access/base.store';
import type { Pub } from '../utils/pub.models';
import { getDistanceKm } from '../../shared/utils/get-distance';
import { CheckinStore } from '../../check-in/data-access/check-in.store';

@Injectable({
  providedIn: 'root',
})
export class PubStore extends BaseStore<Pub> {
  private readonly pubService = inject(PubService);
  private readonly cacheService = inject(CacheService);
  private readonly locationService = inject(LocationService);
  private readonly authStore = inject(AuthStore);

  // Q OK for this store to be calling another store?
  private readonly checkinStore = inject(CheckinStore);

  // ✅ REACTIVE: Watch user changes
  private lastUserId: string | null = null;

  // ✅ REACTIVE: Location from service
  readonly userLocation = this.locationService.location;

  // ✅ COMPUTED: Distance-sorted pubs (fully reactive)
  readonly sortedPubsByDistance = computed(() => {
    const pubs = this.data();
    const location = this.userLocation();

    if (!location || !pubs.length) return pubs;

    return [...pubs].sort((a, b) => {
      const distanceA = getDistanceKm(location, a.location);
      const distanceB = getDistanceKm(location, b.location);
      return distanceA - distanceB;
    });
  });

  // ✅ HELPER: Distance calculation (pure function)
  getDistanceForPub(pub: Pub): number | undefined {
    const location = this.userLocation();
    return location ? getDistanceKm(location, pub.location) : undefined;
  }

  // ✅ HELPER: Get pub by ID (pure lookup)
  getPubById(pubId: string): Pub | undefined {
    return this.data().find(pub => pub.id === pubId);
  }

  constructor() {
    super();

    // ✅ REACTIVE: Reset data when user changes
    effect(() => {
      const user = this.authStore.user();
      const currentUserId = user?.uid || null;

      // Reset if user changed (including logout)
      if (currentUserId !== this.lastUserId) {
        console.log('[PubStore] User changed, resetting data');
        this.resetForUser(currentUserId || undefined);
        this.lastUserId = currentUserId;

        // Auto-load for new user
        if (currentUserId) {
          this.loadOnce();
        }
      }
    });
  }

  // ✅ IMPLEMENTED: BaseStore abstract method
  protected async fetchData(): Promise<Pub[]> {
    return this.cacheService.load({
      key: 'pubs',
      ttlMs: 1000 * 60 * 5, // 5 minutes
      loadFresh: () => this.pubService.getAllPubs(),
    });
  }

    // ✅ ADD: Missing hasCheckedIn method
    hasCheckedIn(pubId: string): boolean {
      return this.checkinStore.userCheckins().includes(pubId);
    }

  // ✅ ENHANCED: User-aware reset
  override resetForUser(userId?: string): void {
    super.resetForUser(userId);
    this.cacheService.clear('pubs');
    console.log('[PubStore] Reset complete for user:', userId || 'anonymous');
  }
}
