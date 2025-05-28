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

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth: Auth;
  private userInternal = signal<User | null>(null)
  private loading = signal<boolean>(true)

  readonly user$$ = computed(() => this.userInternal())
  readonly isAnon$$ = computed(() => !!this.userInternal()?.isAnonymous)
  readonly loading$$ = computed(() => this.loading())

  constructor() {
    this.auth = inject(Auth);
    this.initAuthListener()
  }

  private initAuthListener() {
    console.log('[AuthService] Initializing auth state listener...')

    const unsubscribe: Unsubscribe = onAuthStateChanged(this.auth, async (user) => {
      if (user) {
        console.log('[AuthService] User signed in:', user.uid, user.isAnonymous ? '(anonymous)' : '(registered)')
        this.userInternal.set(user)
        this.loading.set(false)
      } else {
        console.warn('[AuthService] No user session found. Attempting anonymous login...')
        await this.signInAnon()
      }
    })

    // Optional: expose unsubscribe if you ever want to destroy listener
  }

  async signInAnon(): Promise<void> {
    try {
      this.loading.set(true)
      const result = await signInAnonymously(this.auth)
      console.log('[AuthService] Anonymous login successful. UID:', result.user.uid)
      this.userInternal.set(result.user)
    } catch (err) {
      console.error('[AuthService] Anonymous login failed:', err)
    } finally {
      this.loading.set(false)
    }
  }


  async loginWithEmail(email: string, password: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(this.auth, email, password)
    console.log('[AuthService] Email login successful. UID:', cred.user.uid)
    this.userInternal.set(cred.user)
    return cred.user
  }

  async loginWithGoogle(): Promise<User> {
    const provider = new GoogleAuthProvider()
    const cred = await signInWithPopup(this.auth, provider)
    console.log('[AuthService] Google login successful. UID:', cred.user.uid)
    this.userInternal.set(cred.user)
    return cred.user
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth)
      console.log('[AuthService] User signed out.')
      this.userInternal.set(null)
    } catch (err) {
      console.error('[AuthService] Logout failed:', err)
    }
  }

  onAuthChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(this.auth, callback)
  }


  getUid(): string | null {
    return this.userInternal()?.uid ?? null
  }


}
