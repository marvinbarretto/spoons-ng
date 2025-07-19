// src/app/shared/utils/cleanup.service.ts
import { Injectable } from '@angular/core';
import { FirestoreService } from '@fourfold/angular-foundation';
import {
  collection,
  getDocs,
  writeBatch,
  query,
  limit as firestoreLimit,
  where
} from '@angular/fire/firestore';
import type { User } from '@users/utils/user.model';

export type CleanupResult = {
  success: boolean;
  deletedCount: number;
  protectedCount?: number;
  error?: string;
};

export type UserDeletionSummary = {
  totalUsers: number;
  realUsers: number;
  testUsers: number;
  realUserIds: string[];
  testUserIds: string[];
};

@Injectable({
  providedIn: 'root'
})
export class CleanupService extends FirestoreService {

  /**
   * Batch delete all documents from a collection
   * Firestore limit: 500 operations per batch
   */
  async clearCollection(collectionName: string): Promise<CleanupResult> {
    try {
      let totalDeleted = 0;
      let hasMore = true;

      while (hasMore) {
        // Get batch of documents (500 max for batch operations)
        const snapshot = await getDocs(
          query(collection(this.firestore, collectionName), firestoreLimit(500))
        );

        if (snapshot.empty) {
          hasMore = false;
          break;
        }

        // Create batch delete operation
        const batch = writeBatch(this.firestore);
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        // Execute batch
        await batch.commit();
        totalDeleted += snapshot.size;

        console.log(`[CleanupService] Deleted ${snapshot.size} documents from ${collectionName}`);

        // Check if we got less than 500, meaning we're done
        if (snapshot.size < 500) {
          hasMore = false;
        }
      }

      return {
        success: true,
        deletedCount: totalDeleted
      };

    } catch (error: any) {
      console.error(`[CleanupService] Error clearing ${collectionName}:`, error);
      return {
        success: false,
        deletedCount: 0,
        error: error?.message || 'Unknown error'
      };
    }
  }

  /**
   * Get count of documents in a collection
   * Uses inherited FirestoreService methods
   */
  async getCollectionCount(collectionName: string): Promise<number> {
    try {
      // ✅ Use inherited method instead of manual Firestore operations
      const docs = await this.getDocsWhere<any>(collectionName);
      return docs.length;
    } catch (error) {
      console.error(`[CleanupService] Error counting ${collectionName}:`, error);
      return 0;
    }
  }

  /**
   * Get counts for all collections
   * More efficient with Promise.all
   */
  async getCollectionCounts(): Promise<{
    users: number;
    checkIns: number;
    landlords: number;
    earnedBadges: number;
    pubs: number;
    userMissionProgress: number;
    pointsTransactions: number;
    missions: number;
    feedback: number;
  }> {
    const [users, checkIns, landlords, earnedBadges, pubs, userMissionProgress, pointsTransactions, missions, feedback] = await Promise.all([
      this.getCollectionCount('users'),
      this.getCollectionCount('checkins'),
      this.getCollectionCount('landlords'),
      this.getCollectionCount('earnedBadges'),
      this.getCollectionCount('pubs'),
      this.getCollectionCount('userMissionProgress'),
      this.getCollectionCount('pointsTransactions'),
      this.getCollectionCount('missions'),
      this.getCollectionCount('feedback')
    ]);

    return { users, checkIns, landlords, earnedBadges, pubs, userMissionProgress, pointsTransactions, missions, feedback };
  }

  // ===================================
  // 👥 USER ANALYSIS AND PROTECTION
  // ===================================

  /**
   * Analyze users to identify real vs test users
   */
  async analyzeUsers(): Promise<UserDeletionSummary> {
    console.log('[CleanupService] 🔍 Analyzing users for real vs test classification...');

    try {
      const users = await this.getDocsWhere<User>('users');

      const realUsers = users.filter(user => user.realUser === true);
      const testUsers = users.filter(user => user.realUser !== true);

      const summary: UserDeletionSummary = {
        totalUsers: users.length,
        realUsers: realUsers.length,
        testUsers: testUsers.length,
        realUserIds: realUsers.map(u => u.uid),
        testUserIds: testUsers.map(u => u.uid)
      };

      console.log('[CleanupService] 📊 User Analysis Results:', {
        total: summary.totalUsers,
        real: summary.realUsers,
        test: summary.testUsers,
        realUserDisplayNames: realUsers.map(u => ({ uid: u.uid.slice(0, 8), name: u.displayName }))
      });

      return summary;
    } catch (error: any) {
      console.error('[CleanupService] ❌ Error analyzing users:', error);
      throw error;
    }
  }

  /**
   * Get list of real users for review before deletion
   */
  async getRealUsers(): Promise<User[]> {
    console.log('[CleanupService] 🔍 Fetching real users...');

    try {
      const realUsers = await this.getDocsWhere<User>('users', where('realUser', '==', true));

      console.log('[CleanupService] 👥 Found real users:',
        realUsers.map(u => ({
          uid: u.uid.slice(0, 8),
          displayName: u.displayName,
          email: u.email,
          joinedAt: u.joinedAt
        }))
      );

      return realUsers;
    } catch (error: any) {
      console.error('[CleanupService] ❌ Error fetching real users:', error);
      return [];
    }
  }

  // ===================================
  // 🧽 INDIVIDUAL COLLECTION CLEANUP
  // ===================================

  /**
   * Clear users collection (PROTECTED - excludes real users)
   */
  async clearUsers(): Promise<CleanupResult> {
    console.log('[CleanupService] 👥 Clearing users collection (with real user protection)...');
    return this.clearTestUsersOnly();
  }

  /**
   * Clear only test users, protect real users
   */
  async clearTestUsersOnly(): Promise<CleanupResult> {
    console.log('[CleanupService] 👥 Clearing test users only (protecting real users)...');

    try {
      // First analyze the users
      const summary = await this.analyzeUsers();

      if (summary.realUsers > 0) {
        console.log(`[CleanupService] 🛡️ PROTECTING ${summary.realUsers} real users:`,
          summary.realUserIds.map(uid => uid.slice(0, 8))
        );
      }

      if (summary.testUsers === 0) {
        console.log('[CleanupService] ✅ No test users to delete');
        return {
          success: true,
          deletedCount: 0,
          protectedCount: summary.realUsers
        };
      }

      console.log(`[CleanupService] 🗑️ Deleting ${summary.testUsers} test users:`,
        summary.testUserIds.map(uid => uid.slice(0, 8))
      );

      // Delete only test users (those without realUser: true)
      const result = await this.clearUsersWhere(where('realUser', '!=', true));

      return {
        ...result,
        protectedCount: summary.realUsers
      };

    } catch (error: any) {
      console.error('[CleanupService] ❌ Error clearing test users:', error);
      return {
        success: false,
        deletedCount: 0,
        protectedCount: 0,
        error: error?.message || 'Failed to clear test users'
      };
    }
  }

  /**
   * DANGEROUS: Clear ALL users including real users (requires explicit call)
   */
  async clearAllUsersIncludingReal(): Promise<CleanupResult> {
    console.log('[CleanupService] ⚠️ DANGER: Clearing ALL users including real users...');

    const summary = await this.analyzeUsers();
    if (summary.realUsers > 0) {
      console.warn(`[CleanupService] ⚠️ WARNING: This will delete ${summary.realUsers} REAL users!`);
    }

    return this.clearCollection('users');
  }

  /**
   * Clear users with specific where condition
   */
  private async clearUsersWhere(whereCondition: any): Promise<CleanupResult> {
    try {
      let totalDeleted = 0;
      let hasMore = true;

      while (hasMore) {
        // Get batch of documents with where condition
        const snapshot = await getDocs(
          query(
            collection(this.firestore, 'users'),
            whereCondition,
            firestoreLimit(500)
          )
        );

        if (snapshot.empty) {
          hasMore = false;
          break;
        }

        // Create batch delete operation
        const batch = writeBatch(this.firestore);
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        // Execute batch
        await batch.commit();
        totalDeleted += snapshot.size;

        console.log(`[CleanupService] Deleted ${snapshot.size} users (batch)`);

        // Check if we got less than 500, meaning we're done
        if (snapshot.size < 500) {
          hasMore = false;
        }
      }

      return {
        success: true,
        deletedCount: totalDeleted
      };

    } catch (error: any) {
      console.error('[CleanupService] Error clearing users with condition:', error);
      return {
        success: false,
        deletedCount: 0,
        error: error?.message || 'Unknown error'
      };
    }
  }

  /**
   * Clear check-ins collection
   */
  async clearCheckIns(): Promise<CleanupResult> {
    console.log('[CleanupService] 📍 Clearing check-ins collection...');
    return this.clearCollection('checkins');
  }

  /**
   * Clear landlords collection
   */
  async clearLandlords(): Promise<CleanupResult> {
    console.log('[CleanupService] 🏠 Clearing landlords collection...');
    return this.clearCollection('landlords');
  }

  /**
   * Clear earned badges collection
   */
  async clearEarnedBadges(): Promise<CleanupResult> {
    console.log('[CleanupService] 🏆 Clearing earned badges collection...');
    return this.clearCollection('earnedBadges');
  }

  /**
   * Clear badge definitions collection (DANGEROUS - for dev only)
   */
  async clearBadgeDefinitions(): Promise<CleanupResult> {
    console.log('[CleanupService] ⚠️ Clearing badge definitions collection...');
    return this.clearCollection('badges');
  }

  // ===================================
  // 🚀 BULK CLEANUP OPERATIONS
  // ===================================

  /**
   * Clear all test data: users, check-ins, landlords, and earned badges
   * This is the main cleanup method that ensures database consistency
   */
  async clearAllTestData(): Promise<{
    users: CleanupResult;
    checkIns: CleanupResult;
    landlords: CleanupResult;
    earnedBadges: CleanupResult;
  }> {
    console.log('[CleanupService] 🧽 Starting complete test data cleanup...');

    // Run all cleanup operations in parallel for efficiency
    const [users, checkIns, landlords, earnedBadges] = await Promise.all([
      this.clearUsers(),
      this.clearCheckIns(),
      this.clearLandlords(),
      this.clearEarnedBadges()
    ]);

    const totalDeleted = users.deletedCount + checkIns.deletedCount +
                        landlords.deletedCount + earnedBadges.deletedCount;

    console.log(`[CleanupService] ✅ Cleanup complete. Total deleted: ${totalDeleted} documents`);
    console.log('[CleanupService] Results:', { users, checkIns, landlords, earnedBadges });

    return { users, checkIns, landlords, earnedBadges };
  }

  /**
   * Clear all user-related data (users + their earned badges)
   * Useful for targeted cleanup that maintains data consistency
   */
  async clearUserData(): Promise<{
    users: CleanupResult;
    earnedBadges: CleanupResult;
  }> {
    console.log('[CleanupService] 🧽 Clearing user data (users + earned badges)...');

    const [users, earnedBadges] = await Promise.all([
      this.clearUsers(),
      this.clearEarnedBadges()
    ]);

    const totalDeleted = users.deletedCount + earnedBadges.deletedCount;
    console.log(`[CleanupService] ✅ User data cleanup complete. Deleted: ${totalDeleted} documents`);

    return { users, earnedBadges };
  }

  /**
   * Nuclear option: Clear EVERYTHING including badge definitions
   * Only for complete reset scenarios
   */
  async clearEverything(): Promise<{
    users: CleanupResult;
    checkIns: CleanupResult;
    landlords: CleanupResult;
    earnedBadges: CleanupResult;
    badges: CleanupResult;
    pubs: CleanupResult;
    userMissionProgress: CleanupResult;
    pointsTransactions: CleanupResult;
    missions: CleanupResult;
    feedback: CleanupResult;
  }> {
    console.log('🔥🔥🔥 [CleanupService] ☢️ NUCLEAR CLEANUP STARTED 🔥🔥🔥');
    console.log('[CleanupService] This will DELETE ALL DATA from ALL collections');

    // Get current counts for before/after comparison
    console.log('[CleanupService] 📊 Getting current database state...');
    const beforeCounts = await this.getCollectionCounts();
    const totalBefore = Object.values(beforeCounts).reduce((sum, count) => sum + count, 0);

    console.log('[CleanupService] 📊 BEFORE Nuclear Reset:');
    console.log(`[CleanupService]   Total Documents: ${totalBefore}`);
    Object.entries(beforeCounts).forEach(([collection, count]) => {
      console.log(`[CleanupService]   ${collection}: ${count} docs`);
    });

    console.log('[CleanupService] 🚀 Starting parallel deletion of ALL collections...');

    // Clear ALL collections in parallel - including the missing ones
    const [users, checkIns, landlords, earnedBadges, badges, pubs, userMissionProgress, pointsTransactions, missions, feedback] = await Promise.all([
      this.clearAllUsersIncludingReal(), // Use dangerous version for true nuclear reset
      this.clearCheckIns(),
      this.clearLandlords(),
      this.clearEarnedBadges(),
      this.clearBadgeDefinitions(),
      this.clearCollection('pubs'),
      this.clearCollection('userMissionProgress'),
      this.clearCollection('pointsTransactions'),
      this.clearCollection('missions'),
      this.clearCollection('feedback')
    ]);

    // Calculate total deleted
    const results = { users, checkIns, landlords, earnedBadges, badges, pubs, userMissionProgress, pointsTransactions, missions, feedback };
    const totalDeleted = Object.values(results).reduce((sum, result) => sum + result.deletedCount, 0);

    // Log detailed results
    console.log('[CleanupService] 📊 NUCLEAR RESET RESULTS:');
    Object.entries(results).forEach(([collection, result]) => {
      const status = result.success ? '✅' : '❌';
      console.log(`[CleanupService]   ${status} ${collection}: deleted ${result.deletedCount} docs ${result.error ? `(Error: ${result.error})` : ''}`);
    });

    console.log(`[CleanupService] 🔥 TOTAL DELETED: ${totalDeleted} documents`);

    // Get after counts to verify
    console.log('[CleanupService] 📊 Verifying deletion...');
    const afterCounts = await this.getCollectionCounts();
    const totalAfter = Object.values(afterCounts).reduce((sum, count) => sum + count, 0);

    console.log('[CleanupService] 📊 AFTER Nuclear Reset:');
    console.log(`[CleanupService]   Total Documents: ${totalAfter}`);
    if (totalAfter > 0) {
      Object.entries(afterCounts).forEach(([collection, count]) => {
        if (count > 0) {
          console.warn(`[CleanupService]   ⚠️ ${collection}: ${count} docs REMAIN`);
        }
      });
    } else {
      console.log('[CleanupService] ✅ Database is completely empty!');
    }

    console.log('🔥🔥🔥 [CleanupService] ☢️ NUCLEAR CLEANUP COMPLETED 🔥🔥🔥');

    return results;
  }

  // ===================================
  // 🔍 UTILITY METHODS
  // ===================================

  /**
   * Check if a collection is empty
   */
  async isCollectionEmpty(collectionName: string): Promise<boolean> {
    const count = await this.getCollectionCount(collectionName);
    return count === 0;
  }

  /**
   * Get summary of all collection states
   */
  async getDatabaseSummary(): Promise<{
    collections: Record<string, number>;
    totalDocuments: number;
    isEmpty: boolean;
  }> {
    const counts = await this.getCollectionCounts();
    const totalDocuments = Object.values(counts).reduce((sum, count) => sum + count, 0);

    return {
      collections: counts,
      totalDocuments,
      isEmpty: totalDocuments === 0
    };
  }
}
