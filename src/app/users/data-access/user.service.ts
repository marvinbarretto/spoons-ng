import { Injectable } from '@angular/core';
import { FirebaseService } from '../../shared/data-access/firebase.service';
import { UserData } from '../utils/user-data.model';

@Injectable({
  providedIn: 'root',
})
export class UserService extends FirebaseService {
  getUser(uid: string) {
    return this.doc$<UserData>(`users/${uid}`);
  }

  updateUser(uid: string, data: Partial<UserData>) {
    return this.updateDoc<Partial<UserData>>(`users/${uid}`, data);
  }

  createUser(uid: string, data: UserData) {
    return this.setDoc<UserData>(`users/${uid}`, data);
  }
}
