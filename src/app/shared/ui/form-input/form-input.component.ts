import { Component, input, output, signal, computed, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type FormInputType = 'text' | 'email' | 'password' | 'tel' | 'url' | 'search';

@Component({
  selector: 'app-form-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormInputComponent),
      multi: true
    }
  ],
  template: `
    <div class="form-input-container">
      @if (label()) {
        <label [for]="inputId()" class="form-label">
          {{ label() }}
          @if (required()) {
            <span class="required-indicator" aria-label="required">*</span>
          }
        </label>
      }
      
      <div class="input-wrapper" [class.has-error]="hasError()">
        @if (iconLeft()) {
          <span class="input-icon input-icon--left material-symbols-outlined">
            {{ iconLeft() }}
          </span>
        }
        
        <input
          [id]="inputId()"
          [type]="currentType()"
          [placeholder]="placeholder()"
          [disabled]="disabled()"
          [readonly]="readonly()"
          [autocomplete]="autocomplete()"
          [value]="value()"
          (input)="onInput($event)"
          (blur)="onBlur()"
          (focus)="onFocus($event)"
          class="form-input"
          [class.has-icon-left]="!!iconLeft()"
          [class.has-icon-right]="!!iconRight() || isPasswordType()"
        />
        
        @if (isPasswordType()) {
          <button
            type="button"
            class="input-icon input-icon--right input-icon--toggle"
            (click)="togglePasswordVisibility()"
            [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
          >
            <span class="material-symbols-outlined">
              {{ showPassword() ? 'visibility_off' : 'visibility' }}
            </span>
          </button>
        } @else if (iconRight()) {
          <span class="input-icon input-icon--right material-symbols-outlined">
            {{ iconRight() }}
          </span>
        }
      </div>
      
      @if (hasError() && errorMessage()) {
        <div class="form-error" role="alert">
          {{ errorMessage() }}
        </div>
      }
      
      @if (hint()) {
        <div class="form-hint">
          {{ hint() }}
        </div>
      }
    </div>
  `,
  styles: `
    .form-input-container {
      width: 100%;
      margin-bottom: 1rem;
    }

    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text, rgba(255, 255, 255, 0.9));
      margin-bottom: 0.5rem;
    }

    .required-indicator {
      color: var(--error, #ef4444);
      margin-left: 0.25rem;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .form-input {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.2));
      border-radius: 0.5rem;
      background: var(--background-lighter, rgba(255, 255, 255, 0.1));
      color: var(--text, white);
      font-size: 1rem;
      transition: all 0.2s ease;
      outline: none;
    }

    .form-input.has-icon-left {
      padding-left: 3rem;
    }

    .form-input.has-icon-right {
      padding-right: 3rem;
    }

    .form-input:focus {
      border-color: var(--primary, #10b981);
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
      background: var(--background-lightest, rgba(255, 255, 255, 0.15));
    }

    .form-input::placeholder {
      color: var(--text-muted, rgba(255, 255, 255, 0.5));
    }

    .form-input:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      background: var(--background-darker, rgba(255, 255, 255, 0.05));
    }

    .form-input:readonly {
      background: var(--background-darker, rgba(255, 255, 255, 0.05));
      cursor: default;
    }

    .input-wrapper.has-error .form-input {
      border-color: var(--error, #ef4444);
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }

    .input-icon {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted, rgba(255, 255, 255, 0.6));
      pointer-events: none;
      font-size: 1.25rem;
    }

    .input-icon--left {
      left: 0.75rem;
    }

    .input-icon--right {
      right: 0.75rem;
    }

    .input-icon--toggle {
      pointer-events: auto;
      background: none;
      border: none;
      color: var(--text-muted, rgba(255, 255, 255, 0.6));
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 0.25rem;
      transition: color 0.2s ease;
    }

    .input-icon--toggle:hover {
      color: var(--text, rgba(255, 255, 255, 0.8));
    }

    .form-error {
      color: var(--error, #ef4444);
      font-size: 0.875rem;
      margin-top: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .form-hint {
      color: var(--text-muted, rgba(255, 255, 255, 0.6));
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }

    /* Light theme adjustments */
    @media (prefers-color-scheme: light) {
      .form-label {
        color: var(--text, #374151);
      }

      .form-input {
        background: var(--background, white);
        color: var(--text, #374151);
        border-color: var(--border, #d1d5db);
      }

      .form-input::placeholder {
        color: var(--text-muted, #9ca3af);
      }

      .input-icon {
        color: var(--text-muted, #6b7280);
      }

      .form-hint {
        color: var(--text-muted, #6b7280);
      }
    }
  `
})
export class FormInputComponent implements ControlValueAccessor {
  // Input properties
  readonly label = input<string>();
  readonly placeholder = input<string>();
  readonly type = input<FormInputType>('text');
  readonly required = input(false);
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly autocomplete = input<string>();
  readonly iconLeft = input<string>();
  readonly iconRight = input<string>();
  readonly hint = input<string>();
  readonly errorMessage = input<string>();

  // Output events
  readonly focus = output<FocusEvent>();
  readonly blur = output<void>();

  // Internal state
  private readonly _value = signal('');
  private readonly _showPassword = signal(false);
  private readonly _inputId = signal(`form-input-${Math.random().toString(36).substr(2, 9)}`);

  // Public signals
  readonly value = this._value.asReadonly();
  readonly showPassword = this._showPassword.asReadonly();
  readonly inputId = this._inputId.asReadonly();

  // Computed properties
  readonly hasError = computed(() => !!this.errorMessage());
  readonly isPasswordType = computed(() => this.type() === 'password');
  readonly currentType = computed(() => {
    if (this.type() === 'password') {
      return this.showPassword() ? 'text' : 'password';
    }
    return this.type();
  });

  // ControlValueAccessor implementation
  private onChange = (value: string) => {};
  private onTouched = () => {};

  writeValue(value: string): void {
    this._value.set(value || '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Handled by the disabled input signal
  }

  // Event handlers
  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    this._value.set(value);
    this.onChange(value);
  }

  onFocus(event: FocusEvent): void {
    this.focus.emit(event);
  }

  onBlur(): void {
    this.onTouched();
    this.blur.emit();
  }

  togglePasswordVisibility(): void {
    this._showPassword.update(show => !show);
  }
}