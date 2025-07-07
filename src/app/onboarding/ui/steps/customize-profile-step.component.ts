import { Component, input, output, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { ButtonSize } from '@shared/ui/button/button.params';
import { AvatarService } from '@shared/data-access/avatar.service';
import type { User } from '@users/utils/user.model';
import type { AvatarOption } from '@shared/data-access/avatar.service';

@Component({
  selector: 'app-customize-profile-step',
  imports: [ButtonComponent],
  template: `
    <div class="step customize-profile-step">
      <!-- Large Selected Avatar Display -->
      <div class="selected-avatar-display">
        <img 
          class="selected-avatar-large"
          [src]="selectedAvatarUrl()" 
          [alt]="displayName() + ' avatar'"
        />
      </div>

      <div class="hero-section">
        <h1>Pick your avatar,
          <span class="username">
            @if (displayName()) { {{ displayName() }}!}
          </span>
        </h1>
        <p class="subtitle">Choose how you want to appear to other players</p>
      </div>

      <!-- Simple Avatar Grid -->
      <div class="avatar-grid">
        @for (avatar of availableAvatars(); track avatar.id) {
          <button
            type="button"
            class="avatar-option"
            [class.selected]="isSelected(avatar)"
            [disabled]="loading()"
            (click)="onAvatarSelected(avatar.id)"
            [title]="avatar.name"
          >
            <img [src]="avatar.url" [alt]="avatar.name" />
            @if (isSelected(avatar)) {
              <div class="selected-badge">✓</div>
            }
          </button>
        }
      </div>

      <!-- Actions -->
      <div class="cta-section">
        <div class="step-actions">
          <app-button
            variant="secondary"
            [size]="ButtonSize.MEDIUM"
            (onClick)="onBack()"
            [disabled]="loading()"
          >
            Back
          </app-button>
          
          <app-button
            variant="primary"
            [size]="ButtonSize.LARGE"
            [disabled]="!isValid()"
            [loading]="loading()"
            loadingText="Saving..."
            (onClick)="onContinue()"
          >
            Continue
          </app-button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .customize-profile-step {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      max-width: 500px;
      margin: 0 auto;
    }

    .hero-section {
      text-align: center;
      margin-bottom: 1rem;
    }

    .hero-section h1 {
      font-size: 2.5rem;
      line-height: 1.2;
      margin-bottom: 1rem;
      font-weight: 700;
      color: var(--text-primary, white);
    }

    .hero-section .subtitle {
      font-size: 1.125rem;
      line-height: 1.6;
      color: var(--text-primary, white);
      margin: 0;
    }

    .selected-avatar-display {
      display: flex;
      justify-content: center;
      margin-bottom: 2rem;
    }

    .selected-avatar-large {
      width: 140px;
      height: 140px;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid var(--primary, #4ade80);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      transition: all 0.3s ease;
    }

    .username {
      color: gold;
    }

    .avatar-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
      gap: 0.75rem;
      margin: 2rem 0;
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
    }

    .avatar-option {
      position: relative;
      width: 60px;
      height: 60px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.2s ease;
      background: none;
      padding: 0;
      overflow: hidden;
    }

    .avatar-option:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .avatar-option img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-option:hover:not(:disabled) {
      border-color: var(--primary, #4ade80);
      transform: scale(1.05);
    }

    .avatar-option.selected {
      border-color: var(--primary, #4ade80);
      box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.3);
    }

    .selected-badge {
      position: absolute;
      bottom: -2px;
      right: -2px;
      background: var(--primary, #4ade80);
      color: white;
      font-size: 0.625rem;
      font-weight: 600;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--surface-primary, white);
    }

    /* Google Auth Section - commented out for MVP */
    /*
    .auth-option {
      margin: 0;
      text-align: center;
    }

    .divider {
      position: relative;
      margin: 2rem 0;
      text-align: center;
    }

    .divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: var(--border-secondary, rgba(255, 255, 255, 0.2));
    }

    .divider span {
      position: relative;
      background: var(--surface-primary, rgba(0, 0, 0, 0.8));
      padding: 0 1rem;
      color: var(--text-primary, white);
      font-size: 0.875rem;
    }


    .google-hint {
      margin: 0.75rem 0 0 0;
      font-size: 0.875rem;
      color: var(--text-primary, white);
    }
    */

    /* Action Buttons */
    .cta-section {
      text-align: center;
      margin-top: 2rem;
    }

    .step-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin: 0;
    }

    .step-actions app-button {
      min-width: 120px;
    }

    @media (max-width: 768px) {
      .customize-profile-step {
        gap: 1.5rem;
      }

      .selected-avatar-large {
        width: 120px;
        height: 120px;
      }

      .hero-section h1 {
        font-size: 2rem;
      }

      .hero-section .subtitle {
        font-size: 1rem;
      }

      .avatar-grid {
        grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
        max-width: 300px;
      }

      .avatar-option {
        width: 50px;
        height: 50px;
      }

      .step-actions {
        flex-direction: column;
        width: 100%;
        max-width: 300px;
        margin: 0 auto;
      }

      .step-actions app-button {
        width: 100%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomizeProfileStepComponent {
  private readonly avatarService = inject(AvatarService);
  
  // Inputs
  readonly user = input<User | null>(null);
  readonly selectedAvatarId = input<string>('');
  readonly displayName = input<string>('');
  readonly loading = input<boolean>(false);

  // Outputs
  readonly avatarSelected = output<string>();
  readonly back = output<void>();
  readonly continue = output<void>();

  // Expose ButtonSize for template
  readonly ButtonSize = ButtonSize;

  // Computed properties
  readonly isValid = computed(() => {
    return this.selectedAvatarId().length > 0;
  });

  readonly selectedAvatarUrl = computed(() => {
    const avatarId = this.selectedAvatarId();
    const user = this.user();
    
    if (!avatarId || !user) {
      return '/assets/avatars/npc.webp';
    }

    // Generate avatar options for this user and find the selected one
    const avatarOptions = this.avatarService.generateAvatarOptions(user.uid);
    const selectedOption = avatarOptions.find(option => option.id === avatarId);

    return selectedOption?.url || '/assets/avatars/npc.webp';
  });

  readonly availableAvatars = computed((): AvatarOption[] => {
    const user = this.user();
    if (!user) return [];
    return this.avatarService.generateAvatarOptions(user.uid);
  });

  isSelected(avatar: AvatarOption): boolean {
    return this.selectedAvatarId() === avatar.id;
  }

  onAvatarSelected(avatarId: string): void {
    console.log('[CustomizeProfileStep] Avatar selected:', avatarId);
    this.avatarSelected.emit(avatarId);
  }

  onBack(): void {
    console.log('[CustomizeProfileStep] Going back to previous step');
    this.back.emit();
  }

  onContinue(): void {
    if (this.isValid()) {
      console.log('[CustomizeProfileStep] Continuing with avatar:', {
        displayName: this.displayName(),
        avatarId: this.selectedAvatarId()
      });
      this.continue.emit();
    }
  }
}
