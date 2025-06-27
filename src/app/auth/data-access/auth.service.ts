// src/app/auth/data-access/auth.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  User,
  onAuthStateChanged,
  Unsubscribe,
  signInAnonymously,
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
} from '@angular/fire/firestore';
import { generateAnonymousName } from '../../shared/utils/anonymous-names';
import type { User as SpoonsUser } from '../../users/utils/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);

  private readonly userInternal = signal<User | null>(null);
  private readonly loading = signal<boolean>(true);

  // Track if we're in the middle of setting up a new anonymous user
  private settingUpAnonymousUser = false;

  readonly user$$ = computed(() => this.userInternal());
  readonly isAnon$$ = computed(() => !!this.userInternal()?.isAnonymous);
  readonly loading$$ = computed(() => this.loading());

  constructor() {
    this.initAuthListener();
  }

  private initAuthListener() {
    console.log('[AuthService] Initializing auth state listener...');

    const unsubscribe: Unsubscribe = onAuthStateChanged(this.auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          console.log('[AuthService] Auth state changed:', firebaseUser.uid, firebaseUser.isAnonymous ? '(anonymous)' : '(registered)');

          // ✅ For anonymous users, ensure user document exists BEFORE setting user
          if (firebaseUser.isAnonymous && !this.settingUpAnonymousUser) {
            console.log('[AuthService] Setting up anonymous user document...');
            await this.ensureAnonymousUserDocument(firebaseUser);
          }

          // Now it's safe to set the user - document is guaranteed to exist
          this.userInternal.set(firebaseUser);
          this.loading.set(false);
        } else {
          console.warn('[AuthService] No user session found. Attempting anonymous login...');
          await this.signInAnon();
        }
      } catch (error) {
        console.error('[AuthService] Error in auth state handler:', error);
        this.loading.set(false);
      }
    });
  }

  async signInAnon(): Promise<void> {
    try {
      this.loading.set(true);
      this.settingUpAnonymousUser = true;

      console.log('[AuthService] Starting anonymous sign-in...');
      const result = await signInAnonymously(this.auth);

      console.log('[AuthService] ✅ Anonymous authentication successful:', result.user.uid);

      // Note: onAuthStateChanged will handle user document creation and setting the user
      // We don't need to do anything else here

    } catch (error) {
      console.error('[AuthService] Anonymous login failed:', error);
      this.loading.set(false);
      this.settingUpAnonymousUser = false;
    }
  }

  /**
   * ✅ Ensures anonymous user document exists in Firestore
   * Called by onAuthStateChanged before setting the user
   */
  private async ensureAnonymousUserDocument(firebaseUser: User): Promise<void> {
    const userRef = doc(this.firestore, `users/${firebaseUser.uid}`);

    try {
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        console.log('[AuthService] Creating anonymous user document...');

        const displayName = generateAnonymousName(firebaseUser.uid);
        const newUser: SpoonsUser = {
          uid: firebaseUser.uid,
          email: null,
          photoURL: null,
          emailVerified: firebaseUser.emailVerified,
          isAnonymous: true,
          streaks: {},
          displayName,
          joinedAt: new Date().toISOString(),
          badgeCount: 0,
          badgeIds: [],
          landlordCount: 0,
          landlordPubIds: [],
          joinedMissionIds: [],
        };

        await setDoc(userRef, newUser);
        console.log('[AuthService] ✅ Anonymous user document created');
      } else {
        console.log('[AuthService] Anonymous user document already exists');
      }
    } catch (error) {
      console.error('[AuthService] Failed to ensure user document:', error);
      throw error; // Re-throw to prevent user from being set without document
    } finally {
      this.settingUpAnonymousUser = false;
    }
  }

  async loginWithEmail(email: string, password: string): Promise<User> {
    try {
      this.loading.set(true);
      const cred = await signInWithEmailAndPassword(this.auth, email, password);
      console.log('[AuthService] ✅ Email login successful:', cred.user.uid);

      // For registered users, we might want to ensure user document exists too
      if (!cred.user.isAnonymous) {
        await this.ensureRegisteredUserDocument(cred.user);
      }

      return cred.user;
    } catch (error) {
      this.loading.set(false);
      throw error;
    }
  }

  async loginWithGoogle(): Promise<User> {
    try {
      this.loading.set(true);
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(this.auth, provider);
      console.log('[AuthService] ✅ Google login successful:', cred.user.uid);

      // Ensure user document exists for registered users
      await this.ensureRegisteredUserDocument(cred.user);

      return cred.user;
    } catch (error) {
      this.loading.set(false);
      throw error;
    }
  }

  /**
   * ✅ Ensures registered user document exists in Firestore
   */
  private async ensureRegisteredUserDocument(firebaseUser: User): Promise<void> {
    const userRef = doc(this.firestore, `users/${firebaseUser.uid}`);

    try {
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        console.log('[AuthService] Creating registered user document...');

        const newUser: SpoonsUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
          isAnonymous: false,
          streaks: {},
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          joinedAt: new Date().toISOString(),
          badgeCount: 0,
          badgeIds: [],
          landlordCount: 0,
          landlordPubIds: [],
          joinedMissionIds: [],
        };

        await setDoc(userRef, newUser);
        console.log('[AuthService] ✅ Registered user document created');
      }
    } catch (error) {
      console.error('[AuthService] Failed to ensure registered user document:', error);
      // Don't throw here - registered users might work without Firestore document
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      console.log('[AuthService] ✅ User signed out');
      this.userInternal.set(null);
    } catch (error) {
      console.error('[AuthService] Logout failed:', error);
      throw error;
    }
  }

  onAuthChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(this.auth, callback);
  }

  getUid(): string | null {
    return this.userInternal()?.uid ?? null;
  }
}
