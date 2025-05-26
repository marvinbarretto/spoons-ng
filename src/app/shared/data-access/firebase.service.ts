import { inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  CollectionReference,
  DocumentReference,
  DocumentData,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { from } from 'rxjs';
import { map } from 'rxjs/operators';

export abstract class FirebaseService {
  protected firestore = inject(Firestore);

  protected collection$<T>(path: string): Observable<T[]> {
    const col = collection(this.firestore, path) as CollectionReference<T>;
    return from(getDocs(col)).pipe(map(snapshot => snapshot.docs.map(doc => doc.data())));
  }

  protected doc$<T>(path: string): Observable<T | undefined> {
    const ref = doc(this.firestore, path) as DocumentReference<T>;
    return from(getDoc(ref)).pipe(map(snapshot => snapshot.data()));
  }

  protected setDoc<T>(path: string, data: T): Promise<void> {
    const ref = doc(this.firestore, path) as DocumentReference<T>;
    return setDoc(ref, data);
  }

  protected updateDoc<T>(path: string, data: Partial<T>): Promise<void> {
    const ref = doc(this.firestore, path) as DocumentReference<T>;
    return updateDoc(ref, data);
  }

  protected deleteDoc(path: string): Promise<void> {
    const ref = doc(this.firestore, path);
    return deleteDoc(ref);
  }

  // TODO: Do I need a ping/pong method or something for a just a quick sanity check?
}
