// =====================================
// 🎯 checkin SUCCESS FLOW
// =====================================

// src/app/check-in/data-access/check-in.store.ts
import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { CheckInService } from './check-in.service';
import { OverlayService } from '../../shared/data-access/overlay.service';
import { AuthStore } from '../../auth/data-access/auth.store';
import { PubStore } from '../../pubs/data-access/pub.store';
import { PointsStore } from '../../points/data-access/points.store';
import { UserStore } from '../../users/data-access/user.store';
import { BadgeAwardService } from '../../badges/data-access/badge-award.service';
import { LandlordStore, type LandlordResult } from '../../landlord/data-access/landlord.store';
// Remove CheckInModalService import to break circular dependency
import { BaseStore } from '../../shared/base/base.store';
import { CameraService } from '../../shared/data-access/camera.service';
import type { CheckIn } from '../utils/check-in.models';
import { Timestamp } from 'firebase/firestore';


@Injectable({ providedIn: 'root' })
export class CheckInStore extends BaseStore<CheckIn> {
  private readonly newCheckInService = inject(CheckInService);
  private readonly overlayService = inject(OverlayService);
  private readonly pubStore = inject(PubStore);
  private readonly pointsStore = inject(PointsStore);
  private readonly userStore = inject(UserStore);
  private readonly badgeAwardService = inject(BadgeAwardService);
  private readonly landlordStore = inject(LandlordStore);
  // Modal service removed to break circular dependency - use event-based approach
  private readonly cameraService = inject(CameraService);

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
  readonly userCheckins = computed(() =>
    this.checkins().map(c => c.pubId)
  );

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

      console.log('[CheckInStore] Auth state changed:', {
        userId: user?.uid,
        isAnonymous: user?.isAnonymous,
        lastLoaded: this.lastLoadedUserId
      });

      // Handle logout
      if (!user) {
        console.log('[CheckInStore] Clearing data (logout/anonymous)');
        this.reset();
        this.lastLoadedUserId = null;
        return;
      }

      // Deduplication: Don't reload same user
      if (user.uid === this.lastLoadedUserId) {
        console.log('[CheckInStore] Same user, skipping reload');
        return;
      }

      // Load: New authenticated user detected
      console.log('[CheckInStore] Loading check-ins for new user:', user.uid);
      this.lastLoadedUserId = user.uid;
      this.load();
    });
  }

  protected async fetchData(): Promise<CheckIn[]> {
    const userId = this.authStore.uid();
    if (!userId) throw new Error('No authenticated user');

    console.log('📡 [CheckInStore] === FETCHING CHECK-INS ===');
    console.log('📡 [CheckInStore] User ID:', userId?.slice(0, 8));
    console.log('📡 [CheckInStore] Timestamp:', new Date().toISOString());

    const checkins = await this.newCheckInService.loadUserCheckins(userId);

    console.log('📡 [CheckInStore] === CHECK-INS LOADED ===');
    console.log('📡 [CheckInStore] Total checkins received:', checkins.length);
    console.log('📡 [CheckInStore] Unique pubs from checkins:', new Set(checkins.map(c => c.pubId)).size);
    console.log('📡 [CheckInStore] Sample checkins:', checkins.slice(0, 3).map(c => ({
      pubId: c.pubId,
      timestamp: c.timestamp.toDate().toISOString(),
      userId: c.userId?.slice(0, 8),
      dateKey: c.dateKey
    })));

    return checkins;
  }

  // Utility methods
  hasCheckedIn(pubId: string): boolean {
    return this.data().some(checkIn => checkIn.pubId === pubId);
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
   * Check in to a pub with optional carpet detection
   *
   * @param pubId - The pub to check into
   * @returns Promise<void>
   */
 async checkinToPub(pubId: string): Promise<void> {
  console.log('[CheckInStore] 🚀 checkinToPub() called with pubId:', pubId);

  if (this._isProcessing()) {
    console.log('[CheckInStore] ⚠️ Already processing a check-in, ignoring');
    return;
  }

  this._isProcessing.set(true);
  console.log('[CheckInStore] 🔄 Set processing to true');

  try {
    // Validation phase
    console.log('[CheckInStore] 🔍 Starting validation phase...');
    const validation = await this.newCheckInService.canCheckIn(pubId);

    if (!validation.allowed) {
      console.log('[CheckInStore] ❌ Validation failed:', validation.reason);
      throw new Error(validation.reason);
    }
    console.log('[CheckInStore] ✅ All validations passed - proceeding with check-in');

    // 🆕 Carpet Detection Phase
    let carpetImageKey: string | undefined;
    if (this._carpetDetectionEnabled()) {
      console.log('[CheckInStore] 📸 Starting carpet detection phase...');

      // Check if pub has carpet references (for now always true)
      const hasReferences = await this.pubHasCarpetReferences(pubId);

      if (hasReferences) {
        console.log('[CheckInStore] 📸 Requesting carpet scan for pub:', pubId);

        // Signal that we need carpet scanning
        this._needsCarpetScan.set(pubId);

        // Wait for carpet scan result
        carpetImageKey = await this.waitForCarpetScanResult();

        if (carpetImageKey) {
          console.log('[CheckInStore] ✅ Carpet captured successfully:', carpetImageKey);
        } else {
          console.log('[CheckInStore] ℹ️ No carpet detected or capture skipped');
        }
      } else {
        console.log('[CheckInStore] ℹ️ No carpet references for this pub, skipping detection');
      }
    } else {
      console.log('[CheckInStore] ⏭️ Carpet detection disabled, skipping');
    }

    // Calculate points before creation
    console.log('[CheckInStore] 🎯 Calculating points before check-in creation...');
    const pointsData = await this.calculatePoints(pubId, !!carpetImageKey);
    console.log('[CheckInStore] 🎯 Points calculated:', pointsData);

    // Creation phase with carpet data
    console.log('[CheckInStore] 💾 Starting check-in creation...');
    const newCheckinId = await this.newCheckInService.createCheckin(pubId, carpetImageKey);
    console.log('[CheckInStore] ✅ Check-in creation completed successfully');

    // Add to local store immediately
    const userId = this.authStore.uid();
    console.log('[CheckInStore] 🔄 Adding to local store:', { userId, newCheckinId, hasUserId: !!userId, hasId: !!newCheckinId });

    if (userId && newCheckinId) {
      const newCheckin: CheckIn = {
        id: newCheckinId,
        userId,
        pubId,
        timestamp: Timestamp.now(),
        dateKey: new Date().toISOString().split('T')[0],
        ...(carpetImageKey && { carpetImageKey }),
        // Add points data to the checkin object
        pointsEarned: pointsData?.total || 0,
        pointsBreakdown: pointsData ? JSON.stringify(pointsData) : undefined
      };

      console.log('[CheckInStore] 🔄 Before addItem - current data count:', this.data().length);
      this.addItem(newCheckin);
      console.log('[CheckInStore] 🔄 After addItem - new data count:', this.data().length);

      this._checkinSuccess.set(newCheckin);
      console.log('[CheckInStore] ✅ Added new check-in to local store:', newCheckin);

      // ✅ No need to update UserStore with checkedInPubIds anymore!
      // UserStore.pubsVisited now computes from CheckInStore.checkins() data
      // This eliminates redundant UserStore updates and reduces Firebase writes
      console.log('[CheckInStore] ✅ Pub count will update automatically via UserStore computed signal');
    } else {
      console.warn('[CheckInStore] ❌ Cannot add to local store - missing userId or newCheckinId');
    }

    // Success flow - gather data and show overlay
    console.log('[CheckInStore] 🎉 Starting success flow...');
    await this.handleSuccessFlow(pubId, carpetImageKey, pointsData);

  } catch (error: any) {
    console.error('[CheckInStore] ❌ Check-in process failed:', error);
    console.error('[CheckInStore] ❌ Error message:', error?.message);

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

    // Create a promise that will be resolved when we receive the scan result
    return new Promise<string | undefined>((resolve) => {
      // Store the resolver so we can call it from processCarpetScanResult
      this.carpetScanResolver = resolve;

      // Set a timeout to auto-resolve if user takes too long or cancels
      setTimeout(() => {
        if (this.carpetScanResolver) {
          console.log('[CheckInStore] Carpet scan timeout - proceeding without carpet');
          this.carpetScanResolver(undefined);
          this.carpetScanResolver = null;
          this._needsCarpetScan.set(null);
        }
      }, 120000); // 2 minute timeout
    });
  }

  private carpetScanResolver: ((value: string | undefined) => void) | null = null;

  /**
   * Process carpet scan result from UI component
   */
  processCarpetScanResult(imageKey: string | undefined): void {
    console.log('[CheckInStore] Processing carpet scan result:', imageKey);

    // 🎥 STOP CAMERA IMMEDIATELY - carpet scan is complete
    console.log('%c*** CAMERA: Carpet scan complete, stopping camera immediately...', 'color: red; font-weight: bold;');
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
    console.log('%c*** CAMERA: CheckInStore requesting camera cleanup via CameraService...', 'color: red; font-weight: bold;');

    // Use centralized camera service + keep defensive manual cleanup for now
    this.cameraService.releaseCamera();

    // Defensive: Also do manual cleanup (remove this if CameraService works well)
    console.log('%c*** CAMERA: Also doing defensive manual cleanup...', 'color: orange; font-weight: bold;');
    document.querySelectorAll('video').forEach((video, index) => {
      if (video.srcObject) {
        console.log(`%c*** CAMERA: Manual cleanup of video element #${index}`, 'color: orange; font-weight: bold;');
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        video.pause();
      }
    });

    console.log('%c*** CAMERA: CheckInStore camera cleanup complete', 'color: red; font-weight: bold;');
  }

  /**
   * Handle successful check-in flow
   */
  private async handleSuccessFlow(pubId: string, carpetImageKey?: string, pointsData?: any): Promise<void> {
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
        timestamp: new Date().toISOString()
      });

      // Handle home pub collection for first-time users
      if (isFirstEver) {
        console.log('[CheckInStore] 🏠 First ever check-in detected!');
        // TODO: Implement home pub selection logic
      }

      // Points already calculated in main flow
      console.log('[CheckInStore] 🎯 Using pre-calculated points data:', pointsData);

      // Check for new badges
      // Get the newly created check-in from our success signal
      const newCheckin = this._checkinSuccess();
      if (!newCheckin) {
        console.error('[CheckInStore] No check-in data available for badge evaluation');
        return;
      }

      // Get all user check-ins including the new one
      const allUserCheckIns = this.checkins().filter(c => c.userId === userId);

      // Evaluate and award badges using the same method as legacy flow
      let awardedBadges: any[] = [];
      try {
        awardedBadges = await this.badgeAwardService.evaluateAndAwardBadges(
          userId,
          newCheckin,
          allUserCheckIns
        );
        console.log('[CheckInStore] 🏅 Badges evaluated, awarded:', awardedBadges);
      } catch (error) {
        console.error('[CheckInStore] Badge evaluation error:', error);
        // Don't let badge errors break the check-in flow
        awardedBadges = [];
      }

      // ✅ STEP 6: Handle landlord logic via LandlordStore
      console.log('[CheckInStore] 👑 Processing landlord logic...');
      const landlordResult = await this.landlordStore.tryAwardLandlordForCheckin(pubId, userId, new Date());

      // Set landlord message signal
      const landlordMessage = landlordResult.isNewLandlord ? '👑 You\'re the landlord today!' : '✅ Check-in complete!';
      this._landlordMessage.set(landlordMessage);

      // ✅ STEP 7: UserStore updates (DataAggregatorService computes pubsVisited from our data)
      console.log('[CheckInStore] 👤 UserStore.checkedInPubIds updates not needed - DataAggregatorService computes from our check-ins');

      // Assemble success data
      const successData = {
        success: true,
        checkin: {
          pubId,
          timestamp: new Date().toISOString(),
          carpetImageKey,
          madeUserLandlord: landlordResult.isNewLandlord
        },
        pub: {
          name: pub?.name || 'Unknown Pub',
          location: pub?.location
        },
        points: pointsData,
        badges: awardedBadges,
        isNewLandlord: landlordResult.isNewLandlord,
        landlordMessage: landlordMessage,
        isFirstEver,
        carpetCaptured: !!carpetImageKey
      };

      console.log('[CheckInStore] 🎉 Success data assembled:', successData);
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
        source: 'validation_or_creation_failure'
      }
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
        console.log('[CheckInStore] 🎭 ✅ CELEBRATORY: User became landlord → Second modal will show');
      } else {
        console.log('[CheckInStore] 🎭 ❌ ROUTINE: Normal check-in → First modal only');
      }

      // Emit check-in results via signal instead of calling modal service directly
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
          pointsBreakdown: data.points ? JSON.stringify(data.points) : undefined
        },
        pub: {
          id: data.checkin.pubId,
          name: data.pub.name
        },
        points: data.points,
        badges: data.badges || [],
        isNewLandlord: data.isNewLandlord,
        landlordMessage: data.landlordMessage,
        carpetCaptured: data.carpetCaptured
      };

      this._checkinResults.set(resultsData);

      console.log('[CheckInStore] ✅ Check-in results emitted via signal');
    } else {
      console.log('[CheckInStore] ❌ Emitting error results via signal');

      // Emit error results via signal
      this._checkinResults.set({
        success: false,
        error: data.error || 'Check-in failed'
      });
    }
  }


  /**
   * Calculate points for check-in (with carpet bonus)
   */
  private async calculatePoints(pubId: string, hasCarpet: boolean): Promise<any> {
    console.log('[CheckInStore] 🎯 Calculating points for pub:', pubId, 'hasCarpet:', hasCarpet);

    const userId = this.authStore.uid();
    if (!userId) {
      console.log('[CheckInStore] 🎯 No user ID - cannot calculate points');
      return { total: 0, breakdown: [] };
    }

    try {
      // Get check-in context
      const [isFirstVisit, totalCheckins] = await Promise.all([
        this.newCheckInService.isFirstEverCheckIn(userId, pubId),
        this.newCheckInService.getUserTotalCheckinCount(userId)
      ]);

      // TODO: Calculate real distance from home pub
      const distanceFromHome = 0;

      // Build PointsStore data structure
      const pointsData = {
        pubId,
        distanceFromHome,
        isFirstVisit,
        isFirstEver: totalCheckins === 0,
        currentStreak: 0, // TODO: Calculate streak
        hasPhoto: false,
        sharedSocial: false,
        // 🆕 Carpet bonus
        hasCarpet
      };

      console.log('[CheckInStore] 🎯 Points context data prepared:', pointsData);

      // Use PointsStore to calculate AND persist points
      const pointsBreakdown = await this.pointsStore.awardCheckInPoints(pointsData);

      console.log('[CheckInStore] 🎯 PointsStore returned breakdown:', pointsBreakdown);

      // Return the breakdown directly - it already has total and structured data
      console.log('[CheckInStore] 🎯 Points calculated and awarded:', pointsBreakdown);
      return pointsBreakdown;

    } catch (error) {
      console.error('[CheckInStore] ❌ Points calculation failed:', error);
      return { total: 0, breakdown: [] };
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
   * Clear check-in results after modal is shown
   */
  clearCheckinResults(): void {
    this._checkinResults.set(null);
  }
}
