 // nearby-pub.store.ts
import { Injectable, computed, signal, inject, effect } from '@angular/core';

import { PubStore } from './pub.store';
import { haversineDistanceInMeters } from '../../shared/utils/geo';
import { LocationService } from '../../shared/data-access/location.service';
import type { Pub } from '../utils/pub.models';
import { PUB_DISTANCE_THRESHOLD_METRES } from '../../constants';

@Injectable({ providedIn: 'root' })
export class NearbyPubStore {
  private locationService = inject(LocationService);
  private pubStore = inject(PubStore);

  readonly location$$ = this.locationService.location$$;
  readonly allPubs$$ = this.pubStore.pubs$$;

  readonly nearbyPubs$$ = computed(() => {
    const location = this.location$$();
    const pubs: Pub[] = this.allPubs$$();

    if (!location || !pubs.length) return [];

    console.log('[NearbyPubStore] 🧪 distances:', pubs.map(p =>
      [p.name, haversineDistanceInMeters(location, p.location)]
    ));

    const pubsWithDistances = pubs.map((pub) => ({
      ...pub,
      distance: haversineDistanceInMeters(location, pub.location),
    }));

    console.log(
      '🧪 Checking threshold:',
      pubsWithDistances.map((p) => [p.name, p.distance, p.distance < PUB_DISTANCE_THRESHOLD_METRES])
    );

    return pubs
      .map((pub) => ({
        ...pub,
        distance: haversineDistanceInMeters(location, pub.location),
      }))
      .filter((p) => p.distance < PUB_DISTANCE_THRESHOLD_METRES)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
  });

  readonly closestPub$$ = computed(() => {
    const pubs = this.nearbyPubs$$();
    return pubs.length > 0 ? pubs[0] : null;
  });

  readonly canCheckIn$$ = computed(() => !!this.closestPub$$());

  constructor() {
    console.log('[NearbyPubStore] Bootstrapping');
    effect(() => {
      console.log('[NearbyPubStore] 📍 location:', this.location$$());
      console.log('[NearbyPubStore] 🧭 pubs:', this.allPubs$$());
      console.log('[NearbyPubStore] 🏁 nearbyPubs:', this.nearbyPubs$$());
    });
  }
}
