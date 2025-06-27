import { inject, Injectable } from '@angular/core';
import { FirestoreService } from '../../shared/data-access/firestore.service';
import { arrayUnion, increment, serverTimestamp, Timestamp, where } from 'firebase/firestore';
import type { CheckIn } from '../utils/check-in.models';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Pub } from '../../pubs/utils/pub.models';
import { earliest, latest } from '../../shared/utils/date-utils';
import { User } from '../../users/utils/user.model';
import { LandlordService } from '../../landlord/data-access/landlord.service';
import { AuthStore } from '../../auth/data-access/auth.store';
import { LandlordStore } from '../../landlord/data-access/landlord.store';
import { Landlord } from '../../landlord/utils/landlord.model';

/**
 * @deprecated Use NewCheckinService instead. This service will be removed in a future version.
 * @see NewCheckinService
 */
@Injectable({
  providedIn: 'root'
})
export class CheckInService extends FirestoreService {
  private landlordService = inject(LandlordService);
  private authStore = inject(AuthStore);
  private landlordStore = inject(LandlordStore);

  /**
   * Get today's check-in for a specific pub and current user
   * @param pubId - The pub to check for existing check-ins
   * @returns Promise<CheckIn | null> - Today's check-in or null if none exists
   */
  async getTodayCheckin(pubId: string): Promise<CheckIn | null> {
    const todayDateKey = new Date().toISOString().split('T')[0];
    const userId = this.authStore.uid(); // ✅ FIXED: Call the computed signal
    if (!userId) throw new Error('[CheckInService] Missing userId for getTodayCheckin');

    const matches = await this.getDocsWhere<CheckIn>(
      'checkins',
      where('userId', '==', userId),
      where('pubId', '==', pubId),
      where('dateKey', '==', todayDateKey)
    );

    return matches[0] ?? null;
  }


  async getAllCheckins(): Promise<CheckIn[]> {
    return this.getDocsWhere<CheckIn>('checkins');
  }


  /**
   * Load all check-ins for a specific user
   * @param userId - User ID to load check-ins for
   * @returns Promise<CheckIn[]> - Array of all user's check-ins
   */
  async loadUserCheckins(userId: string): Promise<CheckIn[]> {
    return this.getDocsWhere<CheckIn>('checkins', where('userId', '==', userId));
  }

  /**
   * Upload a photo to Firebase Storage
   * @param dataUrl - Base64 data URL of the photo
   * @returns Promise<string> - Download URL of uploaded photo
   */
  async uploadPhoto(dataUrl: string): Promise<string> {
    const storage = getStorage();
    const id = crypto.randomUUID();
    const storageRef = ref(storage, `checkins/${id}.jpg`);

    const blob = await (await fetch(dataUrl)).blob();
    await uploadBytes(storageRef, blob);

    return getDownloadURL(storageRef);
  }

  /**
 * Update user statistics after a check-in
 * - Updates streak count for this pub
 * - Adds pub to visited list
 * @param user - The user document
 * @param checkin - The check-in data
 */
private async updateUserStats(user: User, checkin: Omit<CheckIn, 'id'>): Promise<void> {
  const userRefPath = `users/${checkin.userId}`;
  const prevStreak = user.streaks?.[checkin.pubId] || 0;

  const updatedUser: Partial<User> = {
    streaks: {
      ...(user.streaks || {}),
      [checkin.pubId]: prevStreak + 1,
    },
  };

  await this.updateDoc<User>(userRefPath, updatedUser);
}


  /**
   * Complete a check-in with full validation and side effects
   * - Validates pub exists
   * - Ensures user exists in Firestore
   * - Updates pub statistics
   * - Updates user statistics
   * - Attempts to award landlord status
   * @param checkin - Check-in data without ID
   * @returns Promise<CheckIn & { landlordResult?: ... }> - Completed check-in with landlord info
   */
  async completeCheckin(checkin: Omit<CheckIn, 'id'>): Promise<CheckIn & { landlordResult?: { landlord: Landlord | null; wasAwarded: boolean } }> {
    const pub = await this.validatePubExists(checkin.pubId);
    const user = await this.ensureUserExists(checkin.userId);

    console.log('[CheckInService] completeCheckin fn', checkin);

    // Create the check-in document
    const checkinRef = await this.addDocToCollection<Omit<CheckIn, 'id'>>('checkins', checkin);

    // Update related statistics
    await this.updatePubStats(pub, checkin, checkinRef.id);
    await this.updateUserStats(user, checkin); // ✅ FIXED: Use transformation logic

    // Try to award landlord status (doesn't update stores)
    const checkinDate = this.normalizeDate(checkin.timestamp);
    const landlordResult = await this.landlordService.tryAwardLandlord(checkin.pubId, checkinDate);

    console.log('[CheckInService] Landlord result:', landlordResult);

    // Return the completed check-in with landlord info for the store to handle
    const completedCheckin = {
      ...checkin,
      id: checkinRef.id,
      madeUserLandlord: landlordResult.wasAwarded,
      landlordResult,
    };

    return completedCheckin;
  }


  /**
   * Validate that a pub exists in Firestore
   * @param pubId - Pub ID to validate
   * @returns Promise<Pub> - The pub document
   * @throws Error if pub doesn't exist
   */
  private async validatePubExists(pubId: string): Promise<Pub> {
    const pub = await this.getDocByPath<Pub>(`pubs/${pubId}`);
    if (!pub) throw new Error('Pub not found');
    return pub;
  }

  /**
   * Ensure user exists in Firestore, create if necessary
   * @param userId - User ID to check/create
   * @returns Promise<User> - The user document
   * @throws Error if user creation fails
   */
  private async ensureUserExists(userId: string): Promise<User> {
    const user = await this.getDocByPath<User>(`users/${userId}`);
    if (user) return user;

    // Create new user document with minimal data
    await this.setDoc(`users/${userId}`, {
      createdAt: serverTimestamp(),
      landlordOf: [],
      streaks: {},
    });

    const createdUser = await this.getDocByPath<User>(`users/${userId}`);
    if (!createdUser) throw new Error('[CheckInService] Failed to create user');
    return createdUser;
  }

  /**
   * Update pub statistics after a check-in
   * - Increments check-in count
   * - Updates last check-in timestamp
   * - Updates earliest/latest check-in records
   * - Adds entry to check-in history
   * @param pub - The pub document
   * @param checkin - The check-in data
   * @param checkinId - ID of the created check-in document
   */
  private async updatePubStats(pub: Pub, checkin: Omit<CheckIn, 'id'>, checkinId: string): Promise<void> {
    const pubRefPath = `pubs/${checkin.pubId}`;
    const checkinDate = this.normalizeDate(checkin.timestamp);

    const userId = this.authStore.uid(); // ✅ FIXED: Call the computed signal
    if (!userId) throw new Error('[CheckInService] Cannot update pub stats without a valid user ID');

    await this.updateDoc<Pub>(pubRefPath, {
      checkinCount: increment(1) as any,
      lastCheckinAt: serverTimestamp() as any,
      recordEarlyCheckinAt: earliest(pub.recordEarlyCheckinAt, checkinDate),
      recordLatestCheckinAt: latest(pub.recordLatestCheckinAt, checkinDate),
      checkinHistory: arrayUnion({
        userId,
        timestamp: checkin.timestamp.toMillis(), // ✅ FIXED: Convert Timestamp to number for arrayUnion
      }) as any,
    });
  }

/**
 * Patch the user's Firestore document with updates.
 * Intended to be called after a check-in or profile update.
 */
async patchUserDocument(userId: string, updates: Partial<User>): Promise<void> {
  const path = `users/${userId}`;
  await this.updateDoc<User>(path, updates);
}

  /**
   * Safely convert various timestamp formats to Date
   * @param input - Timestamp, Date, string, or number
   * @returns Date - Normalized date object
   * @throws Error if timestamp format is invalid
   */
  private normalizeDate(input: unknown): Date {
    if (input instanceof Timestamp) return input.toDate();
    if (input instanceof Date) return input;
    if (typeof input === 'string' || typeof input === 'number') {
      const date = new Date(input);
      if (!isNaN(date.getTime())) return date;
    }
    throw new Error(`[CheckInService] Invalid timestamp: ${JSON.stringify(input)}`);
  }
}
