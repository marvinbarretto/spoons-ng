// =====================================
// 🎯 NEW-CHECKIN SUCCESS FLOW
// =====================================

// src/app/new-checkin/data-access/new-checkin.store.ts
import { Injectable, inject, signal } from '@angular/core';
import { NewCheckinService } from './new-checkin.service';
import { OverlayService } from '../../shared/data-access/overlay.service';
import { AuthStore } from '../../auth/data-access/auth.store';
import { PubStore } from '../../pubs/data-access/pub.store';
import { PointsStore } from '../../points/data-access/points.store';
import { BadgeAwardService } from '../../badges/data-access/badge-award.service';
import { CarpetCheckinIntegrationService } from '../../carpets/data-access/carpet-checkin-integration.service';


@Injectable({ providedIn: 'root' })
export class NewCheckinStore {
  private readonly newCheckinService = inject(NewCheckinService);
  private readonly overlayService = inject(OverlayService);
  private readonly authStore = inject(AuthStore);
  private readonly pubStore = inject(PubStore);
  private readonly pointsStore = inject(PointsStore);
  private readonly badgeAwardService = inject(BadgeAwardService);
  private readonly carpetIntegrationService = inject(CarpetCheckinIntegrationService);

  private readonly _isProcessing = signal(false);
  private readonly _carpetDetectionEnabled = signal(true); // Feature flag

  readonly isProcessing = this._isProcessing.asReadonly();
  readonly carpetDetectionEnabled = this._carpetDetectionEnabled.asReadonly();

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
      carpetImageKey = await this.detectAndCaptureCarpet(pubId);

      if (carpetImageKey) {
        console.log('[NewCheckinStore] ✅ Carpet captured successfully:', carpetImageKey);
      } else {
        console.log('[NewCheckinStore] ℹ️ No carpet detected or capture skipped');
      }
    } else {
      console.log('[NewCheckinStore] ⏭️ Carpet detection disabled, skipping');
    }

    // Creation phase with carpet data
    console.log('[NewCheckinStore] 💾 Starting check-in creation...');
    await this.newCheckinService.createCheckin(pubId, carpetImageKey);
    console.log('[NewCheckinStore] ✅ Check-in creation completed successfully');

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
   * 🆕 Detect and capture carpet image
   */
  private async detectAndCaptureCarpet(pubId: string): Promise<string | undefined> {
    console.log('[NewCheckinStore] 📸 Initiating carpet detection for pub:', pubId);

    try {
      // Check if pub has carpet references
      const hasReferences = await this.carpetIntegrationService.pubHasCarpetReferences(pubId);

      if (!hasReferences) {
        console.log('[NewCheckinStore] ℹ️ No carpet references for this pub, skipping detection');
        return undefined;
      }

      console.log('[NewCheckinStore] 🎯 Pub has carpet references, starting detection...');

      // Initialize carpet detection
      const result = await this.carpetIntegrationService.detectAndCaptureCarpet(pubId);

      if (result.success && result.imageKey) {
        console.log('[NewCheckinStore] 🎉 Carpet detection successful:', {
          imageKey: result.imageKey,
          confidence: result.confidence,
          matchType: result.matchType
        });
        return result.imageKey;
      } else {
        console.log('[NewCheckinStore] 📷 Carpet detection completed without match:', {
          reason: result.error || 'No confident match',
          confidence: result.confidence
        });
        return undefined;
      }
    } catch (error) {
      // Don't let carpet detection failures block check-in
      console.error('[NewCheckinStore] ⚠️ Carpet detection error (non-blocking):', error);
      return undefined;
    }
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
      const newBadges = await this.badgeAwardService.checkAndAwardBadges(userId);

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
        badges: newBadges,
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

    // TODO: Implement actual overlay
    console.log('[NewCheckinStore] 📱 OVERLAY WOULD SHOW:');
    console.log('  🎉 Success:', data.success);
    console.log('  🏠 Pub:', data.pub.name);
    console.log('  🎯 Points:', data.points);
    console.log('  🏅 Badges:', data.badges);
    console.log('  🎨 Carpet:', data.carpetCaptured ? 'Captured!' : 'None');
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
