// src/app/admin/data-access/collection-browser.service.ts
import { Injectable } from '@angular/core';
import {
  DocumentData,
  QueryConstraint,
  QueryDocumentSnapshot,
  collection,
  limit as firestoreLimit,
  getDocs,
  orderBy,
  query,
  startAfter,
  where,
} from '@angular/fire/firestore';
import { FirestoreService } from '@fourfold/angular-foundation';

export type CollectionRecord = {
  id: string;
  data: any;
  collection: string;
  lastModified?: Date;
};

export type CollectionBrowserResult = {
  records: CollectionRecord[];
  hasMore: boolean;
  totalCount?: number;
  lastDocument?: QueryDocumentSnapshot<DocumentData>;
};

export type CollectionFilter = {
  field: string;
  operator:
    | '=='
    | '!='
    | '<'
    | '<='
    | '>'
    | '>='
    | 'in'
    | 'not-in'
    | 'array-contains'
    | 'array-contains-any';
  value: any;
};

export type CollectionBrowserOptions = {
  collectionName: string;
  pageSize?: number;
  lastDocument?: QueryDocumentSnapshot<DocumentData>;
  filters?: CollectionFilter[];
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  searchField?: string;
  searchValue?: string;
};

export type UserDataAcrossCollections = {
  userId: string;
  collections: {
    [collectionName: string]: CollectionRecord[];
  };
  totalRecords: number;
  summary: {
    pointsTransactions: { count: number; totalPoints: number };
    checkins: { count: number; uniquePubs: number };
    earnedBadges: { count: number };
    userMissionProgress: { count: number };
    landlords: { count: number };
    userEvents: { count: number };
  };
};

@Injectable({
  providedIn: 'root',
})
export class CollectionBrowserService extends FirestoreService {
  /**
   * Browse any collection with pagination, filtering, and search
   */
  async browseCollection(options: CollectionBrowserOptions): Promise<CollectionBrowserResult> {
    const {
      collectionName,
      pageSize = 50,
      lastDocument,
      filters = [],
      orderByField = 'id',
      orderDirection = 'asc',
      searchField,
      searchValue,
    } = options;

    try {
      console.log(
        `[CollectionBrowserService] 🔍 Browsing ${collectionName} with options:`,
        options
      );

      // Build query constraints
      const constraints: QueryConstraint[] = [];

      // Add filters
      filters.forEach(filter => {
        constraints.push(where(filter.field, filter.operator as any, filter.value));
      });

      // Add search filter if provided
      if (searchField && searchValue) {
        if (typeof searchValue === 'string') {
          // For string searches, we can do prefix matching
          constraints.push(
            where(searchField, '>=', searchValue),
            where(searchField, '<=', searchValue + '\uf8ff')
          );
        } else {
          // For non-string searches, exact match
          constraints.push(where(searchField, '==', searchValue));
        }
      }

      // Add ordering
      try {
        constraints.push(orderBy(orderByField, orderDirection));
      } catch (error) {
        // If ordering fails, fall back to document ID ordering
        console.warn(
          `[CollectionBrowserService] Failed to order by ${orderByField}, using document ID`
        );
        constraints.push(orderBy('__name__', orderDirection));
      }

      // Add pagination
      constraints.push(firestoreLimit(pageSize + 1)); // +1 to check if there are more

      // Add cursor for pagination
      if (lastDocument) {
        constraints.push(startAfter(lastDocument));
      }

      // Execute query
      const q = query(collection(this.firestore, collectionName), ...constraints);
      const snapshot = await getDocs(q);

      // Process results
      const allDocs = snapshot.docs;
      const hasMore = allDocs.length > pageSize;
      const records = allDocs.slice(0, pageSize); // Remove the extra document used for hasMore check

      const result: CollectionBrowserResult = {
        records: records.map(doc => ({
          id: doc.id,
          data: doc.data(),
          collection: collectionName,
          lastModified: doc.data()?.['updatedAt']?.toDate() || doc.data()?.['createdAt']?.toDate(),
        })),
        hasMore,
        lastDocument: hasMore ? records[records.length - 1] : undefined,
      };

      console.log(
        `[CollectionBrowserService] ✅ Found ${result.records.length} records in ${collectionName}, hasMore: ${hasMore}`
      );
      return result;
    } catch (error: any) {
      console.error(`[CollectionBrowserService] ❌ Error browsing ${collectionName}:`, error);
      return {
        records: [],
        hasMore: false,
      };
    }
  }

  /**
   * Get all collections that contain data for a specific user ID
   */
  async getUserDataAcrossCollections(userId: string): Promise<UserDataAcrossCollections> {
    console.log(`[CollectionBrowserService] 🔍 Gathering all data for user: ${userId}`);

    const collectionsToCheck = [
      'pointsTransactions',
      'checkins',
      'earnedBadges',
      'userMissionProgress',
      'landlords',
      'user-events',
    ];

    const collections: { [collectionName: string]: CollectionRecord[] } = {};
    let totalRecords = 0;

    // Initialize summary
    const summary = {
      pointsTransactions: { count: 0, totalPoints: 0 },
      checkins: { count: 0, uniquePubs: 0 },
      earnedBadges: { count: 0 },
      userMissionProgress: { count: 0 },
      landlords: { count: 0 },
      userEvents: { count: 0 },
    };

    // Check each collection for user data
    for (const collectionName of collectionsToCheck) {
      try {
        const result = await this.browseCollection({
          collectionName,
          filters: [{ field: 'userId', operator: '==', value: userId }],
          pageSize: 1000, // Get all records for this user
        });

        collections[collectionName] = result.records;
        totalRecords += result.records.length;

        // Update summary based on collection type
        switch (collectionName) {
          case 'pointsTransactions':
            summary.pointsTransactions.count = result.records.length;
            summary.pointsTransactions.totalPoints = result.records.reduce((total, record) => {
              const points = record.data.points || record.data.amount || 0;
              return total + points;
            }, 0);
            break;

          case 'checkins':
            summary.checkins.count = result.records.length;
            const uniquePubs = new Set(result.records.map(r => r.data.pubId)).size;
            summary.checkins.uniquePubs = uniquePubs;
            break;

          case 'earnedBadges':
            summary.earnedBadges.count = result.records.length;
            break;

          case 'userMissionProgress':
            summary.userMissionProgress.count = result.records.length;
            break;

          case 'landlords':
            summary.landlords.count = result.records.length;
            break;

          case 'user-events':
            summary.userEvents.count = result.records.length;
            break;
        }
      } catch (error) {
        console.warn(
          `[CollectionBrowserService] Failed to get data from ${collectionName} for user ${userId}:`,
          error
        );
        collections[collectionName] = [];
      }
    }

    const result: UserDataAcrossCollections = {
      userId,
      collections,
      totalRecords,
      summary,
    };

    console.log(`[CollectionBrowserService] ✅ User ${userId} data summary:`, {
      totalRecords,
      summary,
      collectionsWithData: Object.entries(collections)
        .filter(([_, records]) => records.length > 0)
        .map(([name]) => name),
    });

    return result;
  }

  /**
   * Find all orphaned records (records with userId that doesn't exist in users collection)
   */
  async findOrphanedRecords(): Promise<{
    [collectionName: string]: CollectionRecord[];
  }> {
    console.log('[CollectionBrowserService] 🔍 Finding orphaned records across all collections...');

    // First, get all valid user IDs
    const users = await this.getDocsWhere<any>('users');
    const validUserIds = new Set(users.map(user => user.uid));

    console.log(`[CollectionBrowserService] Found ${validUserIds.size} valid user IDs`);

    const collectionsToCheck = [
      'pointsTransactions',
      'checkins',
      'earnedBadges',
      'userMissionProgress',
      'landlords',
      'user-events',
    ];

    const orphanedRecords: { [collectionName: string]: CollectionRecord[] } = {};

    for (const collectionName of collectionsToCheck) {
      try {
        console.log(
          `[CollectionBrowserService] Checking ${collectionName} for orphaned records...`
        );

        const result = await this.browseCollection({
          collectionName,
          pageSize: 1000, // Check all records
        });

        // Filter for orphaned records
        const orphaned = result.records.filter(record => {
          const userId = record.data.userId;
          return userId && !validUserIds.has(userId);
        });

        if (orphaned.length > 0) {
          orphanedRecords[collectionName] = orphaned;
          console.log(
            `[CollectionBrowserService] Found ${orphaned.length} orphaned records in ${collectionName}`
          );
        }
      } catch (error) {
        console.warn(
          `[CollectionBrowserService] Failed to check ${collectionName} for orphaned records:`,
          error
        );
      }
    }

    const totalOrphaned = Object.values(orphanedRecords).reduce(
      (sum, records) => sum + records.length,
      0
    );
    console.log(
      `[CollectionBrowserService] ✅ Found ${totalOrphaned} total orphaned records across ${Object.keys(orphanedRecords).length} collections`
    );

    return orphanedRecords;
  }

  /**
   * Delete a specific record from a collection
   */
  async deleteRecord(
    collectionName: string,
    recordId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(
        `[CollectionBrowserService] 🗑️ Deleting record ${recordId} from ${collectionName}`
      );
      await this.deleteDoc(`${collectionName}/${recordId}`);
      console.log(
        `[CollectionBrowserService] ✅ Successfully deleted record ${recordId} from ${collectionName}`
      );
      return { success: true };
    } catch (error: any) {
      console.error(
        `[CollectionBrowserService] ❌ Failed to delete record ${recordId} from ${collectionName}:`,
        error
      );
      return { success: false, error: error?.message || 'Unknown error' };
    }
  }

  /**
   * Delete multiple records from a collection
   */
  async deleteRecords(
    collectionName: string,
    recordIds: string[]
  ): Promise<{
    successCount: number;
    failureCount: number;
    errors: string[];
  }> {
    console.log(
      `[CollectionBrowserService] 🗑️ Bulk deleting ${recordIds.length} records from ${collectionName}`
    );

    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    for (const recordId of recordIds) {
      const result = await this.deleteRecord(collectionName, recordId);
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
        if (result.error) {
          errors.push(`${recordId}: ${result.error}`);
        }
      }
    }

    console.log(
      `[CollectionBrowserService] ✅ Bulk delete completed: ${successCount} success, ${failureCount} failures`
    );
    return { successCount, failureCount, errors };
  }

  /**
   * Get a summary of all collections with record counts
   */
  async getCollectionsSummary(): Promise<{
    [collectionName: string]: {
      count: number;
      hasUserData: boolean;
      sampleRecord?: any;
    };
  }> {
    console.log('[CollectionBrowserService] 📊 Getting collections summary...');

    const collectionsToCheck = [
      'users',
      'pointsTransactions',
      'checkins',
      'earnedBadges',
      'userMissionProgress',
      'landlords',
      'user-events',
      'pubs',
      'badges',
      'missions',
      'feedback',
      'systemErrors',
      'function-errors',
    ];

    const summary: {
      [collectionName: string]: { count: number; hasUserData: boolean; sampleRecord?: any };
    } = {};

    for (const collectionName of collectionsToCheck) {
      try {
        const result = await this.browseCollection({
          collectionName,
          pageSize: 1,
        });

        const hasUserData =
          result.records.length > 0 && result.records[0].data.userId !== undefined;

        // Get approximate count by trying to fetch more
        const countResult = await this.browseCollection({
          collectionName,
          pageSize: 1000,
        });

        summary[collectionName] = {
          count: countResult.records.length + (countResult.hasMore ? 999 : 0), // Rough estimate
          hasUserData,
          sampleRecord: result.records.length > 0 ? result.records[0].data : null,
        };
      } catch (error) {
        console.warn(
          `[CollectionBrowserService] Failed to get summary for ${collectionName}:`,
          error
        );
        summary[collectionName] = {
          count: 0,
          hasUserData: false,
        };
      }
    }

    console.log('[CollectionBrowserService] ✅ Collections summary completed:', summary);
    return summary;
  }
}
