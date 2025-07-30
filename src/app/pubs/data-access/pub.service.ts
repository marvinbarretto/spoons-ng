import { Injectable } from '@angular/core';
import type { CheckIn } from '@check-in/utils/check-in.models';
import { FirestoreService } from '@fourfold/angular-foundation';
import {
  FirestoreDataConverter,
  Timestamp,
  arrayUnion,
  collection,
  getDocs,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { Observable, firstValueFrom } from 'rxjs';
import { earliest, latest } from '../../shared/utils/date-utils';
import type { Pub } from '../utils/pub.models';

@Injectable({
  providedIn: 'root',
})
export class PubService extends FirestoreService {
  protected path = 'pubs';

  // Firebase handles caching automatically with offline persistence

  loadPubs(): Observable<Pub[]> {
    return this.collection$<Pub>('pubs');
  }

  getPubById(id: string): Observable<Pub | undefined> {
    return this.doc$<Pub>(`pubs/${id}`);
  }

  /**
   * Get a single pub by ID (Promise-based for async/await usage)
   */
  async getPub(id: string): Promise<Pub | undefined> {
    console.log('[PubService] 🔍 Fetching pub by ID:', id);
    try {
      const pub = await firstValueFrom(this.doc$<Pub>(`pubs/${id}`));
      console.log('[PubService] 📋 Pub fetch result:', pub ? 'found' : 'not found');
      if (pub) {
        console.log('[PubService] 📋 Pub details:', {
          id: pub.id,
          name: pub.name,
          hasCarpet: pub.hasCarpet,
          carpetUrl: pub.carpetUrl ? 'present' : 'empty',
        });
      }
      return pub;
    } catch (error) {
      console.error('[PubService] ❌ Error fetching pub:', error);
      throw error;
    }
  }

  getAllPubs(): Promise<Pub[]> {
    const pubConverter: FirestoreDataConverter<Pub> = {
      toFirestore: pub => pub,
      fromFirestore: snap => snap.data() as Pub,
    };

    const pubsRef = collection(this.firestore, 'pubs').withConverter(pubConverter);
    return getDocs(pubsRef).then(snapshot => snapshot.docs.map(doc => doc.data()));
  }

  // ✅ Pub Statistics Update Methods

  /**
   * Update pub statistics after a check-in
   * - Increments check-in count
   * - Updates last check-in timestamp
   * - Updates earliest/latest check-in records
   * - Adds entry to check-in history
   */
  async updatePubStats(
    pubId: string,
    checkin: Omit<CheckIn, 'id'>,
    checkinId: string,
    currentPub: Pub,
    userId: string
  ): Promise<void> {
    console.log('[PubService] Updating pub stats for:', pubId);

    const checkinDate = this.normalizeDate(checkin.timestamp);

    await this.updateDoc<Pub>(`${this.path}/${pubId}`, {
      checkinCount: increment(1) as any,
      lastCheckinAt: serverTimestamp() as any,
      recordEarlyCheckinAt: earliest(currentPub.recordEarlyCheckinAt, checkinDate),
      recordLatestCheckinAt: latest(currentPub.recordLatestCheckinAt, checkinDate),
      checkinHistory: arrayUnion({
        userId,
        timestamp: checkin.timestamp.toMillis(),
      }) as any,
    });

    console.log('[PubService] Pub stats updated successfully:', pubId);
  }

  /**
   * Increment check-in count for a pub (simpler method)
   */
  async incrementCheckinCount(pubId: string): Promise<void> {
    console.log('[PubService] Incrementing check-in count for:', pubId);

    await this.updateDoc<Pub>(`${this.path}/${pubId}`, {
      checkinCount: increment(1) as any,
      lastCheckinAt: serverTimestamp() as any,
    });

    console.log('[PubService] Check-in count incremented successfully:', pubId);
  }

  /**
   * Update pub check-in history
   */
  async updatePubHistory(pubId: string, userId: string, timestamp: Timestamp): Promise<void> {
    console.log('[PubService] Adding to pub check-in history:', { pubId, userId });

    await this.updateDoc<Pub>(`${this.path}/${pubId}`, {
      checkinHistory: arrayUnion({
        userId,
        timestamp: timestamp.toMillis(),
      }) as any,
    });

    console.log('[PubService] Pub history updated successfully:', pubId);
  }

  /**
   * 🏷️ Update pub carpet status - Used by CarpetStrategyService
   */
  async updatePubHasCarpet(pubId: string, hasCarpet: boolean, carpetUrl?: string): Promise<void> {
    console.log(
      '[PubService] 🏷️ Updating pub carpet status:',
      pubId,
      '→',
      hasCarpet,
      carpetUrl ? 'with URL' : 'no URL'
    );

    try {
      const updateData: Partial<Pub> = {
        hasCarpet,
        carpetUpdatedAt: serverTimestamp() as any,
      };

      // Only update carpetUrl if provided
      if (carpetUrl) {
        updateData.carpetUrl = carpetUrl;
      }

      await this.updateDoc<Pub>(`${this.path}/${pubId}`, updateData);

      console.log('[PubService] ✅ Pub carpet status updated');

      // Firebase automatically handles cache invalidation on writes
    } catch (error) {
      console.error('[PubService] ❌ Failed to update pub carpet status:', error);
      throw error;
    }
  }

  /**
   * 📸 Update pub with carpet URL - Used by CarpetStorageService
   */
  async updatePubCarpetUrl(pubId: string, carpetUrl: string): Promise<void> {
    console.log('[PubService] 📸 Updating pub carpet URL:', pubId);
    console.log('[PubService] 📋 New carpet URL:', carpetUrl);

    try {
      const updateData: Partial<Pub> = {
        carpetUrl,
        hasCarpet: true, // Set hasCarpet to true when we have a URL
        carpetUpdatedAt: serverTimestamp() as any,
      };

      console.log('[PubService] 🔄 Updating Firestore document...');
      await this.updateDoc<Pub>(`${this.path}/${pubId}`, updateData);

      console.log('[PubService] ✅ Pub carpet URL updated successfully');
      console.log('[PubService] 📋 Updated data:', updateData);

      // 🚀 PERFORMANCE OPTIMIZATION: Cache invalidation removed
      // PubStore now handles signal updates directly for instant UI reactivity
      // No need to invalidate service-level cache since PubStore manages reactivity
      console.log('[PubService] 🎯 Skipping cache invalidation - PubStore handles signal updates');
    } catch (error) {
      console.error('[PubService] ❌ Failed to update pub carpet URL:', error);
      console.log('[PubService] 📋 Error details:', {
        pubId,
        carpetUrl,
        errorType: error?.constructor?.name,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Safely convert various timestamp formats to Date
   */
  private normalizeDate(input: unknown): Date {
    if (input instanceof Timestamp) return input.toDate();
    if (input instanceof Date) return input;
    if (typeof input === 'string' || typeof input === 'number') {
      const date = new Date(input);
      if (!isNaN(date.getTime())) return date;
    }
    throw new Error(`[PubService] Invalid timestamp: ${JSON.stringify(input)}`);
  }
}
