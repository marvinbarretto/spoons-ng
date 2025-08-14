import { Injectable } from '@angular/core';
import { FirestoreService } from '@fourfold/angular-foundation';
import {
  FirestoreDataConverter,
  collection,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { Observable, firstValueFrom } from 'rxjs';
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

  // ✅ Essential Pub Update Methods

  /**
   * Update the last check-in timestamp for a pub (lightweight update)
   * 
   * This is a lightweight update that only sets lastCheckinAt to server timestamp.
   * Used for quick sorting/filtering of pubs by recent activity.
   * 
   * For real statistics (count, unique visitors, etc.), use GlobalCheckInStore methods:
   * - GlobalCheckInStore.getPubVisitCount(pubId) for total visits
   * - GlobalCheckInStore.getCheckInsForPub(pubId) for detailed check-in data
   * 
   * @param pubId - ID of the pub to update
   * @throws Error if update fails or Firestore is unavailable
   */
  async updateLastCheckinTime(pubId: string): Promise<void> {
    console.log('[PubService] Updating last check-in time for:', pubId);

    await this.updateDoc<Pub>(`${this.path}/${pubId}`, {
      lastCheckinAt: serverTimestamp() as any,
    });

    console.log('[PubService] Last check-in time updated successfully:', pubId);
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

}
