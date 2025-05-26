import { Component, computed, inject, effect } from '@angular/core';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FeatureFlagPipe } from '../../utils/feature-flag.pipe';
import { ButtonComponent } from '../../ui/button/button.component';

@Component({
  selector: 'app-user-info',
  imports: [CommonModule, RouterModule, FeatureFlagPipe, ButtonComponent],
  templateUrl: './user-info.component.html',
  styleUrl: './user-info.component.scss',
})
export class UserInfoComponent {
  private readonly auth = inject(AuthStore);

  readonly ready = this.auth.ready$$;
  readonly user = this.auth.user$$;
  readonly token = this.auth.token$$;

  readonly isLoggedIn = computed(
    () => this.ready() && !!this.token() && !!this.user()
  );

  readonly username = computed(() => this.user()?.username ?? 'Unknown');
  readonly role = computed(() => this.user()?.role?.name);

  logout() {
    this.auth.logout();
  }

  constructor() {
    effect(() => {
      if (!this.ready()) return;

      console.log(
        '[UserInfo] ready:',
        this.ready(),
        'isLoggedIn:',
        this.isLoggedIn()
      );
      console.log('[UserInfo] user:', this.user());
      console.log('[UserInfo] token:', this.token());
    });
  }
}
