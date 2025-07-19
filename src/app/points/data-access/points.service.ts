// src/app/points/data-access/points.service.ts
import { Injectable } from '@angular/core';
import { POINTS_CONFIG } from '../utils/points.config';
import type { PointsBreakdown, CheckInPointsData, PointsTransaction } from '../utils/points.models';
import { FirestoreCrudService } from '../../shared/data-access/firestore-crud.service';
import { where } from 'firebase/firestore';


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
   */
  calculateCheckInPoints(data: CheckInPointsData): PointsBreakdown {
    const callId = Date.now();
    console.log(`[PointsService] 🎯 === CALCULATING CHECK-IN POINTS STARTED (${callId}) ===`);
    console.log(`[PointsService] 🎯 Input data (${callId}):`, data);
    
    let base = POINTS_CONFIG.checkIn.base;
    let bonus = 0;
    let distance = 0;
    let multiplier = 1;

    console.log(`[PointsService] 🎯 Initial values (${callId}):`, { base, bonus, distance, multiplier });

    const reasons: string[] = [];

    // Base points
    console.log(`[PointsService] 🎯 Adding base points (${callId}): ${base}`);
    reasons.push(`${base} base points`);

    // First-time bonuses
    if (data.isFirstEver) {
      const firstEverBonus = POINTS_CONFIG.checkIn.firstEver;
      bonus += firstEverBonus;
      console.log(`[PointsService] 🎯 Adding first ever bonus (${callId}): ${firstEverBonus}`);
      reasons.push(`${firstEverBonus} first check-in bonus`);
    } else if (data.isFirstVisit) {
      const firstTimeBonus = POINTS_CONFIG.checkIn.firstTime;
      bonus += firstTimeBonus;
      console.log(`[PointsService] 🎯 Adding first visit bonus (${callId}): ${firstTimeBonus}`);
      reasons.push(`${firstTimeBonus} first visit to this pub`);
    } else {
      console.log(`[PointsService] 🎯 No first-time bonuses (${callId}): isFirstEver=${data.isFirstEver}, isFirstVisit=${data.isFirstVisit}`);
    }

    // Home pub bonus
    if (data.isHomePub) {
      const homePubBonus = POINTS_CONFIG.checkIn.homePub;
      bonus += homePubBonus;
      console.log(`[PointsService] 🎯 Adding home pub bonus (${callId}): ${homePubBonus}`);
      reasons.push(`${homePubBonus} home pub bonus`);
    } else {
      console.log(`[PointsService] 🎯 No home pub bonus (${callId}): isHomePub=${data.isHomePub}`);
    }

    // Distance bonus
    console.log(`[PointsService] 🎯 Checking distance bonus (${callId}): distanceFromHome=${data.distanceFromHome}, minDistance=${POINTS_CONFIG.distance.minDistance}`);
    if (data.distanceFromHome >= POINTS_CONFIG.distance.minDistance) {
      const distanceBonus = Math.min(
        Math.floor(data.distanceFromHome * POINTS_CONFIG.distance.pointsPerKm),
        POINTS_CONFIG.distance.maxDistanceBonus
      );
      distance = distanceBonus;
      console.log(`[PointsService] 🎯 Adding distance bonus (${callId}): ${distanceBonus} (${data.distanceFromHome.toFixed(1)}km from home)`);
      reasons.push(`${distanceBonus} distance bonus (${data.distanceFromHome.toFixed(1)}km from home)`);
    } else {
      console.log(`[PointsService] 🎯 No distance bonus (${callId}): distance too short`);
    }

    // Carpet confirmation bonus
    if (data.carpetConfirmed) {
      const carpetBonus = POINTS_CONFIG.carpet.confirmed;
      bonus += carpetBonus;
      console.log(`[PointsService] 🎯 Adding carpet confirmation bonus (${callId}): ${carpetBonus}`);
      reasons.push(`${carpetBonus} carpet confirmed`);
    } else {
      console.log(`[PointsService] 🎯 No carpet confirmation bonus (${callId}): carpetConfirmed=${data.carpetConfirmed}`);
    }

    // Social sharing bonus
    if (data.sharedSocial) {
      const shareBonus = POINTS_CONFIG.social.share;
      bonus += shareBonus;
      console.log(`[PointsService] 🎯 Adding social share bonus (${callId}): ${shareBonus}`);
      reasons.push(`${shareBonus} social share bonus`);
    } else {
      console.log(`[PointsService] 🎯 No social share bonus (${callId}): sharedSocial=${data.sharedSocial}`);
    }

    // Streak multiplier
    const streakBonus = this.getStreakBonus(data.currentStreak);
    if (streakBonus > 0) {
      bonus += streakBonus;
      console.log(`[PointsService] 🎯 Adding streak bonus (${callId}): ${streakBonus} (${data.currentStreak}-day streak)`);
      reasons.push(`${streakBonus} ${data.currentStreak}-day streak bonus`);
    } else {
      console.log(`[PointsService] 🎯 No streak bonus (${callId}): currentStreak=${data.currentStreak}`);
    }

    console.log(`[PointsService] 🎯 Pre-total calculation (${callId}):`, { base, distance, bonus, multiplier });
    
    const total = (base + distance + bonus) * multiplier;
    console.log(`[PointsService] 🎯 Total calculation (${callId}): (${base} + ${distance} + ${bonus}) * ${multiplier} = ${total}`);

    const breakdown = {
      base,
      distance,
      bonus,
      multiplier,
      total,
      reason: reasons.join(' + ')
    };

    console.log(`[PointsService] 🎯 === POINTS CALCULATION COMPLETE (${callId}) ===`);
    console.log(`[PointsService] 🎯 Final breakdown (${callId}):`, breakdown);
    console.log(`[PointsService] 🎯 Reason string (${callId}): "${breakdown.reason}"`);
    
    return breakdown;
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
      reason: `${points} points for ${action}`
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
      console.log(`[PointsService] ✅ Updated existing user ${userId.slice(0, 8)} totalPoints to ${newTotal}`);
    } catch (error: any) {
      // If document doesn't exist, create it (for guest users)
      if (error?.message?.includes('No document to update')) {
        console.log(`[PointsService] 📝 Creating user document for ${userId.slice(0, 8)} with totalPoints: ${newTotal}`);
        try {
          await this.setDoc(`users/${userId}`, { 
            totalPoints: newTotal,
            uid: userId,
            displayName: `User ${userId.slice(0, 8)}`,
            email: null,
            isAnonymous: true,
            photoURL: null,
            joinedAt: new Date().toISOString(),
            realUser: false // Mark as guest user for leaderboard filtering
          });
          console.log(`[PointsService] ✅ Created user document for guest ${userId.slice(0, 8)} with ${newTotal} points`);
        } catch (createError) {
          console.error(`[PointsService] ❌ Failed to create user document for ${userId.slice(0, 8)}:`, createError);
          throw createError;
        }
      } else {
        console.error(`[PointsService] ❌ Failed to update totalPoints for user ${userId.slice(0, 8)}:`, error);
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

  private getStreakBonus(streak: number): number {
    const streakBonuses = POINTS_CONFIG.streaks.daily;
    const streakStr = streak.toString();

    const applicableStreaks = Object.keys(streakBonuses)
      .map(Number)
      .filter(days => streak >= days)
      .sort((a, b) => b - a);

    if (applicableStreaks.length === 0) return 0;

    const highestStreak = applicableStreaks[0].toString();
    return streakBonuses[highestStreak] || 0;
  }

  /**
   * Get display name for quality tier
   */
  private getQualityTierDisplayName(tier: 'standard' | 'high' | 'exceptional' | 'perfect'): string {
    switch (tier) {
      case 'perfect': return 'perfect';
      case 'exceptional': return 'exceptional';
      case 'high': return 'high-quality';
      default: return 'standard';
    }
  }
}
