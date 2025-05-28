import { inject, Injector, runInInjectionContext } from '@angular/core';
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
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { from } from 'rxjs';
import { map } from 'rxjs/operators';

export abstract class FirebaseService {
  private injector = inject(Injector);
  protected firestore = inject(Firestore);

  protected collection$<T>(path: string): Observable<T[]> {
    return runInInjectionContext(this.injector, () => {
      const col = collection(this.firestore, path) as CollectionReference<T>;
      return from(getDocs(col)).pipe(map(snapshot => snapshot.docs.map(doc => doc.data())));
    });
  }

  protected doc$<T>(path: string): Observable<T | undefined> {
    return runInInjectionContext(this.injector, () => {
      const ref = doc(this.firestore, path) as DocumentReference<T>;
      return from(getDoc(ref)).pipe(map(snapshot => snapshot.data()));
    });
  }

  protected setDoc<T>(path: string, data: T): Promise<void> {
    return runInInjectionContext(this.injector, () => {
      const ref = doc(this.firestore, path) as DocumentReference<T>;
      return setDoc(ref, data);
    });
  }

  protected updateDoc<T>(path: string, data: Partial<T>): Promise<void> {
    return runInInjectionContext(this.injector, () => {
      const ref = doc(this.firestore, path) as DocumentReference<T>;
      return updateDoc(ref, data);
    });
  }

  protected deleteDoc(path: string): Promise<void> {
    return runInInjectionContext(this.injector, () => {
      const ref = doc(this.firestore, path);
      return deleteDoc(ref);
    });
  }
}
