import { Component, ChangeDetectionStrategy, input, computed, Signal, effect, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../button/button.component';
import type { User } from '../../../users/utils/user.model';

@Component({
  selector: 'app-user-info',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './user-info.component.html',
  styleUrl: './user-info.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserInfoComponent {
  readonly user = input.required<Signal<User | null>>();
  readonly isAnonymous = input.required<Signal<boolean>>();
  readonly onLogin = input.required<() => void>();
  readonly onLogout = input.required<() => void>();

  // ✅ Derive everything from the user signal
  readonly currentUser = computed(() => this.user()?.());

  readonly displayName = computed(() => {
    const user = this.currentUser();
    if (!user) return 'Anonymous User';
    return user.displayName || user.email || 'User';
  });

  readonly avatarUrl = computed(() => {
    const user = this.currentUser();

    // If authenticated and has photo, use it
    if (user?.photoURL) {
      return user.photoURL;
    }

    // For anonymous users, could be reactive based on:
    // - Time of day
    // - Random selection
    // - App state

    // Simple example - you could inject other stores if needed
    return 'assets/images/npc-wojack-shaky.webp';
  });
}
