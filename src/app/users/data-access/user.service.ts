import { effect, inject, Injectable, signal } from '@angular/core';
import { FirestoreService } from '@fourfold/angular-foundation';
import { CacheCoherenceService } from '../../shared/data-access/cache-coherence.service';
import { User } from '../utils/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserService extends FirestoreService {
  private readonly cacheCoherence = inject(CacheCoherenceService);

  // Global users signal for leaderboard reactivity
  private readonly _allUsers = signal<User[]>([]);
  readonly allUsers = this._allUsers.asReadonly();

  // Loading state for global users
  private readonly _loadingAllUsers = signal(false);
  readonly loadingAllUsers = this._loadingAllUsers.asReadonly();

  constructor() {
    super();

    // Listen for cache invalidation events
    effect(() => {
      const invalidation = this.cacheCoherence.invalidations();
      if (invalidation && invalidation.collection === 'users') {
        console.log('[UserService] 🔄 Cache invalidated, refreshing all users data');
        console.log('[UserService] 🔄 Reason:', invalidation.reason);
        this.handleCacheInvalidation(invalidation.collection, invalidation.reason);
      }
    });
  }

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
    const users = await this.getDocsWhere<User>('users');

    // Debug logging for isAdmin field tracking
    console.log(
      '[UserService] 🔍 Raw Firestore users with isAdmin status:',
      users.map(u => ({
        uid: u.uid.slice(0, 8),
        displayName: u.displayName,
        email: u.email,
        isAdmin: u.isAdmin,
        hasIsAdminField: 'isAdmin' in u,
      }))
    );

    return users;
  }

  /**
   * Get all users from server (bypasses cache) for real-time competitive data
   * Use this for leaderboard aggregation to ensure fresh cross-user data
   */
  async getAllUsersFromServer(): Promise<User[]> {
    console.log('[UserService] 🌐 Fetching ALL users from server (bypassing cache)...');
    const users = await this.getDocsWhereFromServer<User>('users');

    console.log(`[UserService] ✅ Server fetch complete: ${users.length} users (fresh data)`);
    console.log(
      '[UserService] 🔍 Fresh server users with points:',
      users.map(u => ({
        uid: u.uid.slice(0, 8),
        displayName: u.displayName,
        totalPoints: u.totalPoints,
        isAdmin: u.isAdmin,
      }))
    );

    return users;
  }

  /**
   * Load all users and update the signal for reactive leaderboard
   * Uses fresh server data to ensure real-time competitive updates
   */
  async loadAllUsers(): Promise<void> {
    this._loadingAllUsers.set(true);
    try {
      console.log('[UserService] 🏆 Loading all users for leaderboard (fresh server data)...');
      // 🔥 Use server-side fetch to bypass cache for real-time leaderboard data
      const users = await this.getAllUsersFromServer();
      console.log(`[UserService] ✅ Loaded ${users.length} fresh users for leaderboard`);
      this._allUsers.set(users);
    } catch (error) {
      console.error('[UserService] ❌ Failed to load all users from server:', error);
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
      users.map(user => (user.uid === uid ? { ...user, ...updates } : user))
    );
    console.log(`[UserService] Updated user ${uid} in global signal`);
  }

  /**
   * Handle cache invalidation by refreshing all users data
   * @param collection - The collection that was invalidated
   * @param reason - Reason for invalidation
   */
  private async handleCacheInvalidation(collection: string, reason?: string): Promise<void> {
    console.log(`[UserService] 🔄 === HANDLING CACHE INVALIDATION ===`);
    console.log(`[UserService] 🔄 Collection: ${collection}`);
    console.log(`[UserService] 🔄 Reason: ${reason || 'unspecified'}`);

    try {
      // Refresh all users data to get fresh user profiles with updated display names
      console.log(`[UserService] 🔄 Refreshing all users data...`);
      await this.refreshAllUsers();
      console.log(`[UserService] ✅ All users data refreshed after cache invalidation`);
    } catch (error) {
      console.error(
        `[UserService] ❌ Failed to refresh users data after cache invalidation:`,
        error
      );
    }
  }
}
