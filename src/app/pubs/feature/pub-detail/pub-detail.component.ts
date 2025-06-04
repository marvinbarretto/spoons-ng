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
import { formatDate, formatTime, formatTimestamp } from '../../../shared/utils/timestamp.utils';

@Component({
  selector: 'app-pub-detail',
  imports: [CommonModule, RouterModule, ButtonComponent],
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

  // ✅ Dynamic reactive signals
  readonly currentLandlord = computed(() => {
    const pubId = this.pub()?.id;
    if (!pubId) return null;
    return this.landlordStore.getLandlordForPub(pubId);
  });

  readonly isUserLandlord = computed(() => {
    const userId = this.authStore.uid;
    const landlord = this.currentLandlord();
    return landlord?.userId === userId;
  });

  readonly canCheckIn = computed(() => {
    const pubId = this.pub()?.id;
    if (!pubId) return false;
    return this.nearbyPubStore.isWithinCheckInRange(pubId);
  });

  readonly userDistance = computed(() => {
    const pubId = this.pub()?.id;
    if (!pubId) return null;
    return this.nearbyPubStore.getDistanceToPub(pubId);
  });

  readonly isNearby = computed(() => {
    const distance = this.userDistance();
    return distance !== null && distance < 50; // 50m threshold
  });

  readonly checkInButtonText = computed(() => {
    if (this.loading()) return 'Loading...';
    if (this.isUserLandlord()) return '👑 You rule here!';
    if (this.canCheckIn()) return 'Check In & Claim Throne';
    if (this.userDistance()) {
      const distance = Math.round(this.userDistance()! / 1000 * 10) / 10; // Round to 1 decimal
      return `Too far (${distance}km away)`;
    }
    return 'Location unknown';
  });

  readonly canShowCheckInButton = computed(() => {
    return this.authStore.isAuthenticated() && this.pub();
  });

  readonly locationString = computed(() => {
    const pubValue = this.pub();
    if (!pubValue) return '';
    const { city, region, country } = pubValue;
    return [city, region, country].filter(Boolean).join(', ');
  });

  // ✅ Safe checkin history as computed signal
  readonly recentCheckins = computed(() => {
    const pubValue = this.pub();
    if (!pubValue?.checkinHistory) return [];

    // Handle the case where checkinHistory might be a number (causing the iterator error)
    if (typeof pubValue.checkinHistory === 'number') {
      console.warn('[PubDetail] checkinHistory is a number, expected array:', pubValue.checkinHistory);
      return [];
    }

    if (!Array.isArray(pubValue.checkinHistory)) {
      console.warn('[PubDetail] checkinHistory is not an array:', pubValue.checkinHistory);
      return [];
    }

    return pubValue.checkinHistory.slice(-5).reverse();
  });

  // ✅ Safe landlord history as computed signal
  readonly landlordHistory = computed(() => {
    const pubValue = this.pub();
    if (!pubValue?.landlordHistory) return [];

    // Handle the case where landlordHistory might be a number
    if (typeof pubValue.landlordHistory === 'number') {
      console.warn('[PubDetail] landlordHistory is a number, expected array:', pubValue.landlordHistory);
      return [];
    }

    if (!Array.isArray(pubValue.landlordHistory)) {
      console.warn('[PubDetail] landlordHistory is not an array:', pubValue.landlordHistory);
      return [];
    }

    return pubValue.landlordHistory;
  });

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
      // ✅ Load landlord data using LandlordStore.loadLandlordOnce
      await this.landlordStore.loadLandlordOnce(id);
      return;
    }

    await this.handleAsync(
      async () => {
        const found = await this.pubsService.getPubById(id).toPromise();
        this.pub.set(found ?? null);

        if (found) {
          // ✅ Load landlord data for the found pub
          await this.landlordStore.loadLandlordOnce(found.id);
        }

        return found;
      },
      { errorMessage: 'Failed to load pub details' }
    );
  }

  /**
   * ✅ Handle check-in action
   */
  async checkInToPub(): Promise<void> {
    const pubId = this.pub()?.id;
    if (!pubId) {
      this.showError('No pub selected');
      return;
    }

    if (!this.canCheckIn()) {
      this.showError('You must be within 50m of the pub to check in');
      return;
    }

    try {
      await this.checkinStore.checkinToPub(pubId);
      this.showSuccess('Check-in successful!');

      // ✅ Reload landlord data after check-in using LandlordStore
      await this.landlordStore.loadLandlordOnce(pubId);

    } catch (error: any) {
      this.showError(error?.message || 'Check-in failed');
    }
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
