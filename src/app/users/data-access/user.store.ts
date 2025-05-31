import { Injectable, Injector, runInInjectionContext } from '@angular/core';
import { computed, effect, inject, signal } from "@angular/core";
import { UserService } from "./user.service";
import { AuthStore } from "../../auth/data-access/auth.store";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Subject, takeUntil } from "rxjs";
import { User } from "../utils/user.model";

@Injectable({ providedIn: 'root' })
export class UserStore {
  private readonly userService = inject(UserService);
  private readonly authStore = inject(AuthStore);

  readonly user$$ = signal<User | null>(null);
  readonly loading$$ = signal(false);
  readonly error$$ = signal<string | null>(null);




  private destroy$ = new Subject<void>();

  constructor() {
    effect(() => {
      const authUser = this.authStore.user$$();
      if (!authUser) return;

      this.loadUser(authUser.uid);
    });
  }


  loadUser(uid: string) {
    this.loading$$.set(true);
    this.error$$.set(null);

    const authUser = this.authStore.user$$();

    this.userService.getUser(uid).subscribe({
      next: async (data) => {
        const merged: User = {
          uid: authUser?.uid ?? '',
          displayName: authUser?.displayName ?? '',
          email: authUser?.email ?? '',
          emailVerified: authUser?.emailVerified ?? false,
          isAnonymous: authUser?.isAnonymous ?? true,
          photoURL: authUser?.photoURL ?? '',
          joinedAt: authUser?.joinedAt ?? new Date().toISOString(),

          landlordOf: data?.landlordOf ?? [],
          claimedPubIds: data?.claimedPubIds ?? [],
          checkedInPubIds: data?.checkedInPubIds ?? [],
          badges: data?.badges ?? [],
          streaks: data?.streaks ?? {},
        };

        if (!data) {
          try {
            await this.userService.createUser(uid, merged);
            console.log(`[UserStore] 🔥 Created new user in Firestore: ${uid}`);
          } catch (err) {
            console.error(`[UserStore] ❌ Failed to create user ${uid} in Firestore:`, err);
          }
        }

        this.user$$.set(merged);
        console.log('[UserStore] ✅ Merged user:', merged);
        this.loading$$.set(false);
      },
      error: (err) => {
        this.error$$.set('Failed to load user data');
        console.error('[UserStore] ❌ Error loading user:', err);
        this.loading$$.set(false);
      }
    });
  }

  landlordCount(): number {
    const user = this.user$$();
    const count = user?.landlordOf?.length || 0;
    console.log(`[UserStore] 🧮 Calculated landlordCount: ${count}`);
    return count;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
