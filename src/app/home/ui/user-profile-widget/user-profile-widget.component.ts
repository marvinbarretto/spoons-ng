// src/app/home/ui/user-profile-widget/user-profile-widget.component.ts
import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChipUserComponent, UserChipData } from '@shared/ui/chips/chip-user/chip-user.component';
import type { User } from '@users/utils/user.model';


@Component({
  selector: 'app-user-profile-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ChipUserComponent],
  template: `
    <div class="user-profile-widget">
      @if (userChipData()) {
        <app-chip-user
          [user]="userChipData()!"
          size="md"
          variant="secondary"
          [clickable]="true"
          (clicked)="handleOpenProfile()"
          customClass="profile-chip"
        />
      } @else {
        <div class="guest-state">
          <span class="guest-text">Guest User</span>
        </div>
      }
    </div>
  `,
  styles: `
    .user-profile-widget {
      display: flex;
      align-items: center;
      width: 100%;
    }

    .profile-chip {
      width: 100%;
      justify-content: flex-start;
      border: 1px solid var(--border);
      box-shadow: 0 1px 3px var(--shadow);

      &:hover {
        border-color: var(--primary);
        box-shadow: 0 4px 8px var(--shadow);
      }
    }

    .guest-state {
      display: flex;
      align-items: center;
      padding: 0.5rem 0.75rem;
      background: var(--background-darkest);
      border: 1px solid var(--border);
      border-radius: 9999px;
      width: 100%;
    }

    .guest-text {
      color: var(--text-secondary);
      font-size: 0.875rem;
      font-weight: 500;
    }

    /* Responsive Design */
    @media (max-width: 640px) {
      .profile-chip {
        font-size: 0.8rem;
      }
    }
  `
})
export class UserProfileWidgetComponent {
  // ✅ Inputs
  readonly user = input<User | null>(null);

  // ✅ Outputs
  readonly openProfile = output<void>();

  // ✅ Computed Values
  readonly userChipData = computed((): UserChipData | null => {
    const currentUser = this.user();
    if (!currentUser) return null;

    // ✅ Anonymous users are first-class citizens - respect their chosen display name
    let displayName = currentUser.displayName || 'User';

    return {
      displayName,
      photoURL: currentUser.photoURL || undefined,
      email: currentUser.email || undefined,
      realDisplayName: currentUser.isAnonymous ? undefined : displayName
    };
  });

  // ✅ Event Handler
  handleOpenProfile(): void {
    this.openProfile.emit();
  }
}
