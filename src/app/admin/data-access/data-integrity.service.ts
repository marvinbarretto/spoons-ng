// src/app/admin/data-access/data-integrity.service.ts
import { Injectable } from '@angular/core';
import { where } from '@angular/fire/firestore';
import type { CheckIn } from '@check-in/utils/check-in.models';
import { FirestoreService } from '@fourfold/angular-foundation';
import type { User } from '@users/utils/user.model';

export type DataInconsistency = {
  id: string;
  type:
    | 'orphaned-checkin'
    | 'orphaned-transaction'
    | 'points-mismatch'
    | 'pub-count-mismatch'
    | 'badge-count-mismatch'
    | 'missing-user-summary';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  userName?: string;
  description: string;
  currentValue?: any;
  expectedValue?: any;
  affectedCollections: string[];
  canAutoRepair: boolean;
  repairDescription?: string;
};

export type UserDataSummary = {
  userId: string;
  userName: string;
  summary: {
    totalPoints: number;
    verifiedPubCount: number;
    unverifiedPubCount: number;
    totalPubCount: number;
    badgeCount: number;
  };
  calculated: {
    totalPointsFromTransactions: number;
    verifiedPubCountFromCheckins: number;
    uniquePubsFromCheckins: number;
    badgeCountFromEarned: number;
  };
  inconsistencies: DataInconsistency[];
};

export type IntegrityReport = {
  scanTimestamp: number;
  totalUsers: number;
  usersWithInconsistencies: number;
  totalInconsistencies: number;
  inconsistenciesByType: Record<string, number>;
  orphanedRecords: {
    checkins: number;
    pointsTransactions: number;
    earnedBadges: number;
    landlords: number;
  };
  userSummaries: UserDataSummary[];
  canAutoRepairCount: number;
};

@Injectable({
  providedIn: 'root',
})
export class DataIntegrityService extends FirestoreService {
  /**
   * Perform comprehensive data integrity analysis
   */
  async analyzeDataIntegrity(): Promise<IntegrityReport> {
    console.log('[DataIntegrityService] 🔍 Starting comprehensive data integrity analysis...');

    const scanTimestamp = Date.now();

    // Step 1: Get all users for baseline
    const users = await this.getDocsWhere<User>('users');
    console.log(`[DataIntegrityService] Found ${users.length} users to analyze`);

    // Step 2: Analyze each user's data consistency
    const userSummaries: UserDataSummary[] = [];
    let totalInconsistencies = 0;
    let canAutoRepairCount = 0;

    for (const user of users) {
      const userSummary = await this.analyzeUserData(user);
      userSummaries.push(userSummary);
      totalInconsistencies += userSummary.inconsistencies.length;
      canAutoRepairCount += userSummary.inconsistencies.filter(inc => inc.canAutoRepair).length;
    }

    // Step 3: Find orphaned records
    const orphanedRecords = await this.findOrphanedRecords(users.map(u => u.uid));

    // Step 4: Compile inconsistency statistics
    const allInconsistencies = userSummaries.flatMap(us => us.inconsistencies);
    const inconsistenciesByType: Record<string, number> = {};
    allInconsistencies.forEach(inc => {
      inconsistenciesByType[inc.type] = (inconsistenciesByType[inc.type] || 0) + 1;
    });

    const report: IntegrityReport = {
      scanTimestamp,
      totalUsers: users.length,
      usersWithInconsistencies: userSummaries.filter(us => us.inconsistencies.length > 0).length,
      totalInconsistencies,
      inconsistenciesByType,
      orphanedRecords,
      userSummaries: userSummaries.filter(us => us.inconsistencies.length > 0), // Only include users with issues
      canAutoRepairCount,
    };

    console.log('[DataIntegrityService] ✅ Analysis complete:', {
      totalUsers: report.totalUsers,
      usersWithIssues: report.usersWithInconsistencies,
      totalIssues: report.totalInconsistencies,
      orphanedRecords: report.orphanedRecords,
    });

    return report;
  }

  /**
   * Analyze a specific user's data consistency
   */
  async analyzeUserData(user: User): Promise<UserDataSummary> {
    const inconsistencies: DataInconsistency[] = [];

    // Get user's transactional data
    const [checkins, pointsTransactions, earnedBadges] = await Promise.all([
      this.getUserCheckins(user.uid),
      this.getUserPointsTransactions(user.uid),
      this.getUserEarnedBadges(user.uid),
    ]);

    // Calculate actual values from transactions
    const calculated = {
      totalPointsFromTransactions: this.calculateTotalPoints(pointsTransactions),
      verifiedPubCountFromCheckins: checkins.length,
      uniquePubsFromCheckins: new Set(checkins.map(c => c.pubId)).size,
      badgeCountFromEarned: earnedBadges.length,
    };

    // Current summary values (with fallbacks)
    const summary = {
      totalPoints: user.totalPoints || 0,
      verifiedPubCount: user.verifiedPubCount || 0,
      unverifiedPubCount: user.unverifiedPubCount || 0,
      totalPubCount: user.totalPubCount || 0,
      badgeCount: user.badgeCount || 0,
    };

    // Check for inconsistencies
    this.checkPointsConsistency(user, summary, calculated, inconsistencies);
    this.checkPubCountConsistency(user, summary, calculated, inconsistencies);
    this.checkBadgeCountConsistency(user, summary, calculated, inconsistencies);
    this.checkMissingSummaryFields(user, summary, inconsistencies);

    return {
      userId: user.uid,
      userName: user.displayName,
      summary,
      calculated,
      inconsistencies,
    };
  }

  /**
   * Find orphaned records that reference non-existent users
   */
  private async findOrphanedRecords(
    validUserIds: string[]
  ): Promise<IntegrityReport['orphanedRecords']> {
    console.log('[DataIntegrityService] 🔍 Scanning for orphaned records...');

    const validUserSet = new Set(validUserIds);

    const [checkins, pointsTransactions, earnedBadges, landlords] = await Promise.all([
      this.getDocsWhere<CheckIn>('checkins'),
      this.getDocsWhere<any>('pointsTransactions'),
      this.getDocsWhere<any>('earnedBadges'),
      this.getDocsWhere<any>('landlords'),
    ]);

    const orphanedCheckins = checkins.filter(c => !validUserSet.has(c.userId)).length;
    const orphanedTransactions = pointsTransactions.filter(t => !validUserSet.has(t.userId)).length;
    const orphanedBadges = earnedBadges.filter(b => !validUserSet.has(b.userId)).length;
    const orphanedLandlords = landlords.filter(l => !validUserSet.has(l.userId)).length;

    console.log('[DataIntegrityService] 📊 Orphaned records found:', {
      checkins: orphanedCheckins,
      pointsTransactions: orphanedTransactions,
      earnedBadges: orphanedBadges,
      landlords: orphanedLandlords,
    });

    return {
      checkins: orphanedCheckins,
      pointsTransactions: orphanedTransactions,
      earnedBadges: orphanedBadges,
      landlords: orphanedLandlords,
    };
  }

  /**
   * Get user's check-ins
   */
  private async getUserCheckins(userId: string): Promise<CheckIn[]> {
    try {
      return await this.getDocsWhere<CheckIn>('checkins', where('userId', '==', userId));
    } catch (error) {
      console.warn(`[DataIntegrityService] Failed to get checkins for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get user's points transactions
   */
  private async getUserPointsTransactions(userId: string): Promise<any[]> {
    try {
      return await this.getDocsWhere<any>('pointsTransactions', where('userId', '==', userId));
    } catch (error) {
      console.warn(
        `[DataIntegrityService] Failed to get points transactions for user ${userId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Get user's earned badges
   */
  private async getUserEarnedBadges(userId: string): Promise<any[]> {
    try {
      return await this.getDocsWhere<any>('earnedBadges', where('userId', '==', userId));
    } catch (error) {
      console.warn(`[DataIntegrityService] Failed to get earned badges for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Calculate total points from transactions
   */
  private calculateTotalPoints(transactions: any[]): number {
    return transactions.reduce((total, transaction) => {
      const points = transaction.points || transaction.amount || 0;
      return total + points;
    }, 0);
  }

  /**
   * Check points consistency between summary and transactions
   */
  private checkPointsConsistency(
    user: User,
    summary: UserDataSummary['summary'],
    calculated: UserDataSummary['calculated'],
    inconsistencies: DataInconsistency[]
  ): void {
    if (summary.totalPoints !== calculated.totalPointsFromTransactions) {
      inconsistencies.push({
        id: `${user.uid}-points-mismatch`,
        type: 'points-mismatch',
        severity: 'high',
        userId: user.uid,
        userName: user.displayName,
        description: `User summary shows ${summary.totalPoints} points, but transactions sum to ${calculated.totalPointsFromTransactions}`,
        currentValue: summary.totalPoints,
        expectedValue: calculated.totalPointsFromTransactions,
        affectedCollections: ['users', 'pointsTransactions'],
        canAutoRepair: true,
        repairDescription: `Update user.totalPoints from ${summary.totalPoints} to ${calculated.totalPointsFromTransactions}`,
      });
    }
  }

  /**
   * Check pub count consistency
   */
  private checkPubCountConsistency(
    user: User,
    summary: UserDataSummary['summary'],
    calculated: UserDataSummary['calculated'],
    inconsistencies: DataInconsistency[]
  ): void {
    if (summary.verifiedPubCount !== calculated.verifiedPubCountFromCheckins) {
      inconsistencies.push({
        id: `${user.uid}-pub-count-mismatch`,
        type: 'pub-count-mismatch',
        severity: 'medium',
        userId: user.uid,
        userName: user.displayName,
        description: `User summary shows ${summary.verifiedPubCount} verified pubs, but has ${calculated.verifiedPubCountFromCheckins} check-ins`,
        currentValue: summary.verifiedPubCount,
        expectedValue: calculated.verifiedPubCountFromCheckins,
        affectedCollections: ['users', 'checkins'],
        canAutoRepair: true,
        repairDescription: `Update user.verifiedPubCount from ${summary.verifiedPubCount} to ${calculated.verifiedPubCountFromCheckins}`,
      });
    }

    // Check if totalPubCount makes sense
    const expectedTotalPubCount = summary.verifiedPubCount + summary.unverifiedPubCount;
    if (summary.totalPubCount !== expectedTotalPubCount) {
      inconsistencies.push({
        id: `${user.uid}-total-pub-count-mismatch`,
        type: 'pub-count-mismatch',
        severity: 'low',
        userId: user.uid,
        userName: user.displayName,
        description: `User totalPubCount (${summary.totalPubCount}) doesn't match verified (${summary.verifiedPubCount}) + unverified (${summary.unverifiedPubCount}) = ${expectedTotalPubCount}`,
        currentValue: summary.totalPubCount,
        expectedValue: expectedTotalPubCount,
        affectedCollections: ['users'],
        canAutoRepair: true,
        repairDescription: `Update user.totalPubCount from ${summary.totalPubCount} to ${expectedTotalPubCount}`,
      });
    }
  }

  /**
   * Check badge count consistency
   */
  private checkBadgeCountConsistency(
    user: User,
    summary: UserDataSummary['summary'],
    calculated: UserDataSummary['calculated'],
    inconsistencies: DataInconsistency[]
  ): void {
    if (summary.badgeCount !== calculated.badgeCountFromEarned) {
      inconsistencies.push({
        id: `${user.uid}-badge-count-mismatch`,
        type: 'badge-count-mismatch',
        severity: 'medium',
        userId: user.uid,
        userName: user.displayName,
        description: `User summary shows ${summary.badgeCount} badges, but has ${calculated.badgeCountFromEarned} earned badges`,
        currentValue: summary.badgeCount,
        expectedValue: calculated.badgeCountFromEarned,
        affectedCollections: ['users', 'earnedBadges'],
        canAutoRepair: true,
        repairDescription: `Update user.badgeCount from ${summary.badgeCount} to ${calculated.badgeCountFromEarned}`,
      });
    }
  }

  /**
   * Check for missing summary fields
   */
  private checkMissingSummaryFields(
    user: User,
    summary: UserDataSummary['summary'],
    inconsistencies: DataInconsistency[]
  ): void {
    const missingFields: string[] = [];

    if (user.totalPoints === undefined) missingFields.push('totalPoints');
    if (user.verifiedPubCount === undefined) missingFields.push('verifiedPubCount');
    if (user.unverifiedPubCount === undefined) missingFields.push('unverifiedPubCount');
    if (user.totalPubCount === undefined) missingFields.push('totalPubCount');
    if (user.badgeCount === undefined) missingFields.push('badgeCount');

    if (missingFields.length > 0) {
      inconsistencies.push({
        id: `${user.uid}-missing-summary`,
        type: 'missing-user-summary',
        severity: 'high',
        userId: user.uid,
        userName: user.displayName,
        description: `User is missing summary fields: ${missingFields.join(', ')}`,
        currentValue: null,
        expectedValue: 'Calculated from transactional data',
        affectedCollections: ['users'],
        canAutoRepair: true,
        repairDescription: `Initialize missing summary fields: ${missingFields.join(', ')}`,
      });
    }
  }

  /**
   * Auto-repair a specific inconsistency
   */
  async repairInconsistency(
    inconsistency: DataInconsistency
  ): Promise<{ success: boolean; error?: string }> {
    if (!inconsistency.canAutoRepair) {
      return { success: false, error: 'This inconsistency cannot be auto-repaired' };
    }

    if (!inconsistency.userId) {
      return { success: false, error: 'No user ID specified for repair' };
    }

    try {
      console.log(
        `[DataIntegrityService] 🔧 Repairing ${inconsistency.type} for user ${inconsistency.userId}`
      );

      switch (inconsistency.type) {
        case 'points-mismatch':
          await this.repairPointsMismatch(inconsistency.userId, inconsistency.expectedValue);
          break;
        case 'pub-count-mismatch':
          await this.repairPubCountMismatch(inconsistency.userId, inconsistency);
          break;
        case 'badge-count-mismatch':
          await this.repairBadgeCountMismatch(inconsistency.userId, inconsistency.expectedValue);
          break;
        case 'missing-user-summary':
          await this.repairMissingSummaryFields(inconsistency.userId);
          break;
        default:
          return { success: false, error: `Unknown inconsistency type: ${inconsistency.type}` };
      }

      console.log(
        `[DataIntegrityService] ✅ Successfully repaired ${inconsistency.type} for user ${inconsistency.userId}`
      );
      return { success: true };
    } catch (error: any) {
      console.error(`[DataIntegrityService] ❌ Failed to repair ${inconsistency.type}:`, error);
      return { success: false, error: error?.message || 'Unknown error during repair' };
    }
  }

  /**
   * Repair points mismatch by updating user summary
   */
  private async repairPointsMismatch(userId: string, correctPoints: number): Promise<void> {
    await this.updateDoc(`users/${userId}`, { totalPoints: correctPoints });
  }

  /**
   * Repair pub count mismatch
   */
  private async repairPubCountMismatch(
    userId: string,
    inconsistency: DataInconsistency
  ): Promise<void> {
    const updates: Partial<User> = {};

    if (inconsistency.id.includes('total-pub-count')) {
      updates.totalPubCount = inconsistency.expectedValue;
    } else {
      updates.verifiedPubCount = inconsistency.expectedValue;
      // Recalculate total pub count
      const user = await this.getDocByPath<User>(`users/${userId}`);
      if (user) {
        const newTotal = (inconsistency.expectedValue || 0) + (user.unverifiedPubCount || 0);
        updates.totalPubCount = newTotal;
      }
    }

    await this.updateDoc(`users/${userId}`, updates);
  }

  /**
   * Repair badge count mismatch
   */
  private async repairBadgeCountMismatch(userId: string, correctBadgeCount: number): Promise<void> {
    await this.updateDoc(`users/${userId}`, { badgeCount: correctBadgeCount });
  }

  /**
   * Repair missing summary fields by calculating from transactional data
   */
  private async repairMissingSummaryFields(userId: string): Promise<void> {
    const user = await this.getDocByPath<User>(`users/${userId}`);
    if (!user) throw new Error(`User ${userId} not found`);

    // Recalculate all summary fields
    const userSummary = await this.analyzeUserData(user);

    const updates: Partial<User> = {
      totalPoints: userSummary.calculated.totalPointsFromTransactions,
      verifiedPubCount: userSummary.calculated.verifiedPubCountFromCheckins,
      unverifiedPubCount: user.unverifiedPubCount || 0,
      totalPubCount:
        userSummary.calculated.verifiedPubCountFromCheckins + (user.unverifiedPubCount || 0),
      badgeCount: userSummary.calculated.badgeCountFromEarned,
    };

    await this.updateDoc(`users/${userId}`, updates);
  }

  /**
   * Remove orphaned records for a specific user
   */
  async removeOrphanedRecordsForUser(
    userId: string
  ): Promise<{ success: boolean; deletedCounts: Record<string, number>; error?: string }> {
    try {
      console.log(`[DataIntegrityService] 🗑️ Removing orphaned records for user ${userId}`);

      const deletedCounts = {
        checkins: 0,
        pointsTransactions: 0,
        earnedBadges: 0,
        landlords: 0,
      };

      // Remove from each collection
      const collections = ['checkins', 'pointsTransactions', 'earnedBadges', 'landlords'];

      for (const collectionName of collections) {
        const docs = await this.getDocsWhere<any>(collectionName, where('userId', '==', userId));
        for (const doc of docs) {
          await this.deleteDoc(`${collectionName}/${doc.id}`);
          deletedCounts[collectionName as keyof typeof deletedCounts]++;
        }
      }

      console.log(
        `[DataIntegrityService] ✅ Removed orphaned records for user ${userId}:`,
        deletedCounts
      );
      return { success: true, deletedCounts };
    } catch (error: any) {
      console.error(
        `[DataIntegrityService] ❌ Failed to remove orphaned records for user ${userId}:`,
        error
      );
      return { success: false, deletedCounts: {}, error: error?.message || 'Unknown error' };
    }
  }
}
