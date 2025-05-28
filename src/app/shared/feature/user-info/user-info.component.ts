// user-info.component.ts
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { ButtonComponent } from "../../ui/button/button.component";

@Component({
  selector: 'app-user-info',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  styleUrl: './user-info.component.scss',
  templateUrl: './user-info.component.html',
})
export class UserInfoComponent {
  protected authStore = inject(AuthStore);

  readonly user = this.authStore.user$$;
  readonly isAuthenticated = this.authStore.isAuthenticated$$;


  readonly isAuthenticatedWithGoogle = computed(() => {
    return this.isAuthenticated() && !this.user()?.isAnonymous;
  });

  logout() {
    this.authStore.logout();
  }

  loginWithGoogle() {
    this.authStore.loginWithGoogle();
  }
}


