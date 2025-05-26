import { Component, inject, isDevMode } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthStore } from '../../data-access/auth.store';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { NotificationService } from '../../../shared/data-access/notification.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule, ButtonComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  readonly authStore = inject(AuthStore);
  readonly notificationService = inject(NotificationService);

  identifier = '';
  password = '';

  readonly isDev = true; // isDevMode();

  onLogin() {
    if (!this.identifier || !this.password) {
      this.notificationService.error('Please enter both email and password.');
      return;
    }

    this.authStore.login(this.identifier, this.password);
    // Note: Store handles side effects (navigation, error, etc)
  }

  quickLogin(role: 'auth' | 'author' | 'admin') {
    console.log('Quick login as', role);
    const emails = {
      auth: 'auth@test.com',
      author: 'author@test.com',
      admin: 'admin@test.com',
    };

    this.authStore.login(emails[role], 'password123');
  }
}
