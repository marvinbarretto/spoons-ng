// src/app/check-in/data-access/check-in.store.ts
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { CheckInService } from './check-in.service';
import type { CheckIn } from '../util/check-in.model';
import { Timestamp } from 'firebase/firestore';
import { PubService } from '../../pubs/data-access/pub.service';
import { Pub } from '../../pubs/utils/pub.models';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../../auth/data-access/auth.store';
import { BaseStore } from '../../shared/data-access/base.store';
import { LandlordStore } from '../../landlord/data-access/landlord.store';

@Injectable({ providedIn: 'root' })
export class CheckinStore extends BaseStore<CheckIn> {
  // 🔧 Dependencies
  private readonly checkinService = inject(CheckInService);
  private readonly pubService = inject(PubService);
  private readonly authStore = inject(AuthStore);
  private readonly landlordStore = inject(LandlordStore);

  // 🔒 Auth-reactive state
  private lastLoadedUserId: string | null = null;

  // 📡 Additional check-in specific state
  private readonly _checkinSuccess = signal<CheckIn | null>(null);
  private readonly _landlordMessage = signal<string | null>(null);

  readonly checkinSuccess = this._checkinSuccess.asReadonly();
  readonly landlordMessage = this._landlordMessage.asReadonly();

  // 📡 Main data - expose with clean name
  readonly checkins = this.data;

  // 📊 Computed signals for derived state
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

  constructor() {
    super();
    console.log('[CheckinStore] ✅ Initialized');

    // 🎬 Auth-Reactive Pattern: Auto-load when user changes
    effect(() => {
      const user = this.authStore.user();

      console.log('[CheckinStore] Auth state changed:', {
        userId: user?.uid,
        isAnonymous: user?.isAnonymous,
        lastLoaded: this.lastLoadedUserId
      });

      // 🛡️ GUARD: Handle logout
      if (!user) {
        console.log('[CheckinStore] Clearing data (logout/anonymous)');
        this.reset();
        this.lastLoadedUserId = null;
        return;
      }

      // 🔄 DEDUPLICATION: Don't reload same user
      if (user.uid === this.lastLoadedUserId) {
        console.log('[CheckinStore] Same user, skipping reload');
        return;
      }

      // 🚀 LOAD: New authenticated user detected
      console.log('[CheckinStore] Loading check-ins for new user:', user.uid);
      this.lastLoadedUserId = user.uid;
      this.loadOnce(); // BaseStore handles caching + loading
    });
  }

  // ✅ BaseStore implementation - called by loadOnce()
  protected async fetchData(): Promise<CheckIn[]> {
    const userId = this.authStore.uid();
    if (!userId) throw new Error('No authenticated user');

    console.log('[CheckinStore] 📡 Fetching check-ins for user:', userId);
    return this.checkinService.loadUserCheckins(userId);
  }

  // 🎯 Public API - Query Methods

  canCheckInToday(pubId: string | null): boolean {
    if (!pubId) return false;

    const today = new Date().toISOString().split('T')[0];
    const existingCheckin = this.checkins().find(
      c => c.pubId === pubId && c.dateKey === today
    );

    return !existingCheckin;
  }

  hasCheckedInToday(pubId: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return this.checkins().some(c => c.pubId === pubId && c.dateKey === today);
  }

  getLatestCheckinForPub(pubId: string): CheckIn | null {
    const pubCheckins = this.checkins()
      .filter(c => c.pubId === pubId)
      .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());

    return pubCheckins[0] || null;
  }

  // 🎬 Public API - Action Methods

  /**
   * ✅ PRIMARY CHECK-IN METHOD
   * Handles geolocation, validation, and check-in process automatically
   */
  async checkinToPub(pubId: string, photoDataUrl: string | null = null): Promise<void> {
    console.log('[CheckinStore] 🎯 Starting check-in for:', pubId);
    this.clearCheckinSuccess();

    try {
      // 1. Get user location
      const position = await this.getCurrentPosition();

      // 2. Validate distance
      const distance = await this.getDistanceMeters(position.coords, pubId);
      console.log('[CheckinStore] Distance to pub:', distance, 'meters');

      // 3. Upload photo if provided
      let photoUrl: string | undefined;
      if (photoDataUrl) {
        console.log('[CheckinStore] 📸 Uploading photo...');
        photoUrl = await this.checkinService.uploadPhoto(photoDataUrl);
      }

      // 4. Get current user
      const userId = this.authStore.uid();
      if (!userId) throw new Error('Not logged in');

      // 5. Create check-in data
      const newCheckin: Omit<CheckIn, 'id'> = {
        userId,
        pubId,
        timestamp: Timestamp.now(),
        dateKey: new Date().toISOString().split('T')[0],
        ...(photoUrl && { photoUrl }),
      };

      // 6. Complete check-in (handles landlord logic)
      console.log('[CheckinStore] 🔄 Processing check-in...');
      const completed = await this.checkinService.completeCheckin(newCheckin);

      // 7. Update landlord store if landlord was awarded
      if (completed.landlordResult) {
        this.landlordStore.setTodayLandlord(pubId, completed.landlordResult.landlord);
        console.log('[CheckinStore] 👑 Updated landlord store:', completed.landlordResult);
      }

      // 8. Set success message
      this._landlordMessage.set(
        completed.madeUserLandlord
          ? '👑 You\'re the landlord today!'
          : '✅ Check-in complete!'
      );

      // 9. Record success (remove landlordResult before storing)
      const { landlordResult, ...cleanCheckin } = completed;
      this.recordCheckinSuccess(cleanCheckin);
      this.toastService.success('Check-in successful!');

      console.log('[CheckinStore] ✅ Check-in completed successfully');

    } catch (error: any) {
      const message = error?.message || 'Check-in failed';
      this._error.set(message);
      this.toastService.error(message);
      console.error('[CheckinStore] ❌ Check-in failed:', error);
      throw error; // Re-throw for component handling
    }
  }

  /**
   * Clear check-in success state
   */
  clearCheckinSuccess(): void {
    this._checkinSuccess.set(null);
    this._landlordMessage.set(null);
  }

  // 🧹 Enhanced reset - clears check-in specific state
  override reset(): void {
    super.reset();
    this._checkinSuccess.set(null);
    this._landlordMessage.set(null);
    console.log('[CheckinStore] 🧹 Complete reset');
  }

  // 🔧 Private Helper Methods

  /**
   * Get current position with proper error handling
   */
  private getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('[CheckinStore] 📍 Location acquired');
          resolve(position);
        },
        (error) => {
          const message = this.getLocationErrorMessage(error);
          console.error('[CheckinStore] 📍 Location error:', message);
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      );
    });
  }

  /**
   * Get user-friendly location error messages
   */
  private getLocationErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location access denied. Please enable location services.';
      case error.POSITION_UNAVAILABLE:
        return 'Location information unavailable.';
      case error.TIMEOUT:
        return 'Location request timed out. Please try again.';
      default:
        return 'Failed to get your location.';
    }
  }

  /**
   * Calculate distance to pub in meters
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

  /**
   * Record successful check-in
   */
  private recordCheckinSuccess(newCheckin: CheckIn): void {
    const extended = {
      ...newCheckin,
      madeUserLandlord: newCheckin.madeUserLandlord ?? false
    };

    this.addItem(extended); // BaseStore method to add to collection
    this._checkinSuccess.set(extended);
  }
}
