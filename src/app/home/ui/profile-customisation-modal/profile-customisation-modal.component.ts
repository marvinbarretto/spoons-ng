// src/app/home/ui/profile-customisation-modal/profile-customisation-modal.component.ts
import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '@auth/data-access/auth.store';
import { OverlayService } from '@shared/data-access/overlay.service';
import { ButtonComponent } from '@shared/ui/button/button.component';

// Import micro-widgets
import { ThemeSelectionWidgetComponent } from './widgets/theme-selection-widget/theme-selection-widget.component';
import { AvatarSelectionWidgetComponent } from './widgets/avatar-selection-widget/avatar-selection-widget.component';
import { DisplayNameWidgetComponent } from './widgets/display-name-widget/display-name-widget.component';

@Component({
  selector: 'app-profile-customisation-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ButtonComponent,
    ThemeSelectionWidgetComponent,
    AvatarSelectionWidgetComponent,
    DisplayNameWidgetComponent,
  ],
  template: `
    <div class="modal-container">
      <!-- ✅ Header -->
      <div class="modal-header">
        <h2>🎮 Customize Your Profile</h2>
        <button type="button" class="close-btn" (click)="close()">×</button>
      </div>

      <!-- ✅ Modal Body with Widgets -->
      <div class="modal-body">
        <!-- ✅ Display Name Widget -->
        <app-display-name-widget
          [user]="user()"
          [displayName]="displayName()"
          (displayNameChanged)="onDisplayNameChanged($event)" />

        <!-- ✅ Avatar Selection Widget -->
        <app-avatar-selection-widget
          [user]="user()"
          [selectedAvatarId]="selectedAvatarId()"
          (avatarSelected)="onAvatarSelected($event)" />

        <!-- ✅ Theme Selection Widget -->
        <app-theme-selection-widget />

        <!-- ✅ Account Upgrade Widget (anonymous users only) -->
        <!-- <app-account-upgrade-widget
          [user]="user()"
          (upgradeRequested)="onUpgradeRequested()"
          (continueAnonymousRequested)="close()" /> -->
      </div>

      <!-- ✅ Footer -->
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
      background: var(--color-surface);
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
      background: var(--color-surface-elevated);
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
      background: var(--color-surface);
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
  private readonly authStore = inject(AuthStore);
  private readonly overlayService = inject(OverlayService);

  // ✅ Component State
  readonly displayName = signal('');
  readonly selectedAvatarId = signal('');
  readonly saving = signal(false);

  // ✅ Reactive Data
  readonly user = this.authStore.user;
  readonly originalDisplayName = computed(() => this.user()?.displayName || '');
  readonly originalAvatarUrl = computed(() => this.user()?.photoURL || '');

  // ✅ Change Detection
  readonly hasChanges = computed(() => {
    const nameChanged = this.displayName() !== this.originalDisplayName();
    const avatarChanged = this.selectedAvatarId() !== this.findCurrentAvatarId();
    return nameChanged || avatarChanged;
  });

  ngOnInit(): void {
    // Initialize with current user data
    const user = this.user();
    if (user?.displayName) {
      this.displayName.set(user.displayName);
    }

    const currentAvatarId = this.findCurrentAvatarId();
    this.selectedAvatarId.set(currentAvatarId);
  }

  // ✅ Event Handlers
  onDisplayNameChanged(newName: string): void {
    this.displayName.set(newName);
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

    this.saving.set(true);

    try {
      const user = this.user();
      if (!user) {
        throw new Error('No user found');
      }

      // TODO: Implement actual save logic
      console.log('[ProfileModal] Saving changes:', {
        displayName: this.displayName(),
        avatarId: this.selectedAvatarId(),
        userId: user.uid
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // TODO: Update user via AuthStore or UserService
      // await this.authStore.updateProfile({
      //   displayName: this.displayName(),
      //   photoURL: this.getAvatarUrlById(this.selectedAvatarId())
      // });

      console.log('[ProfileModal] ✅ Changes saved successfully');
      this.close();

    } catch (error: any) {
      console.error('[ProfileModal] ❌ Save failed:', error);
      // TODO: Show error toast
    } finally {
      this.saving.set(false);
    }
  }

  close(): void {
    this.overlayService.closeFromComponent();
  }

  // ✅ Utility Methods
  private findCurrentAvatarId(): string {
    // TODO: Match current photoURL to avatar ID
    // For now, return default
    return 'npc-default';
  }

  private getAvatarUrlById(avatarId: string): string {
    // TODO: Get avatar URL from avatar service
    // For now, return placeholder
    return '/assets/avatars/npc.webp';
  }
}
