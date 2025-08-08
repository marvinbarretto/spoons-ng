import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CheckInStore } from '../../check-in/data-access/check-in.store';
import { NearbyPubStore } from '../../pubs/data-access/nearby-pub.store';
import { AbstractLocationService } from '../../shared/data-access/abstract-location.service';
import { DataAggregatorService } from '../../shared/data-access/data-aggregator.service';
import { UserStore } from '../../users/data-access/user.store';
import { BaseWidgetComponent } from '../base/base-widget.component';

import { EmptyStateComponent, LoadingStateComponent } from '@fourfold/angular-foundation';
import { PubCardComponent } from '../../pubs/ui/pub-card/pub-card.component';
import { LocationStateComponent } from '../../shared/ui/location-state/location-state.component';

@Component({
  selector: 'app-nearest-pub',
  imports: [PubCardComponent, LoadingStateComponent, EmptyStateComponent, LocationStateComponent],
  template: `
    <div class="widget-container">
      @if (loading()) {
        <ff-loading-state text="Finding nearby pubs..." />
      } @else if (shouldShowLocationError()) {
        <app-location-state [message]="getLocationMessage()" (retry)="requestLocation()" />
      } @else if (!hasNearbyPubs()) {
        <ff-empty-state
          icon="📍"
          title="No pubs found nearby"
          subtitle="Try adjusting your location or search criteria"
        />
      } @else {
        <div class="nearby-pubs">
          <h3 class="widget-title">Nearest Pubs</h3>
          @for (pub of nearbyPubsWithStatus(); track pub.id) {
            <app-pub-card
              [pub]="pub"
              [hasCheckedIn]="pub.hasVisited"
              [hasVerifiedVisit]="hasVerifiedCheckIn(pub.id)"
              [hasUnverifiedVisit]="hasUnverifiedVisit(pub.id)"
              [checkinCount]="pub.visitCount"
              [showCheckinCount]="pub.hasVisited"
              [isLocalPub]="dataAggregatorService.isLocalPub(pub.id)"
              (cardClicked)="navigateToPub($event.id)"
            />
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .widget-container {
        padding: 1rem;
        background: var(--background-lighter);
        color: var(--text);
        border: 1px solid var(--border);
        border-radius: 0.5rem;
        box-shadow: var(--shadow);
      }

      .widget-title {
        margin: 0 0 1rem 0;
        font-size: 1.125rem;
        font-weight: 600;
      }

      .nearby-pubs {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NearestPubComponent extends BaseWidgetComponent {
  // Direct store access for widget-specific location data
  private readonly nearbyPubStore = inject(NearbyPubStore);
  private readonly locationService = inject(AbstractLocationService);
  private readonly userStore = inject(UserStore);
  private readonly checkinStore = inject(CheckInStore);

  // DataAggregator for universal cross-store data
  protected readonly dataAggregatorService = inject(DataAggregatorService);

  // Widget-specific reactive signals
  protected readonly nearbyPubs = this.nearbyPubStore.nearbyPubs;
  protected readonly hasNearbyPubs = this.nearbyPubStore.hasNearbyPubs;

  // Combine location data with visit status
  protected readonly nearbyPubsWithStatus = computed(() => {
    const pubs = this.nearbyPubStore.nearbyPubs();
    return pubs.map(pub => ({
      ...pub,
      hasVisited: this.dataAggregatorService.hasVisitedPub(pub.id),
      visitCount: this.dataAggregatorService.getVisitCountForPub(pub.id),
    }));
  });

  protected override onInit(): void {
    // Check for location errors from LocationService
    const locationLoading = this.locationService.loading();
    const hasLocation = this.nearbyPubStore.location();
    const locationError = this.locationService.error();

    console.log('[NearestPubComponent] 📍 Location status:', {
      loading: locationLoading,
      hasLocation: !!hasLocation,
      error: locationError,
      nearbyPubsCount: this.nearbyPubs().length,
    });

    if (!locationLoading && !hasLocation && locationError) {
      this.error.set(locationError);
    }
  }

  protected shouldShowLocationError(): boolean {
    const hasLocation = this.nearbyPubStore.location();
    const locationError = this.locationService.error();
    // Show location state if we don't have location, regardless of error state
    return !hasLocation;
  }

  protected getLocationMessage(): string {
    return 'We need your location to find nearby pubs. Please enable location services and try again.';
  }

  protected navigateToPub(pubId: string): void {
    this.router.navigate(['/pubs', pubId]);
  }

  protected requestLocation(): void {
    console.log(
      '[NearestPubComponent] 📍 User clicked "Grant Location Access" - requesting location...'
    );
    this.error.set(null);
    this.locationService.getCurrentLocation().catch(error => {
      console.error('[NearestPubComponent] Location request failed:', error);
      this.error.set(error.message || 'Failed to get location');
    });
  }

  // Visit status helpers (same pattern as pub-list component)
  protected hasVerifiedCheckIn(pubId: string): boolean {
    return this.checkinStore.hasCheckedIn(pubId);
  }

  protected hasUnverifiedVisit(pubId: string): boolean {
    return this.userStore.hasVisitedPub(pubId);
  }
}
