import { Component, input, output, signal, computed, forwardRef, ChangeDetectionStrategy, effect } from '@angular/core';

import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type FormInputType = 'text' | 'email' | 'password' | 'tel' | 'url' | 'search';

@Component({
  selector: 'app-form-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
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
        <label [for]="inputId()" [class]="shouldHideLabel() ? 'form-label sr-only' : 'form-label'">
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
          [disabled]="effectiveDisabled()"
          [readonly]="readonly()"
          [autocomplete]="autocomplete()"
          [value]="value()"
          [attr.maxlength]="maxlength()"
          [attr.minlength]="minlength()"
          [attr.pattern]="pattern()"
          [attr.min]="min()"
          [attr.max]="max()"
          [attr.required]="required() || null"
          [attr.aria-describedby]="hasError() ? inputId() + '-error' : (hint() ? inputId() + '-hint' : null)"
          [attr.aria-invalid]="hasError()"
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

      @if (hasError()) {
        <div class="form-error" role="alert" [id]="inputId() + '-error'">
          {{ getErrorMessage() }}
        </div>
      }

      @if (hint()) {
        <div class="form-hint" [id]="inputId() + '-hint'">
          {{ hint() }}
        </div>
      }
    </div>
  `,
  styles: `
    .form-input-container {
      width: 100%;
      font-family: var(--font-primary, 'Fredoka', system-ui, sans-serif);
    }

    /* Screen reader only - visually hidden but accessible */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text, rgba(255, 255, 255, 0.9));
      margin-bottom: 0.375rem;
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
      border: 2px solid var(--border);
      border-radius: 0.75rem;
      background: var(--background-lighter);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
      color: var(--text);
      font-size: 1rem;
      font-family: inherit; /* Inherit brand font from container */
      font-weight: 400;
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
      border-color: var(--accent, #f59e0b);
      box-shadow:
        inset 0 1px 3px rgba(0, 0, 0, 0.1),
        0 0 0 3px var(--accent-hover, rgba(245, 158, 11, 0.15));
      background: var(--background-lightest, rgba(255, 255, 255, 0.25));
      transform: translateY(-1px);
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
      box-shadow:
        inset 0 1px 3px rgba(0, 0, 0, 0.1),
        0 0 0 3px rgba(239, 68, 68, 0.15);
      background: rgba(239, 68, 68, 0.05);
    }

    .input-icon {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted, rgba(255, 255, 255, 0.6));
      pointer-events: none;
      font-size: 1.25rem;
      display: flex;
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
      margin-top: 0.375rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .form-hint {
      color: var(--text-muted, rgba(255, 255, 255, 0.6));
      font-size: 0.875rem;
      margin-top: 0.375rem;
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
  readonly errorMessage = input<string>(); // Manual error message
  readonly formControl = input<any>(); // FormControl for validation

  // Common validation attributes
  readonly maxlength = input<number>();
  readonly minlength = input<number>();
  readonly pattern = input<string>();
  readonly min = input<number>();
  readonly max = input<number>();

  // Output events
  readonly focus = output<FocusEvent>();
  readonly blur = output<void>();

  // Internal state
  private readonly _value = signal('');
  private readonly _showPassword = signal(false);
  private readonly _inputId = signal(`form-input-${Math.random().toString(36).substr(2, 9)}`);
  private readonly _isDisabled = signal(false);

  // Public signals
  readonly value = this._value.asReadonly();
  readonly showPassword = this._showPassword.asReadonly();
  readonly inputId = this._inputId.asReadonly();
  readonly isDisabled = this._isDisabled.asReadonly();

  // Computed properties
  // Effective disabled state (input disabled OR FormControl disabled)
  readonly effectiveDisabled = computed(() => this.disabled() || this.isDisabled());

  readonly hasError = computed(() => {
    // Show error if manual error message is provided
    if (this.errorMessage()) return true;

    // Show validation errors from FormControl if field has been touched
    const control = this.formControl?.();
    // Always show errors after markAllAsTouched() is called (when form is submitted)
    const hasErrorResult = control && control.invalid && (control.dirty || control.touched);

    // Debug logging
    if (control) {
      console.log(`[FormInput ${this.label()}] hasError check:`, {
        invalid: control.invalid,
        dirty: control.dirty,
        touched: control.touched,
        errors: control.errors,
        hasErrorResult
      });
    }

    return hasErrorResult;
  });
  readonly isPasswordType = computed(() => this.type() === 'password');
  readonly shouldHideLabel = computed(() => !!this.placeholder() && !!this.label());
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
    // Sync FormControl disabled state with internal disabled state
    this._isDisabled.set(isDisabled);
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

  getErrorMessage(): string {
    // Return manual error message if provided
    if (this.errorMessage()) {
      return this.errorMessage()!;
    }

    // Get validation errors from FormControl
    const control = this.formControl?.();
    if (control && control.errors && (control.dirty || control.touched)) {
      const errors = control.errors;

      if (errors['required']) return `${this.label() || 'This field'} is required`;
      if (errors['email']) return 'Please enter a valid email address';
      if (errors['minlength']) return `Minimum ${errors['minlength'].requiredLength} characters required`;
      if (errors['maxlength']) return `Maximum ${errors['maxlength'].requiredLength} characters allowed`;
      if (errors['pattern']) return 'Please enter a valid format';
      if (errors['min']) return `Minimum value is ${errors['min'].min}`;
      if (errors['max']) return `Maximum value is ${errors['max'].max}`;
    }

    return '';
  }
}
