import { Injectable, Injector, runInInjectionContext } from '@angular/core';
import { computed, effect, inject, signal } from "@angular/core";
import { UserService } from "./user.service";
import { AuthStore } from "../../auth/data-access/auth.store";
import { UserData } from "../utils/user-data.model";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Subject, takeUntil } from "rxjs";

@Injectable({ providedIn: 'root' })
export class UserStore {
  private readonly userService = inject(UserService);
  private readonly authStore = inject(AuthStore);

  readonly userData$$ = signal<UserData | null>(null);
  readonly loading$$ = signal(false);
  readonly error$$ = signal<string | null>(null);

  private destroy$ = new Subject<void>();

  constructor() {
    effect(() => {
      const authUser = this.authStore.user$$();
      if (!authUser) return;

      this.loadUserData(authUser.uid);
    });
  }

  loadUserData(uid: string) {
    this.loading$$.set(true);
    this.error$$.set(null);

    this.userService.getUser(uid)
      .subscribe({
        next: (data) => {
          this.userData$$.set(data ?? { claimedPubIds: [] });
          console.log('[UserStore] ✅ Live user data updated:', data);
          this.loading$$.set(false);
        },
        error: (err) => {
          this.error$$.set('Failed to load user data');
          console.error('[UserStore] ❌ Error in reactive user data stream:', err);
          this.loading$$.set(false);
        }
      });
  }

  get claimedCount() {
    return computed(() => this.userData$$()?.claimedPubIds?.length ?? 0);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
