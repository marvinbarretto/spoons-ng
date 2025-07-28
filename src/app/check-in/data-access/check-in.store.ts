// =====================================
// 🎯 checkin SUCCESS FLOW
// =====================================

// src/app/check-in/data-access/check-in.store.ts
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { BadgeAwardService } from '../../badges/data-access/badge-award.service';
import { CarpetStrategyService } from '../../carpets/data-access/carpet-strategy.service';
import { LandlordStore } from '../../landlord/data-access/landlord.store';
import { PointsStore } from '../../points/data-access/points.store';
import { PubStore } from '../../pubs/data-access/pub.store';
import { UserStore } from '../../users/data-access/user.store';
import { CheckInService } from './check-in.service';
// Remove CheckInModalService import to break circular dependency
import {
  CameraService,
  OverlayService,
  TelegramNotificationService,
} from '@fourfold/angular-foundation';
import { Timestamp } from 'firebase/firestore';
import { environment } from '../../../environments/environment';
import type { EarnedBadgeWithDetails } from '../../badges/utils/badge.model';
import type { Pub } from '../../pubs/utils/pub.models';
import { BaseStore } from '../../shared/base/base.store';
import { CacheCoherenceService } from '../../shared/data-access/cache-coherence.service';
import { ErrorLoggingService } from '../../shared/data-access/error-logging.service';
import { getDistanceKm } from '../../shared/utils/location.utils';
import type { User } from '../../users/utils/user.model';
import type { CheckIn } from '../utils/check-in.models';

@Injectable({ providedIn: 'root' })
export class CheckInStore extends BaseStore<CheckIn> {
  protected readonly newCheckInService = inject(CheckInService);
  protected readonly overlayService = inject(OverlayService);
  protected readonly pubStore = inject(PubStore);
  protected readonly pointsStore = inject(PointsStore);
  protected readonly userStore = inject(UserStore);
  protected readonly badgeAwardService = inject(BadgeAwardService);
  protected readonly landlordStore = inject(LandlordStore);
  protected readonly carpetStrategy = inject(CarpetStrategyService);
  // Modal service removed to break circular dependency - use event-based approach
  protected readonly cameraService = inject(CameraService);
  protected readonly telegramNotificationService = inject(TelegramNotificationService);
  private readonly cacheCoherence = inject(CacheCoherenceService);
  protected readonly errorLoggingService = inject(ErrorLoggingService);

  // Check-in process state
  private readonly _isProcessing = signal(false);
  private readonly _carpetDetectionEnabled = signal(true);
  private readonly _needsCarpetScan = signal<string | null>(null);

  // Check-in success state
  private readonly _checkinSuccess = signal<CheckIn | null>(null);
  private readonly _landlordMessage = signal<string | null>(null);
  private readonly _checkinResults = signal<any | null>(null);

  // Auth-reactive state
  private lastLoadedUserId: string | null = null;

  // Public readonly signals
  readonly isProcessing = this._isProcessing.asReadonly();
  readonly carpetDetectionEnabled = this._carpetDetectionEnabled.asReadonly();
  readonly needsCarpetScan = this._needsCarpetScan.asReadonly();
  readonly checkinResults = this._checkinResults.asReadonly();
  readonly checkinSuccess = this._checkinSuccess.asReadonly();
  readonly landlordMessage = this._landlordMessage.asReadonly();

  // Main data - expose with clean name
  readonly checkins = this.data;

  // Computed signals for derived state
  readonly userCheckins = computed(() => this.checkins().map(c => c.pubId));

  readonly checkedInPubIds = computed(() => new Set(this.data().map(checkIn => checkIn.pubId)));

  readonly landlordPubs = computed(() =>
    this.checkins()
      .filter(c => c.madeUserLandlord)
      .map(c => c.pubId)
  );

  readonly todayCheckins = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.checkins().filter(c => c.dateKey === today);
  });

  readonly totalCheckins = computed(() => this.checkins().length);

  readonly totalPubsCount = computed(() => {
    const userId = this.authStore.uid();
    if (!userId) return 0;
    const userCheckins = this.checkins().filter(c => c.userId === userId);
    const uniquePubIds = new Set(userCheckins.map(c => c.pubId));
    return uniquePubIds.size;
  });

  constructor() {
    super();
    console.log('[CheckInStore] ✅ Initialized');

    // Auth-Reactive Pattern: Auto-load when user changes
    effect(() => {
      const user = this.authStore.user();
      const currentUserSlice = user?.uid?.slice(0, 8) || 'none';
      const lastUserSlice = this.lastLoadedUserId?.slice(0, 8) || 'none';

      console.log(`🔄 [CheckInStore] Auth state change: ${lastUserSlice} → ${currentUserSlice}`);

      // Handle logout
      if (!user) {
        console.log('🔄 [CheckInStore] User logged out, clearing all cached check-ins');
        this.reset();
        this.lastLoadedUserId = null;
        return;
      }

      // 🔍 Cache check for existing user
      if (user.uid === this.lastLoadedUserId) {
        console.log(
          `✅ [CheckInStore] Cache HIT - Using cached check-ins (${this.totalCheckins()} items) for user: ${currentUserSlice}`
        );
        return;
      }

      // 📡 Cache miss: New authenticated user detected
      console.log(
        `📡 [CheckInStore] Cache MISS - Fetching check-ins from Firebase for new user: ${currentUserSlice}`
      );
      this.lastLoadedUserId = user.uid;
      this.load();
    });
  }

  protected async fetchData(): Promise<CheckIn[]> {
    const userId = this.authStore.uid();
    if (!userId) throw new Error('No authenticated user');

    console.log(
      `📡 [CheckInStore] Starting Firebase fetch for user check-ins: ${userId.slice(0, 8)}`
    );

    const checkins = await this.newCheckInService.loadUserCheckins(userId);

    console.log(
      `✅ [CheckInStore] Firebase data loaded successfully: ${checkins.length} check-ins cached`
    );
    console.log(`├─ Unique pubs visited: ${new Set(checkins.map(c => c.pubId)).size}`);
    console.log(
      `└─ Most recent check-in: ${checkins[0]?.timestamp?.toDate().toISOString() || 'none'}`
    );

    return checkins;
  }

  // Utility methods
  hasCheckedIn(pubId: string): boolean {
    return this.data().some(checkIn => checkIn.pubId === pubId);
  }

  canCheckInToday(pubId: string | null): boolean {
    if (!pubId) return false;
    const today = new Date().toISOString().split('T')[0];
    const existingCheckin = this.checkins().find(c => c.pubId === pubId && c.dateKey === today);
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
   * Check in to a pub with optional carpet detection
   *
   * @param pubId - The pub to check into
   * @returns Promise<void>
   */
  async checkinToPub(pubId: string, carpetResult?: any): Promise<void> {
    console.log('[CheckInStore] 🚀 checkinToPub() called with pubId:', pubId);
    console.log('[CheckInStore] 🚀 Carpet result passed:', carpetResult);

    if (this._isProcessing()) {
      console.log('[CheckInStore] ⚠️ Already processing a check-in, ignoring');
      return;
    }

    this._isProcessing.set(true);
    console.log('[CheckInStore] 🔄 Set processing to true');

    // Declare variables at function scope for error logging
    let pointsData: any = null;
    let carpetImageKey: string | undefined = undefined;
    let awardedBadges: any[] = [];
    let landlordResult: any = null;

    try {
      // Validation phase
      console.log('[CheckInStore] 🔍 Starting validation phase...');
      const validation = await this.newCheckInService.canCheckIn(pubId);

      if (!validation.allowed) {
        console.log('[CheckInStore] ❌ Validation failed:', validation.reason);
        throw new Error(validation.reason);
      }
      console.log('[CheckInStore] ✅ All validations passed - proceeding with check-in');

      // Calculate points before creation
      console.log('[CheckInStore] 🎯 Calculating points before check-in creation...');
      pointsData = await this.calculatePoints(pubId, carpetResult);
      console.log('[CheckInStore] 🎯 Points calculated:', pointsData);

      // Calculate badges and landlord status BEFORE creating the document
      console.log('[CheckInStore] 🏅 Pre-calculating badges and landlord status...');
      const userId = this.authStore.uid();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Create temporary checkin object for badge evaluation
      const tempCheckin: CheckIn = {
        id: 'temp', // Will be replaced with real ID
        userId,
        pubId,
        timestamp: Timestamp.now(),
        dateKey: new Date().toISOString().split('T')[0],
        pointsEarned: pointsData?.total || 0,
        pointsBreakdown: pointsData || undefined,
      };

      // Get all user check-ins for badge evaluation
      const allUserCheckIns = this.checkins().filter(c => c.userId === userId);

      // Calculate badges
      let badgeName: string | undefined;
      try {
        awardedBadges = await this.badgeAwardService.evaluateAndAwardBadges(
          userId,
          tempCheckin,
          allUserCheckIns
        );
        console.log('[CheckInStore] 🏅 Badges pre-calculated, awarded:', awardedBadges);
        // Get the first badge name if any awarded
        badgeName = awardedBadges.length > 0 ? awardedBadges[0].badge.name : undefined;
      } catch (error) {
        console.error('[CheckInStore] Badge pre-calculation error:', error);
        // Log the badge error for admin review
        await this.errorLoggingService.logCheckInError('badge-pre-calculation', error as Error, {
          pubId,
          userId,
          pointsData: pointsData,
          severity: 'medium', // Badge failures shouldn't break check-ins
        });
        // Don't let badge errors break the check-in flow
        awardedBadges = [];
      }

      // Calculate landlord status
      console.log('[CheckInStore] 👑 Pre-calculating landlord status...');
      landlordResult = await this.landlordStore.tryAwardLandlordForCheckin(
        pubId,
        userId,
        new Date()
      );

      // Check for mission updates
      console.log('[CheckInStore] 🎯 Pre-calculating mission updates...');
      // TODO: Add mission update logic here if needed
      const missionUpdated = false; // Placeholder

      // Prepare carpet image key
      carpetImageKey = carpetResult?.llmConfirmed ? carpetResult.localKey : undefined;

      // Prepare complete check-in data to save
      const completeCheckinData: Partial<CheckIn> = {
        pointsEarned: pointsData?.total || 0,
        pointsBreakdown: pointsData || undefined,
        ...(badgeName && { badgeName }),
        madeUserLandlord: landlordResult.isNewLandlord,
        missionUpdated,
        ...(carpetImageKey && { carpetImageKey }),
      };

      console.log('[CheckInStore] 📋 Complete check-in data prepared:', completeCheckinData);

      // Creation phase with complete data
      console.log('[CheckInStore] 💾 Starting check-in creation with complete data...');
      const newCheckinId = await this.newCheckInService.createCheckin(
        pubId,
        carpetImageKey,
        completeCheckinData
      );
      console.log(
        '[CheckInStore] ✅ Check-in creation completed successfully with all data saved!'
      );

      // ✅ CRITICAL: Invalidate cache to trigger leaderboard refresh
      console.log('[CheckInStore] 🔄 Triggering cache invalidation for new check-in');
      this.cacheCoherence.invalidate('checkins', 'new-check-in-created');
      console.log('[CheckInStore] 🔄 Cache invalidation triggered - leaderboard should refresh');

      // Add to local store immediately with complete data
      console.log('[CheckInStore] 🔄 Adding to local store with complete data:', {
        userId,
        newCheckinId,
        hasUserId: !!userId,
        hasId: !!newCheckinId,
      });

      if (userId && newCheckinId) {
        // Create the complete CheckIn object with all the data that was saved to Firestore
        const newCheckin: CheckIn = {
          id: newCheckinId,
          userId,
          pubId,
          timestamp: Timestamp.now(),
          dateKey: new Date().toISOString().split('T')[0],
          // Include all the complete data
          ...completeCheckinData,
        };

        console.log('[CheckInStore] 🎯 === COMPLETE CHECKIN DATA STORAGE DEBUG ===');
        console.log('[CheckInStore] 🎯 Complete check-in being stored:', {
          id: newCheckin.id,
          pointsEarned: newCheckin.pointsEarned,
          hasPointsBreakdown: !!newCheckin.pointsBreakdown,
          badgeName: newCheckin.badgeName,
          madeUserLandlord: newCheckin.madeUserLandlord,
          missionUpdated: newCheckin.missionUpdated,
          carpetImageKey: newCheckin.carpetImageKey,
          pointsBreakdownStructure: newCheckin.pointsBreakdown
            ? {
                base: newCheckin.pointsBreakdown.base,
                distance: newCheckin.pointsBreakdown.distance,
                bonus: newCheckin.pointsBreakdown.bonus,
                total: newCheckin.pointsBreakdown.total,
                reason: newCheckin.pointsBreakdown.reason,
              }
            : null,
        });
        console.log('[CheckInStore] 🎯 === END COMPLETE CHECKIN DATA STORAGE DEBUG ===');

        console.log('[CheckInStore] 🔄 Before addItem - current data count:', this.data().length);
        this.addItem(newCheckin);
        console.log('[CheckInStore] 🔄 After addItem - new data count:', this.data().length);

        this._checkinSuccess.set(newCheckin);
        console.log('[CheckInStore] ✅ Added complete check-in to local store:', newCheckin);

        // ✅ UPDATE USER PROFILE with new pub counts
        console.log('[CheckInStore] 🔄 Updating user profile with new pub counts...');
        await this.updateUserPubCounts(userId);
        console.log('[CheckInStore] ✅ User profile updated with new pub counts');
      } else {
        console.warn(
          '[CheckInStore] ❌ Cannot add to local store - missing userId or newCheckinId'
        );
      }

      // Success flow - gather data and show overlay
      console.log('[CheckInStore] 🎉 Starting success flow with pre-calculated data...');

      // Pass all the pre-calculated data to the success flow
      const photoTaken = carpetResult?.localStored || false;
      await this.handleSuccessFlow(
        pubId,
        carpetImageKey,
        pointsData,
        photoTaken,
        awardedBadges,
        landlordResult
      );
    } catch (error: any) {
      console.error('[CheckInStore] ❌ Check-in process failed:', error);
      console.error('[CheckInStore] ❌ Error message:', error?.message);

      // Log the check-in failure for admin review
      try {
        await this.errorLoggingService.logCheckInError('check-in-process-failure', error, {
          pubId,
          userId: this.authStore.uid() || undefined,
          pointsData: pointsData || undefined,
          carpetResult: carpetResult || undefined,
          severity: 'critical', // Check-in failures are critical
        });
      } catch (loggingError) {
        console.error('[CheckInStore] Failed to log check-in error:', loggingError);
      }

      // Error flow - show error overlay
      console.log('[CheckInStore] 💥 Starting error flow...');
      this.handleErrorFlow(error?.message || 'Check-in failed');

      throw error;
    } finally {
      this._isProcessing.set(false);
      console.log('[CheckInStore] 🔄 Set processing to false');
    }
  }

  /**
   * Check if pub has carpet references
   */
  private async pubHasCarpetReferences(pubId: string): Promise<boolean> {
    console.log('[CheckInStore] Checking carpet references for pub:', pubId);
    // TODO: Implement actual reference checking when service is ready
    // For now, assume all pubs have carpet references
    return true;
  }

  /**
   * Wait for carpet scan result from UI component
   */
  private async waitForCarpetScanResult(): Promise<string | undefined> {
    console.log('[CheckInStore] Waiting for carpet scan result...');
    console.log('[CheckInStore] ⏳ NO TIMEOUT - will wait indefinitely for carpet photo');

    // Create a promise that will be resolved when we receive the scan result
    return new Promise<string | undefined>(resolve => {
      // Store the resolver so we can call it from processCarpetScanResult
      this.carpetScanResolver = resolve;

      // REMOVED TIMEOUT - no more racing! Always wait for carpet photo
      // Check-in will only complete when carpet is captured or explicitly cancelled
    });
  }

  private carpetScanResolver: ((value: string | undefined) => void) | null = null;

  /**
   * Process carpet scan result from UI component
   */
  processCarpetScanResult(imageKey: string | undefined): void {
    console.log('[CheckInStore] Processing carpet scan result:', imageKey);

    // 🎥 STOP CAMERA IMMEDIATELY - carpet scan is complete
    console.log(
      '%c*** CAMERA: Carpet scan complete, stopping camera immediately...',
      'color: red; font-weight: bold;'
    );
    this.stopAllCameraStreams();

    if (this.carpetScanResolver) {
      this.carpetScanResolver(imageKey);
      this.carpetScanResolver = null;
    }

    // Clear the signal
    this._needsCarpetScan.set(null);
  }

  /**
   * 🎥 CAMERA CLEANUP: Stop all active camera streams
   */
  private stopAllCameraStreams(): void {
    console.log(
      '%c*** CAMERA: CheckInStore requesting camera cleanup via CameraService...',
      'color: red; font-weight: bold;'
    );

    // Use centralized camera service + keep defensive manual cleanup for now
    this.cameraService.releaseCamera();

    // Defensive: Also do manual cleanup (remove this if CameraService works well)
    console.log(
      '%c*** CAMERA: Also doing defensive manual cleanup...',
      'color: orange; font-weight: bold;'
    );
    document.querySelectorAll('video').forEach((video, index) => {
      if (video.srcObject) {
        console.log(
          `%c*** CAMERA: Manual cleanup of video element #${index}`,
          'color: orange; font-weight: bold;'
        );
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        video.pause();
      }
    });

    console.log(
      '%c*** CAMERA: CheckInStore camera cleanup complete',
      'color: red; font-weight: bold;'
    );
  }

  /**
   * Handle successful check-in flow
   */
  private async handleSuccessFlow(
    pubId: string,
    carpetImageKey?: string,
    pointsData?: any,
    photoTaken?: boolean,
    awardedBadges?: EarnedBadgeWithDetails[],
    landlordResult?: any
  ): Promise<void> {
    console.log('[CheckInStore] 🎉 Gathering success data for pub:', pubId);

    try {
      const userId = this.authStore.uid();
      const pub = this.pubStore.get(pubId);

      if (!userId) {
        console.log('[CheckInStore] 📊 No authenticated user found');
        return;
      }

      // Check if this is user's first ever check-in
      const totalCheckins = await this.newCheckInService.getUserTotalCheckinCount(userId);
      const isFirstEver = totalCheckins === 1;

      console.log('[CheckInStore] 📊 Basic data:', {
        userId,
        pubName: pub?.name,
        totalCheckins,
        isFirstEver,
        hasCarpet: !!carpetImageKey,
        timestamp: new Date().toISOString(),
      });

      // Handle home pub collection for first-time users
      if (isFirstEver) {
        console.log('[CheckInStore] 🏠 First ever check-in detected!');
        // TODO: Implement home pub selection logic
      }

      // Use pre-calculated data from main flow
      console.log('[CheckInStore] 🎯 Using pre-calculated points data:', pointsData);
      console.log('[CheckInStore] 🏅 Using pre-calculated badges:', awardedBadges);
      console.log('[CheckInStore] 👑 Using pre-calculated landlord result:', landlordResult);

      // Get the newly created check-in from our success signal
      const newCheckin = this._checkinSuccess();
      if (!newCheckin) {
        console.error('[CheckInStore] No check-in data available for UI display');
        return;
      }

      // Use the pre-calculated badge data
      const finalAwardedBadges = awardedBadges || [];

      // Use the pre-calculated landlord data
      const finalLandlordResult = landlordResult || { isNewLandlord: false };

      // Set landlord message signal
      const landlordMessage = finalLandlordResult.isNewLandlord
        ? "👑 You're the landlord today!"
        : '✅ Check-in complete!';
      this._landlordMessage.set(landlordMessage);

      // ✅ STEP 7: UserStore updates (DataAggregatorService computes pubsVisited from our data)
      console.log(
        '[CheckInStore] 👤 UserStore.checkedInPubIds updates not needed - DataAggregatorService computes from our check-ins'
      );

      // ✅ STEP 8: Mission progress updates handled automatically via UserMissionsStore reactive effects
      console.log(
        '[CheckInStore] 🎯 Mission progress will be updated automatically via reactive effects'
      );

      // Assemble success data
      const successData = {
        success: true,
        checkin: {
          pubId,
          timestamp: new Date().toISOString(),
          carpetImageKey,
          madeUserLandlord: finalLandlordResult.isNewLandlord,
        },
        pub: {
          name: pub?.name || 'Unknown Pub',
          location: pub?.location,
        },
        points: pointsData,
        badges: finalAwardedBadges,
        isNewLandlord: finalLandlordResult.isNewLandlord,
        landlordMessage: landlordMessage,
        isFirstEver,
        carpetCaptured: photoTaken || false, // Whether a photo was taken (regardless of carpet detection)
        carpetConfirmed: !!carpetImageKey, // Whether the LLM confirmed it was a carpet
      };

      console.log('[CheckInStore] 🎉 Success data assembled:', successData);

      // Send Telegram notification for real user check-ins
      const currentUser = this.authStore.user();
      if (currentUser && pub) {
        console.log('[CheckInStore] 📱 Sending Telegram notification...');
        await this.sendCheckinNotification(newCheckin, currentUser, pub);
      }

      console.log('[CheckInStore] ✅ Check-in workflow complete - showing modals');

      // Show success overlay
      this.showCheckinResults(successData);
    } catch (error) {
      console.error('[CheckInStore] ❌ Error in success flow:', error);
    }
  }

  /**
   * ✅ NEW: Handle first ever check-in - collect home pub info
   */
  private async handleFirstEverCheckin(userId: string, pubId: string, pub: any): Promise<void> {
    console.log('[CheckInStore] 🏠 Handling first ever check-in for user:', userId);

    try {
      // For now, assume this pub is their home pub
      // TODO: Replace with overlay asking user to confirm/select home pub

      console.log('[CheckInStore] 🏠 [ASSUMPTION] Setting current pub as home pub...');
      console.log('[CheckInStore] 🏠 [TODO] Show overlay: "Is this your local pub?"');
      console.log('[CheckInStore] 🏠 [TODO] Allow user to search/select different home pub');

      await this.setUserHomePub(userId, pubId, pub);
    } catch (error) {
      console.error('[CheckInStore] 🏠 Error handling first check-in:', error);
      // Don't fail the check-in process, just log the error
    }
  }

  /**
   * ✅ NEW: Set user's home pub (stub for now)
   */
  private async setUserHomePub(userId: string, pubId: string, pub: any): Promise<void> {
    console.log('[CheckInStore] 🏠 Setting home pub for user:', userId, 'pub:', pubId);

    try {
      // TODO: Save to user profile in Firestore
      console.log('[CheckInStore] 🏠 [STUB] Would save to user profile:');
      console.log('  userId:', userId);
      console.log('  homePubId:', pubId);
      console.log('  homePubName:', pub?.name);
      console.log('  homePubLocation:', pub?.location);
      console.log('  setAt:', new Date().toISOString());

      // TODO: Update UserStore with home pub info
      // await this.userStore.updateUser(userId, {
      //   homePubId: pubId,
      //   homePubLocation: pub?.location,
      //   homePubSetAt: new Date()
      // });

      console.log('[CheckInStore] 🏠 Home pub set successfully (stubbed)');
    } catch (error) {
      console.error('[CheckInStore] 🏠 Error setting home pub:', error);
    }
  }

  /**
   * Enable/disable carpet detection
   */
  setCarpetDetectionEnabled(enabled: boolean): void {
    console.log('[CheckInStore] 🎛️ Carpet detection:', enabled ? 'enabled' : 'disabled');
    this._carpetDetectionEnabled.set(enabled);
  }

  /**
   * ✅ NEW: Handle error flow
   */
  private handleErrorFlow(errorMessage: string): void {
    console.log('[CheckInStore] 💥 Handling error flow:', errorMessage);

    const errorData = {
      success: false,
      error: errorMessage,
      debugInfo: {
        flow: 'CheckInStore',
        timestamp: new Date().toISOString(),
        source: 'validation_or_creation_failure',
      },
    };

    console.log('[CheckInStore] 💥 Error data assembled:', errorData);
    console.log('[CheckInStore] 🔄 Showing check-in results...');
    this.showCheckinResults(errorData);
  }
  /**
   * Show check-in results overlay
   */
  private showCheckinResults(data: any): void {
    console.log('[CheckInStore] 📱 Showing check-in results:', data);

    if (data.success) {
      console.log('[CheckInStore] 🎉 Calling CheckInModalService.showCheckInResults for SUCCESS');

      // Log modal coordination decision
      if (data.isNewLandlord) {
        console.log(
          '[CheckInStore] 🎭 ✅ CELEBRATORY: User became landlord → Second modal will show'
        );
      } else {
        console.log('[CheckInStore] 🎭 ❌ ROUTINE: Normal check-in → First modal only');
      }

      // Emit check-in results via signal instead of calling modal service directly
      console.log('[CheckInStore] 🎯 === CHECKIN RESULTS POINTS DEBUG ===');
      console.log('[CheckInStore] 🎯 Points from results:', data.points);
      console.log(
        '[CheckInStore] 🎯 Points structure:',
        data.points
          ? {
              base: data.points.base,
              distance: data.points.distance,
              bonus: data.points.bonus,
              total: data.points.total,
              reason: data.points.reason,
            }
          : null
      );

      const resultsData = {
        success: true,
        checkin: {
          id: data.checkin.id,
          userId: data.checkin.userId,
          pubId: data.checkin.pubId,
          timestamp: data.checkin.timestamp,
          dateKey: data.checkin.dateKey,
          carpetImageKey: data.checkin.carpetImageKey,
          pointsEarned: data.points?.total || 0,
          pointsBreakdown: data.points || undefined,
        },
        pub: {
          id: data.checkin.pubId,
          name: data.pub.name,
        },
        points: data.points,
        badges: (data.badges || []).map((badgeWithDetails: EarnedBadgeWithDetails) => ({
          badgeId: badgeWithDetails.earnedBadge.badgeId,
          name: badgeWithDetails.badge.name,
        })),
        isNewLandlord: data.isNewLandlord,
        landlordMessage: data.landlordMessage,
        carpetCaptured: data.carpetCaptured,
      };

      console.log('[CheckInStore] 🎯 Final results data being set:', {
        checkinId: resultsData.checkin?.id,
        pointsEarned: resultsData.checkin?.pointsEarned,
        hasBreakdown: !!resultsData.checkin?.pointsBreakdown,
        breakdownTotal: resultsData.checkin?.pointsBreakdown?.total,
      });
      console.log('[CheckInStore] 🎯 === END CHECKIN RESULTS POINTS DEBUG ===');

      this._checkinResults.set(resultsData);

      console.log('[CheckInStore] ✅ Check-in results emitted via signal');
    } else {
      console.log('[CheckInStore] ❌ Emitting error results via signal');

      // Emit error results via signal
      this._checkinResults.set({
        success: false,
        error: data.error || 'Check-in failed',
      });
    }
  }

  /**
   * Calculate points for check-in (with carpet bonus)
   */
  private async calculatePoints(pubId: string, carpetResult?: any): Promise<any> {
    const callId = Date.now();
    console.log(`[CheckInStore] 🎯 === CALCULATE POINTS STARTED (${callId}) ===`);
    console.log(`[CheckInStore] 🎯 Input (${callId}):`, { pubId, hasCarpetResult: !!carpetResult });
    console.log(`[CheckInStore] 🎯 Carpet processing result (${callId}):`, carpetResult);

    const userId = this.authStore.uid();
    if (!userId) {
      console.error(`[CheckInStore] ❌ No user ID - cannot calculate points (${callId})`);
      return { total: 0, breakdown: [] };
    }

    console.log(`[CheckInStore] 🎯 Authenticated user ID (${callId}):`, userId);

    try {
      // Get check-in context
      console.log(`[CheckInStore] 🎯 Fetching check-in context (${callId})`);
      const [isFirstVisit, totalCheckins] = await Promise.all([
        this.newCheckInService.isFirstEverCheckIn(userId, pubId),
        this.newCheckInService.getUserTotalCheckinCount(userId),
      ]);

      console.log(`[CheckInStore] 🎯 Check-in context (${callId}):`, {
        isFirstVisit,
        totalCheckins,
      });

      // Calculate distance from home pub
      console.log(`[CheckInStore] 🎯 Calculating distance from home (${callId})`);
      const distanceFromHome = await this.calculateDistanceFromHome(pubId, userId);
      console.log(`[CheckInStore] 🎯 Distance from home pub (${callId}):`, distanceFromHome, 'km');

      // Determine if carpet was confirmed by LLM for bonus points
      const carpetConfirmed = !!(carpetResult && carpetResult.llmConfirmed);
      console.log(`[CheckInStore] 🎯 Carpet confirmed by LLM (${callId}):`, carpetConfirmed);
      console.log(`[CheckInStore] 🎯 Photo quality data (${callId}):`, carpetResult?.photoQuality);

      // Determine if this is user's home pub
      console.log(`[CheckInStore] 🎯 Checking if home pub (${callId})`);
      const isHomePub = await this.isHomePub(pubId, userId);
      console.log(`[CheckInStore] 🎯 Is home pub (${callId}):`, isHomePub);

      // Photo quality is just a metric, not for points
      const photoQualityScore = carpetResult?.photoQuality?.overall;
      console.log(`[CheckInStore] 🎯 Photo quality metric (${callId}):`, photoQualityScore);

      const pointsData = {
        pubId,
        distanceFromHome,
        isFirstVisit,
        isFirstEver: totalCheckins === 0,
        currentStreak: 0, // TODO: Implement streak calculation - track consecutive daily check-ins
        carpetConfirmed,
        sharedSocial: false, // TODO: Implement social sharing feature - track if user shared this check-in
        isHomePub,
      };

      console.log(`[CheckInStore] 🎯 Points context data prepared (${callId}):`, pointsData);

      // Use PointsStore to calculate AND persist points
      console.log(`[CheckInStore] 🎯 Calling PointsStore.awardCheckInPoints (${callId})`);
      const pointsBreakdown = await this.pointsStore.awardCheckInPoints(pointsData);

      console.log(`[CheckInStore] 🎯 PointsStore returned breakdown (${callId}):`, pointsBreakdown);

      // Return the breakdown directly - it already has total and structured data
      console.log(`[CheckInStore] 🎯 === CALCULATE POINTS COMPLETE (${callId}) ===`);
      console.log(`[CheckInStore] 🎯 Final result (${callId}):`, pointsBreakdown);
      return pointsBreakdown;
    } catch (error) {
      console.error(`[CheckInStore] ❌ Points calculation failed (${callId}):`, error);
      console.error(
        `[CheckInStore] ❌ Error stack (${callId}):`,
        error instanceof Error ? error.stack : 'No stack trace'
      );

      // Log the points calculation failure for admin review
      try {
        await this.errorLoggingService.logCheckInError(
          'points-calculation-failure',
          error as Error,
          {
            pubId,
            userId,
            carpetResult,
            severity: 'high', // Points failures are high severity
          }
        );
      } catch (loggingError) {
        console.error('[CheckInStore] Failed to log points calculation error:', loggingError);
      }

      return { total: 0, breakdown: [] };
    }
  }

  /**
   * Check if the pub is the user's home pub
   */
  private async isHomePub(pubId: string, userId: string): Promise<boolean> {
    try {
      const user = this.userStore.user();
      return user?.homePubId === pubId;
    } catch (error) {
      console.error('[CheckInStore] ❌ Error checking if home pub:', error);
      return false;
    }
  }

  /**
   * Calculate distance from current pub to user's home pub
   */
  private async calculateDistanceFromHome(pubId: string, userId: string): Promise<number> {
    try {
      // Get user's data to find home pub
      const user = this.userStore.user();
      if (!user?.homePubId) {
        console.log('[CheckInStore] 📍 User has no home pub set, distance = 0');
        return 0;
      }

      // If this is the user's home pub, distance is 0
      if (user.homePubId === pubId) {
        console.log('[CheckInStore] 📍 Checking into home pub, distance = 0');
        return 0;
      }

      // Ensure pub store is loaded
      await this.pubStore.loadOnce();

      // Get location data for both pubs
      const currentPub = this.pubStore.get(pubId);
      const homePub = this.pubStore.get(user.homePubId);

      // Check if both pubs have location data
      if (!currentPub?.location || !homePub?.location) {
        console.log('[CheckInStore] 📍 Missing location data for distance calculation:', {
          currentPubHasLocation: !!currentPub?.location,
          homePubHasLocation: !!homePub?.location,
        });
        return 0;
      }

      // Calculate distance in kilometers
      const distance = getDistanceKm(homePub.location, currentPub.location);

      console.log('[CheckInStore] 📍 Distance calculated:', {
        homePubId: user.homePubId,
        currentPubId: pubId,
        homePubLocation: homePub.location,
        currentPubLocation: currentPub.location,
        distanceKm: distance,
      });

      return distance;
    } catch (error) {
      console.error('[CheckInStore] ❌ Error calculating distance from home:', error);
      return 0;
    }
  }

  private async checkForNewBadges(userId: string, pubId: string): Promise<any> {
    // try {
    //   console.log('🔄 [CheckInStore] Calling BadgeAwardService.evaluateBadges...');
    // This will handle the complete badge workflow
    // await this.badgeAwardService.evaluateAndAwardBadges(userId);
    // Force BadgeStore to reload fresh data
    // await this._badgeStore.load();
    // const userBadges = this._badgeStore.earnedBadges();
    // const recentBadges = this._badgeStore.recentBadges();
    // console.log('🎖️ [CheckInStore] Badge evaluation complete:', {
    //   totalBadges: userBadges.length,
    //   recentCount: recentBadges.length
    // });
    // return {
    //   totalBadges: userBadges.length,
    //   recentBadges: recentBadges.slice(0, 3), // Show 3 most recent
    //   newlyAwarded: [] // TODO: Track which were just awarded
    // };
    // } catch (error) {
    //   console.error('❌ [CheckInStore] Badge evaluation failed:', error);
    //   return { error: error.message };
    // }
  }

  /**
   * 🎨 Handle carpet workflow orchestration using CarpetStrategyService
   */
  async handleCarpetWorkflow(
    fullResCanvas: HTMLCanvasElement,
    pubId: string,
    pubName: string
  ): Promise<string | undefined> {
    console.log('[CheckInStore] 🎨 Starting carpet workflow orchestration');

    try {
      const result = await this.carpetStrategy.processCarpetCapture(fullResCanvas, pubId, pubName);

      if (!result.llmConfirmed) {
        console.log('[CheckInStore] ❌ Carpet workflow failed - LLM rejected');
        throw new Error(result.error || 'LLM analysis failed');
      }

      console.log('[CheckInStore] ✅ Carpet workflow complete:');
      console.log('  Local stored:', result.localStored);
      console.log('  Firestore uploaded:', result.firestoreUploaded);
      console.log('  Local key:', result.localKey);

      // Return the local key for check-in association
      return result.localKey;
    } catch (error) {
      console.error('[CheckInStore] ❌ Carpet workflow error:', error);
      throw error;
    }
  }

  /**
   * Clear check-in results after modal is shown
   */
  clearCheckinResults(): void {
    this._checkinResults.set(null);
  }

  /**
   * Check if we should send Telegram notification for this user
   */
  private shouldSendNotification(user: User): boolean {
    if (!environment.telegram?.checkinNotificationsEnabled) {
      console.log('[CheckInStore] Telegram check-in notifications disabled');
      return false;
    }

    if (environment.telegram?.realUsersOnly && !user.realUser) {
      console.log('[CheckInStore] Filtering out non-real user:', user.displayName);
      return false;
    }

    return true;
  }

  /**
   * Format check-in message for Telegram
   */
  private formatCheckinMessage(checkIn: CheckIn, user: User, pub: Pub): string {
    const emoji = checkIn.madeUserLandlord ? '👑' : '🍺';
    const userType = user.realUser ? 'Real User' : 'User';

    let message = `${emoji} *${userType} Check-In*\n\n`;
    message += `👤 *User:* ${this.telegramNotificationService.escapeMarkdown(user.displayName)}\n`;
    message += `🏠 *Pub:* ${this.telegramNotificationService.escapeMarkdown(pub.name)}\n`;
    message += `📍 *Location:* ${this.telegramNotificationService.escapeMarkdown(pub.address)}\n`;

    if (checkIn.madeUserLandlord) {
      message += `👑 *New Landlord!*\n`;
    }

    if (checkIn.pointsEarned && checkIn.pointsEarned > 0) {
      message += `🎯 *Points Earned:* ${checkIn.pointsEarned}\n`;
    }

    if (checkIn.carpetImageKey) {
      message += `📸 *Carpet Captured:* Yes\n`;
    }

    message += `🕐 *Time:* ${checkIn.timestamp.toDate().toLocaleString()}`;

    return message;
  }

  /**
   * Send Telegram notification for check-in
   */
  private async sendCheckinNotification(checkIn: CheckIn, user: User, pub: Pub): Promise<void> {
    if (!this.shouldSendNotification(user)) {
      return;
    }

    try {
      const message = this.formatCheckinMessage(checkIn, user, pub);
      await this.telegramNotificationService.sendMessage(message, { parseMode: 'Markdown' });
      console.log('[CheckInStore] Telegram check-in notification sent successfully');
    } catch (error) {
      // Don't throw - we don't want Telegram errors to affect check-in flow
      console.error('[CheckInStore] Failed to send Telegram check-in notification:', error);
    }
  }

  /**
   * Update user's pub count fields in Firestore after successful check-in
   */
  private async updateUserPubCounts(userId: string): Promise<void> {
    try {
      console.log('[CheckInStore] 📊 Calculating verified pub count for user:', userId);

      // Get all check-ins for this user to calculate verified pub count
      const userCheckins = await this.newCheckInService.loadUserCheckins(userId);
      const uniquePubIds = new Set(userCheckins.map(c => c.pubId));
      const verifiedPubCount = uniquePubIds.size;

      console.log('[CheckInStore] 📊 User check-in stats:', {
        totalCheckins: userCheckins.length,
        uniquePubs: verifiedPubCount,
        userId: userId.slice(0, 8),
      });

      // Get current user data to preserve unverified count
      const currentUser = this.userStore.user();
      const unverifiedPubCount = currentUser?.unverifiedPubCount || 0;
      const totalPubCount = verifiedPubCount + unverifiedPubCount;

      // Update user document in Firestore with new pub counts
      const updates = {
        verifiedPubCount,
        totalPubCount,
        // Update timestamp for tracking when stats were last calculated
        lastStatsUpdate: new Date().toISOString(),
      };

      console.log('[CheckInStore] 🔄 Updating user Firestore document with:', updates);
      await this.userStore.updateProfile(updates);

      // Trigger cache invalidation to refresh leaderboards and other data
      this.cacheCoherence.invalidate('users', 'pub-count-update-after-checkin');

      console.log('[CheckInStore] ✅ User pub counts updated successfully');
    } catch (error) {
      console.error('[CheckInStore] ❌ Failed to update user pub counts:', error);
      // Don't throw - we don't want this to break the check-in flow
    }
  }

  /**
   * Load current user's check-ins (explicit user-scoped method)
   */
  async loadUserCheckins(): Promise<void> {
    const userId = this.authStore.uid();
    if (!userId) throw new Error('No authenticated user');

    console.log(`📡 [CheckInStore] Loading user check-ins: ${userId.slice(0, 8)}`);

    const checkins = await this.newCheckInService.loadUserCheckins(userId);
    this._data.set(checkins);

    console.log(`✅ [CheckInStore] User check-ins loaded: ${checkins.length} total`);
  }

  /**
   * Load ALL check-ins from all users (admin-only method)
   * Includes built-in security check for admin permissions
   */
  async loadAllCheckins(): Promise<void> {
    // Security check: Only allow authenticated users to access admin data
    const userId = this.authStore.uid();
    if (!userId) {
      throw new Error('Authentication required for admin operations');
    }

    // Security check: Only allow admin users to access all check-ins
    const currentUser = this.userStore.currentUser();
    if (!currentUser?.isAdmin) {
      throw new Error('Admin privileges required for this operation');
    }

    console.log(
      `📡 [CheckInStore] Loading ALL check-ins (admin operation) by admin user: ${userId.slice(0, 8)}`
    );

    const allCheckIns = await this.newCheckInService.getAllCheckIns();
    this._data.set(allCheckIns);

    console.log(`✅ [CheckInStore] All check-ins loaded: ${allCheckIns.length} total`);
    console.log(`├─ Unique users: ${new Set(allCheckIns.map(c => c.userId)).size}`);
    console.log(`├─ Unique pubs: ${new Set(allCheckIns.map(c => c.pubId)).size}`);
    console.log(`└─ Most recent: ${allCheckIns[0]?.timestamp?.toDate().toISOString() || 'none'}`);
  }
}
