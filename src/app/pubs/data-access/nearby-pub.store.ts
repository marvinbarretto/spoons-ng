import { computed, inject, Injectable, Signal } from '@angular/core';
import type { Pub, PubWithDistance } from '../utils/pub.models';
import { haversineDistanceInMeters } from '../../shared/utils/geo';
import { LocationService } from '../../shared/data-access/location.service';
import { PubStore } from './pub.store';
import { MAX_NEARBY_PUBS } from '../../constants';
import { environment } from '../../../environments/environment';


/**
 * ✅ REACTIVE COMPUTED STORE
 *
 * This store doesn't manage its own data - it's a pure transformation layer
 * that derives state from LocationService + PubStore. This is the correct
 * pattern for stores that only compute derived state.
 */
@Injectable({ providedIn: 'root' })
export class NearbyPubStore {
  private readonly locationService = inject(LocationService);
  private readonly pubStore = inject(PubStore);

  // ✅ REACTIVE: Direct access to source signals with clean names
  readonly location: Signal<{ lat: number; lng: number } | null> =
    this.locationService.location;

  readonly allPubs: Signal<Pub[]> = this.pubStore.data;

  // ✅ COMPUTED: All reactive calculations
  readonly nearbyPubs: Signal<PubWithDistance[]> = computed(() => {
    const location = this.location();
    const pubs = this.allPubs();

    if (!location || !pubs.length) {
      return [];
    }

    const userLocation = { lat: location.lat, lng: location.lng };

    const pubsWithDistances: PubWithDistance[] = pubs.map((pub) => ({
      ...pub,
      distance: haversineDistanceInMeters(userLocation, pub.location),
    }));

    return pubsWithDistances
      .filter((pub) => pub.distance < (environment.checkInDistanceThresholdMeters || 200))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, MAX_NEARBY_PUBS);
  });

  readonly closestPub: Signal<PubWithDistance | null> = computed(() => {
    const pubs = this.nearbyPubs();
    return pubs.length > 0 ? pubs[0] : null;
  });

  readonly canCheckIn: Signal<boolean> = computed(() => !!this.closestPub());

  // ✅ COMPUTED: Additional derived state
  readonly nearbyPubsCount = computed(() => this.nearbyPubs().length);
  readonly hasNearbyPubs = computed(() => this.nearbyPubsCount() > 0);

  constructor() {
    console.log('[NearbyPubStore] 📍 Initialized - watching location + pubs');
  }

  // ✅ UTILITY METHODS: Pure functions, no state mutation

  /**
   * Get distance to a specific pub (pure calculation)
   */
  getDistanceToPub(pubId: string): number | null {
    const location = this.location();
    const pubs = this.allPubs();

    if (!location) return null;

    const pub = pubs.find(p => p.id === pubId);
    if (!pub) return null;

    return haversineDistanceInMeters(location, pub.location);
  }

  /**
   * Check if a pub is within check-in range (pure calculation)
   */
  isWithinCheckInRange(pubId: string): boolean {
    const distance = this.getDistanceToPub(pubId);
    return distance !== null && distance < (environment.checkInDistanceThresholdMeters || 200);
  }

  /**
   * Get pubs within a custom radius (pure calculation)
   */
  getPubsWithinRadius(radiusMeters: number): PubWithDistance[] {
    const location = this.location();
    const pubs = this.allPubs();

    if (!location || !pubs.length) return [];

    const userLocation = { lat: location.lat, lng: location.lng };

    return pubs
      .map(pub => ({
        ...pub,
        distance: haversineDistanceInMeters(userLocation, pub.location)
      }))
      .filter(pub => pub.distance <= radiusMeters)
      .sort((a, b) => a.distance - b.distance);
  }
}
