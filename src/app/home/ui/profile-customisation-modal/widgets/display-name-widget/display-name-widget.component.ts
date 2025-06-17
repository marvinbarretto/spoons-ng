// src/app/home/ui/profile-customisation-modal/widgets/display-name-widget/display-name-widget.component.ts
import { Component, input, output, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { generateAnonymousName } from '../../../../../shared/utils/anonymous-names';
import type { User } from '@users/utils/user.model';

@Component({
  selector: 'app-display-name-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="display-name-widget">
      <h3 class="widget-title">✏️ Display Name</h3>

      <!-- ✅ Name input -->
      <div class="name-input-section">
        <label for="displayName" class="input-label">Your display name</label>
        <input
          id="displayName"
          type="text"
          class="name-input"
          [class.error]="hasError()"
          [value]="displayName()"
          (input)="updateDisplayName($event)"
          [placeholder]="getPlaceholder()"
          [attr.maxlength]="maxLength"
          autocomplete="nickname"
        />
        <div class="input-meta">
          <span class="char-count" [class.warning]="isNearLimit()">
            {{ displayName().length }}/{{ maxLength }}
          </span>
          @if (hasError()) {
            <span class="error-message">{{ errorMessage() }}</span>
          }
        </div>
      </div>

      <!-- ✅ Shuffle button for anonymous users -->
      @if (isAnonymous()) {
        <div class="shuffle-section">
          <button
            type="button"
            class="shuffle-btn"
            (click)="shuffleRandomName()"
            title="Generate a random pub-themed name"
          >
            🎲 Shuffle random
          </button>
        </div>
      }

      <!-- ✅ Tips for new users -->
      @if (showTips()) {
        <div class="tips-section">
          <div class="tip">
            <span class="tip-icon">💡</span>
            <span class="tip-text">Your display name is how other players will see you on leaderboards</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .display-name-widget {
      padding: 1rem;
      background: var(--color-surface-elevated);
      border: 1px solid var(--color-border);
      border-radius: 8px;
    }

    .widget-title {
      margin: 0 0 1rem 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text);
    }

    /* ✅ Input Section */
    .name-input-section {
      margin-bottom: 1rem;
    }

    .input-label {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text);
    }

    .name-input {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid var(--color-border);
      border-radius: 6px;
      font-size: 1rem;
      background: var(--color-surface);
      color: var(--color-text);
      transition: all 0.2s ease;
    }

    .name-input:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .name-input.error {
      border-color: var(--color-error);
    }

    .name-input:disabled {
      background: var(--color-surface-elevated);
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* ✅ Input Meta */
    .input-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.5rem;
      font-size: 0.75rem;
    }

    .char-count {
      color: var(--color-text-secondary);
    }

    .char-count.warning {
      color: var(--color-warning);
      font-weight: 600;
    }

    .error-message {
      color: var(--color-error);
      font-weight: 500;
    }

    /* ✅ Shuffle Section */
    .shuffle-section {
      margin-bottom: 1rem;
    }

    .shuffle-btn {
      padding: 0.75rem 1rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text);
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .shuffle-btn:hover {
      background: var(--color-primary);
      color: var(--color-primary-text);
      border-color: var(--color-primary);
      transform: translateY(-1px);
    }

    .shuffle-btn:active {
      transform: translateY(0);
    }

    /* ✅ Tips */
    .tips-section {
      padding: 0.75rem;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.2);
      border-radius: 6px;
    }

    .tip {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .tip-icon {
      font-size: 1rem;
      flex-shrink: 0;
    }

    .tip-text {
      font-size: 0.875rem;
      color: var(--color-text);
      line-height: 1.4;
    }

    /* ✅ Responsive */
    @media (max-width: 640px) {
      .shuffle-btn {
        width: 100%;
        justify-content: center;
      }
    }
  `
})
export class DisplayNameWidgetComponent {
  readonly maxLength = 30;

  // ✅ Inputs
  readonly user = input<User | null>(null);
  readonly displayName = input('');

  // ✅ Outputs
  readonly displayNameChanged = output<string>();

  // ✅ Internal state
  readonly errorMessage = signal<string | null>(null);

  // ✅ Computed values
  readonly isAnonymous = computed(() => {
    return this.user()?.isAnonymous ?? true;
  });

  readonly hasError = computed(() => {
    return !!this.errorMessage();
  });

  readonly isNearLimit = computed(() => {
    return this.displayName().length >= this.maxLength - 5;
  });

  readonly showTips = computed(() => {
    return this.isAnonymous() && this.displayName().length < 3;
  });

  // ✅ Methods
  getPlaceholder(): string {
    if (this.isAnonymous()) {
      return 'Enter your pub name...';
    }
    return 'Your display name';
  }

  updateDisplayName(event: Event): void {
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

    this.displayNameChanged.emit(newName);
  }

  /**
   * Generate a new random pub-themed name with unique number suffix
   */
  shuffleRandomName(): void {
    // Generate a random UID-like string to get different results each time
    const randomSeed = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const randomName = generateAnonymousName(randomSeed);

    // Convert to a more display-friendly format (remove original numbers, capitalize)
    const baseName = randomName.split('-').slice(0, 2).join('-');
    const cleanName = baseName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');

    // Append random 3-digit number for uniqueness
    const randomNumber = Math.floor(Math.random() * 900) + 100; // 100-999
    const displayName = `${cleanName}${randomNumber}`;

    this.errorMessage.set(null);
    this.displayNameChanged.emit(displayName);
  }

  private containsInappropriateContent(name: string): boolean {
    // Basic inappropriate content filter
    const inappropriate = ['admin', 'moderator', 'system', 'null', 'undefined'];
    const lowerName = name.toLowerCase();
    return inappropriate.some(word => lowerName.includes(word));
  }
}
