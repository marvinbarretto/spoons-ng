// src/app/home/feature/home/home.component.ts
import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NearbyPubStore } from '../../../pubs/data-access/nearby-pub.store';
import { CheckinStore } from '../../../check-in/data-access/check-in.store';
import { CheckInHomepageWidgetComponent } from '../../../check-in/ui/check-in-homepage-widget/check-in-homepage-widget.component';
import { UserBadgesComponent } from '../../../badges/ui/user-badges/user-badges.component';
import { BadgeStore } from '../../../badges/data-access/badge.store';
import { BaseComponent } from '../../../shared/data-access/base.component';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { toDate, isToday } from '../../../shared/utils/timestamp.utils';
import { PubProgressHeroComponent } from '../../../home/ui/pub-progress-hero/pub-progress-hero.component';

@Component({
  selector: 'app-home',
  imports: [CommonModule, CheckInHomepageWidgetComponent, UserBadgesComponent, PubProgressHeroComponent],
  templateUrl: './home.component.html',
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
export class HomeComponent extends BaseComponent {
  private readonly nearbyPubStore = inject(NearbyPubStore);
  protected readonly checkinStore = inject(CheckinStore);
  private readonly pubStore = inject(PubStore);
  protected readonly badgeStore = inject(BadgeStore);

  // ✅ Location & nearby pubs
  readonly location = this.nearbyPubStore.location;
  readonly allPubs = this.nearbyPubStore.allPubs;
  readonly nearestPubs = this.nearbyPubStore.nearbyPubs;
  readonly closestPub = this.nearbyPubStore.closestPub;

  // ✅ Static total (will be configurable later)
  // TODO: get this from our total
  readonly totalPubs = signal(800);

  /**
   * Count of unique pubs the user has visited
   * @returns Number of unique pubs checked into
   */
  readonly visitedPubsCount = computed(() => {
    const checkins = this.checkinStore.checkins();
    if (!checkins.length) return 0;

    const uniquePubIds = new Set(checkins.map(c => c.pubId));
    return uniquePubIds.size;
  });

  /**
   * Progress percentage towards visiting all pubs
   * @returns Percentage (0-100) of pubs visited
   */
  readonly progressPercentage = computed(() => {
    const visited = this.visitedPubsCount();
    const total = this.totalPubs();

    if (total === 0) return 0;
    return Math.round((visited / total) * 100);
  });

  /**
   * Check if user can check in to closest pub today
   * @returns Whether check-in is allowed
   */
  readonly userCanCheckIn = computed(() => {
    const pubId = this.closestPub()?.id ?? null;
    if (!pubId) return false;

    const isClose = this.nearbyPubStore.isWithinCheckInRange(pubId);
    const hasntCheckedInToday = this.checkinStore.canCheckInToday(pubId);

    return isClose && hasntCheckedInToday;
  });

  /**
   * Whether we have enough data to show meaningful stats
   * @returns True if user has checked in to any pubs
   */
  readonly hasProgressData = computed(() => this.visitedPubsCount() > 0);

  /**
   * Loading state - true if any critical data is still loading
   * @returns Whether we're still loading essential data
   */
  readonly isLoading = computed(() =>
    this.pubStore.loading() || this.checkinStore.loading()
  );
}
