// =====================================
// 🎯 NEW-CHECKIN SUCCESS FLOW
// =====================================

// src/app/new-checkin/data-access/new-checkin.store.ts
import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { NewCheckinService } from './new-checkin.service';
import { OverlayService } from '../../shared/data-access/overlay.service';
import { AuthStore } from '../../auth/data-access/auth.store';
import { PubStore } from '../../pubs/data-access/pub.store';
import { PointsStore } from '../../points/data-access/points.store';
import { UserStore } from '../../users/data-access/user.store';
import { BadgeAwardService } from '../../badges/data-access/badge-award.service';
import { CheckInModalService } from '../../check-in/data-access/check-in-modal.service';
import { BaseStore } from '../../shared/data-access/base.store';
import type { CheckIn } from '../../check-in/utils/check-in.models';
import { Timestamp } from 'firebase/firestore';


@Injectable({ providedIn: 'root' })
export class NewCheckinStore extends BaseStore<CheckIn> {
  private readonly newCheckinService = inject(NewCheckinService);
  private readonly overlayService = inject(OverlayService);
  private readonly pubStore = inject(PubStore);
  private readonly pointsStore = inject(PointsStore);
  private readonly userStore = inject(UserStore);
  private readonly badgeAwardService = inject(BadgeAwardService);
  private readonly checkInModalService = inject(CheckInModalService);

  // Check-in process state
  private readonly _isProcessing = signal(false);
  private readonly _carpetDetectionEnabled = signal(true);
  private readonly _needsCarpetScan = signal<string | null>(null);
  
  // Check-in success state
  private readonly _checkinSuccess = signal<CheckIn | null>(null);
  private readonly _landlordMessage = signal<string | null>(null);

  // Auth-reactive state
  private lastLoadedUserId: string | null = null;

  // Public readonly signals
  readonly isProcessing = this._isProcessing.asReadonly();
  readonly carpetDetectionEnabled = this._carpetDetectionEnabled.asReadonly();
  readonly needsCarpetScan = this._needsCarpetScan.asReadonly();
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
    console.log('[NewCheckinStore] ✅ Initialized');

    // Auth-Reactive Pattern: Auto-load when user changes
    effect(() => {
      const user = this.authStore.user();

      console.log('[NewCheckinStore] Auth state changed:', {
        userId: user?.uid,
        isAnonymous: user?.isAnonymous,
        lastLoaded: this.lastLoadedUserId
      });

      // Handle logout
      if (!user) {
        console.log('[NewCheckinStore] Clearing data (logout/anonymous)');
        this.reset();
        this.lastLoadedUserId = null;
        return;
      }

      // Deduplication: Don't reload same user
      if (user.uid === this.lastLoadedUserId) {
        console.log('[NewCheckinStore] Same user, skipping reload');
        return;
      }

      // Load: New authenticated user detected
      console.log('[NewCheckinStore] Loading check-ins for new user:', user.uid);
      this.lastLoadedUserId = user.uid;
      this.load();
    });
  }

  protected async fetchData(): Promise<CheckIn[]> {
    const userId = this.authStore.uid();
    if (!userId) throw new Error('No authenticated user');

    console.log('[NewCheckinStore] 📡 Fetching check-ins for user:', userId);
    return this.newCheckinService.loadUserCheckins(userId);
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
  console.log('[NewCheckinStore] 🚀 checkinToPub() called with pubId:', pubId);

  if (this._isProcessing()) {
    console.log('[NewCheckinStore] ⚠️ Already processing a check-in, ignoring');
    return;
  }

  this._isProcessing.set(true);
  console.log('[NewCheckinStore] 🔄 Set processing to true');

  try {
    // Validation phase
    console.log('[NewCheckinStore] 🔍 Starting validation phase...');
    const validation = await this.newCheckinService.canCheckIn(pubId);

    if (!validation.allowed) {
      console.log('[NewCheckinStore] ❌ Validation failed:', validation.reason);
      throw new Error(validation.reason);
    }
    console.log('[NewCheckinStore] ✅ All validations passed - proceeding with check-in');

    // 🆕 Carpet Detection Phase
    let carpetImageKey: string | undefined;
    if (this._carpetDetectionEnabled()) {
      console.log('[NewCheckinStore] 📸 Starting carpet detection phase...');
      
      // Check if pub has carpet references (for now always true)
      const hasReferences = await this.pubHasCarpetReferences(pubId);
      
      if (hasReferences) {
        console.log('[NewCheckinStore] 📸 Requesting carpet scan for pub:', pubId);
        
        // Signal that we need carpet scanning
        this._needsCarpetScan.set(pubId);
        
        // Wait for carpet scan result
        carpetImageKey = await this.waitForCarpetScanResult();
        
        if (carpetImageKey) {
          console.log('[NewCheckinStore] ✅ Carpet captured successfully:', carpetImageKey);
        } else {
          console.log('[NewCheckinStore] ℹ️ No carpet detected or capture skipped');
        }
      } else {
        console.log('[NewCheckinStore] ℹ️ No carpet references for this pub, skipping detection');
      }
    } else {
      console.log('[NewCheckinStore] ⏭️ Carpet detection disabled, skipping');
    }

    // Creation phase with carpet data
    console.log('[NewCheckinStore] 💾 Starting check-in creation...');
    const newCheckinId = await this.newCheckinService.createCheckin(pubId, carpetImageKey);
    console.log('[NewCheckinStore] ✅ Check-in creation completed successfully');

    // Add to local store immediately
    const userId = this.authStore.uid();
    console.log('[NewCheckinStore] 🔄 Adding to local store:', { userId, newCheckinId, hasUserId: !!userId, hasId: !!newCheckinId });
    
    if (userId && newCheckinId) {
      const newCheckin: CheckIn = {
        id: newCheckinId,
        userId,
        pubId,
        timestamp: Timestamp.now(),
        dateKey: new Date().toISOString().split('T')[0],
        ...(carpetImageKey && { carpetImageKey })
      };
      
      console.log('[NewCheckinStore] 🔄 Before addItem - current data count:', this.data().length);
      this.addItem(newCheckin);
      console.log('[NewCheckinStore] 🔄 After addItem - new data count:', this.data().length);
      
      this._checkinSuccess.set(newCheckin);
      console.log('[NewCheckinStore] ✅ Added new check-in to local store:', newCheckin);

      // ✅ No need to update UserStore with checkedInPubIds anymore!
      // UserStore.pubsVisited now computes from NewCheckinStore.checkins() data
      // This eliminates redundant UserStore updates and reduces Firebase writes
      console.log('[NewCheckinStore] ✅ Pub count will update automatically via UserStore computed signal');
    } else {
      console.warn('[NewCheckinStore] ❌ Cannot add to local store - missing userId or newCheckinId');
    }

    // Success flow - gather data and show overlay
    console.log('[NewCheckinStore] 🎉 Starting success flow...');
    await this.handleSuccessFlow(pubId, carpetImageKey);

  } catch (error: any) {
    console.error('[NewCheckinStore] ❌ Check-in process failed:', error);
    console.error('[NewCheckinStore] ❌ Error message:', error?.message);

    // Error flow - show error overlay
    console.log('[NewCheckinStore] 💥 Starting error flow...');
    this.handleErrorFlow(error?.message || 'Check-in failed');

    throw error;

  } finally {
    this._isProcessing.set(false);
    console.log('[NewCheckinStore] 🔄 Set processing to false');
  }
}



  /**
   * Check if pub has carpet references
   */
  private async pubHasCarpetReferences(pubId: string): Promise<boolean> {
    console.log('[NewCheckinStore] Checking carpet references for pub:', pubId);
    // TODO: Implement actual reference checking when service is ready
    // For now, assume all pubs have carpet references
    return true;
  }

  /**
   * Wait for carpet scan result from UI component
   */
  private async waitForCarpetScanResult(): Promise<string | undefined> {
    console.log('[NewCheckinStore] Waiting for carpet scan result...');
    
    // Create a promise that will be resolved when we receive the scan result
    return new Promise<string | undefined>((resolve) => {
      // Store the resolver so we can call it from processCarpetScanResult
      this.carpetScanResolver = resolve;
      
      // Set a timeout to auto-resolve if user takes too long or cancels
      setTimeout(() => {
        if (this.carpetScanResolver) {
          console.log('[NewCheckinStore] Carpet scan timeout - proceeding without carpet');
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
    console.log('[NewCheckinStore] Processing carpet scan result:', imageKey);
    
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
    console.log('%c*** CAMERA: 🚨 AGGRESSIVE CAMERA CLEANUP STARTING 🚨', 'color: red; font-weight: bold; font-size: 14px;');
    
    // 1. Stop all video elements first
    document.querySelectorAll('video').forEach((video, index) => {
      console.log(`%c*** CAMERA: Found video element #${index}:`, 'color: red; font-weight: bold;', video.srcObject ? 'HAS STREAM' : 'NO STREAM');
      if (video.srcObject) {
        const stream = video.srcObject as MediaStream;
        console.log(`%c*** CAMERA: Video #${index} has ${stream.getTracks().length} tracks`, 'color: red; font-weight: bold;');
        stream.getTracks().forEach((track, trackIndex) => {
          console.log(`%c*** CAMERA: Stopping video #${index} track #${trackIndex}: ${track.kind} (${track.label}) - readyState: ${track.readyState}`, 'color: red; font-weight: bold;');
          track.stop();
        });
        video.srcObject = null;
        video.pause();
        console.log(`%c*** CAMERA: Video element #${index} cleaned up`, 'color: red; font-weight: bold;');
      }
    });
    
    // 2. Stop any tracks that might still be active
    console.log('%c*** CAMERA: Attempting to enumerate and stop all media devices...', 'color: red; font-weight: bold;');
    
    // Try multiple approaches to stop camera
    try {
      // Approach 1: Get fresh camera access and immediately stop it
      navigator.mediaDevices?.getUserMedia({ video: true, audio: false })
        .then(stream => {
          console.log(`%c*** CAMERA: Got fresh camera stream with ${stream.getTracks().length} tracks - stopping immediately`, 'color: red; font-weight: bold;');
          stream.getTracks().forEach((track, index) => {
            console.log(`%c*** CAMERA: Emergency stop track #${index}: ${track.kind} (${track.label})`, 'color: red; font-weight: bold;');
            track.stop();
          });
        })
        .catch(error => {
          console.log('%c*** CAMERA: Could not get fresh camera stream (this is probably good):', 'color: green; font-weight: bold;', error.message);
        });
    } catch (error) {
      console.log('%c*** CAMERA: Error during emergency camera cleanup:', 'color: red; font-weight: bold;', error);
    }
    
    console.log('%c*** CAMERA: 🚨 AGGRESSIVE CAMERA CLEANUP COMPLETE 🚨', 'color: red; font-weight: bold; font-size: 14px;');
  }

  /**
   * Handle successful check-in flow
   */
  private async handleSuccessFlow(pubId: string, carpetImageKey?: string): Promise<void> {
    console.log('[NewCheckinStore] 🎉 Gathering success data for pub:', pubId);

    try {
      const userId = this.authStore.uid();
      const pub = this.pubStore.get(pubId);

      if (!userId) {
        console.log('[NewCheckinStore] 📊 No authenticated user found');
        return;
      }

      // Check if this is user's first ever check-in
      const totalCheckins = await this.newCheckinService.getUserTotalCheckinCount(userId);
      const isFirstEver = totalCheckins === 1;

      console.log('[NewCheckinStore] 📊 Basic data:', {
        userId,
        pubName: pub?.name,
        totalCheckins,
        isFirstEver,
        hasCarpet: !!carpetImageKey,
        timestamp: new Date().toISOString()
      });

      // Handle home pub collection for first-time users
      if (isFirstEver) {
        console.log('[NewCheckinStore] 🏠 First ever check-in detected!');
        // TODO: Implement home pub selection logic
      }

      // Calculate points (including carpet bonus if applicable)
      const pointsData = await this.calculatePoints(pubId, !!carpetImageKey);

      // Check for new badges
      // Get the newly created check-in from our success signal
      const newCheckin = this._checkinSuccess();
      if (!newCheckin) {
        console.error('[NewCheckinStore] No check-in data available for badge evaluation');
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
        console.log('[NewCheckinStore] 🏅 Badges evaluated, awarded:', awardedBadges);
      } catch (error) {
        console.error('[NewCheckinStore] Badge evaluation error:', error);
        // Don't let badge errors break the check-in flow
        awardedBadges = [];
      }

      // Check landlord status
      // TODO: Implement landlord check

      // Assemble success data
      const successData = {
        success: true,
        checkin: {
          pubId,
          timestamp: new Date().toISOString(),
          carpetImageKey
        },
        pub: {
          name: pub?.name || 'Unknown Pub',
          location: pub?.location
        },
        points: pointsData,
        badges: awardedBadges,
        isFirstEver,
        carpetCaptured: !!carpetImageKey
      };

      console.log('[NewCheckinStore] 🎉 Success data assembled:', successData);

      // Show success overlay
      this.showCheckinResults(successData);

    } catch (error) {
      console.error('[NewCheckinStore] ❌ Error in success flow:', error);
    }
  }

    /**
   * ✅ NEW: Handle first ever check-in - collect home pub info
   */
    private async handleFirstEverCheckin(userId: string, pubId: string, pub: any): Promise<void> {
      console.log('[NewCheckinStore] 🏠 Handling first ever check-in for user:', userId);

      try {
        // For now, assume this pub is their home pub
        // TODO: Replace with overlay asking user to confirm/select home pub

        console.log('[NewCheckinStore] 🏠 [ASSUMPTION] Setting current pub as home pub...');
        console.log('[NewCheckinStore] 🏠 [TODO] Show overlay: "Is this your local pub?"');
        console.log('[NewCheckinStore] 🏠 [TODO] Allow user to search/select different home pub');

        await this.setUserHomePub(userId, pubId, pub);

      } catch (error) {
        console.error('[NewCheckinStore] 🏠 Error handling first check-in:', error);
        // Don't fail the check-in process, just log the error
      }
    }


    /**
   * ✅ NEW: Set user's home pub (stub for now)
   */
  private async setUserHomePub(userId: string, pubId: string, pub: any): Promise<void> {
    console.log('[NewCheckinStore] 🏠 Setting home pub for user:', userId, 'pub:', pubId);

    try {
      // TODO: Save to user profile in Firestore
      console.log('[NewCheckinStore] 🏠 [STUB] Would save to user profile:');
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

      console.log('[NewCheckinStore] 🏠 Home pub set successfully (stubbed)');

    } catch (error) {
      console.error('[NewCheckinStore] 🏠 Error setting home pub:', error);
    }
  }

    /**
   * Enable/disable carpet detection
   */
    setCarpetDetectionEnabled(enabled: boolean): void {
      console.log('[NewCheckinStore] 🎛️ Carpet detection:', enabled ? 'enabled' : 'disabled');
      this._carpetDetectionEnabled.set(enabled);
    }

  /**
   * ✅ NEW: Handle error flow
   */
  private handleErrorFlow(errorMessage: string): void {
    console.log('[NewCheckinStore] 💥 Handling error flow:', errorMessage);

    const errorData = {
      success: false,
      error: errorMessage,
      debugInfo: {
        flow: 'NewCheckinStore',
        timestamp: new Date().toISOString(),
        source: 'validation_or_creation_failure'
      }
    };

    console.log('[NewCheckinStore] 💥 Error data assembled:', errorData);
    console.log('[NewCheckinStore] 🔄 Showing check-in results...');
    this.showCheckinResults(errorData);
  }
  /**
   * Show check-in results overlay
   */
  private showCheckinResults(data: any): void {
    console.log('[NewCheckinStore] 📱 Showing check-in results:', data);

    if (data.success) {
      console.log('[NewCheckinStore] 🎉 Calling CheckInModalService.showCheckInResults for SUCCESS');
      
      // Show success modal like the old flow
      this.checkInModalService.showCheckInResults({
        success: true,
        checkin: {
          id: data.checkin.id,
          userId: data.checkin.userId,
          pubId: data.checkin.pubId,
          timestamp: data.checkin.timestamp,
          dateKey: data.checkin.dateKey,
          carpetImageKey: data.checkin.carpetImageKey
        },
        pub: {
          id: data.checkin.pubId,
          name: data.pub.name
        },
        points: data.points,
        badges: data.badges || [],
        isNewLandlord: false, // TODO: Implement landlord check
        carpetCaptured: data.carpetCaptured
      });
      
      console.log('[NewCheckinStore] ✅ CheckInModalService.showCheckInResults called');
    } else {
      console.log('[NewCheckinStore] ❌ Calling CheckInModalService.showCheckInResults for ERROR');
      
      // Show error modal
      this.checkInModalService.showCheckInResults({
        success: false,
        error: data.error || 'Check-in failed'
      });
    }
  }


  /**
   * Calculate points for check-in (with carpet bonus)
   */
  private async calculatePoints(pubId: string, hasCarpet: boolean): Promise<any> {
    console.log('[NewCheckinStore] 🎯 Calculating points for pub:', pubId, 'hasCarpet:', hasCarpet);

    const userId = this.authStore.uid();
    if (!userId) {
      console.log('[NewCheckinStore] 🎯 No user ID - cannot calculate points');
      return { total: 0, breakdown: [] };
    }

    try {
      // Get check-in context
      const [isFirstVisit, totalCheckins] = await Promise.all([
        this.newCheckinService.isFirstEverCheckIn(userId, pubId),
        this.newCheckinService.getUserTotalCheckinCount(userId)
      ]);

      // TODO: Calculate real distance from home pub
      const distanceFromHome = 0;

      // Build PointsStore data structure
      const pointsData = {
        pubId,
        distanceFromHome,
        isFirstVisit,
        isFirstEver: totalCheckins === 1,
        currentStreak: 0, // TODO: Calculate streak
        hasPhoto: false,
        sharedSocial: false,
        // 🆕 Carpet bonus
        hasCarpet
      };

      console.log('[NewCheckinStore] 🎯 Points context data prepared:', pointsData);

      // Use PointsStore to calculate AND persist points
      const pointsBreakdown = await this.pointsStore.awardCheckInPoints(pointsData);

      console.log('[NewCheckinStore] 🎯 PointsStore returned breakdown:', pointsBreakdown);

      // Convert to display format
      const result = {
        total: pointsBreakdown.total,
        breakdown: [
          { reason: 'Base check-in', points: pointsBreakdown.base },
          ...(pointsBreakdown.distance > 0 ? [{ reason: 'Distance bonus', points: pointsBreakdown.distance }] : []),
          ...(pointsBreakdown.bonus > 0 ? [{ reason: 'Bonus points', points: pointsBreakdown.bonus }] : [])
        ]
      };

      console.log('[NewCheckinStore] 🎯 Points calculated and awarded:', result);
      return result;

    } catch (error) {
      console.error('[NewCheckinStore] ❌ Points calculation failed:', error);
      return { total: 0, breakdown: [] };
    }
  }


  private async checkForNewBadges(userId: string, pubId: string): Promise<any> {
    // try {
    //   console.log('🔄 [NewCheckinStore] Calling BadgeAwardService.evaluateBadges...');

      // This will handle the complete badge workflow
      // await this.badgeAwardService.evaluateAndAwardBadges(userId);

      // Force BadgeStore to reload fresh data
      // await this._badgeStore.load();

      // const userBadges = this._badgeStore.earnedBadges();
      // const recentBadges = this._badgeStore.recentBadges();

      // console.log('🎖️ [NewCheckinStore] Badge evaluation complete:', {
      //   totalBadges: userBadges.length,
      //   recentCount: recentBadges.length
      // });

      // return {
      //   totalBadges: userBadges.length,
      //   recentBadges: recentBadges.slice(0, 3), // Show 3 most recent
      //   newlyAwarded: [] // TODO: Track which were just awarded
      // };

    // } catch (error) {
    //   console.error('❌ [NewCheckinStore] Badge evaluation failed:', error);
    //   return { error: error.message };
    // }
  }


  /**
   * 🚧 STUB: Check landlord status
   */
  private async checkLandlordStatus(pubId: string): Promise<any> {
    console.log('[NewCheckinStore] 👑 [STUB] Checking landlord status for pub:', pubId);

    // Simulate landlord check delay
    await new Promise(resolve => setTimeout(resolve, 75));

    const stubData = {
      isNewLandlord: false, // TODO: Check if user became landlord today
      currentLandlord: null, // TODO: Get current landlord
      message: null,
      debug: {
        todayDateKey: new Date().toISOString().split('T')[0],
        firstCheckinToday: false // TODO: Check if this was first check-in today
      }
    };

    console.log('[NewCheckinStore] 👑 [STUB] Landlord check complete:', stubData);
    return stubData;
  }
}
