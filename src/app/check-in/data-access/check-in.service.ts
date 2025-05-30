import { Injectable } from '@angular/core';
import { FirebaseService } from '../../shared/data-access/firebase.service';
import { addDoc, collection, DocumentReference, getDocs, query, serverTimestamp, setDoc, Timestamp, where } from 'firebase/firestore';
import type { CheckIn } from '../util/check-in.model';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Pub } from '../../pubs/utils/pub.models';
import { earliest, latest } from '../../shared/utils/date-utils';
import { User } from '../../users/utils/user.model';

// TODO: can we improve this service, can it use signals?
// Centralise user doc creation
// how can we ensure we have a user doc before we create a checkin?
// can we improve the naming conventions?

@Injectable({
  providedIn: 'root'
})
export class CheckInService extends FirebaseService {
  async getTodayCheckin(userId: string, pubId: string): Promise<CheckIn | null> {
    const todayDateKey = new Date().toISOString().split('T')[0];

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
    const storage = getStorage(); // assumes Firebase has been initialized
    const id = crypto.randomUUID();
    const storageRef = ref(storage, `checkins/${id}.jpg`);

    const blob = await (await fetch(dataUrl)).blob();
    await uploadBytes(storageRef, blob);

    return getDownloadURL(storageRef);
  }

  async completeCheckin(checkin: Omit<CheckIn, 'id'>): Promise<DocumentReference> {
    const { userId, pubId, timestamp } = checkin;

    const checkinsRef = collection(this.firestore, 'checkins');
    const pubRef = doc(this.firestore, `pubs/${pubId}`);
    const userRef = doc(this.firestore, `users/${userId}`);

    // 1. Validate pub exists
    const pubSnap = await getDoc(pubRef);
    if (!pubSnap.exists()) {
      console.error('[CheckIn] ❌ Pub not found:', pubId);
      throw new Error('Pub not found');
    }

    // 2. Ensure user doc exists (create if missing)
    let userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      console.warn('[CheckIn] ⚠️ User not found — creating new user doc:', userId);
      await setDoc(userRef, {
        createdAt: serverTimestamp(),
        landlordOf: [],
        streaks: {},
      });
      userSnap = await getDoc(userRef); // re-fetch
    }

    const pub = pubSnap.data() as Pub;
    const user = userSnap.data() as User;
    const checkinDate = timestamp.toDate();

    // 3. Save the check-in (strip out undefined fields)
    const cleanCheckin = Object.fromEntries(
      Object.entries(checkin).filter(([_, v]) => v !== undefined)
    ) as Omit<CheckIn, 'id'>;

    const checkinRef = await addDoc(checkinsRef, cleanCheckin);

    // 4. Update pub stats
    const updatedPub: Partial<Pub> = {
      checkinCount: (pub.checkinCount || 0) + 1,
      lastCheckinAt: timestamp,
      recordEarlyCheckinAt: earliest(pub.recordEarlyCheckinAt, checkinDate),
      recordLatestCheckinAt: latest(pub.recordLatestCheckinAt, checkinDate),
      landlordId: userId,
    };
    await updateDoc(pubRef, updatedPub);

    // 5. Update user streaks and landlord list
    const prevStreak = user.streaks?.[pubId] || 0;
    const updatedUser: Partial<User> = {
      streaks: { ...user.streaks, [pubId]: prevStreak + 1 },
      landlordOf: Array.from(new Set([...(user.landlordOf || []), pubId])),
    };
    await updateDoc(userRef, updatedUser);

    // 6. Return the check-in reference
    return checkinRef;
  }



}
