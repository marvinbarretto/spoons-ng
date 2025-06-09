// src/app/auth/data-access/auth.store.ts
import { inject, Injectable, signal, computed, effect } from '@angular/core';
import { AuthService } from './auth.service';
import { OverlayService } from '../../shared/data-access/overlay.service';
import { SsrPlatformService } from '../../shared/utils/ssr/ssr-platform.service';
import { User } from '../../users/utils/user.model';
import { generateAnonymousName } from '../../shared/utils/anonymous-names';
import { getAuth, updateProfile } from 'firebase/auth';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly authService = inject(AuthService);
  private readonly overlayService = inject(OverlayService);
  private readonly platform = inject(SsrPlatformService);

  // ✅ Core auth state
  private readonly _user = signal<User | null>(null);
  private readonly _token = signal<string | null>(null);
  private readonly _ready = signal(false);

  // ✅ Public readonly signals
  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly ready = this._ready.asReadonly();

  // ✅ Derived state
  readonly isAuthenticated = computed(() => !!this.token());
  readonly uid = computed(() => this.user()?.uid ?? null);

/**
 * ✅ UPDATED: User display helpers - now properly use stored display name
 */
readonly userDisplayName = computed(() => {
  const user = this.user();
  console.log('[AuthStore] Computing userDisplayName for:', user);

  if (!user) return 'Guest';

  // ✅ For anonymous users, use their stored displayName if available
  if (user.isAnonymous) {
    if (user.displayName) {
      console.log('[AuthStore] Using stored anonymous display name:', user.displayName);
      return user.displayName;
    }

    // Fallback: generate name from UID
    const generated = generateAnonymousName(user.uid);
    console.log('[AuthStore] Generated fallback anonymous name:', generated);
    return generated;
  }

  // For real users, use displayName > email > 'User'
  const realName = user.displayName || user.email || 'User';
  console.log('[AuthStore] Using real user name:', realName);
  return realName;
});

/**
 * ✅ UPDATED: Update display name method with better logging
 */
async updateDisplayName(newDisplayName: string): Promise<void> {
  const current = this._user();
  if (!current) {
    console.warn('[AuthStore] Cannot update display name - no current user');
    return;
  }

  console.log('[AuthStore] 🔄 Updating display name:', {
    from: current.displayName,
    to: newDisplayName,
    uid: current.uid,
    isAnonymous: current.isAnonymous
  });

  try {
    // Update Firebase Auth profile
    const auth = getAuth();
    const fbUser = auth.currentUser;

    if (fbUser) {
      await updateProfile(fbUser, { displayName: newDisplayName });
      console.log('[AuthStore] ✅ Firebase Auth profile updated');
    }

    // ✅ CRITICAL: Update local user signal with new object
    const updatedUser = {
      ...current,
      displayName: newDisplayName,
      // Force new object reference by spreading
      uid: current.uid,
    };

    console.log('[AuthStore] 🔄 Setting updated user object:', updatedUser);
    this._user.set(updatedUser);

    // Update localStorage
    this.platform.onlyOnBrowser(() => {
      localStorage.setItem('user', JSON.stringify(updatedUser));
    });

    // Save to Firestore
    await this.saveUserToFirestore(updatedUser);

    console.log('[AuthStore] ✅ Display name update complete:', {
      newDisplayName,
      computedDisplayName: this.userDisplayName(),
      computedShortName: this.userShortName()
    });

  } catch (error) {
    console.error('[AuthStore] ❌ Display name update failed:', error);
    throw error;
  }
}

readonly userShortName = computed(() => {
  const user = this.user();
  console.log('[AuthStore] Computing userShortName for:', user);

  if (!user) return 'Anonymous';

  if (user.isAnonymous) {
    // Use stored display name if available, otherwise generate
    const displayName = user.displayName || generateAnonymousName(user.uid);
    console.log('[AuthStore] Short anonymous name:', displayName);
    return displayName;
  }

  // For real users, use display name or email prefix
  const shortName = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
  console.log('[AuthStore] Short real name:', shortName);
  return shortName;
});

  readonly isAnonymous = computed(() => this.user()?.isAnonymous ?? true);

  // ✅ User change signal for other stores to listen to
  private readonly _userChangeCounter = signal(0);
  readonly userChangeSignal = this._userChangeCounter.asReadonly();

  constructor() {
    this.platform.onlyOnBrowser(() => {
      console.log('[AuthStore] 🔁 Starting Firebase auth listener...');

      this.authService.onAuthChange(async (firebaseUser) => {
        if (firebaseUser) {
          await this.handleUserSignIn(firebaseUser);
        } else {
          this.handleUserSignOut();
        }

        this._ready.set(true);
      });
    });

    if (this.platform.isServer) {
      this._ready.set(true);
    }
  }

  // ✅ MODAL MANAGEMENT - Store handles overlay logic
  openUsernameModal(): void {
    this.platform.onlyOnBrowser(async () => {
      const { UsernameModalComponent } = await import('../../shared/ui/username-modal/username-modal.component');

      const { componentRef, close } = this.overlayService.open(
        UsernameModalComponent,
        {},
        { currentUser: this.user() }
      );

      componentRef.instance.closeModal = close;
    });
  }

  openAvatarSelector(): void {
    this.platform.onlyOnBrowser(async () => {
      const { AvatarSelectorComponent } = await import('../../shared/ui/avatar-selector/avatar-selector.component');

      const { componentRef, close } = this.overlayService.open(
        AvatarSelectorComponent,
        {},
        { currentUser: this.user() }
      );

      componentRef.instance.closeModal = close;
    });
  }

/**
 * ✅ Handle user sign in - build app user and store state
 * UPDATED: Ensure anonymous users get display names saved
 */
private async handleUserSignIn(firebaseUser: any): Promise<void> {
  try {
    console.log('[AuthStore] ✅ User signed in:', firebaseUser.uid, firebaseUser.isAnonymous ? '(anonymous)' : '(authenticated)');

    const token = await firebaseUser.getIdToken();

    // ✅ CRITICAL: For anonymous users, generate and save display name
    let displayName = firebaseUser.displayName;

    if (firebaseUser.isAnonymous && !displayName) {
      displayName = generateAnonymousName(firebaseUser.uid);
      console.log('[AuthStore] 🎭 Generated anonymous name:', displayName);

      // Save the generated name to Firebase Auth profile
      try {
        await updateProfile(firebaseUser, { displayName });
        console.log('[AuthStore] ✅ Anonymous display name saved to Firebase Auth');
      } catch (error) {
        console.warn('[AuthStore] ⚠️ Could not save display name to Firebase Auth:', error);
        // Continue anyway - we'll use it locally
      }
    }

    const appUser: User = {
      uid: firebaseUser.uid,
      email: firebaseUser.email ?? undefined,
      displayName: displayName ?? undefined, // Use generated name for anonymous
      photoURL: firebaseUser.photoURL ?? undefined,
      emailVerified: firebaseUser.emailVerified,
      isAnonymous: firebaseUser.isAnonymous,

      // App-specific fields
      landlordOf: [],
      claimedPubIds: [],
      checkedInPubIds: [],
      badges: [],
      streaks: {},
      joinedMissionIds: [],
      joinedAt: new Date().toISOString(), // Set join date
    };

    this._token.set(token);
    this._user.set(appUser);

    // ✅ Save to localStorage for persistence
    this.platform.onlyOnBrowser(() => {
      localStorage.setItem('user', JSON.stringify(appUser));
      localStorage.setItem('token', token);
    });

    this._userChangeCounter.update(c => c + 1);

    console.log('[AuthStore] ✅ User state updated:', {
      uid: appUser.uid,
      isAnonymous: appUser.isAnonymous,
      displayName: appUser.displayName,
      generatedName: firebaseUser.isAnonymous ? generateAnonymousName(firebaseUser.uid) : null
    });

    // ✅ TODO: Optionally save to Firestore user document as well
    await this.saveUserToFirestore(appUser);

  } catch (error) {
    console.error('[AuthStore] ❌ Error handling user sign in:', error);
    this.handleUserSignOut();
  }
}


/**
 * ✅ NEW: Save user data to Firestore for persistence
 */
private async saveUserToFirestore(user: User): Promise<void> {
  try {
    // This would require Firebase Firestore to be set up
    // For now, just log what we would save
    console.log('[AuthStore] 💾 Would save to Firestore:', {
      uid: user.uid,
      displayName: user.displayName,
      isAnonymous: user.isAnonymous,
      joinedAt: user.joinedAt,
      // Don't save sensitive data like email/photoURL for anonymous users
    });

    // TODO: Implement actual Firestore save
    // const userDoc = doc(this.firestore, 'users', user.uid);
    // await setDoc(userDoc, {
    //   displayName: user.displayName,
    //   isAnonymous: user.isAnonymous,
    //   joinedAt: user.joinedAt,
    //   landlordOf: user.landlordOf,
    //   claimedPubIds: user.claimedPubIds,
    //   checkedInPubIds: user.checkedInPubIds,
    //   badges: user.badges,
    //   streaks: user.streaks,
    //   joinedMissionIds: user.joinedMissionIds,
    // }, { merge: true });

  } catch (error) {
    console.warn('[AuthStore] ⚠️ Could not save user to Firestore:', error);
    // Don't throw - this isn't critical for auth flow
  }
}

  /**
   * Handle user sign out - clean up all state
   */
  private handleUserSignOut(): void {
    console.log('[AuthStore] 👋 User signed out - cleaning up state');

    this._user.set(null);
    this._token.set(null);

    this.platform.onlyOnBrowser(() => {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    });

    this._userChangeCounter.update(c => c + 1);
    console.log('[AuthStore] ✅ Cleanup complete');
  }

  /**
   * Initiate logout
   */
  logout(): void {
    console.log('[AuthStore] 🚪 Logout initiated');
    this.authService.logout();
  }

  /**
   * Initiate Google login
   */
  loginWithGoogle(): void {
    console.log('[AuthStore] 🔐 Google login initiated');
    this.authService.loginWithGoogle();
  }

  /**
   * Initiate email login
   */
  loginWithEmail(email: string, password: string): void {
    console.log('[AuthStore] 📧 Email login initiated');
    this.authService.loginWithEmail(email, password);
  }

  async updateUserProfile(updates: Partial<User>): Promise<void> {
    const current = this._user();
    if (!current) return;

    const auth = getAuth();
    const fbUser = auth.currentUser;

    if (!fbUser) {
      throw new Error('No authenticated Firebase user found.');
    }

    try {
      await updateProfile(fbUser, {
        displayName: updates.displayName,
        photoURL: updates.photoURL,
      });

      // Set updated local signal to trigger reactivity
      this._user.set({
        ...current,
        ...updates,
      });

      console.log('[AuthStore] ✅ Firebase profile updated:', updates);

    } catch (error) {
      console.error('[AuthStore] ❌ Failed to update Firebase profile:', error);
      throw error;
    }
  }



/**
 * ✅ NEW: Debug method to verify anonymous naming
 */
debugAnonymousNaming(): void {
  const user = this._user();
  if (!user) {
    console.log('[AuthStore] 🐛 No user for debugging');
    return;
  }

  console.log('[AuthStore] 🐛 Anonymous naming debug:', {
    uid: user.uid,
    isAnonymous: user.isAnonymous,
    storedDisplayName: user.displayName,
    generatedName: generateAnonymousName(user.uid),
    computedDisplayName: this.userDisplayName(),
    computedShortName: this.userShortName(),
  });
}
}
