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
    let base = POINTS_CONFIG.checkIn.base;
    let bonus = 0;
    let distance = 0;
    let multiplier = 1;

    const reasons: string[] = [];

    // Base points
    reasons.push(`${base} base points`);

    // First-time bonuses
    if (data.isFirstEver) {
      bonus += POINTS_CONFIG.checkIn.firstEver;
      reasons.push(`${POINTS_CONFIG.checkIn.firstEver} first check-in bonus`);
    } else if (data.isFirstVisit) {
      bonus += POINTS_CONFIG.checkIn.firstTime;
      reasons.push(`${POINTS_CONFIG.checkIn.firstTime} first visit to this pub`);
    }

    // Home pub bonus
    if (data.isHomePub) {
      bonus += POINTS_CONFIG.checkIn.homePub;
      reasons.push(`${POINTS_CONFIG.checkIn.homePub} home pub bonus`);
    }

    // Distance bonus
    if (data.distanceFromHome >= POINTS_CONFIG.distance.minDistance) {
      const distanceBonus = Math.min(
        Math.floor(data.distanceFromHome * POINTS_CONFIG.distance.pointsPerKm),
        POINTS_CONFIG.distance.maxDistanceBonus
      );
      distance = distanceBonus;
      reasons.push(`${distanceBonus} distance bonus (${data.distanceFromHome.toFixed(1)}km from home)`);
    }

    // Social bonuses
    if (data.hasPhoto) {
      bonus += POINTS_CONFIG.social.photo;
      reasons.push(`${POINTS_CONFIG.social.photo} photo bonus`);
    }

    // Photo quality bonus (new enhanced system)
    if (data.photoQuality && data.photoQuality.bonus > 0) {
      bonus += data.photoQuality.bonus;
      const tierName = this.getQualityTierDisplayName(data.photoQuality.tier);
      reasons.push(`${data.photoQuality.bonus} ${tierName} photo quality bonus`);
    }

    if (data.sharedSocial) {
      bonus += POINTS_CONFIG.social.share;
      reasons.push(`${POINTS_CONFIG.social.share} social share bonus`);
    }

    // Streak multiplier
    const streakBonus = this.getStreakBonus(data.currentStreak);
    if (streakBonus > 0) {
      bonus += streakBonus;
      reasons.push(`${streakBonus} ${data.currentStreak}-day streak bonus`);
    }

    const total = (base + distance + bonus) * multiplier;

    return {
      base,
      distance,
      bonus,
      multiplier,
      total,
      reason: reasons.join(' + ')
    };
  }

  /**
   * Calculate points for social actions
   */
  calculateSocialPoints(action: 'share' | 'photo'): PointsBreakdown {
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
   */
  async updateUserTotalPoints(userId: string, newTotal: number): Promise<void> {
    await this.updateDoc(`users/${userId}`, { totalPoints: newTotal });
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
