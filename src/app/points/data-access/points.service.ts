// src/app/points/data-access/points.service.ts
import { Injectable } from '@angular/core';
import {
  calculateCheckInPoints,
  type CheckInPointsInput,
} from '@check-in/utils/points-calculation.utils';
import { FirestoreCrudService } from '@fourfold/angular-foundation';
import type { Pub } from '@pubs/utils/pub.models';
import { where } from 'firebase/firestore';
import { POINTS_CONFIG } from '../utils/points.config';
import type { CheckInPointsData, PointsBreakdown, PointsTransaction } from '../utils/points.models';

/**
 * PointsService
 *
 * ✅ RESPONSIBILITIES:
 * - Firestore CRUD operations for points transactions
 * - Pure points calculation logic (no state management)
 * - Points rules and formula implementation
 * - User profile points updates
 *
 * ❌ NOT RESPONSIBLE FOR:
 * - State management (PointsStore handles this)
 * - UI logic or reactive updates
 * - Check-in flow orchestration
 */
@Injectable({ providedIn: 'root' })
export class PointsService extends FirestoreCrudService<PointsTransaction> {
  protected override path = 'pointsTransactions';

  // ===================================
  // 🧮 PURE CALCULATION METHODS
  // ===================================

  /**
   * Calculate points for a check-in based on all factors
   * Now uses the shared utility function for consistent calculation
   */
  calculateCheckInPoints(
    data: CheckInPointsData,
    checkInPub?: Pub,
    homePub?: Pub | null
  ): PointsBreakdown {
    const callId = Date.now();
    console.log(`🔄 [PointsService] === REGULAR CHECK-IN POINTS CALCULATION (${callId}) ===`);
    console.log(`🔄 [PointsService] Legacy data input (${callId}):`, data);
    console.log(`🔄 [PointsService] Pub data (${callId}):`, {
      checkInPub: checkInPub?.name || 'Missing',
      homePub: homePub?.name || 'None set',
    });

    console.log(`🔄 [PointsService] Mapping to new shared utility format...`);
    // Map legacy CheckInPointsData to new CheckInPointsInput
    const input: CheckInPointsInput = {
      checkInPub: checkInPub!,
      homePub: homePub,
      isFirstEver: data.isFirstEver,
      isFirstVisit: data.isFirstVisit,
      isHomePub: data.isHomePub,
      carpetConfirmed: data.carpetConfirmed,
      sharedSocial: data.sharedSocial,
      currentStreak: data.currentStreak,
    };

    console.log(`🔄 [PointsService] Calling SHARED UTILITY (same as admin!)...`);
    const result = calculateCheckInPoints(input);

    console.log(`🔄 [PointsService] === REGULAR CHECK-IN RESULT (${callId}) ===`);
    console.log(`🔄 [PointsService] Points calculated by shared utility:`, result);

    return result;
  }

  /**
   * Calculate points for social actions
   */
  calculateSocialPoints(action: 'share'): PointsBreakdown {
    const points = POINTS_CONFIG.social[action];

    return {
      base: points,
      distance: 0,
      bonus: 0,
      multiplier: 1,
      total: points,
      reason: `${points} points for ${action}`,
    };
  }

  /**
   * Format points with appropriate messaging
   */
  formatPointsMessage(breakdown: PointsBreakdown): string {
    if (breakdown.total <= 10) {
      return `You earned ${breakdown.total} points! 🍺`;
    } else if (breakdown.total <= 25) {
      return `Nice! ${breakdown.total} points earned! 🎉`;
    } else {
      return `Excellent! ${breakdown.total} points! You're on fire! 🔥`;
    }
  }

  // ===================================
  // 🗄️ FIRESTORE OPERATIONS
  // ===================================

  /**
   * Create a points transaction record
   */
  async createTransaction(transaction: Omit<PointsTransaction, 'id'>): Promise<PointsTransaction> {
    const docRef = await this.addDocToCollection('pointsTransactions', transaction);
    return { ...transaction, id: docRef.id };
  }

  /**
   * Get recent transactions for a user
   */
  async getUserTransactions(userId: string, limit: number = 20): Promise<PointsTransaction[]> {
    // ✅ FIXED: Use getDocsWhere with proper constraints
    return this.getDocsWhere<PointsTransaction>(
      'pointsTransactions',
      where('userId', '==', userId)
      // Note: Firestore doesn't support orderBy + limit in getDocsWhere
      // We'll sort in memory and limit client-side
    ).then(transactions => {
      return transactions
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    });
  }

  /**
   * Update user's total points in their profile
   * Creates document if it doesn't exist (for guest users)
   */
  async updateUserTotalPoints(userId: string, newTotal: number): Promise<void> {
    try {
      // First try to update existing document
      await this.updateDoc(`users/${userId}`, { totalPoints: newTotal });
      console.log(
        `[PointsService] ✅ Updated existing user ${userId.slice(0, 8)} totalPoints to ${newTotal}`
      );
    } catch (error: any) {
      // If document doesn't exist, create it (for guest users)
      if (error?.message?.includes('No document to update')) {
        console.log(
          `[PointsService] 📝 Creating user document for ${userId.slice(0, 8)} with totalPoints: ${newTotal}`
        );
        try {
          await this.setDoc(`users/${userId}`, {
            totalPoints: newTotal,
            uid: userId,
            displayName: `User ${userId.slice(0, 8)}`,
            email: null,
            isAnonymous: true,
            photoURL: null,
            joinedAt: new Date().toISOString(),
            realUser: false, // Mark as guest user for leaderboard filtering
          });
          console.log(
            `[PointsService] ✅ Created user document for guest ${userId.slice(0, 8)} with ${newTotal} points`
          );
        } catch (createError) {
          console.error(
            `[PointsService] ❌ Failed to create user document for ${userId.slice(0, 8)}:`,
            createError
          );
          throw createError;
        }
      } else {
        console.error(
          `[PointsService] ❌ Failed to update totalPoints for user ${userId.slice(0, 8)}:`,
          error
        );
        throw error;
      }
    }
  }

  /**
   * Get user's current total points
   */
  async getUserTotalPoints(userId: string): Promise<number> {
    const userDoc = await this.getDocByPath<{ totalPoints?: number }>(`users/${userId}`);
    return userDoc?.totalPoints || 0;
  }

  // ===================================
  // 🔧 PRIVATE HELPERS
  // ===================================

  /**
   * Get display name for quality tier
   */
  private getQualityTierDisplayName(tier: 'standard' | 'high' | 'exceptional' | 'perfect'): string {
    switch (tier) {
      case 'perfect':
        return 'perfect';
      case 'exceptional':
        return 'exceptional';
      case 'high':
        return 'high-quality';
      default:
        return 'standard';
    }
  }
}
