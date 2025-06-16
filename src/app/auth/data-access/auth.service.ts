// auth.service.ts
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
import type { UserStage } from '@shared/utils/user-progression.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);

  private readonly userInternal = signal<User | null>(null);
  private readonly loading = signal<boolean>(true);

  readonly user$$ = computed(() => this.userInternal());
  readonly isAnon$$ = computed(() => !!this.userInternal()?.isAnonymous);
  readonly loading$$ = computed(() => this.loading());

  constructor() {
    this.initAuthListener();
  }

  private initAuthListener() {
    console.log('[AuthService] Initializing auth state listener...');

    const unsubscribe: Unsubscribe = onAuthStateChanged(this.auth, async (user) => {
      if (user) {
        console.log('[AuthService] User signed in:', user.uid, user.isAnonymous ? '(anonymous)' : '(registered)');
        this.userInternal.set(user);
        this.loading.set(false);
      } else {
        console.warn('[AuthService] No user session found. Attempting anonymous login...');
        await this.signInAnon();
      }
    });

    // Optional: return unsubscribe if needed later
  }

  async signInAnon(): Promise<void> {
    try {
      this.loading.set(true);
      const result = await signInAnonymously(this.auth);
      const user = result.user;
      console.log('[AuthService] Anonymous login successful. UID:', user.uid);

      const userRef = doc(this.firestore, `users/${user.uid}`);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const displayName = generateAnonymousName(user.uid);
        const newUser: SpoonsUser = {
          uid: user.uid,
          email: null,
          photoURL: null,
          emailVerified: user.emailVerified,
          isAnonymous: true,
          checkedInPubIds: [],
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
        console.log('[AuthService] Anonymous profile created in Firestore.');
      }

      this.userInternal.set(user);
    } catch (err) {
      console.error('[AuthService] Anonymous login failed:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async loginWithEmail(email: string, password: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    console.log('[AuthService] Email login successful. UID:', cred.user.uid);
    this.userInternal.set(cred.user);
    return cred.user;
  }

  async loginWithGoogle(): Promise<User> {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(this.auth, provider);
    console.log('[AuthService] Google login successful. UID:', cred.user.uid);
    this.userInternal.set(cred.user);
    return cred.user;
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      console.log('[AuthService] User signed out.');
      this.userInternal.set(null);
    } catch (err) {
      console.error('[AuthService] Logout failed:', err);
    }
  }

  onAuthChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(this.auth, callback);
  }

  getUid(): string | null {
    return this.userInternal()?.uid ?? null;
  }
}
