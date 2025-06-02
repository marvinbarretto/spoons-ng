// src/app/pubs/data-access/nearby-pub.store.ts
import { computed, inject, Injectable, Signal } from '@angular/core';
import type { Pub } from '../utils/pub.models';
import { haversineDistanceInMeters } from '../../shared/utils/geo';
import { LocationService } from '../../shared/data-access/location.service';
import { PubStore } from './pub.store';
import { PUB_DISTANCE_THRESHOLD_METRES } from '../../constants';

type PubWithDistance = Pub & { distance: number };

/**
 * NearbyPubStore doesn't need BaseStore since it doesn't manage its own data.
 * It's a computed store that derives state from LocationService + PubStore.
 *
 * This is a good example of when NOT to use BaseStore - when you're just
 * computing derived state from other stores/services.
 */
@Injectable({ providedIn: 'root' })
export class NearbyPubStore {
  private readonly locationService = inject(LocationService);
  private readonly pubStore = inject(PubStore);

  // Direct access to location and pubs from other stores
  readonly location$$: Signal<{ lat: number; lng: number } | null> =
    this.locationService.location$$;

  readonly allPubs$$: Signal<Pub[]> = this.pubStore.pubs$$;

  // Computed state - this is what makes this store valuable
  readonly nearbyPubs$$: Signal<PubWithDistance[]> = computed(() => {
    const location = this.location$$();
    const pubs = this.allPubs$$();

    if (!location || !pubs.length) return [];

    const userLoc = { lat: location.lat, lng: location.lng };

    const pubsWithDistances: PubWithDistance[] = pubs.map((pub) => ({
      ...pub,
      distance: haversineDistanceInMeters(userLoc, pub.location),
    }));

    return pubsWithDistances
      .filter((p) => p.distance < PUB_DISTANCE_THRESHOLD_METRES)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
  });

  readonly closestPub$$: Signal<PubWithDistance | null> = computed(() => {
    const pubs = this.nearbyPubs$$();
    return pubs.length > 0 ? pubs[0] : null;
  });

  readonly canCheckIn$$: Signal<boolean> = computed(() => !!this.closestPub$$());

  // Computed state for different filters
  readonly nearbyPubsCount$$ = computed(() => this.nearbyPubs$$().length);

  readonly hasNearbyPubs$$ = computed(() => this.nearbyPubsCount$$() > 0);

  constructor() {
    console.log('[NearbyPubStore] 📍 Initialized - watching location + pubs');
  }

  /**
   * Utility method to get distance to a specific pub
   */
  getDistanceToPub(pubId: string): number | null {
    const location = this.location$$();
    const pubs = this.allPubs$$();

    if (!location) return null;

    const pub = pubs.find(p => p.id === pubId);
    if (!pub) return null;

    return haversineDistanceInMeters(location, pub.location);
  }

  /**
   * Check if a pub is within check-in range
   */
  canCheckInToPub(pubId: string): boolean {
    const distance = this.getDistanceToPub(pubId);
    return distance !== null && distance < PUB_DISTANCE_THRESHOLD_METRES;
  }
}
