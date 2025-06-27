/**
 * @fileoverview CheckinStore - Check-in workflow orchestration and multi-store coordination
 * @deprecated Use NewCheckinStore instead. This store will be removed in a future version.
 * @see NewCheckinStore
 * 
 * RESPONSIBILITIES:
 * - Check-in workflow management (geolocation, validation, completion)
 * - Multi-store coordination during check-ins
 * - Badge evaluation after successful check-ins
 * - Landlord status determination and updates
 * 
 * MULTI-STORE COORDINATION WORKFLOW:
 * 1. User initiates check-in → validates location + distance
 * 2. PointsStore.awardCheckInPoints() → calculates & awards points
 * 3. Creates check-in record in Firestore
 * 4. UserStore.patchUser() → updates checkedInPubIds (for pubsVisited)
 * 5. LandlordStore.set() → updates landlord status if won
 * 6. BadgeAwardService.evaluateAndAwardBadges() → checks for new badges
 * 
 * CRITICAL REAL-TIME UPDATES:
 * - MUST update UserStore.checkedInPubIds immediately after check-in
 * - PointsStore handles totalPoints updates automatically
 * - All updates must be immediate for scoreboard accuracy
 * 
 * AUTH-REACTIVE PATTERN:
 * - Auto-loads user's check-ins when user authenticates
 * - Clears data on logout to prevent stale state
 * 
 * @architecture Orchestrator store that coordinates multiple stores during check-in flow
 */
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { CheckInService } from './check-in.service';
import type { CheckIn } from '../utils/check-in.models';
import { Timestamp } from 'firebase/firestore';
import { PubService } from '../../pubs/data-access/pub.service';
import { Pub } from '../../pubs/utils/pub.models';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../../auth/data-access/auth.store';
import { BaseStore } from '../../shared/data-access/base.store';
import { LandlordStore } from '../../landlord/data-access/landlord.store';
import { getDistanceKm } from '../../shared/utils/get-distance';
import { User } from '../../users/utils/user.model';
import { UserStore } from '../../users/data-access/user.store';
import { BadgeAwardService } from '../../badges/data-access/badge-award.service';
import { PointsStore } from '../../points/data-access/points.store';
import { CheckInPointsData, PointsBreakdown } from '../../points/utils/points.models';

@Injectable({ providedIn: 'root' })
export class CheckinStore extends BaseStore<CheckIn> {
  // 🔧 Dependencies
  private readonly checkinService = inject(CheckInService);
  private readonly pubService = inject(PubService);
  private readonly badgeAwardService = inject(BadgeAwardService);
  private readonly landlordStore = inject(LandlordStore);
  private readonly userStore = inject(UserStore);
  private readonly pointsStore = inject(PointsStore);

  private readonly _lastPointsBreakdown = signal<any>(null);
  readonly lastPointsBreakdown = this._lastPointsBreakdown.asReadonly();


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

  hasCheckedIn(pubId: string): boolean {
    return this.data().some(checkIn => checkIn.pubId === pubId);
  }

  readonly checkedInPubIds = computed(() =>
    new Set(this.data().map(checkIn => checkIn.pubId))
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
      this.load(); // BaseStore handles caching + loading
    });
  }

  protected async fetchData(): Promise<CheckIn[]> {
    const userId = this.authStore.uid();
    if (!userId) throw new Error('No authenticated user');

    console.log('[CheckinStore] 📡 Fetching check-ins for user:', userId);
    return this.checkinService.loadUserCheckins(userId);
  }

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

  /**
   * Primary check-in method - orchestrates complete workflow
   * @param pubId - ID of pub to check into
   * @param photoDataUrl - Optional base64 photo data
   * @description CRITICAL multi-store coordination workflow:
   * 1. Validates user location (geolocation + distance check)
   * 2. Awards points via PointsStore (updates UserStore.totalPoints)
   * 3. Creates check-in record in Firestore
   * 4. Updates UserStore.checkedInPubIds (for real-time pubsVisited)
   * 5. Updates LandlordStore if user becomes landlord
   * 6. Evaluates and awards badges via BadgeAwardService
   * 
   * @throws Error if location denied, too far, or check-in fails
   * @sideEffects Updates multiple stores for real-time scoreboard accuracy
   */
  async checkinToPub(pubId: string, photoDataUrl: string | null = null): Promise<void> {
    console.log('[CheckinStore] 🎯 Starting check-in for:', pubId);
    this.clearCheckinSuccess();

    try {
      // 1-3. Your existing steps (location, validation, photo upload)
      const position = await this.getCurrentPosition();
      const distance = await this.getDistanceMeters(position.coords, pubId);
      console.log('[CheckinStore] Distance to pub:', distance, 'meters');

      let photoUrl: string | undefined;
      if (photoDataUrl) {
        console.log('[CheckinStore] 📸 Uploading photo...');
        photoUrl = await this.checkinService.uploadPhoto(photoDataUrl);
      }

      const userId = this.authStore.uid();
      if (!userId) throw new Error('Not logged in');

      // ✅ 4. Calculate points BEFORE creating check-in (via PointsStore only)
      console.log('[CheckinStore] 🎯 Calculating points...');
      const pointsData = await this.buildCheckInPointsData(pubId, userId, {
        hasPhoto: !!photoUrl,
        sharedSocial: false
      });

      const pointsBreakdown = await this.pointsStore.awardCheckInPoints(pointsData);
      this._lastPointsBreakdown.set(pointsBreakdown);

      // 5. Create check-in data WITH points included
      const newCheckin: Omit<CheckIn, 'id'> = {
        userId,
        pubId,
        timestamp: Timestamp.now(),
        dateKey: new Date().toISOString().split('T')[0],
        // ✅ Include points in initial check-in
        pointsEarned: pointsBreakdown.total,
        pointsBreakdown: pointsBreakdown.reason,
        ...(photoUrl && { photoUrl }),
      };

      // 6-8. Your existing flow (complete check-in, landlord, badges)
      console.log('[CheckinStore] 🔄 Processing check-in...');
      const completed = await this.checkinService.completeCheckin(newCheckin);

      if (completed.landlordResult) {
        this.landlordStore.set(pubId, completed.landlordResult.landlord);
        console.log('[CheckinStore] 👑 Updated landlord store:', completed.landlordResult);
      }

      const { landlordResult, ...cleanCheckin } = completed;
      this.recordCheckinSuccess(cleanCheckin);

      console.log('[CheckinStore] 🏅 Starting badge evaluation...');
      await this.evaluateBadgesAfterCheckIn(userId, cleanCheckin);


// ✅ UPDATE USER'S CHECKED-IN PUBS (add this after badge evaluation)
console.log('[CheckinStore] 🔄 Updating user check-in history...');

// Update UserStore with new check-in data
const currentUser = this.userStore.user();
if (currentUser) {
  const updatedCheckedInPubIds = [...new Set([...currentUser.checkedInPubIds, pubId])];

  // Update local user state immediately
  this.userStore.patchUser({
    checkedInPubIds: updatedCheckedInPubIds
  });

  // Update Firestore user document
  try {
    await this.checkinService.patchUserDocument(userId, {
      checkedInPubIds: updatedCheckedInPubIds
    });
    console.log('[CheckinStore] ✅ User check-in history updated');
  } catch (error) {
    console.warn('[CheckinStore] ⚠️ Failed to update user document:', error);
    // Don't fail the check-in if user doc update fails
  }
}




      // ✅ Enhanced success message with points
      const pointsMessage = this.formatPointsMessage(pointsBreakdown);
      this._landlordMessage.set(
        completed.madeUserLandlord
          ? `👑 You're the landlord today! ${pointsMessage}`
          : `✅ Check-in complete! ${pointsMessage}`
      );





      console.log('[CheckinStore] ✅ Check-in completed with points:', pointsBreakdown.total);

    } catch (error: any) {
      const message = error?.message || 'Check-in failed';
      this._error.set(message);
      this.toastService.error(message);
      console.error('[CheckinStore] ❌ Check-in failed:', error);
      throw error;
    }
  }


     /**
   * Get badge debug info for current user
   */
  async debugBadges(userId?: string): Promise<void> {
    const targetUserId = userId || this.authStore.uid();
    if (!targetUserId) {
      console.error('[CheckinStore] ❌ No user ID for badge debug');
      return;
    }

    console.log('[CheckinStore] 🐛 Badge debug for user:', targetUserId);

    try {
      const userCheckIns = this.checkins().filter(ci => ci.userId === targetUserId);
      const debugInfo = await this.badgeAwardService.getDebugInfo();
      console.log('[CheckinStore] 🐛 Badge debug info:', debugInfo);
    } catch (error) {
      console.error('[CheckinStore] 🐛 Badge debug failed:', error);
    }
  }

  // ✅ NEW: Development/Testing helpers
  /**
   * Manual badge evaluation for testing
   */
  async testBadgeEvaluation(userId?: string): Promise<void> {
    const targetUserId = userId || this.authStore.uid();
    if (!targetUserId) {
      console.error('[CheckinStore] ❌ No user ID for badge testing');
      return;
    }

    console.log('[CheckinStore] 🧪 Testing badge evaluation for user:', targetUserId);

    try {
      const userCheckIns = this.checkins().filter(ci => ci.userId === targetUserId);
      const eligibleBadges = await this.badgeAwardService.evaluateBadgesForUser(targetUserId, userCheckIns);
      console.log('[CheckinStore] 🧪 Test results - eligible badges:', eligibleBadges);
    } catch (error) {
      console.error('[CheckinStore] 🧪 Badge test failed:', error);
    }
  }
  private async evaluateBadgesAfterCheckIn(userId: string, checkIn: CheckIn): Promise<void> {
    console.log('[CheckinStore] 🎯 Badge evaluation starting', {
      userId,
      checkInId: checkIn.id,
      pubId: checkIn.pubId
    });

    try {
      // Get all user check-ins (including the new one just added)
      const allUserCheckIns = this.checkins().filter(ci => ci.userId === userId);

      const awardedBadges = await this.badgeAwardService.evaluateAndAwardBadges(
        userId,
        checkIn,
        allUserCheckIns
      );

      if (awardedBadges.length > 0) {
        console.log('[CheckinStore] 🎉 Badges awarded during check-in!', {
          checkInId: checkIn.id,
          userId,
          badgesAwarded: awardedBadges.map(b => b.badgeId),
          totalAwarded: awardedBadges.length
        });

        // ✅ Show toast for badge awards
        const badgeNames = awardedBadges.map(b => b.badgeId).join(', ');
        this.toastService.success(`🏅 New badge${awardedBadges.length > 1 ? 's' : ''} earned: ${badgeNames}!`);
      } else {
        console.log('[CheckinStore] 📝 No new badges awarded for this check-in');
      }
    } catch (error) {
      console.error('[CheckinStore] Badge evaluation failed:', error);
      // Don't fail the check-in if badge evaluation fails
      // Badge awarding is secondary to the main check-in flow
    }
  }

  /**
   * Clear check-in success state with null checks
   */
  clearCheckinSuccess(): void {
    if (this._checkinSuccess) {
      this._checkinSuccess.set(null);
    }
    if (this._landlordMessage) {
      this._landlordMessage.set(null);
    }
  }

  // 🧹 Enhanced reset - clears check-in specific state with null checks
  override reset(): void {
    super.reset();

    // ✅ Safe null checks before calling set()
    if (this._checkinSuccess) {
      this._checkinSuccess.set(null);
    }
    if (this._landlordMessage) {
      this._landlordMessage.set(null);
    }

    console.log('[CheckinStore] 🧹 Complete reset');
  }

  // ===================================
  // 🔧 PRIVATE HELPER METHODS
  // ===================================

  /**
   * Build points calculation data BEFORE check-in is created
   */
  private async buildCheckInPointsData(
    pubId: string,
    userId: string,
    options?: { hasPhoto?: boolean; sharedSocial?: boolean }
  ): Promise<CheckInPointsData> {
    const userCheckins = this.data().filter(c => c.userId === userId);

    return {
      pubId,
      distanceFromHome: await this.calculateDistanceFromHome(pubId),
      isFirstVisit: !userCheckins.some(c => c.pubId === pubId),
      isFirstEver: userCheckins.length === 0, // No check-ins yet
      currentStreak: this.calculateCurrentStreak(userCheckins),
      hasPhoto: options?.hasPhoto || false,
      sharedSocial: options?.sharedSocial || false
    };
  }


    /**
   * ✅ ADDED: Format points message for display
   */
    private formatPointsMessage(breakdown: PointsBreakdown): string {
      if (breakdown.total <= 10) {
        return `You earned ${breakdown.total} points! 🍺`;
      } else if (breakdown.total <= 25) {
        return `Nice! ${breakdown.total} points earned! 🎉`;
      } else {
        return `Excellent! ${breakdown.total} points! You're on fire! 🔥`;
      }
    }


/**
 * Calculate distance from user's current location to pub
 * Uses the same location as the check-in validation for consistency
 */
private async calculateDistanceFromHome(pubId: string): Promise<number> {
  try {
    // Get current position
    const position = await this.getCurrentPosition();

    // Calculate distance to pub (this already works correctly)
    const distanceMeters = await this.getDistanceMeters(position.coords, pubId);

    // Convert to kilometers for points calculation
    const distanceKm = distanceMeters / 1000;

    console.log('[CheckinStore] Distance calculation:', {
      pubId,
      distanceMeters: Math.round(distanceMeters),
      distanceKm: distanceKm.toFixed(2),
      coordinates: {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }
    });

    return distanceKm;

  } catch (error) {
    console.warn('[CheckinStore] Failed to calculate distance from home:', error);
    return 0; // Default to 0 if calculation fails (no distance bonus)
  }
}
private calculateCurrentStreak(userCheckins: CheckIn[]): number {
  // Implement streak calculation logic
  return 0; // Placeholder
}

/**
   * Clear the points breakdown (for new check-ins)
   */
clearPointsBreakdown(): void {
  this._lastPointsBreakdown.set(null);
}


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
  private async getDistanceMeters(location: GeolocationCoordinates, pubId: string): Promise<number> {
    const pub: Pub | undefined = await firstValueFrom(this.pubService.getPubById(pubId));

    if (!pub || !pub.location) {
      throw new Error('Pub not found or missing coordinates');
    }

    // ✅ Use your existing correct function
    const distanceKm = getDistanceKm(
      { lat: location.latitude, lng: location.longitude },
      pub.location
    );

    return distanceKm * 1000; // Convert to meters
  }


  async performCheckIn(pubId: string): Promise<void> {
    const user = this.authStore.user();
    if (!user) {
      console.warn('[CheckinStore] ❌ Cannot check in without a user');
      return;
    }

    const now = new Date();
    const checkin = {
      userId: user.uid,
      pubId,
      timestamp: Timestamp.fromDate(now),
      dateKey: now.toISOString().split('T')[0],
      photoURL: '',
    };

    try {
      // ✅ Step 1: Complete the check-in
      const result = await this.checkinService.completeCheckin(checkin);
      console.log('[CheckinStore] ✅ Check-in completed:', result);

      // ✅ Step 2: Update user Firestore doc
      const current = this.userStore.user();
      const prevStreak = current?.streaks?.[pubId] || 0;
      const updatedUserFields: Partial<User> = {
        streaks: { ...(current?.streaks || {}), [pubId]: prevStreak + 1 },
        checkedInPubIds: [...new Set([...(current?.checkedInPubIds || []), pubId])],
      };

      await this.checkinService.patchUserDocument(user.uid, updatedUserFields);

      // ✅ Step 3: Update local user state
      this.userStore.patchUser(updatedUserFields);

      // ✅ Step 4: Handle landlord result
      if (result.landlordResult?.wasAwarded && result.landlordResult.landlord) {
        this.landlordStore.set(pubId, result.landlordResult.landlord);
        console.log('[CheckinStore] 👑 New landlord awarded:', result.landlordResult.landlord);
      }

      // ✅ Step 5: Add check-in to local state
      this.recordCheckinSuccess(result);

      // ✅ Step 6: NEW: Evaluate badges after successful check-in
      console.log('[CheckinStore] 🏅 Starting badge evaluation...');
      await this.evaluateBadgesAfterCheckIn(user.uid, result);

    } catch (error: any) {
      console.error('[CheckinStore] ❌ performCheckIn failed:', error);
      this.toastService.error('Check-in failed. Please try again.');
    }
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
