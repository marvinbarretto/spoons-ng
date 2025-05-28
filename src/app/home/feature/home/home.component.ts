import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NearbyPubStore } from '../../../pubs/data-access/nearby-pub.store';
import { LocationService } from '../../../shared/data-access/location.service';
import { haversineDistanceInMeters } from '../../../shared/utils/geo';
import { PubListComponent } from "../../../pubs/ui/pub-list/pub-list.component";
import { CheckInComponent } from "../../../check-in/ui/check-in/check-in.component"; // if not yet exposed

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, PubListComponent, CheckInComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  private nearbyPubStore = inject(NearbyPubStore);
  private locationService = inject(LocationService);

  location$$ = this.nearbyPubStore.location$$;
  allPubs$$ = this.nearbyPubStore.allPubs$$;
  nearestPubs$$ = this.nearbyPubStore.nearbyPubs$$;


  readonly closestPubId$$ = computed(() => this.nearbyPubStore.closestPub$$()?.id ?? null);

  readonly userCanCheckIn$$ = this.nearbyPubStore.canCheckIn$$;
  readonly closestPub$$ = this.nearbyPubStore.closestPub$$;




  distances$$ = computed(() => {
    const loc = this.location$$();
    const pubs = this.allPubs$$();
    if (!loc) return [];
    return pubs.map(p => [p.name, haversineDistanceInMeters(loc, p.location)]);
  });
}
