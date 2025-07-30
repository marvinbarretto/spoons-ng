import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { User, createUser } from '../../users/utils/user.model';

@Injectable()
export class MockUserService {
  // Test data storage
  private mockUsers = new Map<string, User>();

  // Global users signal for leaderboard reactivity (matches real service)
  private readonly _allUsers = signal<User[]>([]);
  readonly allUsers = this._allUsers.asReadonly();

  // Loading state for global users
  private readonly _loadingAllUsers = signal(false);
  readonly loadingAllUsers = this._loadingAllUsers.asReadonly();

  constructor() {
    // Initialize with some default test users
    this.initializeTestData();
  }

  /**
   * Mock implementation of getUser
   * Returns observable of user data
   */
  getUser(uid: string): Observable<User | undefined> {
    const user = this.mockUsers.get(uid);
    return of(user);
  }

  /**
   * Mock implementation of updateUser
   * Updates user in mock storage
   */
  async updateUser(uid: string, data: Partial<User>): Promise<void> {
    const existingUser = this.mockUsers.get(uid);
    if (existingUser) {
      const updatedUser = { ...existingUser, ...data };
      this.mockUsers.set(uid, updatedUser);
      this.updateUserInGlobalSignal(uid, data);
    }
  }

  /**
   * Mock implementation of createUser
   * Creates new user in mock storage
   */
  async createUser(uid: string, data: User): Promise<void> {
    this.mockUsers.set(uid, data);
    this.addUserToGlobalSignal(data);
  }

  /**
   * Mock implementation of getAllUsers
   * Returns all users from mock storage
   */
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.mockUsers.values());
  }

  /**
   * Mock implementation of loadAllUsers
   * Loads all users and updates the signal
   */
  async loadAllUsers(): Promise<void> {
    this._loadingAllUsers.set(true);
    try {
      const users = await this.getAllUsers();
      this._allUsers.set(users);
    } catch (error) {
      console.error('[MockUserService] Failed to load all users:', error);
      throw error;
    } finally {
      this._loadingAllUsers.set(false);
    }
  }

  /**
   * Mock implementation of refreshAllUsers
   */
  async refreshAllUsers(): Promise<void> {
    await this.loadAllUsers();
  }

  /**
   * Add a user to the global users signal (matches real service)
   */
  addUserToGlobalSignal(user: User): void {
    this._allUsers.update(users => {
      const exists = users.some(u => u.uid === user.uid);
      if (!exists) {
        return [...users, user];
      }
      return users;
    });
  }

  /**
   * Update a user in the global users signal (matches real service)
   */
  updateUserInGlobalSignal(uid: string, updates: Partial<User>): void {
    this._allUsers.update(users =>
      users.map(user => (user.uid === uid ? { ...user, ...updates } : user))
    );
  }

  // Test helper methods
  setMockUser(uid: string, user: User): void {
    this.mockUsers.set(uid, user);
    this.addUserToGlobalSignal(user);
  }

  clearMockData(): void {
    this.mockUsers.clear();
    this._allUsers.set([]);
  }

  hasMockUser(uid: string): boolean {
    return this.mockUsers.has(uid);
  }

  getMockUserCount(): number {
    return this.mockUsers.size;
  }

  /**
   * Initialize with default test data
   */
  private initializeTestData(): void {
    const testUser: User = createUser({
      uid: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
      emailVerified: true,
      isAnonymous: false,
      photoURL: null,
      joinedAt: new Date().toISOString(),
      accentColor: '#FF6B35',
      streaks: {},
      joinedMissionIds: [],
      homePubId: 'test-pub-id',
      badgeCount: 0,
      badgeIds: [],
      landlordCount: 0,
      landlordPubIds: [],
      totalPoints: 0,
      manuallyAddedPubIds: [],
      verifiedPubCount: 0,
      unverifiedPubCount: 0,
      totalPubCount: 0,
      onboardingCompleted: true,
      realUser: true,
    });

    this.setMockUser(testUser.uid, testUser);
  }
}
