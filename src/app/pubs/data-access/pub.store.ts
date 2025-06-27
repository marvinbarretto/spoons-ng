// src/app/pubs/data-access/pub.store.ts
import { Injectable, computed, inject } from '@angular/core';
import { BaseStore } from '@shared/data-access/base.store';
import { CacheService } from '@shared/data-access/cache.service';
import { LocationService } from '@shared/data-access/location.service';
import type { Pub } from '../utils/pub.models';
import type { CheckIn } from '../../check-in/utils/check-in.models';
import { PubService } from './pub.service';
import { calculateDistance } from '@shared/utils/location.utils';
import { Timestamp } from 'firebase/firestore';

@Injectable({ providedIn: 'root' })
export class PubStore extends BaseStore<Pub> {
  private readonly pubService = inject(PubService);
  private readonly cacheService = inject(CacheService);
  private readonly locationService = inject(LocationService);

  readonly pubs = this.data;
  
  readonly totalCount = computed(() => this.pubs().length);

  readonly sortedPubsByDistance = computed(() => {
    const location = this.locationService.location();
    const pubs = this.pubs();

    if (!location) {
      return [...pubs].sort((a, b) => a.name.localeCompare(b.name));
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

  // ✅ Helper method for component filtering
  readonly getSortedPubs = computed(() => this.sortedPubsByDistance());

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

  // ✅ Pub Statistics Update Methods

  /**
   * Update pub statistics after a check-in
   * - Increments check-in count
   * - Updates last check-in timestamp
   * - Updates earliest/latest check-in records
   * - Adds entry to check-in history
   * @param pubId - ID of the pub to update
   * @param checkin - The check-in data
   * @param checkinId - ID of the created check-in document
   */
  async updatePubStats(pubId: string, checkin: Omit<CheckIn, 'id'>, checkinId: string): Promise<void> {
    console.log('[PubStore] Updating pub stats for:', pubId);
    
    try {
      const pub = this.pubs().find(p => p.id === pubId);
      if (!pub) {
        console.warn('[PubStore] Pub not found for stats update:', pubId);
        return;
      }

      const userId = this.authStore.user()?.uid;
      if (!userId) {
        throw new Error('[PubStore] Cannot update pub stats without a valid user ID');
      }

      // Delegate to PubService
      await this.pubService.updatePubStats(pubId, checkin, checkinId, pub, userId);

      console.log('[PubStore] Pub stats updated successfully via PubService:', pubId);
      
      // Optionally refresh pub data to get updated stats
      // await this.refreshPubData();
      
    } catch (error) {
      console.error('[PubStore] Failed to update pub stats:', error);
      throw error;
    }
  }

  /**
   * Increment check-in count for a pub (simpler method)
   * @param pubId - ID of the pub to update
   */
  async incrementCheckinCount(pubId: string): Promise<void> {
    console.log('[PubStore] Incrementing check-in count for:', pubId);
    
    try {
      // Delegate to PubService
      await this.pubService.incrementCheckinCount(pubId);

      console.log('[PubStore] Check-in count incremented successfully via PubService:', pubId);
      
    } catch (error) {
      console.error('[PubStore] Failed to increment check-in count:', error);
      throw error;
    }
  }

  /**
   * Update pub check-in history
   * @param pubId - ID of the pub to update
   * @param userId - User ID who checked in
   * @param timestamp - Check-in timestamp
   */
  async updatePubHistory(pubId: string, userId: string, timestamp: Timestamp): Promise<void> {
    console.log('[PubStore] Adding to pub check-in history:', { pubId, userId });
    
    try {
      // Delegate to PubService
      await this.pubService.updatePubHistory(pubId, userId, timestamp);

      console.log('[PubStore] Pub history updated successfully via PubService:', pubId);
      
    } catch (error) {
      console.error('[PubStore] Failed to update pub history:', error);
      throw error;
    }
  }
}
