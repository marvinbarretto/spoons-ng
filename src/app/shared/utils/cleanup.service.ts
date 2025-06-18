// src/app/shared/utils/cleanup.service.ts
import { Injectable } from '@angular/core';
import { FirestoreService } from '../data-access/firestore.service';
import {
  collection,
  getDocs,
  writeBatch,
  query,
  limit as firestoreLimit
} from '@angular/fire/firestore';

export type CleanupResult = {
  success: boolean;
  deletedCount: number;
  error?: string;
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
  }> {
    const [users, checkIns, landlords, earnedBadges, pubs] = await Promise.all([
      this.getCollectionCount('users'),
      this.getCollectionCount('checkins'),
      this.getCollectionCount('landlords'),
      this.getCollectionCount('earnedBadges'),
      this.getCollectionCount('pubs')
    ]);

    return { users, checkIns, landlords, earnedBadges, pubs };
  }

  // ===================================
  // 🧽 INDIVIDUAL COLLECTION CLEANUP
  // ===================================

  /**
   * Clear users collection
   */
  async clearUsers(): Promise<CleanupResult> {
    console.log('[CleanupService] 👥 Clearing users collection...');
    return this.clearCollection('users');
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
    pubs?: CleanupResult;
  }> {
    console.log('[CleanupService] ☢️ NUCLEAR CLEANUP - Clearing ALL data...');

    const [users, checkIns, landlords, earnedBadges, badges] = await Promise.all([
      this.clearUsers(),
      this.clearCheckIns(),
      this.clearLandlords(),
      this.clearEarnedBadges(),
      this.clearBadgeDefinitions()
    ]);

    const totalDeleted = users.deletedCount + checkIns.deletedCount +
                        landlords.deletedCount + earnedBadges.deletedCount +
                        badges.deletedCount;

    console.log(`[CleanupService] ☢️ Nuclear cleanup complete. Deleted: ${totalDeleted} documents`);

    return { users, checkIns, landlords, earnedBadges, badges };
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
