import { Component, inject, isDevMode } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { NotificationService } from '../../../shared/data-access/notification.service';
import { AuthStore } from '../../data-access/auth.store';

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
}
