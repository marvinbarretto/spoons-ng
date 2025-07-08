// src/app/profile/ui/profile-header-widget/profile-header-widget.component.ts
import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { BaseComponent } from '@shared/base/base.component';
import { UserStore } from '@users/data-access/user.store';
import { AuthStore } from '@auth/data-access/auth.store';
import { UserAvatarComponent } from '@shared/ui/user-avatar/user-avatar.component';
import { OverlayService } from '@shared/data-access/overlay.service';
import { ProfileCustomisationModalComponent } from '@home/ui/profile-customisation-modal/profile-customisation-modal.component';

@Component({
  selector: 'app-profile-header-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UserAvatarComponent
  ],
  template: `
    <div class="profile-header-widget">
      <div class="profile-header-content">
        <div class="profile-avatar-section">
          @if (user()) {
            <app-user-avatar
              [user]="user()!"
              size="large"
              class="profile-avatar"
            />
          }
          <button
            (click)="handleEditProfile()"
            class="edit-profile-btn"
            type="button"
          >
            Edit Profile
          </button>
        </div>

        <div class="profile-info-section">
          <h2 class="profile-name">{{ user()?.displayName || 'Anonymous User' }}</h2>
          <p class="profile-email">{{ user()?.email || 'No email' }}</p>
          <div class="profile-stats">
            <div class="stat-item">
              <span class="stat-value">{{ user()?.badgeCount || 0 }}</span>
              <span class="stat-label">Badges</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ user()?.landlordCount || 0 }}</span>
              <span class="stat-label">Landlord</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ joinedMissionsCount() }}</span>
              <span class="stat-label">Missions</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .profile-header-widget {
      background: var(--background-light);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 1rem;
    }

    .profile-header-content {
      display: flex;
      gap: 2rem;
      align-items: center;
    }

    .profile-avatar-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .profile-avatar {
      border: 3px solid var(--primary);
      border-radius: 50%;
    }

    .edit-profile-btn {
      background: var(--primary);
      color: var(--on-primary);
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.875rem;
      transition: all 0.2s ease;
    }

    .edit-profile-btn:hover {
      background: var(--primary-dark);
      transform: translateY(-1px);
    }

    .profile-info-section {
      flex: 1;
    }

    .profile-name {
      margin: 0 0 0.5rem 0;
      color: var(--text-primary);
      font-size: 1.5rem;
      font-weight: 600;
    }

    .profile-email {
      margin: 0 0 1.5rem 0;
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .profile-stats {
      display: flex;
      gap: 2rem;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary);
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .profile-header-content {
        flex-direction: column;
        text-align: center;
        gap: 1.5rem;
      }

      .profile-stats {
        justify-content: center;
      }
    }
  `
})
export class ProfileHeaderWidgetComponent extends BaseComponent {
  protected readonly userStore = inject(UserStore);
  protected readonly authStore = inject(AuthStore);
  protected readonly overlayService = inject(OverlayService);

  // Data signals
  readonly user = this.userStore.user;

  // Computed properties
  readonly joinedMissionsCount = computed(() => {
    const user = this.user();
    return user?.joinedMissionIds?.length || 0;
  });

  constructor() {
    super();
    console.log('[ProfileHeaderWidget] ProfileHeaderWidgetComponent initialized');
  }

  handleEditProfile(): void {
    console.log('[ProfileHeaderWidget] Opening profile customization modal');

    const { componentRef, close } = this.overlayService.open(
      ProfileCustomisationModalComponent,
      {
        maxWidth: '600px',
        maxHeight: '90vh'
      }
    );

    // Pass the close callback to the modal component
    componentRef.setInput('closeCallback', close);

    console.log('[ProfileHeaderWidget] Profile customization modal opened');
  }
}
