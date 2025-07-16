/**
 * @fileoverview UserStatsCalculator - Calculates and validates user statistics
 * 
 * RESPONSIBILITIES:
 * - Calculate verified pub count from actual check-ins
 * - Validate user stats consistency
 * - Generate user stats updates for Firestore
 * - Handle data repair scenarios
 */

import { getFirestore } from 'firebase-admin/firestore';
import { CheckIn } from '../models/checkin.model';
import { User, UserStats } from '../models/user.model';

export class UserStatsCalculator {
  private db = getFirestore();

  /**
   * Calculate comprehensive user statistics from check-ins
   */
  async calculateUserStats(userId: string): Promise<UserStats> {
    console.log(`[UserStatsCalculator] Calculating stats for user: ${userId.slice(0, 8)}`);
    
    try {
      // Get all check-ins for this user
      const checkinsSnapshot = await this.db
        .collection('checkins')
        .where('userId', '==', userId)
        .get();
      
      const checkins = checkinsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CheckIn[];
      
      console.log(`[UserStatsCalculator] Found ${checkins.length} check-ins for user`);
      
      // Calculate verified pub count from unique pub IDs
      const uniquePubIds = new Set(checkins.map(checkin => checkin.pubId));
      const verifiedPubCount = uniquePubIds.size;
      
      // Calculate total points from check-ins
      const totalPoints = checkins.reduce((sum, checkin) => {
        return sum + (checkin.pointsEarned || 0);
      }, 0);
      
      // Get current user document to preserve unverified counts
      const userDoc = await this.db.collection('users').doc(userId).get();
      const userData = userDoc.data() as User;
      
      const unverifiedPubCount = userData?.unverifiedPubCount || 0;
      const totalPubCount = verifiedPubCount + unverifiedPubCount;
      
      const stats: UserStats = {
        totalPoints,
        verifiedPubCount,
        unverifiedPubCount,
        totalPubCount,
        totalCheckins: checkins.length,
        badgeCount: userData?.badgeCount || 0,
        landlordCount: userData?.landlordCount || 0,
        lastCalculatedAt: new Date().toISOString()
      };
      
      console.log(`[UserStatsCalculator] Calculated stats:`, {
        totalCheckins: stats.totalCheckins,
        verifiedPubCount: stats.verifiedPubCount,
        totalPoints: stats.totalPoints,
        userId: userId.slice(0, 8)
      });
      
      return stats;
      
    } catch (error) {
      console.error(`[UserStatsCalculator] Error calculating stats for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Validate user stats against actual check-in data
   */
  async validateUserStats(userId: string): Promise<{
    isValid: boolean;
    discrepancies: string[];
    currentStats: UserStats;
    correctStats: UserStats;
  }> {
    console.log(`[UserStatsCalculator] Validating stats for user: ${userId.slice(0, 8)}`);
    
    // Get current user document
    const userDoc = await this.db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error(`User document not found: ${userId}`);
    }
    
    const userData = userDoc.data() as User;
    
    // Calculate what the stats should be
    const correctStats = await this.calculateUserStats(userId);
    
    // Current stats from user document
    const currentStats: UserStats = {
      totalPoints: userData.totalPoints || 0,
      verifiedPubCount: userData.verifiedPubCount || 0,
      unverifiedPubCount: userData.unverifiedPubCount || 0,
      totalPubCount: userData.totalPubCount || 0,
      totalCheckins: 0, // Not stored in user doc
      badgeCount: userData.badgeCount || 0,
      landlordCount: userData.landlordCount || 0,
      lastCalculatedAt: userData.lastStatsUpdate || 'never'
    };
    
    // Check for discrepancies
    const discrepancies: string[] = [];
    
    if (currentStats.totalPoints !== correctStats.totalPoints) {
      discrepancies.push(`Points mismatch: stored=${currentStats.totalPoints}, actual=${correctStats.totalPoints}`);
    }
    
    if (currentStats.verifiedPubCount !== correctStats.verifiedPubCount) {
      discrepancies.push(`Verified pubs mismatch: stored=${currentStats.verifiedPubCount}, actual=${correctStats.verifiedPubCount}`);
    }
    
    if (currentStats.totalPubCount !== correctStats.totalPubCount) {
      discrepancies.push(`Total pubs mismatch: stored=${currentStats.totalPubCount}, actual=${correctStats.totalPubCount}`);
    }
    
    const isValid = discrepancies.length === 0;
    
    if (!isValid) {
      console.warn(`[UserStatsCalculator] Stats validation failed for user ${userId.slice(0, 8)}:`, discrepancies);
    } else {
      console.log(`[UserStatsCalculator] Stats validation passed for user ${userId.slice(0, 8)}`);
    }
    
    return {
      isValid,
      discrepancies,
      currentStats,
      correctStats
    };
  }

  /**
   * Update user document with calculated stats
   */
  async updateUserStats(userId: string, stats: UserStats): Promise<void> {
    console.log(`[UserStatsCalculator] Updating user stats for: ${userId.slice(0, 8)}`);
    
    const updates = {
      totalPoints: stats.totalPoints,
      verifiedPubCount: stats.verifiedPubCount,
      totalPubCount: stats.totalPubCount,
      lastStatsUpdate: stats.lastCalculatedAt
    };
    
    await this.db.collection('users').doc(userId).update(updates);
    
    console.log(`[UserStatsCalculator] User stats updated successfully`, updates);
  }

  /**
   * Repair user stats by calculating from check-ins and updating Firestore
   */
  async repairUserStats(userId: string): Promise<UserStats> {
    console.log(`[UserStatsCalculator] Repairing stats for user: ${userId.slice(0, 8)}`);
    
    const correctStats = await this.calculateUserStats(userId);
    await this.updateUserStats(userId, correctStats);
    
    console.log(`[UserStatsCalculator] Stats repair completed for user ${userId.slice(0, 8)}`);
    return correctStats;
  }
}