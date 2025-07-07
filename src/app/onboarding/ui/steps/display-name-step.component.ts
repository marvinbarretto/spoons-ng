import { Component, input, output, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { ButtonSize } from '@shared/ui/button/button.params';
import { generateRandomName } from '../../../shared/utils/anonymous-names';

@Component({
  selector: 'app-display-name-step',
  imports: [ButtonComponent],
  template: `
    <div class="step display-name-step">
      <div class="hero-section">
        <h1>What should we call you?</h1>
        <p class="subtitle">Choose a display name that other players will see</p>
      </div>

      <!-- Simple Name Input Section -->
      <div class="name-section">
        <div class="name-input-container">
          <input
            type="text"
            class="name-input"
            [class.error]="hasError()"
            [value]="displayName()"
            (input)="onDisplayNameChange($event)"
            [attr.maxlength]="maxLength"
            autocomplete="nickname"
          />
          <button
            type="button"
            class="shuffle-btn"
            (click)="shuffleRandomName()"
            title="Generate a random pub-themed name"
          >
            🎲
          </button>
        </div>

        <div class="input-meta">
          <span class="char-count" [class.warning]="isNearLimit()">
            {{ displayName().length }}/{{ maxLength }}
          </span>
          @if (hasError()) {
            <span class="error-message">{{ errorMessage() }}</span>
          }
        </div>
      </div>

      <!-- Continue Button -->
      <div class="cta-section">
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
  `,
  styles: `
    .display-name-step {
      display: flex;
      flex-direction: column;
      gap: 3rem;
      max-width: 500px;
      margin: 0 auto;
      text-align: center;
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
      opacity: 0.9;
    }

    .name-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .name-input-container {
      position: relative;
      display: flex;
      align-items: center;
    }

    .name-input {
      width: 100%;
      padding: 1rem 4rem 1rem 1.5rem;
      border: 3px solid var(--border-secondary, rgba(255, 255, 255, 0.3));
      border-radius: 12px;
      font-size: 1.25rem;
      font-weight: 500;
      background: var(--surface-primary, white);
      color: var(--text-dark, #1a1a1a);
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      text-align: center;
    }

    .name-input:focus {
      outline: none;
      border-color: var(--primary, #4ade80);
      box-shadow: 0 0 0 4px rgba(74, 222, 128, 0.25), 0 6px 20px rgba(0, 0, 0, 0.2);
      transform: translateY(-2px);
    }

    .name-input.error {
      border-color: var(--color-error);
      box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.25);
    }

    .shuffle-btn {
      position: absolute;
      right: 12px;
      background: var(--surface-secondary, rgba(0, 0, 0, 0.05));
      border: 2px solid var(--border-secondary, rgba(0, 0, 0, 0.1));
      border-radius: 8px;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.75rem;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .shuffle-btn:hover {
      background: var(--primary, #4ade80);
      border-color: var(--primary, #4ade80);
      transform: scale(1.1);
    }

    .shuffle-btn:active {
      transform: scale(0.95);
    }

    .input-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.875rem;
      min-height: 1.2rem;
    }

    .char-count {
      color: rgba(255, 255, 255, 0.7);
    }

    .char-count.warning {
      color: var(--warning, #f59e0b);
      font-weight: 600;
    }

    .error-message {
      color: var(--error, #ef4444);
      font-weight: 500;
    }

    .cta-section {
      display: flex;
      justify-content: center;
    }

    .cta-section app-button {
      min-width: 200px;
    }

    @media (max-width: 768px) {
      .display-name-step {
        gap: 2rem;
      }

      .hero-section h1 {
        font-size: 2rem;
      }

      .hero-section .subtitle {
        font-size: 1rem;
      }

      .name-input {
        font-size: 1.125rem;
        padding: 0.875rem 4rem 0.875rem 1.25rem;
      }

      .shuffle-btn {
        width: 44px;
        height: 44px;
        padding: 0.625rem;
        font-size: 1.25rem;
      }

      .cta-section app-button {
        width: 100%;
        max-width: 300px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DisplayNameStepComponent {
  readonly maxLength = 30;

  // Inputs
  readonly displayName = input<string>('');
  readonly loading = input<boolean>(false);

  // Outputs
  readonly nameChanged = output<string>();
  readonly generateRandom = output<void>();
  readonly back = output<void>();
  readonly continue = output<void>();

  // Local state
  readonly errorMessage = signal<string | null>(null);

  // Expose ButtonSize for template
  readonly ButtonSize = ButtonSize;

  // Computed properties
  readonly hasError = computed(() => !!this.errorMessage());
  readonly isNearLimit = computed(() => this.displayName().length >= this.maxLength - 5);

  readonly isValid = computed(() => {
    const name = this.displayName().trim();
    return name.length >= 2 && !this.hasError();
  });

  onDisplayNameChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const newName = target.value;

    // Clear previous errors
    this.errorMessage.set(null);

    // Validate
    if (newName.length > this.maxLength) {
      this.errorMessage.set(`Name too long (max ${this.maxLength} characters)`);
      return;
    }

    if (newName.trim().length < 2 && newName.trim().length > 0) {
      this.errorMessage.set('Name must be at least 2 characters');
      return;
    }

    // Check for inappropriate content (basic)
    if (this.containsInappropriateContent(newName)) {
      this.errorMessage.set('Please choose an appropriate name');
      return;
    }

    this.nameChanged.emit(newName);
  }

  shuffleRandomName(): void {
    // Generate a random UID-like string to get different results each time
    const randomSeed = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const randomName = generateRandomName(randomSeed);

    // Keep kebab-case format with first-last-123 pattern
    const baseName = randomName.split('-').slice(0, 2).join('-');

    // Append random 3-digit number for uniqueness
    const randomNumber = Math.floor(Math.random() * 900) + 100; // 100-999
    const displayName = `${baseName}-${randomNumber}`;

    this.errorMessage.set(null);
    this.nameChanged.emit(displayName);
  }

  private containsInappropriateContent(name: string): boolean {
    // Basic inappropriate content filter
    const inappropriate = ['admin', 'moderator', 'system', 'null', 'undefined'];
    const lowerName = name.toLowerCase();
    return inappropriate.some(word => lowerName.includes(word));
  }

  onContinue(): void {
    if (!this.isValid()) return;

    console.log('[DisplayNameStep] Continuing with name:', this.displayName());
    this.continue.emit();
  }
}
