import { computed, effect, inject, Injectable, Signal } from '@angular/core';

import type { Pub } from '../utils/pub.models';
import { haversineDistanceInMeters } from '../../shared/utils/geo';
import { LocationService } from '../../shared/data-access/location.service';
import { PubStore } from './pub.store';
import { PUB_DISTANCE_THRESHOLD_METRES } from '../../constants';



type PubWithDistance = Pub & { distance: number };

@Injectable({ providedIn: 'root' })
export class NearbyPubStore {
  private readonly locationService = inject(LocationService);
  private readonly pubStore = inject(PubStore);

  readonly location$$: Signal<{ lat: number; lng: number } | null> =
    this.locationService.location$$;

  readonly allPubs$$: Signal<Pub[]> = this.pubStore.pubs$$;

  readonly nearbyPubs$$: Signal<PubWithDistance[]> = computed(() => {
    const location = this.location$$();
    const pubs = this.allPubs$$();

    if (!location || !pubs.length) return [];

    const userLoc = { lat: location.lat, lng: location.lng };

    const pubsWithDistances: PubWithDistance[] = pubs.map((pub) => ({
      ...pub,
      distance: haversineDistanceInMeters(userLoc, pub.location),
    }));

    console.log(
      '[NearbyPubStore] 🧪 distances (m):',
      pubsWithDistances.map((p) => [
        p.name,
        `${p.distance.toFixed(0)}m`,
        p.distance < PUB_DISTANCE_THRESHOLD_METRES ? '✅' : '❌',
      ])
    );

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

  constructor() {
    console.log('[NearbyPubStore] Bootstrapping');
    effect(() => {
      console.log('[NearbyPubStore] 📍 location:', this.location$$());
      console.log('[NearbyPubStore] 🧭 pubs:', this.allPubs$$());
      console.log('[NearbyPubStore] 🏁 nearbyPubs:', this.nearbyPubs$$());
    });
  }
}
