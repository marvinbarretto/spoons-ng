// =====================================
// 🔧 NEW-CHECKIN SERVICE - COMPLETE FIREBASE INTEGRATION
// =====================================

// src/app/new-checkin/data-access/new-checkin.service.ts
import { Injectable, inject } from '@angular/core';
import { Timestamp, where } from 'firebase/firestore';
import { FirestoreService } from '../../shared/data-access/firestore.service';
import { NearbyPubStore } from '../../pubs/data-access/nearby-pub.store';
import { AuthStore } from '../../auth/data-access/auth.store';
import type { CheckIn } from '../../check-in/utils/check-in.models';

@Injectable({ providedIn: 'root' })
export class NewCheckinService extends FirestoreService {
  // Clean dependencies - no underscores for services
  private readonly authStore = inject(AuthStore);
  private readonly nearbyPubStore = inject(NearbyPubStore);

  /**
   * Check if user can check in to this pub
   *
   * @param pubId - The pub to validate check-in for
   * @returns Promise<{allowed: boolean, reason?: string}>
   */
  async canCheckIn(pubId: string): Promise<{ allowed: boolean; reason?: string }> {
    console.log('[NewCheckinService] 🔍 Running check-in validations for pub:', pubId);

    // Gate 1: Daily limit check (NOW REAL!)
    console.log('[NewCheckinService] 📅 Starting REAL daily limit validation...');
    const dailyCheck = await this.dailyLimitCheck(pubId);
    if (!dailyCheck.passed) {
      console.log('[NewCheckinService] ❌ Failed daily limit check:', dailyCheck.reason);
      return { allowed: false, reason: dailyCheck.reason };
    }
    console.log('[NewCheckinService] ✅ Daily limit check passed');

    // Gate 2: Proximity check
    console.log('[NewCheckinService] 📍 Starting proximity validation...');
    const proximityCheck = await this.proximityCheck(pubId);
    if (!proximityCheck.passed) {
      console.log('[NewCheckinService] ❌ Failed proximity check:', proximityCheck.reason);
      return { allowed: false, reason: proximityCheck.reason };
    }
    console.log('[NewCheckinService] ✅ Proximity check passed');

    // All gates passed
    console.log('[NewCheckinService] ✅ All validations passed - check-in allowed');
    return { allowed: true };
  }

  /**
   * 🔄 UPDATED: Check if user has already checked into this pub today
   * Now uses REAL Firestore data instead of simulation
   */
  private async dailyLimitCheck(pubId: string): Promise<{ passed: boolean; reason?: string }> {
    console.log('[NewCheckinService] 📅 Checking REAL daily limit for pub:', pubId);

    try {
      // ✅ REAL: Get current user
      const userId = this.authStore.uid();
      if (!userId) {
        console.log('[NewCheckinService] 📅 No authenticated user found');
        return { passed: false, reason: 'You must be logged in to check in' };
      }

      console.log('[NewCheckinService] 📅 Checking for existing check-in today...', { userId, pubId });

      // ✅ REAL: Build today's date key
      const todayDateKey = new Date().toISOString().split('T')[0];
      console.log('[NewCheckinService] 📅 Today\'s date key:', todayDateKey);

      // ✅ REAL: Query Firestore for today's check-in using inherited FirestoreService method
      const existingCheckins = await this.getDocsWhere<CheckIn>(
        'checkins',
        where('userId', '==', userId),
        where('pubId', '==', pubId),
        where('dateKey', '==', todayDateKey)
      );

      console.log('[NewCheckinService] 📅 Query results:', {
        collection: 'checkins',
        query: { userId, pubId, dateKey: todayDateKey },
        resultCount: existingCheckins.length
      });

      // if (existingCheckins.length > 0) {
      //   const existingCheckin = existingCheckins[0];
      //   console.log('[NewCheckinService] ❌ Found existing check-in today:', {
      //     checkinId: existingCheckin.id,
      //     timestamp: existingCheckin.timestamp,
      //     dateKey: existingCheckin.dateKey
      //   });

      //   return {
      //     passed: false,
      //     reason: 'You have already checked into this pub today'
      //   };
      // }

      console.log('[NewCheckinService] ✅ No existing check-in found for today - user can check in');
      return { passed: true };

    } catch (error: any) {
      console.error('[NewCheckinService] 📅 Error checking daily limit:', error);
      console.error('[NewCheckinService] 📅 Error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack
      });

      return {
        passed: false,
        reason: 'Could not verify daily check-in limit. Please try again.'
      };
    }
  }

  /**
   * Check if user is close enough to the pub
   */
  private async proximityCheck(pubId: string): Promise<{ passed: boolean; reason?: string }> {
    console.log('[NewCheckinService] 📍 Checking proximity to pub:', pubId);

    try {
      // Get real distance using NearbyPubStore
      console.log('[NewCheckinService] 📍 Getting real distance to pub...');
      const distance = this.nearbyPubStore.getDistanceToPub(pubId);

      if (distance === null) {
        console.log('[NewCheckinService] 📍 Could not determine distance (no location or pub not found)');
        return { passed: false, reason: 'Could not determine your location or pub location' };
      }

      console.log('[NewCheckinService] 📍 Real distance calculated:', Math.round(distance), 'meters');

      // Check if within range (using same threshold as NearbyPubStore)
      const isWithinRange = this.nearbyPubStore.isWithinCheckInRange(pubId);
      console.log('[NewCheckinService] 📍 Within check-in range?', isWithinRange);

      if (!isWithinRange) {
        const distanceInMeters = Math.round(distance);
        console.log('[NewCheckinService] 📍 User is too far from pub');
        return {
          passed: false,
          reason: `You are ${distanceInMeters}m away. Must be within 100m to check in.`
        };
      }

      console.log('[NewCheckinService] 📍 User is within check-in range');
      return { passed: true };

    } catch (error) {
      console.error('[NewCheckinService] 📍 Error checking proximity:', error);
      return { passed: false, reason: 'Failed to check your location' };
    }
  }

  /**
   * 🔄 UPDATED: Create a check-in record in Firestore
   * Now uses REAL Firebase instead of simulation
   */
  async createCheckin(pubId: string): Promise<void> {
    console.log('[NewCheckinService] 💾 Creating REAL check-in for pub:', pubId);

    try {
      // ✅ REAL: Get authenticated user
      const userId = this.authStore.uid();
      if (!userId) {
        console.log('[NewCheckinService] ❌ No authenticated user - cannot create check-in');
        throw new Error('User must be authenticated to check in');
      }

      // ✅ REAL: Build check-in data
      const now = new Date();
      const checkinData: Omit<CheckIn, 'id'> = {
        userId,
        pubId,
        timestamp: Timestamp.fromDate(now),
        dateKey: now.toISOString().split('T')[0] // YYYY-MM-DD format
      };

      console.log('[NewCheckinService] 💾 Check-in data prepared:', {
        ...checkinData,
        timestamp: now.toISOString() // Log readable timestamp
      });

      console.log('[NewCheckinService] 💾 Saving to Firestore collection: checkins');

      // ✅ REAL: Save to Firestore using inherited FirestoreService method
      const documentRef = await this.addDocToCollection('checkins', checkinData);

      console.log('[NewCheckinService] ✅ Check-in created successfully!');
      console.log('[NewCheckinService] ✅ Firestore document ID:', documentRef.id);
      console.log('[NewCheckinService] ✅ Document path: checkins/' + documentRef.id);

      // Log what's now in Firestore
      console.log('[NewCheckinService] 📄 Firestore document saved:', {
        collection: 'checkins',
        documentId: documentRef.id,
        data: {
          userId: checkinData.userId,
          pubId: checkinData.pubId,
          dateKey: checkinData.dateKey,
          timestamp: 'Timestamp object',
          createdAt: now.toISOString()
        }
      });

    } catch (error: any) {
      console.error('[NewCheckinService] ❌ Failed to create check-in:', error);
      console.error('[NewCheckinService] ❌ Error message:', error?.message);
      console.error('[NewCheckinService] ❌ Error code:', error?.code);
      console.error('[NewCheckinService] ❌ Error stack:', error?.stack);

      // Re-throw with user-friendly message but preserve original error for debugging
      const userMessage = this.getFriendlyErrorMessage(error);
      throw new Error(userMessage);
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
    console.log('[NewCheckinService] 🔍 Checking if first visit...', { userId, pubId });

    try {
      const checkinCount = await this.getUserCheckinCount(userId, pubId);
      const isFirst = checkinCount === 1; // Just the one we created

      console.log('[NewCheckinService] 🔍 First visit check:', {
        checkinCount,
        isFirst,
        logic: 'count === 1 means first visit (just created)'
      });

      return isFirst;

    } catch (error) {
      console.error('[NewCheckinService] 🔍 Error checking first visit:', error);
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
    console.log('[NewCheckinService] 📊 Getting user check-in count...', { userId, pubId });

    try {
      const checkins = await this.getDocsWhere<CheckIn>(
        'checkins',
        where('userId', '==', userId),
        where('pubId', '==', pubId)
      );

      console.log('[NewCheckinService] 📊 Check-in count query result:', {
        collection: 'checkins',
        query: { userId, pubId },
        resultCount: checkins.length
      });

      return checkins.length;

    } catch (error) {
      console.error('[NewCheckinService] 📊 Error getting check-in count:', error);
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
    console.log('[NewCheckinService] 📊 Getting user total check-in count...', { userId });

    try {
      const allCheckins = await this.getDocsWhere<CheckIn>(
        'checkins',
        where('userId', '==', userId)
      );

      console.log('[NewCheckinService] 📊 Total check-in count query result:', {
        collection: 'checkins',
        query: { userId },
        resultCount: allCheckins.length
      });

      return allCheckins.length;

    } catch (error) {
      console.error('[NewCheckinService] 📊 Error getting total check-in count:', error);
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
    console.log('[NewCheckinService] 🏠 Getting unique pub count...', { userId });

    try {
      const allCheckins = await this.getDocsWhere<CheckIn>(
        'checkins',
        where('userId', '==', userId)
      );

      const uniquePubIds = new Set(allCheckins.map(checkin => checkin.pubId));
      const uniqueCount = uniquePubIds.size;

      console.log('[NewCheckinService] 🏠 Unique pub count query result:', {
        totalCheckins: allCheckins.length,
        uniquePubs: uniqueCount,
        pubIds: Array.from(uniquePubIds)
      });

      return uniqueCount;

    } catch (error) {
      console.error('[NewCheckinService] 🏠 Error getting unique pub count:', error);
      return 0;
    }
  }
}
