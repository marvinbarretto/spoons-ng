import { Injectable } from '@angular/core';
import { FirebaseService } from '../../shared/data-access/firebase.service';
import { addDoc, collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { Checkin } from '../util/check-in.model';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Pub } from '../../pubs/utils/pub.models';
import { earliest, latest } from '../../shared/utils/date-utils';
import { User } from '../../users/utils/user.model';

@Injectable({
  providedIn: 'root'
})
export class CheckInService extends FirebaseService {
  async getTodayCheckin(userId: string, pubId: string): Promise<Checkin | null> {
    const todayDateKey = new Date().toISOString().split('T')[0];

    const ref = collection(this.firestore, 'checkins');
    const q = query(
      ref,
      where('userId', '==', userId),
      where('pubId', '==', pubId),
      where('dateKey', '==', todayDateKey)
    );

    const snapshot = await getDocs(q);
    return snapshot.empty ? null : (snapshot.docs[0].data() as Checkin);
  }


  async uploadPhoto(dataUrl: string): Promise<string> {
    const storage = getStorage(); // assumes Firebase has been initialized
    const id = crypto.randomUUID();
    const storageRef = ref(storage, `checkins/${id}.jpg`);

    const blob = await (await fetch(dataUrl)).blob();
    await uploadBytes(storageRef, blob);

    return getDownloadURL(storageRef);
  }

  async completeCheckin(checkin: Omit<Checkin, 'id'>): Promise<void> {
    const checkinsRef = collection(this.firestore, 'checkins');
    const pubRef = doc(this.firestore, `pubs/${checkin.pubId}`);
    const userRef = doc(this.firestore, `users/${checkin.userId}`);

    const pubSnap = await getDoc(pubRef);
    const userSnap = await getDoc(userRef);

    if (!pubSnap.exists()) {
      console.error('[CheckIn] ❌ Pub not found:', checkin.pubId);
      throw new Error('Pub not found');
    }
    if (!userSnap.exists()) {
      console.error('[CheckIn] ❌ User not found:', checkin.userId);
      throw new Error('User not found');
    }

    const pub = pubSnap.data() as Pub;
    const user = userSnap.data() as User;

    const newCheckinRef = await addDoc(checkinsRef, checkin);

    const newCheckinDate = checkin.timestamp.toDate();

    // Update pub stats
    const updatedPub: Partial<Pub> = {
      checkinCount: (pub.checkinCount || 0) + 1,
      lastCheckinAt: checkin.timestamp,
      recordEarlyCheckinAt: earliest(pub.recordEarlyCheckinAt, newCheckinDate),
      recordLatestCheckinAt: latest(pub.recordLatestCheckinAt, newCheckinDate),
      landlordId: checkin.userId,
    };

    await updateDoc(pubRef, updatedPub);

    // Update user streaks
    const prevStreak = user.streaks?.[checkin.pubId] || 0;
    const updatedStreaks = { ...user.streaks, [checkin.pubId]: prevStreak + 1 };

    const updatedUser: Partial<User> = {
      streaks: updatedStreaks,
      landlordOf: Array.from(new Set([...(user.landlordOf || []), checkin.pubId])),
    };

    await updateDoc(userRef, updatedUser);
  }

}
