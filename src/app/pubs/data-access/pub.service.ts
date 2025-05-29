import { Injectable } from '@angular/core';
import { FirebaseService } from '../../shared/data-access/firebase.service';
import { Observable } from 'rxjs';
import type { Pub } from '../utils/pub.models';
import { FirestoreDataConverter, collection, getDocs } from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class PubService extends FirebaseService {

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
}
