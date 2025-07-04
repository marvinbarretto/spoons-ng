// src/app/home/ui/profile-customisation-modal/profile-customisation-modal.component.ts
import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserStore } from '@users/data-access/user.store';
import { AuthStore } from '@auth/data-access/auth.store';
import { AvatarService } from '@shared/data-access/avatar.service';
import { OverlayService } from '@shared/data-access/overlay.service';
import { ButtonComponent } from '@shared/ui/button/button.component';

// Import widgets
import { ThemeSelectionWidgetComponent } from './widgets/theme-selection-widget/theme-selection-widget.component';
import { ProfileIdentityWidgetComponent } from './widgets/profile-identity-widget/profile-identity-widget.component';

@Component({
  selector: 'app-profile-customisation-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ButtonComponent,
    ThemeSelectionWidgetComponent,
    ProfileIdentityWidgetComponent,
  ],
  template: `
    <div class="modal-container">

      <div class="modal-header">
        <h2>🎮 Customize Your Profile</h2>
        <button type="button" class="close-btn" (click)="close()">        <!-- TODO: Bring in an icon-component to handle exit icon -->
        ×</button>
      </div>



      <div class="modal-body">

        <app-profile-identity-widget
          [user]="user()"
          [displayName]="tempDisplayName()"
          [selectedAvatarId]="selectedAvatarId()"
          (displayNameChanged)="onDisplayNameChanged($event)"
          (avatarSelected)="onAvatarSelected($event)" />

        <app-theme-selection-widget />

      </div>

      <div class="modal-footer">
        <app-button
          variant="secondary"
          (onClick)="close()"
          [disabled]="saving()"
        >
          Cancel
        </app-button>

        <app-button
          variant="primary"
          (onClick)="saveChanges()"
          [loading]="saving()"
          [disabled]="!hasChanges() || saving()"
        >
          Save Changes
        </app-button>
      </div>
    </div>
  `,
  styles: `
    .modal-container {
      background: var(--color-background);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      width: 100%;
      height: 100%;
      max-width: 600px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px var(--color-shadow);
    }

    /* ✅ Header */
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid var(--color-border);
      background: var(--color-backgroundLightest);
    }

    .modal-header h2 {
      margin: 0;
      color: var(--color-text);
      font-size: 1.25rem;
      font-weight: 700;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: var(--color-text-secondary);
      padding: 0.25rem;
      line-height: 1;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .close-btn:hover {
      background: var(--color-backgroundLightest-elevated);
      color: var(--color-text);
    }

    /* ✅ Body */
    .modal-body {
      flex: 1;
      padding: 1.5rem;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin;
      scrollbar-color: var(--color-border) transparent;

      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .modal-body::-webkit-scrollbar {
      width: 6px;
    }

    .modal-body::-webkit-scrollbar-track {
      background: transparent;
    }

    .modal-body::-webkit-scrollbar-thumb {
      background: var(--color-border);
      border-radius: 3px;
    }

    .modal-body::-webkit-scrollbar-thumb:hover {
      background: var(--color-text-secondary);
    }

    /* ✅ Footer */
    .modal-footer {
      padding: 1.5rem;
      border-top: 1px solid var(--color-border);
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      background: var(--color-backgroundLightest);
    }

    /* ✅ Responsive */
    @media (max-width: 600px) {
      .modal-container {
        border-radius: 8px;
      }

      .modal-header,
      .modal-body,
      .modal-footer {
        padding: 1rem;
      }

      .modal-footer {
        flex-direction: column-reverse;
      }
    }
  `
})
export class ProfileCustomisationModalComponent implements OnInit {
  private readonly userStore = inject(UserStore);
  private readonly authStore = inject(AuthStore);
  private readonly avatarService = inject(AvatarService);
  private readonly overlayService = inject(OverlayService);

  // ✅ Component State
  readonly tempDisplayName = signal('');  // Temporary value during editing
  readonly selectedAvatarId = signal('');
  readonly saving = computed(() => this.userStore.loading());

  // ✅ Reactive Data
  readonly user = this.userStore.user;
  readonly originalDisplayName = computed(() => this.user()?.displayName || '');
  readonly originalAvatarUrl = computed(() => this.user()?.photoURL || '');

  // ✅ Change Detection
  readonly hasChanges = computed(() => {
    const nameChanged = this.tempDisplayName() !== this.userStore.displayName();
    const avatarChanged = this.selectedAvatarId() !== this.findCurrentAvatarId();
    return nameChanged || avatarChanged;
  });

  ngOnInit(): void {
    // Initialize temp display name with current value
    const currentDisplayName = this.userStore.displayName();
    this.tempDisplayName.set(currentDisplayName || '');

    const currentAvatarId = this.findCurrentAvatarId();
    this.selectedAvatarId.set(currentAvatarId);
  }

  // ✅ Event Handlers
  onDisplayNameChanged(newName: string): void {
    this.tempDisplayName.set(newName);
  }

  onAvatarSelected(avatarId: string): void {
    this.selectedAvatarId.set(avatarId);
  }

  onUpgradeRequested(): void {
    console.log('[ProfileModal] Upgrade to Google requested');
    this.close();
    // TODO: Trigger Google sign-in flow
    this.authStore.loginWithGoogle();
  }

  async saveChanges(): Promise<void> {
    if (!this.hasChanges() || this.saving()) return;

    try {
      const user = this.user();
      if (!user) {
        throw new Error('No user found');
      }

      const updates: Partial<any> = {};

      // Update display name if changed
      if (this.tempDisplayName() !== this.userStore.displayName()) {
        updates['displayName'] = this.tempDisplayName();
      }

      // Update avatar if changed
      if (this.selectedAvatarId() !== this.findCurrentAvatarId()) {
        updates['photoURL'] = this.getAvatarUrlById(this.selectedAvatarId());
      }

      console.log('[ProfileModal] Saving changes:', {
        displayName: updates['displayName'],
        photoURL: updates['photoURL'],
        userId: user.uid
      });

      // Save via UserStore
      await this.userStore.updateProfile(updates);

      console.log('[ProfileModal] ✅ Changes saved successfully');
      this.close();

    } catch (error: any) {
      console.error('[ProfileModal] ❌ Save failed:', error);
      // TODO: Show error toast
    }
  }

  close(): void {
    this.overlayService.closeFromComponent();
  }

  // ✅ Utility Methods
  private findCurrentAvatarId(): string {
    const user = this.user();
    if (!user) return 'npc-default';

    const availableAvatars = this.avatarService.generateAvatarOptions(user.uid);
    const currentUrl = user.photoURL;

    if (!currentUrl) return 'npc-default';

    // Find avatar by URL
    const currentAvatar = availableAvatars.find(avatar => avatar.url === currentUrl);
    return currentAvatar?.id || 'npc-default';
  }

  private getAvatarUrlById(avatarId: string): string {
    const user = this.user();
    if (!user) return '/assets/avatars/npc.webp';

    const availableAvatars = this.avatarService.generateAvatarOptions(user.uid);
    const selectedAvatar = availableAvatars.find(avatar => avatar.id === avatarId);
    return selectedAvatar?.url || '/assets/avatars/npc.webp';
  }
}
