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

    const ref = collection(this.firestore, 'checkins');
    const q = query(
      ref,
      where('userId', '==', userId),
      where('pubId', '==', pubId),
      where('dateKey', '==', todayDateKey)
    );

    const snapshot = await getDocs(q);
    return snapshot.empty ? null : (snapshot.docs[0].data() as CheckIn);
  }

  async loadUserCheckins(userId: string): Promise<CheckIn[]> {
    const ref = collection(this.firestore, 'checkins');
    const q = query(ref, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      ...(doc.data() as CheckIn),
      id: doc.id,
    }));
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

    const checkinRef = await this.saveCheckin(checkin);
    await this.updatePubStats(pub, checkin, checkinRef.id);
    await this.updateUserStats(user, checkin);

    await this.landlordService.tryAwardLandlord(checkin.pubId, checkin.timestamp.toDate());

    return { ...checkin, id: checkinRef.id };
  }

  private async validatePubExists(pubId: string): Promise<Pub> {
    const pubRef = doc(this.firestore, `pubs/${pubId}`);
    const pubSnap = await getDoc(pubRef);
    if (!pubSnap.exists()) throw new Error('Pub not found');
    return pubSnap.data() as Pub;
  }

  private async ensureUserExists(userId: string): Promise<User> {
    const userRef = doc(this.firestore, `users/${userId}`);
    let userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        createdAt: serverTimestamp(),
        landlordOf: [],
        streaks: {},
      });
      userSnap = await getDoc(userRef);
    }
    return userSnap.data() as User;
  }

  private async saveCheckin(checkin: Omit<CheckIn, 'id'>): Promise<DocumentReference> {
    const checkinsRef = collection(this.firestore, 'checkins');
    const cleanCheckin = Object.fromEntries(
      Object.entries(checkin).filter(([_, v]) => v !== undefined)
    );
    return await addDoc(checkinsRef, cleanCheckin);
  }

  private async updatePubStats(pub: Pub, checkin: Omit<CheckIn, 'id'>, checkinId: string): Promise<void> {
    const pubRef = doc(this.firestore, `pubs/${checkin.pubId}`);
    const checkinDate = checkin.timestamp.toDate();

    const userId = this.authStore.uid;
    if (!userId) {
      throw new Error('[CheckInService] Cannot update pub stats without a valid user ID');
    }

    await updateDoc(pubRef, {
      checkinCount: increment(1),
      lastCheckinAt: serverTimestamp(),
      recordEarlyCheckinAt: earliest(pub.recordEarlyCheckinAt, checkinDate),
      recordLatestCheckinAt: latest(pub.recordLatestCheckinAt, checkinDate),
      checkinHistory: arrayUnion({
        userId,
        timestamp: serverTimestamp(),
      }),
    });
  }

  private async updateUserStats(user: User, checkin: Omit<CheckIn, 'id'>): Promise<void> {
    const userRef = doc(this.firestore, `users/${checkin.userId}`);
    const prevStreak = user.streaks?.[checkin.pubId] || 0;

    const updatedUser: Partial<User> = {
      streaks: { ...user.streaks, [checkin.pubId]: prevStreak + 1 },
    };

    await updateDoc(userRef, updatedUser);
  }
}
