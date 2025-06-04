import { inject, Injectable } from '@angular/core';
import { FirestoreService } from '../../shared/data-access/firestore.service';
import { addDoc, arrayUnion, collection, DocumentReference, getDocs, increment, query, serverTimestamp, setDoc, Timestamp, where } from 'firebase/firestore';
import type { CheckIn } from '../util/check-in.model';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Pub } from '../../pubs/utils/pub.models';
import { earliest, latest } from '../../shared/utils/date-utils';
import { User } from '../../users/utils/user.model';
import { LandlordService } from '../../landlord/data-access/landlord.service';
import { AuthStore } from '../../auth/data-access/auth.store';

@Injectable({
  providedIn: 'root'
})
export class CheckInService extends FirestoreService {
  private landlordService = inject(LandlordService);
  private authStore = inject(AuthStore);

  async getTodayCheckin(pubId: string): Promise<CheckIn | null> {
    const todayDateKey = new Date().toISOString().split('T')[0];
    const userId = this.authStore.uid;
    if (!userId) throw new Error('[CheckInService] Missing userId for getTodayCheckin');

    const matches = await this.getDocsWhere<CheckIn>(
      'checkins',
      where('userId', '==', userId),
      where('pubId', '==', pubId),
      where('dateKey', '==', todayDateKey)
    );

    return matches[0] ?? null;
  }

  async loadUserCheckins(userId: string): Promise<CheckIn[]> {
    return this.getDocsWhere<CheckIn>('checkins', where('userId', '==', userId));
  }

  async uploadPhoto(dataUrl: string): Promise<string> {
    const storage = getStorage();
    const id = crypto.randomUUID();
    const storageRef = ref(storage, `checkins/${id}.jpg`);

    const blob = await (await fetch(dataUrl)).blob();
    await uploadBytes(storageRef, blob);

    return getDownloadURL(storageRef);
  }

  async completeCheckin(checkin: Omit<CheckIn, 'id'>): Promise<CheckIn> {
    const pub = await this.validatePubExists(checkin.pubId);
    const user = await this.ensureUserExists(checkin.userId);

    console.log('[CheckInService] completeCheckin fn', checkin);
    const checkinRef = await this.addDocToCollection<Omit<CheckIn, 'id'>>('checkins', checkin);
    await this.updatePubStats(pub, checkin, checkinRef.id);
    await this.updateUserStats(user, checkin);

    const checkinDate = this.normalizeDate(checkin.timestamp);
    await this.landlordService.tryAwardLandlord(checkin.pubId, checkinDate);

    return { ...checkin, id: checkinRef.id };
  }

  private async validatePubExists(pubId: string): Promise<Pub> {
    const pub = await this.getDocByPath<Pub>(`pubs/${pubId}`);
    if (!pub) throw new Error('Pub not found');
    return pub;
  }

  private async ensureUserExists(userId: string): Promise<User> {
    const user = await this.getDocByPath<User>(`users/${userId}`);
    if (user) return user;

    await this.setDoc(`users/${userId}`, {
      createdAt: serverTimestamp(),
      landlordOf: [],
      streaks: {},
    });

    const createdUser = await this.getDocByPath<User>(`users/${userId}`);
    if (!createdUser) throw new Error('[CheckInService] Failed to create user');
    return createdUser;
  }

  private async updatePubStats(pub: Pub, checkin: Omit<CheckIn, 'id'>, checkinId: string): Promise<void> {
    const pubRefPath = `pubs/${checkin.pubId}`;
    const checkinDate = this.normalizeDate(checkin.timestamp);

    const userId = this.authStore.uid;
    if (!userId) throw new Error('[CheckInService] Cannot update pub stats without a valid user ID');

    await this.updateDoc<Pub>(pubRefPath, {
      checkinCount: increment(1) as any,
      lastCheckinAt: serverTimestamp() as any,
      recordEarlyCheckinAt: earliest(pub.recordEarlyCheckinAt, checkinDate),
      recordLatestCheckinAt: latest(pub.recordLatestCheckinAt, checkinDate),
      checkinHistory: arrayUnion({
        userId,
        timestamp: checkin.timestamp,
      }) as any,
    });
  }

  private async updateUserStats(user: User, checkin: Omit<CheckIn, 'id'>): Promise<void> {
    const userRefPath = `users/${checkin.userId}`;
    const prevStreak = user.streaks?.[checkin.pubId] || 0;

    const updatedUser: Partial<User> = {
      streaks: { ...user.streaks, [checkin.pubId]: prevStreak + 1 },
    };

    await this.updateDoc<User>(userRefPath, updatedUser);
  }

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

