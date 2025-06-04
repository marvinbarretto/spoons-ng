// src/app/home/feature/home/home.component.ts
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NearbyPubStore } from '../../../pubs/data-access/nearby-pub.store';
import { CheckinStore } from '../../../check-in/data-access/check-in.store';
import { CheckInHomepageWidgetComponent } from '../../../check-in/ui/check-in-homepage-widget/check-in-homepage-widget.component';

@Component({
  selector: 'app-home',
  imports: [CommonModule, CheckInHomepageWidgetComponent],
  template: `
    <div class="home-container">
      @if (location()) {
        <div class="location-info">
          <p>Your location: {{ location()!.lat.toFixed(3) }}, {{ location()!.lng.toFixed(3) }}</p>
        </div>
      } @else {
        <p>Getting your location...</p>
      }

      @if (closestPub() && userCanCheckIn()) {
        <app-check-in-homepage-widget
          [closestPub]="closestPub()!"
        />
      } @else if (closestPub() && !userCanCheckIn()) {
        <div class="already-checked-in">
          <p>You've already checked in to {{ closestPub()!.name }} today!</p>
        </div>
      } @else {
        <p>No nearby pubs found</p>
      }

      @if (nearestPubs().length > 0) {
        <div class="nearby-pubs">
          <h2>Nearby Pubs</h2>
          <ul>
            @for (pub of nearestPubs(); track pub.id) {
              <li>
                {{ pub.name }} - {{ (pub.distance / 1000).toFixed(1) }}km
              </li>
            }
          </ul>
        </div>
      }
    </div>
  `,
  styles: [`
    .home-container {
      padding: 1rem;
      max-width: 600px;
      margin: 0 auto;
    }

    .location-info {
      background: var(--color-subtleLighter);
      padding: 1rem;
      border-radius: 4px;
      margin: 1rem 0;
    }

    .already-checked-in {
      background: var(--color-subtleLighter);
      padding: 1rem;
      border-radius: 4px;
      margin: 1rem 0;
      text-align: center;
    }

    .nearby-pubs {
      margin-top: 2rem;
    }

    .nearby-pubs ul {
      list-style: none;
      padding: 0;
    }

    .nearby-pubs li {
      padding: 0.5rem;
      border-bottom: 1px solid var(--color-subtleLighter);
    }
  `]
})
export class HomeComponent {
  private readonly nearbyPubStore = inject(NearbyPubStore);
  private readonly checkinStore = inject(CheckinStore);

  readonly location = this.nearbyPubStore.location;
  readonly allPubs = this.nearbyPubStore.allPubs;
  readonly nearestPubs = this.nearbyPubStore.nearbyPubs;
  readonly closestPub = this.nearbyPubStore.closestPub;

  readonly userCanCheckIn = computed(() => {
    const pubId = this.closestPub()?.id ?? null;
    if (!pubId) return false;

    const isClose = this.nearbyPubStore.isWithinCheckInRange(pubId);
    const hasntCheckedInToday = this.checkinStore.canCheckInToday(pubId);

    return isClose && hasntCheckedInToday;
  });

}
