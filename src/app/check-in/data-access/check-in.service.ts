import { Injectable } from '@angular/core';
import { FirebaseService } from '../../shared/data-access/firebase.service';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { Checkin } from '../util/check-in.model';

@Injectable({
  providedIn: 'root'
})
export class CheckInService extends FirebaseService {
  async getTodayCheckin(userId: string, pubId: string): Promise<Checkin | null> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const ref = collection(this.firestore, 'checkins');
    const q = query(
      ref,
      where('userId', '==', userId),
      where('pubId', '==', pubId),
      where('timestamp', '>=', startOfDay.getTime())
    );

    const snapshot = await getDocs(q);
    return snapshot.empty ? null : (snapshot.docs[0].data() as Checkin);
  }

  async createCheckin(checkin: Omit<Checkin, 'id'>): Promise<void> {
    const ref = collection(this.firestore, 'checkins');
    await addDoc(ref, checkin);
  }
}
