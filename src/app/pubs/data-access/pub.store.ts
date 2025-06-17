// src/app/pubs/data-access/pub.store.ts
import { Injectable, computed, inject } from '@angular/core';
import { BaseStore } from '@shared/data-access/base.store';
import { CacheService } from '@shared/data-access/cache.service';
import { LocationService } from '@shared/data-access/location.service';
import type { Pub } from '../utils/pub.models';
import { PubService } from './pub.service';
import { calculateDistance } from '@shared/utils/location.utils';

@Injectable({ providedIn: 'root' })
export class PubStore extends BaseStore<Pub> {
  private readonly pubService = inject(PubService);
  private readonly cacheService = inject(CacheService);
  private readonly locationService = inject(LocationService);

  // ✅ Store-specific computed signals
  readonly pubs = this.data; // Alias for cleaner access

  readonly sortedPubsByDistance = computed(() => {
    const location = this.locationService.location();
    const pubs = this.pubs();

    if (!location) {
      return pubs; // Return unsorted if no location
    }

    return [...pubs].sort((a, b) => {
      const distanceA = calculateDistance(location, { lat: a.location.lat, lng: a.location.lng });
      const distanceB = calculateDistance(location, { lat: b.location.lat, lng: b.location.lng });
      return distanceA - distanceB;
    });
  });

  readonly pubsWithDistance = computed(() => {
    const location = this.locationService.location();
    const pubs = this.pubs();

    return pubs.map(pub => ({
      ...pub,
      distance: location
        ? calculateDistance(location, { lat: pub.location.lat, lng: pub.location.lng })
        : Infinity // ✅ Use Infinity instead of null - still sorts to bottom
    }));
  });

  // ✅ Implement required fetchData method
  protected async fetchData(): Promise<Pub[]> {
    // ✅ Pubs are GLOBAL data - don't use user-specific cache
    return this.cacheService.load({
      key: 'pubs-global',
      ttlMs: 1000 * 60 * 60, // 1 hour (pubs change rarely)
      loadFresh: () => this.pubService.getAllPubs()
      // ✅ No userId - global cache
    });
  }

  // ✅ Override onUserReset to NOT clear global pub cache
  protected override onUserReset(userId?: string): void {
    // ✅ Don't clear pub cache when user changes - pubs are global
    console.log(`[PubStore] User reset for ${userId} - keeping global pub cache`);
    // No cache clearing here
  }

  // ✅ Store-specific methods
  findByName(name: string): Pub | undefined {
    return this.find(pub => pub.name.toLowerCase().includes(name.toLowerCase()));
  }

  findByLocation(lat: number, lng: number, radiusKm: number = 1): Pub[] {
    return this.filter(pub => {
      const distance = calculateDistance({ lat, lng }, { lat: pub.location.lat, lng: pub.location.lng });
      return distance <= radiusKm * 1000; // Convert km to meters
    });
  }

  // ✅ Manual cache management (if needed)
  async refreshPubData(): Promise<void> {
    console.log('[PubStore] Manually refreshing pub data');
    this.cacheService.clear('pubs-global');
    await this.load();
  }

  // ✅ Development helper
  clearGlobalPubCache(): void {
    this.cacheService.clear('pubs-global');
    console.log('[PubStore] Global pub cache cleared');
  }
}
