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

@Injectable({ providedIn: 'root' })
export class NewCheckinStore {
  private readonly newCheckinService = inject(NewCheckinService);
  private readonly overlayService = inject(OverlayService);
  private readonly authStore = inject(AuthStore);
  private readonly pubStore = inject(PubStore);
  private readonly pointsStore = inject(PointsStore);
  private readonly badgeAwardService = inject(BadgeAwardService);

  private readonly _isProcessing = signal(false);
  readonly isProcessing = this._isProcessing.asReadonly();

  /**
   * Check in to a pub
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

      // Creation phase
      console.log('[NewCheckinStore] 💾 Starting check-in creation...');
      await this.newCheckinService.createCheckin(pubId);
      console.log('[NewCheckinStore] ✅ Check-in creation completed successfully');

      // ✅ NEW: Success flow - gather data and show overlay
      console.log('[NewCheckinStore] 🎉 Starting success flow...');
      await this.handleSuccessFlow(pubId);

    } catch (error: any) {
      console.error('[NewCheckinStore] ❌ Check-in process failed:', error);
      console.error('[NewCheckinStore] ❌ Error message:', error?.message);

      // ✅ NEW: Error flow - show error overlay
      console.log('[NewCheckinStore] 💥 Starting error flow...');
      this.handleErrorFlow(error?.message || 'Check-in failed');

      throw error;

    } finally {
      this._isProcessing.set(false);
      console.log('[NewCheckinStore] 🔄 Set processing to false');
    }
  }

  /**
   * ✅ NEW: Handle successful check-in flow
   */
  private async handleSuccessFlow(pubId: string): Promise<void> {
    console.log('[NewCheckinStore] 🎉 Gathering success data for pub:', pubId);

    try {
      const userId = this.authStore.uid();
      const pub = this.pubStore.get(pubId);

      if (!userId) {
        console.log('[NewCheckinStore] 📊 No authenticated user found');
        return;
      }

      // ✅ NEW: Check if this is user's first ever check-in
      const totalCheckins = await this.newCheckinService.getUserTotalCheckinCount(userId);
      const isFirstEver = totalCheckins === 1;

      console.log('[NewCheckinStore] 📊 Basic data:', {
        userId,
        pubName: pub?.name,
        totalCheckins,
        isFirstEver,
        timestamp: new Date().toISOString()
      });

      // ✅ NEW: Handle home pub collection for first-time users
      if (isFirstEver) {
        console.log('[NewCheckinStore] 🏠 First ever check-in detected!');
        await this.handleFirstEverCheckin(userId, pubId, pub);
      }

      // Calculate points (still using PointsStore but with real distance)
      const pointsData = await this.calculatePoints(pubId);

      const badgeData = await this.checkForNewBadges(userId, pubId);

      // Build success data (without badges - they'll be handled by CheckinStore)
      const successData = {
        success: true,
        checkin: {
          id: 'just-created',
          userId,
          pubId,
          timestamp: new Date(),
          dateKey: new Date().toISOString().split('T')[0]
        },
        pub: {
          id: pubId,
          name: pub?.name || 'Unknown Pub'
        },
        points: pointsData,
        isFirstEver,
        // badges: [], // Will be populated by CheckinStore effects
        debugInfo: {
          flow: 'NewCheckinStore',
          timestamp: new Date().toISOString(),
          userId,
          pubId,
          isFirstEver,
          totalCheckins
        }
      };

      console.log('[NewCheckinStore] 🎉 Success data assembled:', successData);
      this.showCheckInResults(successData);

    } catch (error) {
      console.error('[NewCheckinStore] ❌ Error in success flow:', error);
      this.showCheckInResults({
        success: true,
        error: 'Check-in successful but could not load details'
      });
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
    this.showCheckInResults(errorData);
  }

  /**
   * ✅ NEW: Show check-in results overlay
   */
  private showCheckInResults(data: any): void {
    console.log('[NewCheckinStore] 📱 Showing check-in results:', data);

    // TODO: Create proper overlay component
    // For now, just log what we would show
    console.log('[NewCheckinStore] 📱 OVERLAY WOULD SHOW:');
    console.log('  🎉 Success:', data.success);

    if (data.success) {
      console.log('  🏠 Pub:', data.pub?.name);
      console.log('  🎯 Points:', data.points);
      console.log('  🏅 Badges:', data.badges);
      console.log('  👑 Landlord:', data.landlord);
    } else {
      console.log('  ❌ Error:', data.error);
    }

    console.log('  🔧 Debug:', data.debugInfo);

    // TODO: Replace with real overlay
    // const { componentRef, close } = this.overlayService.open(
    //   NewCheckinSuccessComponent,
    //   {},
    //   { data }
    // );
  }

  /**
   * 🚧 STUB: Calculate points for this check-in
   */
  private async calculatePoints(pubId: string): Promise<any> {
    console.log('[NewCheckinStore] 🎯 Calculating points for pub:', pubId);

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

      // TODO: Calculate real distance from home pub (once we have home pub data)
      const distanceFromHome = 0; // Stub for now
      console.log('[NewCheckinStore] 🎯 [STUB] Distance from home:', distanceFromHome, 'km');
      console.log('[NewCheckinStore] 🎯 [TODO] Calculate real distance from user\'s home pub');

      // Build PointsStore data structure
      const pointsData = {
        pubId,
        distanceFromHome,
        isFirstVisit,
        isFirstEver: totalCheckins === 1,
        currentStreak: 0, // TODO: Calculate streak
        hasPhoto: false,
        sharedSocial: false
      };

      console.log('[NewCheckinStore] 🎯 Points context data prepared:', pointsData);

      // ✅ REAL: Use PointsStore to calculate AND persist points
      const pointsBreakdown = await this.pointsStore.awardCheckInPoints(pointsData);

      console.log('[NewCheckinStore] 🎯 PointsStore returned breakdown:', pointsBreakdown);

      // Convert to display format
      const result = {
        total: pointsBreakdown.total,
        breakdown: [
          { reason: 'Base check-in', points: pointsBreakdown.base },
          ...(pointsBreakdown.distance > 0 ? [{ reason: 'Distance bonus', points: pointsBreakdown.distance }] : []),
          ...(pointsBreakdown.bonus > 0 ? [{ reason: 'Bonus points', points: pointsBreakdown.bonus }] : [])
        ],
        rawBreakdown: pointsBreakdown,
        pointsData,
        debug: {
          source: 'PointsStore',
          isFirstVisit,
          isFirstEver: totalCheckins === 1,
          totalCheckins,
          distanceFromHome
        }
      };

      console.log('[NewCheckinStore] 🎯 REAL points calculated and awarded:', result);
      return result;

    } catch (error) {
      console.error('[NewCheckinStore] 🎯 Error calculating points:', error);

      return {
        total: 10,
        breakdown: [{ reason: 'Base check-in (fallback)', points: 10 }],
        debug: { source: 'fallback', error: true }
      };
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
