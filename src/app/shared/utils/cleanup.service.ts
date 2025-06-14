import { Injectable, inject } from '@angular/core';
import {
  Firestore,
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
export class CleanupService {
  private readonly firestore = inject(Firestore);

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
   * Clear users collection
   */
  async clearUsers(): Promise<CleanupResult> {
    return this.clearCollection('users');
  }

  /**
   * Clear check-ins collection
   */
  async clearCheckIns(): Promise<CleanupResult> {
    return this.clearCollection('checkins');
  }

  /**
   * Clear both users and check-ins in sequence
   */
  async clearAllTestData(): Promise<{ users: CleanupResult; checkIns: CleanupResult }> {
    console.log('[CleanupService] Starting full test data cleanup...');

    const [users, checkIns] = await Promise.all([
      this.clearUsers(),
      this.clearCheckIns()
    ]);

    console.log('[CleanupService] Cleanup complete:', { users, checkIns });

    return { users, checkIns };
  }

  /**
   * Get collection counts for confirmation
   */
  async getCollectionCounts(): Promise<{ users: number; checkIns: number; pubs: number }> {
    try {
      const [usersSnap, checkInsSnap, pubsSnap] = await Promise.all([
        getDocs(collection(this.firestore, 'users')),
        getDocs(collection(this.firestore, 'checkins')),
        getDocs(collection(this.firestore, 'pubs'))
      ]);

      return {
        users: usersSnap.size,
        checkIns: checkInsSnap.size,
        pubs: pubsSnap.size
      };
    } catch (error: any) {
      console.error('[CleanupService] Error getting counts:', error);
      return { users: 0, checkIns: 0, pubs: 0 };
    }
  }
}
