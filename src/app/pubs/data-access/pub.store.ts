// src/app/pubs/data-access/pub.store.ts
import { Injectable, computed, inject } from '@angular/core';
import type { CheckIn } from '@check-in/utils/check-in.models';
import { CacheService, LocationService } from '@fourfold/angular-foundation';
import { BaseStore } from '@shared/base/base.store';
import { calculateDistance } from '@shared/utils/location.utils';
import { Timestamp } from 'firebase/firestore';
import type { Pub } from '../utils/pub.models';
import { PubService } from './pub.service';

@Injectable({ providedIn: 'root' })
export class PubStore extends BaseStore<Pub> {
  protected readonly pubService = inject(PubService);
  protected readonly cacheService = inject(CacheService);
  protected readonly locationService = inject(LocationService);

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
        : Infinity, // ✅ Use Infinity instead of null - still sorts to bottom
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
      loadFresh: () => this.pubService.getAllPubs(),
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
      const distance = calculateDistance(
        { lat, lng },
        { lat: pub.location.lat, lng: pub.location.lng }
      );
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

  // ✅ Essential Pub Update Methods
  // Note: Use GlobalCheckInStore for real-time statistics instead of maintaining
  // aggregated data in pub documents (avoids scalability and consistency issues)

  /**
   * Update the last check-in timestamp for a pub
   * 
   * This is a lightweight update that only sets lastCheckinAt to server timestamp.
   * Used for quick sorting/filtering of pubs by recent activity.
   * 
   * For real statistics (count, unique visitors, etc.), use GlobalCheckInStore methods:
   * - GlobalCheckInStore.getPubVisitCount(pubId) for total visits
   * - GlobalCheckInStore.getCheckInsForPub(pubId) for detailed check-in data
   * 
   * @param pubId - ID of the pub to update
   * @throws Error if update fails or pub service is unavailable
   */
  async updateLastCheckinTime(pubId: string): Promise<void> {
    console.log('[PubStore] Updating last check-in time for:', pubId);

    try {
      await this.pubService.updateLastCheckinTime(pubId);
      console.log('[PubStore] ✅ Last check-in time updated successfully:', pubId);
    } catch (error) {
      console.error('[PubStore] ❌ Failed to update last check-in time:', error);
      throw error;
    }
  }

  /**
   * Update pub carpet URL efficiently using signal updates
   *
   * 🎯 PERFORMANCE OPTIMIZATION:
   * Instead of invalidating the entire pub cache when one carpet URL changes,
   * we update the specific pub object in the signal directly. This provides:
   * - Instant UI updates via signal reactivity
   * - No cache invalidation overhead
   * - No network requests to reload all pubs
   * - Preserves cached data for other pubs
   *
   * 📊 FLOW:
   * 1. User checks in and uploads carpet image
   * 2. CarpetStorageService calls this method
   * 3. Firebase is updated via PubService
   * 4. In-memory signal is updated directly
   * 5. Template reactivity triggers immediate UI update
   *
   * ⚡ CACHE STRATEGY:
   * We deliberately avoid cache invalidation because:
   * - Carpet URLs are user-generated content that changes frequently
   * - Full cache reload would refetch ALL pubs unnecessarily
   * - Signal updates are instant and maintain data consistency
   * - Cache remains valid for all other pub data
   *
   * @param pubId - ID of the pub to update
   * @param carpetUrl - New carpet image URL from Firebase Storage
   */
  async updatePubCarpetUrl(pubId: string, carpetUrl: string): Promise<void> {
    console.log('[PubStore] 🖼️ Updating pub carpet URL:', { pubId, carpetUrl });

    try {
      // Step 1: Update Firebase document via PubService
      // This handles Firestore update and service-level cache invalidation
      await this.pubService.updatePubCarpetUrl(pubId, carpetUrl);

      // Step 2: Update in-memory signal directly for instant UI reactivity
      // This is the key optimization - no cache invalidation needed!
      const updateData = {
        carpetUrl,
        hasCarpet: true, // Mark as having carpet when URL is provided
        carpetUpdatedAt: Timestamp.now(), // Track when carpet was last updated
      };

      // Use BaseStore's updateItem method to modify the signal
      this.updateItem(
        pub => pub.id === pubId, // Find the specific pub
        updateData // Apply the carpet URL updates
      );

      console.log(
        '[PubStore] ✅ Pub carpet URL updated successfully with signal reactivity:',
        pubId
      );
      console.log('[PubStore] 🚀 UI will update instantly via signal - no cache reload needed!');
    } catch (error) {
      console.error('[PubStore] ❌ Failed to update pub carpet URL:', error);
      throw error;
    }
  }
}
