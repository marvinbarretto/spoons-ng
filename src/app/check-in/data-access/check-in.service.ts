// =====================================
// 🔧 checkin SERVICE - COMPLETE FIREBASE INTEGRATION
// =====================================

// src/app/checkin/data-access/checkin.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { FirestoreService } from '@fourfold/angular-foundation';
import { Timestamp, where } from 'firebase/firestore';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../../auth/data-access/auth.store';
import { NearbyPubStore } from '../../pubs/data-access/nearby-pub.store';
import { AnalyticsService } from '@shared/data-access/analytics.service';
import type { CheckIn } from '../utils/check-in.models';

@Injectable({ providedIn: 'root' })
export class CheckInService extends FirestoreService {
  protected path: string = 'checkins';

  // Firebase handles caching automatically with offline persistence

  // Global check-ins signal for leaderboard reactivity
  private readonly _allCheckIns = signal<CheckIn[]>([]);
  readonly allCheckIns = this._allCheckIns.asReadonly();

  // Loading state for global check-ins
  private readonly _loadingAllCheckIns = signal(false);
  readonly loadingAllCheckIns = this._loadingAllCheckIns.asReadonly();

  // Clean dependencies - no underscores for services
  protected readonly authStore = inject(AuthStore);
  protected readonly nearbyPubStore = inject(NearbyPubStore);
  private readonly analytics = inject(AnalyticsService);

  /**
   * Check if user can check in to this pub
   *
   * @param pubId - The pub to validate check-in for
   * @returns Promise<{allowed: boolean, reason?: string}>
   */
  async canCheckIn(pubId: string): Promise<{ allowed: boolean; reason?: string }> {
    console.log('[CheckInService] 🔍 Running check-in validations for pub:', pubId);
    
    // Track validation attempt
    this.analytics.trackFeatureUsage('check_in_validation_start', 'check_in_flow');

    // Gate 1: Daily limit check
    if (environment.ACTIVE_DEVELOPMENT_MODE) {
      console.log(
        '[CheckInService] 📅 Daily limit check SKIPPED (ACTIVE_DEVELOPMENT_MODE enabled)'
      );
    } else {
      console.log('[CheckInService] 📅 Running daily limit check...');
      const dailyCheck = await this.dailyLimitCheck(pubId);
      if (!dailyCheck.passed) {
        console.log('[CheckInService] ❌ Failed daily limit check:', dailyCheck.reason);
        this.analytics.trackUserFriction('daily_limit_exceeded', 'check_in_flow');
        return { allowed: false, reason: dailyCheck.reason };
      }
      console.log('[CheckInService] ✅ Daily limit check passed');
    }

    // Gate 2: Proximity check
    if (environment.ACTIVE_DEVELOPMENT_MODE) {
      console.log('[CheckInService] 📍 Proximity check SKIPPED (ACTIVE_DEVELOPMENT_MODE enabled)');
    } else {
      console.log('[CheckInService] 📍 Starting proximity validation...');
      const proximityCheck = await this.proximityCheck(pubId);
      if (!proximityCheck.passed) {
        console.log('[CheckInService] ❌ Failed proximity check:', proximityCheck.reason);
        this.analytics.trackUserFriction('proximity_check_failed', 'check_in_flow');
        return { allowed: false, reason: proximityCheck.reason };
      }
      console.log('[CheckInService] ✅ Proximity check passed');
    }

    // All gates passed
    console.log('[CheckInService] ✅ All validations passed - check-in allowed');
    this.analytics.trackFeatureUsage('check_in_validation_success', 'check_in_flow');
    return { allowed: true };
  }

  /**
   * 🔄 UPDATED: Check if user has already checked into this pub today
   * Now uses REAL Firestore data instead of simulation
   */
  private async dailyLimitCheck(pubId: string): Promise<{ passed: boolean; reason?: string }> {
    console.log('[CheckInService] 📅 Checking REAL daily limit for pub:', pubId);

    try {
      // ✅ REAL: Get current user
      const userId = this.authStore.uid();
      if (!userId) {
        console.log('[CheckInService] 📅 No authenticated user found');
        return { passed: false, reason: 'You must be logged in to check in' };
      }

      console.log('[CheckInService] 📅 Checking for existing check-in today...', { userId, pubId });

      // ✅ REAL: Build today's date key
      const todayDateKey = new Date().toISOString().split('T')[0];
      console.log("[CheckInService] 📅 Today's date key:", todayDateKey);

      // ✅ REAL: Query Firestore for today's check-in using inherited FirestoreService method
      const existingCheckins = await this.getDocsWhere<CheckIn>(
        'checkins',
        where('userId', '==', userId),
        where('pubId', '==', pubId),
        where('dateKey', '==', todayDateKey)
      );

      console.log('[CheckInService] 📅 Query results:', {
        collection: 'checkins',
        query: { userId, pubId, dateKey: todayDateKey },
        resultCount: existingCheckins.length,
      });

      if (existingCheckins.length > 0) {
        const existingCheckin = existingCheckins[0];
        console.log('[CheckInService] ❌ Found existing check-in today:', {
          checkinId: existingCheckin.id,
          timestamp: existingCheckin.timestamp,
          dateKey: existingCheckin.dateKey,
        });

        return {
          passed: false,
          reason: 'You have already checked into this pub today. Try again tomorrow!',
        };
      }

      console.log('[CheckInService] ✅ No existing check-in found for today - user can check in');
      return { passed: true };
    } catch (error: any) {
      console.error('[CheckInService] 📅 Error checking daily limit:', error);
      console.error('[CheckInService] 📅 Error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
      });

      return {
        passed: false,
        reason: 'Could not verify daily check-in limit. Please try again.',
      };
    }
  }

  /**
   * Check if user is close enough to the pub
   */
  private async proximityCheck(pubId: string): Promise<{ passed: boolean; reason?: string }> {
    console.log('[CheckInService] 📍 Checking proximity to pub:', pubId);

    try {
      // Get real distance using NearbyPubStore
      console.log('[CheckInService] 📍 Getting real distance to pub...');
      const distance = this.nearbyPubStore.getDistanceToPub(pubId);

      if (distance === null) {
        console.log(
          '[CheckInService] 📍 Could not determine distance (no location or pub not found)'
        );
        return { passed: false, reason: 'Could not determine your location or pub location' };
      }

      console.log('[CheckInService] 📍 Real distance calculated:', Math.round(distance), 'meters');

      // Check if within range (using same threshold as NearbyPubStore)
      const isWithinRange = this.nearbyPubStore.isWithinCheckInRange(pubId);
      console.log('[CheckInService] 📍 Within check-in range?', isWithinRange);

      if (!isWithinRange) {
        const distanceInMeters = Math.round(distance);
        const threshold = environment.checkInDistanceThresholdMeters || 200;
        console.log('[CheckInService] 📍 User is too far from pub');
        return {
          passed: false,
          reason: `You are ${distanceInMeters}m away. Must be within ${threshold}m to check in.`,
        };
      }

      console.log('[CheckInService] 📍 User is within check-in range');
      return { passed: true };
    } catch (error) {
      console.error('[CheckInService] 📍 Error checking proximity:', error);
      return { passed: false, reason: 'Failed to check your location' };
    }
  }

  /**
   * Create a new check-in with complete data including points, badges, landlord status
   *
   * @param pubId - The pub to check into
   * @param carpetImageKey - Optional key for captured carpet image
   * @param checkinData - Optional complete check-in data to save (if not provided, creates minimal check-in)
   * @returns Promise<string> - The ID of the created check-in document
   */
  async createCheckin(
    pubId: string,
    carpetImageKey?: string,
    checkinData?: Partial<CheckIn>
  ): Promise<string> {
    console.log('[CheckInService] 💾 Creating REAL check-in for pub:', pubId);

    if (carpetImageKey) {
      console.log('[CheckInService] 🎨 Including carpet image key:', carpetImageKey);
    }

    if (checkinData) {
      console.log('[CheckInService] 📋 Complete check-in data provided:', {
        hasPointsEarned: 'pointsEarned' in checkinData,
        hasPointsBreakdown: 'pointsBreakdown' in checkinData,
        hasBadgeName: 'badgeName' in checkinData,
        hasMadeUserLandlord: 'madeUserLandlord' in checkinData,
        hasMissionUpdated: 'missionUpdated' in checkinData,
      });
    }

    const userId = this.authStore.uid();
    if (!userId) {
      console.log('[CheckInService] ❌ No authenticated user - cannot create check-in');
      throw new Error('User must be authenticated to check in');
    }

    // Build check-in data
    const timestamp = new Date();
    const dateKey = timestamp.toISOString().split('T')[0];

    // Create complete check-in data including all calculated fields
    const completeCheckinData: Omit<CheckIn, 'id'> = {
      userId,
      pubId,
      timestamp: Timestamp.fromDate(timestamp),
      dateKey,
      // Include carpet image key if provided
      ...(carpetImageKey && { carpetImageKey }),
      // Include all additional check-in data (points, badges, landlord status, etc.)
      ...checkinData,
    };

    console.log('[CheckInService] 💾 Complete check-in data prepared:', {
      userId: completeCheckinData.userId,
      pubId: completeCheckinData.pubId,
      timestamp: timestamp.toISOString(),
      dateKey: completeCheckinData.dateKey,
      pointsEarned: completeCheckinData.pointsEarned,
      hasPointsBreakdown: !!completeCheckinData.pointsBreakdown,
      badgeName: completeCheckinData.badgeName,
      madeUserLandlord: completeCheckinData.madeUserLandlord,
      missionUpdated: completeCheckinData.missionUpdated,
      carpetImageKey: completeCheckinData.carpetImageKey,
    });

    // Save to Firestore
    console.log(
      '[CheckInService] 💾 Saving complete check-in data to Firestore collection: checkins'
    );

    const docRef = await this.addDocToCollection('checkins', completeCheckinData);
    const docId = docRef.id;
    
    // Track successful check-in creation with detailed analytics
    const isFirstTime = await this.isFirstEverCheckIn(userId, pubId);
    this.analytics.trackCheckIn(
      pubId,
      isFirstTime,
      !!carpetImageKey,
      undefined // timeSpent will be calculated elsewhere
    );

    console.log('[CheckInService] ✅ Check-in created successfully with complete data!');
    console.log('[CheckInService] ✅ Firestore document ID:', docId);
    console.log('[CheckInService] ✅ Document path:', `checkins/${docId}`);
    console.log('[CheckInService] ✅ Points saved:', completeCheckinData.pointsEarned);
    console.log('[CheckInService] ✅ Badge awarded:', completeCheckinData.badgeName || 'none');
    console.log(
      '[CheckInService] ✅ Made landlord:',
      completeCheckinData.madeUserLandlord || false
    );
    
    // Track check-in success metrics
    this.analytics.trackFeatureUsage('check_in_create_success', 'check_in_flow');
    
    if (completeCheckinData.badgeName) {
      this.analytics.trackFeatureUsage('badge_earned', 'badges', 0);
    }
    
    if (completeCheckinData.madeUserLandlord) {
      this.analytics.trackFeatureUsage('became_landlord', 'landlord', 0);
    }

    if (carpetImageKey) {
      console.log('[CheckInService] 🎨 Carpet image linked to check-in:', carpetImageKey);
    }

    // Log the complete document for debugging
    console.log('[CheckInService] 📄 Complete Firestore document saved:', {
      collection: 'checkins',
      documentId: docId,
      data: completeCheckinData,
    });

    return docId;
  }

  /**
   * Load all check-ins for a specific user
   */
  async loadUserCheckins(userId: string): Promise<CheckIn[]> {
    console.log('[CheckInService] 📡 Loading check-ins for user:', userId);

    try {
      const checkins = await this.getDocsWhere<CheckIn>('checkins', where('userId', '==', userId));

      console.log('[CheckInService] 📡 Loaded check-ins:', {
        userId,
        count: checkins.length,
      });

      return checkins;
    } catch (error) {
      console.error('[CheckInService] ❌ Failed to load user check-ins:', error);
      throw error;
    }
  }

  /**
   * Convert Firebase errors to user-friendly messages
   */
  private getFriendlyErrorMessage(error: any): string {
    // Common Firebase error patterns
    if (error?.code === 'permission-denied') {
      return 'You do not have permission to check in. Please try logging in again.';
    }

    if (error?.code === 'unavailable') {
      return 'Service temporarily unavailable. Please try again.';
    }

    if (error?.message?.includes('network')) {
      return 'Network error. Please check your connection and try again.';
    }

    // Default fallback
    return error?.message || 'Failed to save check-in. Please try again.';
  }

  /**
   * Check if this is the user's first ever check-in to this pub
   *
   * @param userId - The user to check
   * @param pubId - The pub to check
   * @returns Promise<boolean> - True if this is their first visit
   */
  async isFirstEverCheckIn(userId: string, pubId: string): Promise<boolean> {
    console.log('[CheckInService] 🔍 Checking if first visit...', { userId, pubId });

    try {
      const checkinCount = await this.getUserCheckinCount(userId, pubId);
      const isFirst = checkinCount === 1; // Just the one we created

      console.log('[CheckInService] 🔍 First visit check:', {
        checkinCount,
        isFirst,
        logic: 'count === 1 means first visit (just created)',
      });

      return isFirst;
    } catch (error) {
      console.error('[CheckInService] 🔍 Error checking first visit:', error);
      return false; // Default to false if we can't determine
    }
  }

  /**
   * Get total number of check-ins by user to this pub
   *
   * @param userId - The user to check
   * @param pubId - The pub to check
   * @returns Promise<number> - Total check-in count
   */
  async getUserCheckinCount(userId: string, pubId: string): Promise<number> {
    console.log('[CheckInService] 📊 Getting user check-in count...', { userId, pubId });

    try {
      const checkins = await this.getDocsWhere<CheckIn>(
        'checkins',
        where('userId', '==', userId),
        where('pubId', '==', pubId)
      );

      console.log('[CheckInService] 📊 Check-in count query result:', {
        collection: 'checkins',
        query: { userId, pubId },
        resultCount: checkins.length,
      });

      return checkins.length;
    } catch (error) {
      console.error('[CheckInService] 📊 Error getting check-in count:', error);
      return 0; // Default to 0 if we can't query
    }
  }

  /**
   * Get total number of check-ins by user across all pubs
   *
   * @param userId - The user to check
   * @returns Promise<number> - Total check-in count across all pubs
   */
  async getUserTotalCheckinCount(userId: string): Promise<number> {
    console.log('[CheckInService] 📊 Getting user total check-in count...', { userId });

    try {
      const allCheckins = await this.getDocsWhere<CheckIn>(
        'checkins',
        where('userId', '==', userId)
      );

      console.log('[CheckInService] 📊 Total check-in count query result:', {
        collection: 'checkins',
        query: { userId },
        resultCount: allCheckins.length,
      });

      return allCheckins.length;
    } catch (error) {
      console.error('[CheckInService] 📊 Error getting total check-in count:', error);
      return 0;
    }
  }

  /**
   * Get number of unique pubs user has visited
   *
   * @param userId - The user to check
   * @returns Promise<number> - Number of unique pubs visited
   */
  async getUserUniquePubCount(userId: string): Promise<number> {
    console.log('[CheckInService] 🏠 Getting unique pub count...', { userId });

    try {
      const allCheckins = await this.getDocsWhere<CheckIn>(
        'checkins',
        where('userId', '==', userId)
      );

      const uniquePubIds = new Set(allCheckins.map(checkin => checkin.pubId));
      const uniqueCount = uniquePubIds.size;

      console.log('[CheckInService] 🏠 Unique pub count query result:', {
        totalCheckins: allCheckins.length,
        uniquePubs: uniqueCount,
        pubIds: Array.from(uniquePubIds),
      });

      return uniqueCount;
    } catch (error) {
      console.error('[CheckInService] 🏠 Error getting unique pub count:', error);
      return 0;
    }
  }

  /**
   * Get all check-ins from all users (for leaderboard)
   */
  async getAllCheckIns(): Promise<CheckIn[]> {
    try {
      console.log('[CheckInService] Loading all check-ins for global reactivity...');
      const checkIns = await this.getDocsWhere<CheckIn>('checkins');
      console.log(`[CheckInService] Loaded ${checkIns.length} check-ins from all users`);
      return checkIns;
    } catch (error) {
      console.error('[CheckInService] Failed to load all check-ins:', error);
      throw error;
    }
  }

  /**
   * Get all check-ins from server (bypasses cache) for real-time competitive data
   * Use this for leaderboard aggregation to ensure fresh cross-user data
   */
  async getAllCheckInsFromServer(): Promise<CheckIn[]> {
    try {
      console.log('[CheckInService] 🌐 Fetching ALL check-ins from server (bypassing cache)...');
      const checkIns = await this.getDocsWhereFromServer<CheckIn>('checkins');
      console.log(
        `[CheckInService] ✅ Server fetch complete: ${checkIns.length} check-ins (fresh data)`
      );
      console.log('[CheckInService] 🔍 Fresh server check-ins summary:', {
        totalCheckIns: checkIns.length,
        uniqueUsers: new Set(checkIns.map(c => c.userId)).size,
        withPoints: checkIns.filter(c => (c.pointsEarned || 0) > 0).length,
      });
      return checkIns;
    } catch (error) {
      console.error('[CheckInService] ❌ Failed to load all check-ins from server:', error);
      throw error;
    }
  }

  /**
   * Load all check-ins and update the signal for reactive leaderboard
   * Uses fresh server data to ensure real-time competitive updates
   */
  async loadAllCheckIns(): Promise<void> {
    this._loadingAllCheckIns.set(true);
    const startTime = Date.now();
    
    try {
      console.log(
        '[CheckInService] 🏆 Loading all check-ins for leaderboard (fresh server data)...'
      );
      // 🔥 Use server-side fetch to bypass cache for real-time leaderboard data
      const checkIns = await this.getAllCheckInsFromServer();
      console.log(`[CheckInService] ✅ Loaded ${checkIns.length} fresh check-ins for leaderboard`);
      this._allCheckIns.set(checkIns);
      
      // Track data loading performance
      const loadTime = Date.now() - startTime;
      this.analytics.trackFeatureUsage('leaderboard_data_load', 'leaderboard', loadTime);
      
      if (loadTime > 3000) {
        this.analytics.trackPerformanceIssue('slow_load', 'leaderboard', 'high');
      }
    } catch (error) {
      console.error('[CheckInService] ❌ Failed to load all check-ins from server:', error);
      this.analytics.trackUserFriction('leaderboard_load_failed', 'leaderboard');
      throw error;
    } finally {
      this._loadingAllCheckIns.set(false);
    }
  }

  /**
   * Refresh global check-ins data
   */
  async refreshAllCheckIns(): Promise<void> {
    console.log('[CheckInService] Refreshing all check-ins data...');
    await this.loadAllCheckIns();
  }

  /**
   * Add a check-in to the global check-ins signal (for immediate reactivity)
   */
  addCheckInToGlobalSignal(checkIn: CheckIn): void {
    this._allCheckIns.update(checkIns => {
      const exists = checkIns.some(
        c =>
          c.userId === checkIn.userId &&
          c.pubId === checkIn.pubId &&
          c.timestamp.isEqual(checkIn.timestamp)
      );
      if (!exists) {
        console.log(
          `[CheckInService] Adding check-in to global signal: ${checkIn.userId} -> ${checkIn.pubId}`
        );
        return [...checkIns, checkIn];
      }
      return checkIns;
    });
  }

  /**
   * Remove a check-in from the global check-ins signal
   */
  removeCheckInFromGlobalSignal(checkInId: string): void {
    this._allCheckIns.update(checkIns => {
      const filtered = checkIns.filter(c => c.id !== checkInId);
      if (filtered.length !== checkIns.length) {
        console.log(`[CheckInService] Removed check-in ${checkInId} from global signal`);
      }
      return filtered;
    });
  }
}
