// src/app/shared/feature/user-info/user-info.component.ts
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { ButtonComponent } from "../../ui/button/button.component";

@Component({
  selector: 'app-user-info',
  imports: [CommonModule, ButtonComponent],
  template: `
    <section class="user-info">
      @if (authStore.isAnonymous()) {
        <!-- Anonymous User Display -->
        <div class="user-info__anon">
          <img
            class="anon-avatar"
            src="assets/images/npc-wojack-shaky.webp"
            alt="Anonymous NPC"
            width="48"
            height="48"
          />
          <div class="user-details">
            <p class="user-name" [title]="'Anonymous: ' + authStore.user()?.uid">
              {{ authStore.userShortName() }}
            </p>
            <small class="user-type">Anonymous</small>
          </div>
        </div>

        <!-- Login Button -->
        <app-button
          variant="primary"
          size="sm"
          (onClick)="loginWithGoogle()"
          icon="login"
        >
          Sign Up
        </app-button>

      } @else {
        <!-- Authenticated User Display -->
        <div class="user-info__user">
          <img
            *ngIf="authStore.user()?.photoURL"
            [src]="authStore.user()?.photoURL"
            alt="User avatar"
            width="32"
            height="32"
          />
          <div class="user-details">
            <p class="user-name">{{ authStore.userShortName() }}</p>
            <small class="user-type">Signed In</small>
          </div>
        </div>

        <!-- Logout Button -->
        <app-button
          variant="ghost"
          size="sm"
          (onClick)="logout()"
          icon="logout"
        >
          Logout
        </app-button>
      }
    </section>
  `,
  styleUrl: './user-info.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserInfoComponent {
  // ✅ Single store dependency - clean and simple
  protected readonly authStore = inject(AuthStore);

  /**
   * Handle Google login - delegate to store
   */
  loginWithGoogle(): void {
    this.authStore.loginWithGoogle();
  }

  /**
   * Handle logout - delegate to store
   */
  logout(): void {
    this.authStore.logout();
  }
}
