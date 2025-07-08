import { Injectable } from '@angular/core';
import { CachedFirestoreService } from '../../shared/data-access/cached-firestore.service';
import { Observable } from 'rxjs';
import type { Pub } from '../utils/pub.models';
import type { CheckIn } from '@check-in/utils/check-in.models';
import { FirestoreDataConverter, collection, getDocs, arrayUnion, increment, serverTimestamp, Timestamp } from 'firebase/firestore';
import { earliest, latest } from '../../shared/utils/date-utils';

@Injectable({
  providedIn: 'root'
})
export class PubService extends CachedFirestoreService {
  protected path = 'pubs';
  
  // Configure caching for pubs collection to use STATIC tier
  protected override cacheConfig = {
    'pubs': {
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days (STATIC tier)
      strategy: 'cache-first' as const
    }
  };

  loadPubs(): Observable<Pub[]> {
    return this.collection$<Pub>('pubs');
  }

  getPubById(id: string): Observable<Pub | undefined> {
    return this.doc$<Pub>(`pubs/${id}`);
  }

  getAllPubs(): Promise<Pub[]> {
    const pubConverter: FirestoreDataConverter<Pub> = {
      toFirestore: (pub) => pub,
      fromFirestore: (snap) => snap.data() as Pub,
    };

    const pubsRef = collection(this.firestore, 'pubs').withConverter(pubConverter);
    return getDocs(pubsRef).then(snapshot =>
      snapshot.docs.map(doc => doc.data())
    );
  }

  // ✅ Pub Statistics Update Methods

  /**
   * Update pub statistics after a check-in
   * - Increments check-in count
   * - Updates last check-in timestamp
   * - Updates earliest/latest check-in records
   * - Adds entry to check-in history
   */
  async updatePubStats(pubId: string, checkin: Omit<CheckIn, 'id'>, checkinId: string, currentPub: Pub, userId: string): Promise<void> {
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
    console.log('[PubService] 🏷️ Updating pub carpet status:', pubId, '→', hasCarpet, carpetUrl ? 'with URL' : 'no URL');
    
    try {
      const updateData: Partial<Pub> = { 
        hasCarpet,
        carpetUpdatedAt: serverTimestamp() as any
      };
      
      // Only update carpetUrl if provided
      if (carpetUrl) {
        updateData.carpetUrl = carpetUrl;
      }
      
      await this.updateDoc<Pub>(`${this.path}/${pubId}`, updateData);
      
      console.log('[PubService] ✅ Pub carpet status updated');
      
      // Invalidate cache to force refresh on next read
      await this.invalidateCache(`${this.path}/${pubId}`);
      
    } catch (error) {
      console.error('[PubService] ❌ Failed to update pub carpet status:', error);
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
