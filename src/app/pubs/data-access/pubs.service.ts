import { Injectable } from '@angular/core';
import { FirebaseService } from '../../shared/data-access/firebase.service';
import { Observable } from 'rxjs';
import type { Pub } from '../utils/pub.models';

@Injectable({
  providedIn: 'root'
})
export class PubsService extends FirebaseService {

  loadPubs(): Observable<Pub[]> {
    return this.collection$<Pub>('pubs');
  }

  getPubById(id: string): Observable<Pub | undefined> {
    return this.doc$<Pub>(`pubs/${id}`);
  }

  // Should i add a $ for observable?
  // its tricky to see those and the signals...

  // set, update, delete if needed
}
