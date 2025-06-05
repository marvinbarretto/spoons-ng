import { Injectable } from '@angular/core';
import { FirestoreService } from '../../shared/data-access/firestore.service';
import { User } from '../utils/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserService extends FirestoreService {

  getUser(uid: string) {
    return this.doc$<User>(`users/${uid}`);
  }

  updateUser(uid: string, data: Partial<User>) {
    return this.updateDoc<Partial<User>>(`users/${uid}`, data);
  }

  createUser(uid: string, data: User) {
    return this.setDoc<User>(`users/${uid}`, data);
  }

  async getAllUsers(): Promise<User[]> {
    return this.getDocsWhere<User>('users');
  }
}
