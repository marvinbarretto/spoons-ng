// src/app/pubs/feature/pub-detail/pub-detail.component.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import type { Pub } from '../../utils/pub.models';
import { PubStore } from '../../data-access/pub.store';
import { PubService } from '../../data-access/pub.service';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { LandlordStore } from '../../../landlord/data-access/landlord.store';
import { NearbyPubStore } from '../../data-access/nearby-pub.store';
import { CheckinStore } from '../../../check-in/data-access/check-in.store';
import { BaseComponent } from '../../../shared/data-access/base.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { formatDate, formatTime, formatTimestamp, getRelativeTime } from '../../../shared/utils/timestamp.utils';
import { generateAnonymousName } from '../../../shared/utils/anonymous-names';

@Component({
  selector: 'app-pub-detail',
  imports: [CommonModule, RouterModule],
  templateUrl: './pub-detail.component.html',
  styleUrl: './pub-detail.component.scss',
})
export class PubDetailComponent extends BaseComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pubsService = inject(PubService);

  // ✅ Inject all required stores
  protected readonly pubStore = inject(PubStore);
  protected readonly authStore = inject(AuthStore);
  protected readonly landlordStore = inject(LandlordStore);
  protected readonly nearbyPubStore = inject(NearbyPubStore);
  protected readonly checkinStore = inject(CheckinStore);

  readonly pub = signal<Pub | null>(null);

  // ✅ Enhanced user display helpers
  readonly currentUser = this.authStore.user;

  // ✅ Dynamic reactive signals
  readonly currentLandlord = computed(() => {
    const pubId = this.pub()?.id;
    if (!pubId) return null;
    return this.landlordStore.getLandlordForPub(pubId);
  });

  readonly isUserLandlord = computed(() => {
    const userId = this.authStore.uid();
    const landlord = this.currentLandlord();
    return landlord?.userId === userId;
  });

  readonly userDistance = computed(() => {
    const pubId = this.pub()?.id;
    if (!pubId) return null;
    return this.nearbyPubStore.getDistanceToPub(pubId);
  });

  readonly isNearby = computed(() => {
    const distance = this.userDistance();
    return distance !== null && distance < 50000; // 50km threshold
  });

  readonly canCheckIn = computed(() => {
    const pubId = this.pub()?.id;
    if (!pubId) return false;
    return this.nearbyPubStore.isWithinCheckInRange(pubId);
  });

  readonly locationString = computed(() => {
    const pubValue = this.pub();
    if (!pubValue) return '';
    const { city, region, country } = pubValue;
    return [city, region, country].filter(Boolean).join(', ');
  });

  // ✅ Enhanced stats computed signals
  readonly pubStats = computed(() => {
    const pubValue = this.pub();
    if (!pubValue) return null;

    return {
      totalCheckins: pubValue.checkinCount || 0,
      lastVisit: pubValue.lastCheckinAt ? getRelativeTime(pubValue.lastCheckinAt) : 'Never',
      earliestCheckin: pubValue.recordEarlyCheckinAt ? formatTime(pubValue.recordEarlyCheckinAt) : null,
      latestCheckin: pubValue.recordLatestCheckinAt ? formatTime(pubValue.recordLatestCheckinAt) : null,
      longestStreak: pubValue.longestStreak || 0,
    };
  });

  // ✅ User's personal stats for this pub
  readonly userPubStats = computed(() => {
    const pubValue = this.pub();
    const userId = this.authStore.uid();
    if (!pubValue || !userId) return null;

    const userCheckins = this.checkinStore.checkins().filter(c => c.pubId === pubValue.id);
    const hasVisited = userCheckins.length > 0;
    const lastVisit = hasVisited ? userCheckins[userCheckins.length - 1] : null;
    const visitCount = userCheckins.length;

    return {
      hasVisited,
      visitCount,
      lastVisit: lastVisit ? getRelativeTime(lastVisit.timestamp) : null,
      canCheckInToday: this.checkinStore.canCheckInToday(pubValue.id),
    };
  });

  // ✅ Landlord insights
  readonly landlordInsights = computed(() => {
    const landlord = this.currentLandlord();
    const userId = this.authStore.uid();

    if (!landlord) {
      return {
        status: 'unclaimed',
        message: 'No one rules this pub today',
        subtitle: 'Be the first to claim the throne!',
        actionHint: this.canCheckIn() ? 'Check in to become landlord' : 'Get within range to claim it'
      };
    }

    if (landlord.userId === userId) {
      return {
        status: 'you',
        message: 'You are the landlord!',
        subtitle: `Since ${getRelativeTime(landlord.claimedAt)}`,
        actionHint: 'Your reign continues...'
      };
    }

    return {
      status: 'other',
      message: `${this.getUserDisplayName(landlord.userId)} rules here`,
      subtitle: `Claimed ${getRelativeTime(landlord.claimedAt)}`,
      actionHint: this.canCheckIn() ? 'Check in to challenge their rule!' : 'Get closer to stage a coup'
    };
  });

  // ✅ Safe checkin history with enhanced display
  readonly recentCheckins = computed(() => {
    const pubValue = this.pub();
    if (!pubValue?.checkinHistory || !Array.isArray(pubValue.checkinHistory)) {
      return [];
    }

    return pubValue.checkinHistory
      .slice(-10) // Show more recent checkins
      .reverse()
      .map(entry => ({
        ...entry,
        displayName: this.getUserDisplayName(entry.userId),
        relativeTime: getRelativeTime(entry.timestamp),
        isCurrentUser: entry.userId === this.authStore.uid()
      }));
  });

  // ✅ Nearby pubs discovery features
  readonly nearbyPubs = computed(() => {
    const currentPub = this.pub();
    const allPubs = this.pubStore.pubs();

    if (!currentPub || !allPubs.length) return [];

    // Calculate distances and sort by proximity
    const pubsWithDistance = allPubs
      .filter(pub => pub.id !== currentPub.id) // Exclude current pub
      .map(pub => {
        const distance = this.calculateDistance(
          currentPub.location,
          pub.location
        );
        return { ...pub, distance };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8); // Top 8 nearest

    return pubsWithDistance;
  });

  readonly unvisitedNearbyPubs = computed(() => {
    const visitedPubIds = new Set(
      this.checkinStore.checkins().map(c => c.pubId)
    );

    return this.nearbyPubs().filter(pub => !visitedPubIds.has(pub.id));
  });

  readonly visitedNearbyPubs = computed(() => {
    const visitedPubIds = new Set(
      this.checkinStore.checkins().map(c => c.pubId)
    );

    return this.nearbyPubs().filter(pub => visitedPubIds.has(pub.id));
  });

  // ✅ Safe landlord history with enhanced display
  readonly landlordHistory = computed(() => {
    const pubValue = this.pub();
    if (!pubValue?.landlordHistory || !Array.isArray(pubValue.landlordHistory)) {
      return [];
    }

    return pubValue.landlordHistory
      .slice(-5) // Last 5 landlords
      .reverse()
      .map(entry => ({
        ...entry,
        displayName: this.getUserDisplayName(entry.userId),
        relativeTime: getRelativeTime(entry.claimedAt),
        isCurrentUser: entry.userId === this.authStore.uid()
      }));
  });




  // In PubDetailComponent class, add this after your existing computed signals:

  readonly debugInfo = computed(() => {
    const pubValue = this.pub();
    const userId = this.authStore.uid();
    const user = this.authStore.user();

    return {
      // ... existing debug info ...
      authReady: this.authStore.ready(),
      userExists: !!user,
      userIsAnonymous: user?.isAnonymous,
      checkinStoreLoading: this.checkinStore.loading(),
      checkinStoreHasLoaded: this.checkinStore.hasData(), // If this method exists
    };
  });



  /**
   * ✅ Calculate distance between two points using Haversine formula
   */
  private calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  protected override onInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/pubs']);
      return;
    }

    this.loadPub(id);
  }

  private async loadPub(id: string): Promise<void> {
    const local = this.pubStore.pubs().find(p => p.id === id);
    if (local) {
      this.pub.set(local);
      await this.landlordStore.loadLandlordOnce(id);
      return;
    }

    await this.handleAsync(
      async () => {
        const found = await this.pubsService.getPubById(id).toPromise();
        this.pub.set(found ?? null);

        if (found) {
          await this.landlordStore.loadLandlordOnce(found.id);
        }

        return found;
      },
      { errorMessage: 'Failed to load pub details' }
    );
  }

  /**
   * ✅ Get user-friendly display name with pub-themed anonymous names
   */
  private getUserDisplayName(userId: string): string {
    // Check if it's the current user
    const currentUser = this.currentUser();
    if (currentUser?.uid === userId) {
      if (currentUser.isAnonymous) {
        return `${generateAnonymousName(userId)} (You)`;
      }
      return `${currentUser.displayName || currentUser.email || 'You'} (You)`;
    }

    // For other users, assume anonymous and generate pub name
    // In a real app, you'd fetch user data or have it cached
    return generateAnonymousName(userId);
  }

  // ✅ Safe timestamp formatting methods
  formatDate(timestamp: unknown): string {
    return formatDate(timestamp);
  }

  formatTime(timestamp: unknown): string {
    return formatTime(timestamp);
  }

  formatTimestamp(timestamp: unknown): string {
    return formatTimestamp(timestamp);
  }
}
