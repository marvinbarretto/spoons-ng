import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BaseWidgetComponent } from '../base/base-widget.component';
import { NearbyPubStore } from '../../pubs/data-access/nearby-pub.store';
import { DataAggregatorService } from '../../shared/data-access/data-aggregator.service';
import { LocationService } from '../../shared/data-access/location.service';
import { CommonModule } from '@angular/common';
import { PubCardComponent } from '../../pubs/ui/pub-card/pub-card.component';
import type { Pub } from '../../pubs/utils/pub.models';

@Component({
  selector: 'app-nearest-pub',
  imports: [CommonModule, PubCardComponent],
  template: `
    <div class="widget-container">
      @if (loading()) {
        <div class="widget-loading">
          <span class="loading-spinner"></span>
          <span>Finding nearby pubs...</span>
        </div>
      } @else if (error()) {
        <div class="widget-error">
          <span class="error-icon">⚠️</span>
          <span>{{ error() }}</span>
        </div>
      } @else if (!hasNearbyPubs()) {
        <div class="widget-empty">
          <span class="empty-icon">📍</span>
          <span>No pubs within 50km</span>
        </div>
      } @else {
        <div class="nearby-pubs">
          <h3 class="widget-title">Nearest Pubs</h3>
          @for (pub of nearbyPubsWithStatus(); track pub.id) {
            <app-pub-card
              [pub]="pub"
              [hasCheckedIn]="pub.hasVisited"
              [checkinCount]="pub.visitCount"
              [showCheckinCount]="pub.hasVisited"
              (cardClicked)="navigateToPub($event.id)"
            />
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .widget-container {
      padding: 1rem;
      background: var(--background-lighter);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      box-shadow: var(--shadow);
    }

    .widget-loading,
    .widget-error,
    .widget-empty {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 2rem;
      justify-content: center;
      color: var(--text-secondary);
    }

    .loading-spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid currentColor;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NearestPubComponent extends BaseWidgetComponent {
  // Direct store access for widget-specific location data
  private readonly nearbyPubStore = inject(NearbyPubStore);
  private readonly locationService = inject(LocationService);

  // DataAggregator for universal cross-store data
  private readonly dataAggregatorService = inject(DataAggregatorService);

  // Widget-specific reactive signals
  protected readonly nearbyPubs = this.nearbyPubStore.nearbyPubs;
  protected readonly hasNearbyPubs = this.nearbyPubStore.hasNearbyPubs;

  // Combine location data with visit status
  protected readonly nearbyPubsWithStatus = computed(() => {
    const pubs = this.nearbyPubStore.nearbyPubs();
    return pubs.map(pub => ({
      ...pub,
      hasVisited: this.dataAggregatorService.hasVisitedPub(pub.id),
      visitCount: this.dataAggregatorService.getVisitCountForPub(pub.id)
    }));
  });

  protected override onInit(): void {
    // Check for location errors from LocationService
    const locationLoading = this.locationService.loading();
    const hasLocation = this.nearbyPubStore.location();
    const locationError = this.locationService.error();
    
    if (!locationLoading && !hasLocation && locationError) {
      this.error.set(locationError);
    }
  }

  protected navigateToPub(pubId: string): void {
    this.router.navigate(['/pubs', pubId]);
  }
}
