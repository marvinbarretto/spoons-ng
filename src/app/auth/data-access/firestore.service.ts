import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { inject } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { collection, collectionData } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private firestore = inject(Firestore);
  testCollection = collection(this.firestore, 'test');

  constructor() { }

  // TODO: Type this up properly
  getData(): Observable<any[]> {
    return collectionData(this.testCollection, { idField: 'hello' }) as Observable<any[]>;
  }
}
