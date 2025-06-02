// src/app/check-in/data-access/check-in.store.ts
import { computed, inject, Injectable, signal } from '@angular/core';
import { CheckInService } from './check-in.service';
import type { CheckIn } from '../util/check-in.model';
import { Timestamp } from 'firebase/firestore';
import { PubService } from '../../pubs/data-access/pub.service';
import { Pub } from '../../pubs/utils/pub.models';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../../auth/data-access/auth.store';
import { BaseStore } from '../../shared/data-access/base.store';

@Injectable({ providedIn: 'root' })
export class CheckinStore extends BaseStore<CheckIn> {
  // 🔧 Services
  private readonly checkinService = inject(CheckInService);
  private readonly pubService = inject(PubService);
  private readonly authStore = inject(AuthStore);

  // 📡 Main data - expose as clean name
  readonly checkins = this.data;

  // 📡 Additional check-in specific state
  private readonly _checkinSuccess = signal<CheckIn | null>(null);
  private readonly _landlordMessage = signal<string | null>(null);

  readonly checkinSuccess = this._checkinSuccess.asReadonly();
  readonly landlordMessage = this._landlordMessage.asReadonly();

  // 📡 Computed signals for derived state
  readonly userCheckins = computed(() =>
    this.checkins().map(c => c.pubId)
  );

  readonly landlordPubs = computed(() =>
    this.checkins().filter(c => c.madeUserLandlord).map(c => c.pubId)
  );

  readonly todayCheckins = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.checkins().filter(c => c.dateKey === today);
  });

  readonly totalCheckins = computed(() => this.checkins().length);

  /**
   * Load check-ins for specific user (CheckinStore-specific method)
   */
  async loadOnceForUser(userId: string): Promise<void> {
    if (this.hasLoaded) {
      console.log('[CheckinStore] ✅ Already loaded — skipping');
      return;
    }
    await this.loadForUser(userId);
  }

  /**
   * Load check-ins for specific user
   */
  async loadForUser(userId: string): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const checkins = await this.checkinService.loadUserCheckins(userId);
      this._data.set(checkins);
      this.hasLoaded = true;
      console.log(`[CheckinStore] ✅ Loaded ${checkins.length} check-ins for user ${userId}`);
    } catch (err: any) {
      const message = 'Failed to load check-ins';
      this._error.set(message);
      this.toastService.error(message);
      console.error('[CheckinStore] ❌ Error loading check-ins', err);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Record successful check-in
   */
  recordCheckinSuccess(newCheckin: CheckIn): void {
    const extended = {
      ...newCheckin,
      madeUserLandlord: newCheckin.madeUserLandlord ?? false
    };

    this.addItem(extended);
    this._checkinSuccess.set(extended);
  }

  /**
   * Perform check-in with full validation and error handling
   */
  async checkin(
    pubId: string,
    location: GeolocationCoordinates,
    photoDataUrl: string | null
  ): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      // Check for existing check-in
      const existing = await this.checkinService.getTodayCheckin(pubId);
      if (existing) {
        throw new Error('Already checked in today.');
      }

      // Validate distance
      const distance = await this.getDistanceMeters(location, pubId);
      // TODO: pull threshold from env
      // if (distance > 100) throw new Error('You are too far from this pub.');

      // Upload photo if provided
      let photoUrl: string | undefined;
      if (photoDataUrl) {
        photoUrl = await this.checkinService.uploadPhoto(photoDataUrl);
      }

      // Get current user
      const userId = this.authStore.uid;
      if (!userId) throw new Error('Not logged in.');

      // Create check-in
      const newCheckin: Omit<CheckIn, 'id'> = {
        userId,
        pubId,
        timestamp: Timestamp.now(),
        dateKey: new Date().toISOString().split('T')[0],
        ...(photoUrl && { photoUrl }), // Only include if exists
      };

      // Complete check-in
      const completed = await this.checkinService.completeCheckin(newCheckin);

      // Update state
      this._landlordMessage.set(
        completed.madeUserLandlord
          ? '👑 You\'re the landlord today!'
          : '✅ Check-in complete, but someone else is already landlord.'
      );

      this.recordCheckinSuccess(completed);
      this.toastService.success('Check-in successful!');
    } catch (error: any) {
      const message = error?.message || 'Check-in failed';
      this._error.set(message);
      this.toastService.error(message);
      console.error('[CheckinStore] ❌ Check-in failed:', error);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Check if user has checked into specific pub today
   */
  hasCheckedInToday(pubId: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return this.checkins().some(c => c.pubId === pubId && c.dateKey === today);
  }

  /**
   * Get latest checkin for a pub
   */
  getLatestCheckinForPub(pubId: string): CheckIn | null {
    const pubCheckins = this.checkins()
      .filter(c => c.pubId === pubId)
      .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());

    return pubCheckins[0] || null;
  }

  /**
   * Reset store and clear check-in specific state
   */
  override reset(): void {
    super.reset();
    this._checkinSuccess.set(null);
    this._landlordMessage.set(null);
  }

  /**
   * BaseStore implementation - not used since we override load()
   */
  protected async fetchData(): Promise<CheckIn[]> {
    throw new Error('Use loadForUser(userId) instead');
  }

  /**
   * Get distance to pub in meters
   */
  private async getDistanceMeters(
    location: GeolocationCoordinates,
    pubId: string
  ): Promise<number> {
    const pub: Pub | undefined = await firstValueFrom(
      this.pubService.getPubById(pubId)
    );

    if (!pub || !pub.location) {
      throw new Error('Pub not found or missing coordinates');
    }

    // Haversine distance calculation
    const earthRadius = 6371000; // Earth radius in meters
    const lat1Rad = location.latitude * Math.PI / 180;
    const lat2Rad = pub.location.lat * Math.PI / 180;
    const deltaLatRad = (pub.location.lat - location.latitude) * Math.PI / 180;
    const deltaLngRad = (pub.location.lng - location.longitude) * Math.PI / 180;
    const x = deltaLngRad * Math.cos((lat1Rad + lat2Rad) / 2);
    const y = deltaLatRad;
    return Math.sqrt(x * x + y * y) * earthRadius;
  }
}
