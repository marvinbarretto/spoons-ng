import { Component, computed, inject, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NearbyPubStore } from '../../../pubs/data-access/nearby-pub.store';
import { haversineDistanceInMeters } from '../../../shared/utils/geo';
import { StatusComponent } from "../status/status.component";
import { CheckInHomepageWidgetComponent } from "../../../check-in/ui/check-in-homepage-widget/check-in-homepage-widget.component";
import { Pub } from '../../../pubs/utils/pub.models';
import { NearestPubsItemComponent } from "../../../pubs/ui/nearest-pubs-item/nearest-pubs-item.component";
import { NearestPubsComponent } from "../../../pubs/ui/nearest-pubs/nearest-pubs.component";
import { OverlayService } from "../../../shared/data-access/overlay.service";
import { CheckinStore } from '../../../check-in/data-access/check-in.store';
import { Router } from '@angular/router';
import { CheckInResultOverlayComponent } from '../../../check-in/ui/check-in-result-overlay/check-in-result-overlay.component';


@Component({
  selector: 'app-home',
  imports: [CommonModule, StatusComponent, CheckInHomepageWidgetComponent, NearestPubsComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  private readonly nearbyPubStore = inject(NearbyPubStore);
  private readonly checkinStore = inject(CheckinStore);
  private readonly router = inject(Router);

  private readonly overlayService = inject(OverlayService);

  openOverlay() {
    // this.overlayService.open(CheckInResultOverlayComponent);
    console.log('TODO: Open check-in result overlay');
  }



  readonly location = this.nearbyPubStore.location;
  readonly allPubs = this.nearbyPubStore.allPubs;
  readonly nearestPubs = this.nearbyPubStore.nearbyPubs;

  readonly userCanCheckIn = computed(() =>
    this.checkinStore.canCheckInToPub(this.closestPubId())

  );

    readonly closestPub = this.nearbyPubStore.closestPub;

  readonly closestPubId = computed(() =>
    this.closestPub()?.id ?? null);

  readonly distances = computed(() => {
    const loc = this.location();
    const pubs = this.allPubs();
    if (!loc) return [];
    return pubs.map(p => [p.name, haversineDistanceInMeters(loc, p.location)]);
  });



  // Maybe move this out

  async checkInToNearestPub() {
    const pub = this.closestPub();
    if (!pub) return;

    console.log('TODO: Open check-in result overlay');
  }
}
