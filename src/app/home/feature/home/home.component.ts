import { Component, computed, inject, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NearbyPubStore } from '../../../pubs/data-access/nearby-pub.store';
import { haversineDistanceInMeters } from '../../../shared/utils/geo';
import { StatusComponent } from "../status/status.component";
import { CheckInHomepageWidgetComponent } from "../../../check-in/ui/check-in-homepage-widget/check-in-homepage-widget.component";
import { Pub } from '../../../pubs/utils/pub.models';
import { NearestPubsItemComponent } from "../../../pubs/ui/nearest-pubs-item/nearest-pubs-item.component";
import { NearestPubsComponent } from "../../../pubs/ui/nearest-pubs/nearest-pubs.component";

@Component({
  selector: 'app-home',
  imports: [CommonModule, StatusComponent, CheckInHomepageWidgetComponent, NearestPubsItemComponent, NearestPubsComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  private readonly nearbyPubStore = inject(NearbyPubStore);

  readonly location$$ = this.nearbyPubStore.location$$;
  readonly allPubs$$ = this.nearbyPubStore.allPubs$$;
  readonly nearestPubs$$ = this.nearbyPubStore.nearbyPubs$$;

  readonly userCanCheckIn$$ = this.nearbyPubStore.canCheckIn$$;
  readonly closestPub$$: Signal<Pub | null> = this.nearbyPubStore.closestPub$$;

  readonly closestPubId$$ = computed(() =>
    this.nearbyPubStore.closestPub$$()?.id ?? null);

  readonly distances$$ = computed(() => {
    const loc = this.location$$();
    const pubs = this.allPubs$$();
    if (!loc) return [];
    return pubs.map(p => [p.name, haversineDistanceInMeters(loc, p.location)]);
  });
}
