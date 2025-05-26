// login.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthStore } from '../../data-access/auth.store';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- <form (submit)="onLogin($event)">
      <label>Email: <input [(ngModel)]="email" name="email" /></label>
      <label>Password: <input [(ngModel)]="password" name="password" type="password" /></label>
      <button type="submit">Login</button>
    </form> -->
    <button (click)="onGoogleLogin()">Login with Google</button>
  `,
})
export class LoginComponent {
  email = '';
  password = '';

  private authStore = inject(AuthStore);

  async onLogin(event: Event) {
    event.preventDefault();
    try {
      await this.authStore.loginWithEmail(this.email, this.password);
    } catch (err) {
      console.error('[LoginComponent] ❌ Login failed', err);
    }
  }

  async onGoogleLogin() {
    try {
      await this.authStore.loginWithGoogle();
    } catch (err) {
      console.error('[LoginComponent] ❌ Google login failed', err);
    }
  }
}
