import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NearbyPubStore } from '../../../pubs/data-access/nearby-pub.store';
import { LocationService } from '../../../shared/data-access/location.service';
import { haversineDistanceInMeters } from '../../../shared/utils/geo';
import { PubListComponent } from "../../../pubs/ui/pub-list/pub-list.component"; // if not yet exposed

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, PubListComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  private nearby = inject(NearbyPubStore);
  private locationService = inject(LocationService);

  location$$ = this.nearby.location$$;
  allPubs$$ = this.nearby.allPubs$$;
  nearestPubs$$ = this.nearby.nearbyPubs$$;

  distances$$ = computed(() => {
    const loc = this.location$$();
    const pubs = this.allPubs$$();
    if (!loc) return [];
    return pubs.map(p => [p.name, haversineDistanceInMeters(loc, p.location)]);
  });
}
