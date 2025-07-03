import { Injectable, signal } from '@angular/core';
import { FirestoreService } from '../../shared/data-access/firestore.service';
import { User } from '../utils/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserService extends FirestoreService {
  // Global users signal for leaderboard reactivity
  private readonly _allUsers = signal<User[]>([]);
  readonly allUsers = this._allUsers.asReadonly();
  
  // Loading state for global users
  private readonly _loadingAllUsers = signal(false);
  readonly loadingAllUsers = this._loadingAllUsers.asReadonly();

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

  /**
   * Load all users and update the signal for reactive leaderboard
   */
  async loadAllUsers(): Promise<void> {
    this._loadingAllUsers.set(true);
    try {
      console.log('[UserService] Loading all users for global reactivity...');
      const users = await this.getAllUsers();
      console.log(`[UserService] Loaded ${users.length} users`);
      this._allUsers.set(users);
    } catch (error) {
      console.error('[UserService] Failed to load all users:', error);
      throw error;
    } finally {
      this._loadingAllUsers.set(false);
    }
  }

  /**
   * Refresh global users data
   */
  async refreshAllUsers(): Promise<void> {
    console.log('[UserService] Refreshing all users data...');
    await this.loadAllUsers();
  }

  /**
   * Add a user to the global users signal (for immediate reactivity)
   */
  addUserToGlobalSignal(user: User): void {
    this._allUsers.update(users => {
      const exists = users.some(u => u.uid === user.uid);
      if (!exists) {
        console.log(`[UserService] Adding user ${user.uid} to global signal`);
        return [...users, user];
      }
      return users;
    });
  }

  /**
   * Update a user in the global users signal
   */
  updateUserInGlobalSignal(uid: string, updates: Partial<User>): void {
    this._allUsers.update(users => 
      users.map(user => 
        user.uid === uid ? { ...user, ...updates } : user
      )
    );
    console.log(`[UserService] Updated user ${uid} in global signal`);
  }
}
