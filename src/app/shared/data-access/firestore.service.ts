// src/app/services/firestore.service.ts
import { inject, Injector, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  CollectionReference,
  DocumentReference,
  QuerySnapshot,
  DocumentData,
  QueryConstraint,
  query,
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { FirebaseMetricsService } from './firebase-metrics.service';

export abstract class FirestoreService {
  private injector = inject(Injector);
  protected firestore = inject(Firestore);
  private metricsService = inject(FirebaseMetricsService);

  /**
   * One-time fetch of all documents in a collection.
   */
  protected collection$<T>(path: string): Observable<T[]> {
    this.metricsService.trackCall('read', path, 'collection$');
    return runInInjectionContext(this.injector, () => {
      const col = collection(this.firestore, path) as CollectionReference<T>;
      return from(getDocs(col)).pipe(
        map(snapshot => snapshot.docs.map(doc => doc.data() as unknown as T)) // cast for safety
      );
    });
  }

  /**
   * One-time fetch of a single document by full path.
   */
  protected doc$<T>(path: string): Observable<T | undefined> {
    this.metricsService.trackCall('read', this.extractCollectionFromPath(path), 'doc$');
    return runInInjectionContext(this.injector, () => {
      const ref = doc(this.firestore, path) as DocumentReference<T>;
      return from(getDoc(ref)).pipe(map(snapshot => snapshot.data()));
    });
  }

  /**
   * Set a document by path (overwrites if exists).
   */
  protected setDoc<T>(path: string, data: T): Promise<void> {
    this.metricsService.trackCall('write', this.extractCollectionFromPath(path), 'setDoc');
    return runInInjectionContext(this.injector, () => {
      const ref = doc(this.firestore, path) as DocumentReference<T>;
      return setDoc(ref, data);
    });
  }

  /**
   * Update a document by path (merges fields).
   */
  protected updateDoc<T>(path: string, data: Partial<T>): Promise<void> {
    this.metricsService.trackCall('write', this.extractCollectionFromPath(path), 'updateDoc');
    return runInInjectionContext(this.injector, () => {
      const ref = doc(this.firestore, path) as DocumentReference<T>;
      return updateDoc(ref, data);
    });
  }

  /**
   * Delete a document by path.
   */
  protected deleteDoc(path: string): Promise<void> {
    this.metricsService.trackCall('delete', this.extractCollectionFromPath(path), 'deleteDoc');
    return runInInjectionContext(this.injector, () => {
      const ref = doc(this.firestore, path);
      return deleteDoc(ref);
    });
  }

  /**
   * Add a document to a collection (auto-generates ID).
   */
  protected addDocToCollection<T>(path: string, data: T): Promise<DocumentReference<T>> {
    this.metricsService.trackCall('write', path, 'addDoc');
    return runInInjectionContext(this.injector, () => {
      const col = collection(this.firestore, path) as CollectionReference<T>;
      return addDoc(col, data);
    });
  }

  /**
   * Map a QuerySnapshot into data objects with injected Firestore document IDs.
   */
  protected mapSnapshotWithId<T>(snapshot: QuerySnapshot<DocumentData>): (T & { id: string })[] {
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as T),
    }));
  }



  /**
   * One-time fetch of a subcollection under a parent document.
   */
  protected async getDocByPath<T>(path: string): Promise<T | undefined> {
    this.metricsService.trackCall('read', this.extractCollectionFromPath(path), 'getDocByPath');
    return runInInjectionContext(this.injector, async () => {
      const ref = doc(this.firestore, path) as DocumentReference<T>;
      const snap = await getDoc(ref);
      return snap.exists() ? (snap.data() as T) : undefined;
    });
  }

  protected async getDocsWhere<T>(
    path: string,
    ...conditions: QueryConstraint[]
  ): Promise<(T & { id: string })[]> {
    this.metricsService.trackCall('read', path, 'getDocsWhere');
    return runInInjectionContext(this.injector, async () => {
      const ref = collection(this.firestore, path);
      const q = query(ref, ...conditions);
      const snapshot = await getDocs(q);
      return this.mapSnapshotWithId<T>(snapshot);
    });
  }

  protected async exists(path: string): Promise<boolean> {
    this.metricsService.trackCall('read', this.extractCollectionFromPath(path), 'exists');
    return runInInjectionContext(this.injector, async () => {
      const ref = doc(this.firestore, path);
      const snap = await getDoc(ref);
      return snap.exists();
    });
  }

  /**
   * Extract collection name from a document path
   * @param path - Document path like "users/123" or "checkins/abc"
   * @returns Collection name like "users" or "checkins"
   */
  private extractCollectionFromPath(path: string): string {
    return path.split('/')[0];
  }
}
