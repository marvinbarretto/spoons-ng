// src/app/features/home/ui/nearby-pub-list/nearby-pub-list.component.ts
import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import type { CheckIn } from '@check-in/utils/check-in.model';
import type { Pub } from '@pubs/utils/pub.models';

type NearbyPub = {
  id: string;
  name: string;
  distance: number; // in meters
  address?: string;
  postcode?: string;
};

@Component({
  selector: 'app-nearby-pub-list',
  imports: [],
  template: `
    <section class="nearby-pubs">
      <h2>📍 Nearby Pubs ({{ pubs().length }})</h2>

      @if (pubs().length === 0) {
        <div class="empty-state">
          <p>🔍 No pubs found nearby</p>
          <small>Try moving to a different location</small>
        </div>
      } @else {
        <ul class="pub-list">
          @for (pub of pubsWithStatus(); track pub.id) {
            <li class="pub-item" [class.visited-today]="pub.visitedToday">
              <div class="pub-info">
                <h4 class="pub-name">{{ pub.name }}</h4>
                <div class="pub-details">
                  <span class="distance">{{ pub.distanceText }}</span>
                  @if (pub.address) {
                    <span class="address">{{ pub.address }}</span>
                  }
                </div>
              </div>

              <div class="pub-status">
                @if (pub.visitedToday) {
                  <span class="visited-badge">✅ Visited today</span>
                } @else if (pub.canCheckIn) {
                  <span class="can-check-in-badge">📍 Can check in</span>
                } @else {
                  <span class="distance-badge">{{ pub.distanceText }}</span>
                }
              </div>
            </li>
          }
        </ul>

        @if (showingLimitedResults()) {
          <div class="results-footer">
            <small>Showing closest {{ pubs().length }} pubs</small>
          </div>
        }
      }
    </section>
  `,
  styles: `
    .nearby-pubs {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      border: 1px solid #e9ecef;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
    }

    .nearby-pubs h2 {
      margin: 0 0 1.25rem 0;
      color: #333;
      font-size: 1.3rem;
      font-weight: 600;
    }

    .empty-state {
      text-align: center;
      padding: 2rem 1rem;
      color: #6c757d;
      background: #f8f9fa;
      border-radius: 8px;
      border: 2px dashed #dee2e6;
    }

    .empty-state p {
      margin: 0 0 0.5rem 0;
      font-size: 1.1rem;
    }

    .empty-state small {
      color: #adb5bd;
    }

    .pub-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .pub-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 0;
      border-bottom: 1px solid #f1f3f4;
      transition: background-color 0.2s ease;
    }

    .pub-item:last-child {
      border-bottom: none;
    }

    .pub-item:hover {
      background: rgba(0, 123, 255, 0.02);
      border-radius: 6px;
      margin: 0 -0.5rem;
      padding: 1rem 0.5rem;
    }

    .pub-item.visited-today {
      background: rgba(40, 167, 69, 0.05);
      border-radius: 6px;
      margin: 0 -0.5rem;
      padding: 1rem 0.5rem;
    }

    .pub-info {
      flex: 1;
      min-width: 0; /* Allow text truncation */
    }

    .pub-name {
      margin: 0 0 0.25rem 0;
      color: #333;
      font-size: 1.05rem;
      font-weight: 600;
      line-height: 1.3;
    }

    .pub-details {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .distance {
      color: #007bff;
      font-weight: 500;
      font-size: 0.9rem;
    }

    .address {
      color: #6c757d;
      font-size: 0.85rem;
      line-height: 1.3;
    }

    .pub-status {
      flex-shrink: 0;
      margin-left: 1rem;
    }

    .visited-badge {
      background: #d4edda;
      color: #155724;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      border: 1px solid #c3e6cb;
    }

    .can-check-in-badge {
      background: #fff3cd;
      color: #856404;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      border: 1px solid #ffeaa7;
    }

    .distance-badge {
      color: #6c757d;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .results-footer {
      text-align: center;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #f1f3f4;
      color: #6c757d;
    }

    /* Mobile responsive */
    @media (max-width: 480px) {
      .nearby-pubs {
        padding: 1.25rem;
      }

      .pub-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }

      .pub-status {
        margin-left: 0;
        align-self: flex-end;
      }

      .pub-details {
        flex-direction: row;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .address {
        flex: 1;
        min-width: 100%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NearbyPubListComponent {
  // ✅ Properly typed inputs
  readonly pubs = input.required<NearbyPub[]>();
  readonly userCheckins = input.required<CheckIn[]>();

  /**
   * Computed signal that adds status information to each pub
   */
  readonly pubsWithStatus = computed(() => {
    const pubs = this.pubs();
    const checkins = this.userCheckins();

    // Create a set of pub IDs that were visited today for fast lookup
    const visitedTodayPubIds = new Set(checkins.map(c => c.pubId));

    return pubs.map(pub => ({
      ...pub,
      distanceText: this.formatDistance(pub.distance),
      visitedToday: visitedTodayPubIds.has(pub.id),
      canCheckIn: this.isWithinCheckInRange(pub.distance), // 500m typical range
    }));
  });

  /**
   * Whether we're showing a limited number of results
   */
  readonly showingLimitedResults = computed(() => {
    // Assume we limit to top 10 or similar
    return this.pubs().length >= 10;
  });

  /**
   * Format distance for display
   */
  private formatDistance(distanceInMeters: number): string {
    if (distanceInMeters < 1000) {
      return `${Math.round(distanceInMeters)}m away`;
    } else {
      return `${(distanceInMeters / 1000).toFixed(1)}km away`;
    }
  }

  /**
   * Check if distance is within check-in range
   */
  private isWithinCheckInRange(distanceInMeters: number): boolean {
    // TODO: This should probably come from a configuration store
    const CHECK_IN_RANGE_METERS = 500;
    return distanceInMeters <= CHECK_IN_RANGE_METERS;
  }
}
