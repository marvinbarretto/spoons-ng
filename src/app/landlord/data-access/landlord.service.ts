// src/app/landlord/data-access/landlord.service.ts
import { Injectable, inject } from '@angular/core';
import { FirestoreService } from '../../shared/data-access/firestore.service';
import { Landlord } from '../utils/landlord.model';
import { Timestamp, serverTimestamp, where } from 'firebase/firestore';
import { toDate, toTimestamp } from '../../shared/utils/timestamp.utils';

@Injectable({
  providedIn: 'root'
})
export class LandlordService extends FirestoreService {

  async tryAwardLandlord(pubId: string, checkinDate: Date): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const checkinDateKey = checkinDate.toISOString().split('T')[0];

    // Only award landlord if checking in today
    if (checkinDateKey !== today) {
      console.log('[LandlordService] Not awarding landlord - check-in not from today');
      return;
    }

    try {
      // Check if there's already a landlord for today
      const existingLandlord = await this.getTodaysLandlord(pubId);

      if (existingLandlord) {
        console.log('[LandlordService] Landlord already exists for today:', existingLandlord);
        return;
      }

      // Award landlord
      const newLandlord: Omit<Landlord, 'id'> = {
        userId: 'current-user-id', // TODO: Get from AuthStore
        pubId,
        claimedAt: Timestamp.now(),
        dateKey: today,
        isActive: true,
      };

      await this.addDocToCollection<Omit<Landlord, 'id'>>('landlords', newLandlord);
      console.log('[LandlordService] ✅ Landlord awarded:', newLandlord);

    } catch (error) {
      console.error('[LandlordService] ❌ Failed to award landlord:', error);
    }
  }

  private async getTodaysLandlord(pubId: string): Promise<Landlord | null> {
    const today = new Date().toISOString().split('T')[0];

    const landlords = await this.getDocsWhere<Landlord>(
      'landlords',
      where('pubId', '==', pubId),
      where('dateKey', '==', today),
      where('isActive', '==', true)
    );

    return landlords[0] || null;
  }

  /**
   * Safely normalize landlord data from Firestore
   */
  normalizeLandlord(data: any): Landlord | null {
    if (!data) return null;

    try {
      return {
        ...data,
        claimedAt: toTimestamp(data.claimedAt) || Timestamp.now(),
        id: data.id || crypto.randomUUID(),
      } as Landlord;
    } catch (error) {
      console.error('[LandlordService] Failed to normalize landlord:', data, error);
      return null;
    }
  }
}
