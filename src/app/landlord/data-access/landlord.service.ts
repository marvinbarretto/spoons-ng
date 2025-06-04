// src/app/landlord/data-access/landlord.service.ts
import { inject, Injectable } from '@angular/core';
import { FirestoreService } from '../../shared/data-access/firestore.service';
import { Landlord } from '../utils/landlord.model';
import { AuthStore } from '../../auth/data-access/auth.store';
import { Timestamp } from 'firebase/firestore';
import { toDate, toTimestamp } from '../../shared/utils/timestamp.utils';

@Injectable({ providedIn: 'root' })
export class LandlordService extends FirestoreService {
  private readonly authStore = inject(AuthStore);

  /**
   * Try to award landlord status for a pub on a specific date
   * Returns the landlord data (existing or new) without updating any store
   */
  async tryAwardLandlord(pubId: string, checkinDate: Date): Promise<{ landlord: Landlord | null; wasAwarded: boolean }> {
    const dateKey = checkinDate.toISOString().split('T')[0];
    const landlordDocPath = `landlords/${pubId}_${dateKey}`;

    try {
      // Check if there's already a landlord for today
      const existingLandlord = await this.getDocByPath<any>(landlordDocPath);

      if (existingLandlord) {
        const normalizedLandlord = this.normalizeLandlord(existingLandlord);
        console.log(`[LandlordService] 👑 Landlord already exists for ${pubId} on ${dateKey}:`, normalizedLandlord?.userId);
        return { landlord: normalizedLandlord, wasAwarded: false };
      }

      // No existing landlord - award it to the current user
      const userId = this.authStore.uid;
      if (!userId) {
        console.warn('[LandlordService] ❌ Cannot award landlord: No user ID');
        return { landlord: null, wasAwarded: false };
      }

      const newLandlord: Landlord = {
        id: crypto.randomUUID(), // ✅ Add missing id
        userId,
        pubId,
        claimedAt: Timestamp.now(),
        dateKey,
        isActive: true
      };

      await this.setDoc(landlordDocPath, newLandlord);

      console.log(`[LandlordService] 👑 Landlord awarded to ${userId} for ${pubId} on ${dateKey}`);
      return { landlord: newLandlord, wasAwarded: true };

    } catch (error) {
      console.error('[LandlordService] ❌ Error awarding landlord:', error);
      return { landlord: null, wasAwarded: false };
    }
  }

  /**
   * Get today's landlord for a specific pub
   * Pure data access - doesn't update any store
   */
  async getTodayLandlord(pubId: string): Promise<Landlord | null> {
    const today = new Date().toISOString().split('T')[0];
    const landlordDocPath = `landlords/${pubId}_${today}`;

    try {
      console.log(`[LandlordService] 🔍 Checking landlord doc: ${landlordDocPath}`);

      const landlordData = await this.getDocByPath<any>(landlordDocPath);

      if (landlordData) {
        const normalizedLandlord = this.normalizeLandlord(landlordData);
        console.log(`[LandlordService] 👑 Found landlord for ${pubId}:`, {
          userId: normalizedLandlord?.userId,
          claimedAt: normalizedLandlord?.claimedAt
        });
        return normalizedLandlord;
      } else {
        console.log(`[LandlordService] 🏴 No landlord found for ${pubId} on ${today}`);
        return null;
      }
    } catch (error) {
      console.error(`[LandlordService] ❌ Error loading landlord for ${pubId}:`, error);
      return null;
    }
  }

  /**
   * Safely normalize landlord data from Firestore
   */
  normalizeLandlord(data: any): Landlord | null {
    if (!data) return null;

    try {
      return {
        id: data.id || crypto.randomUUID(), // ✅ Add missing id
        claimedAt: toTimestamp(data.claimedAt) || Timestamp.now(),
        isActive: data.isActive ?? true,
        userId: data.userId || '',
        pubId: data.pubId || '',
        dateKey: data.dateKey || new Date().toISOString().split('T')[0],
        streakDays: data.streakDays // ✅ Add optional streakDays
      } as Landlord;
    } catch (error) {
      console.error('[LandlordService] Failed to normalize landlord:', data, error);
      return null;
    }
  }
}
