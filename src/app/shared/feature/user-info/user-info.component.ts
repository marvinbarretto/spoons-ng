// user-info.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../../auth/data-access/auth.store';

@Component({
  selector: 'app-user-info',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isAuthenticated()) {
      <div class="user-info">
        <img
          *ngIf="user()?.photoURL"
          [src]="user()?.photoURL"
          alt="User avatar"
          width="32"
          height="32"
        />
        <span>👋 Logged in as {{ user()?.displayName || user()?.email }}</span>
        <button (click)="authStore.logout()">Logout</button>
      </div>
    } @else {
      <p>🙈 Not logged in</p>
      <button (click)="authStore.loginWithGoogle()">Login with Google</button>
    }
  `,
})
export class UserInfoComponent {
  protected authStore = inject(AuthStore);

  readonly user = this.authStore.user$$;
  readonly isAuthenticated = this.authStore.isAuthenticated$$;

  logout() {
    this.authStore.logout();
  }
}
