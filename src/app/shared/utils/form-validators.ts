import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class FormValidators {
  /**
   * Validates that passwords match
   */
  static passwordMatch(passwordField: string, confirmPasswordField: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.get(passwordField);
      const confirmPassword = control.get(confirmPasswordField);

      if (!password || !confirmPassword) {
        return null;
      }

      return password.value === confirmPassword.value ? null : { passwordMismatch: true };
    };
  }

  /**
   * Validates password strength
   */
  static passwordStrength(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;

      if (!value) {
        return null;
      }

      const hasNumber = /[0-9]/.test(value);
      const hasUpper = /[A-Z]/.test(value);
      const hasLower = /[a-z]/.test(value);
      const hasSpecial = /[^A-Za-z0-9]/.test(value);
      const hasMinLength = value.length >= 8;

      const score = [hasNumber, hasUpper, hasLower, hasSpecial, hasMinLength].filter(
        Boolean
      ).length;

      if (score < 3) {
        return { weakPassword: true };
      }

      return null;
    };
  }

  /**
   * Validates display name format
   */
  static displayName(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;

      if (!value) {
        return null;
      }

      // Check for valid characters (letters, numbers, spaces, basic punctuation)
      const validPattern = /^[a-zA-Z0-9\s\-_'.]+$/;
      if (!validPattern.test(value)) {
        return { invalidDisplayName: true };
      }

      // Check for consecutive spaces
      if (/\s{2,}/.test(value)) {
        return { invalidDisplayName: true };
      }

      // Check if it starts or ends with space
      if (value.trim() !== value) {
        return { invalidDisplayName: true };
      }

      return null;
    };
  }

  /**
   * Gets password strength score and label
   */
  static getPasswordStrength(password: string): {
    score: number;
    label: string;
    percentage: number;
  } {
    if (!password) {
      return { score: 0, label: '', percentage: 0 };
    }

    const checks = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ];

    const score = checks.filter(Boolean).length;

    if (score < 2) {
      return { score, label: 'Weak', percentage: 25 };
    } else if (score < 4) {
      return { score, label: 'Medium', percentage: 60 };
    } else {
      return { score, label: 'Strong', percentage: 100 };
    }
  }

  /**
   * Gets user-friendly error messages
   */
  static getErrorMessage(controlName: string, errors: ValidationErrors): string {
    const errorKey = Object.keys(errors)[0];
    const errorValue = errors[errorKey];

    switch (errorKey) {
      case 'required':
        return `${this.getFieldDisplayName(controlName)} is required`;

      case 'email':
        return 'Please enter a valid email address';

      case 'minlength':
        return `${this.getFieldDisplayName(controlName)} must be at least ${errorValue.requiredLength} characters`;

      case 'maxlength':
        return `${this.getFieldDisplayName(controlName)} must be less than ${errorValue.requiredLength} characters`;

      case 'passwordMismatch':
        return 'Passwords do not match';

      case 'weakPassword':
        return 'Password is too weak. Use a mix of letters, numbers, and symbols';

      case 'invalidDisplayName':
        return 'Display name contains invalid characters';

      default:
        return `${this.getFieldDisplayName(controlName)} is invalid`;
    }
  }

  /**
   * Converts control names to user-friendly display names
   */
  private static getFieldDisplayName(controlName: string): string {
    const displayNames: Record<string, string> = {
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      displayName: 'Display Name',
      firstName: 'First Name',
      lastName: 'Last Name',
    };

    return displayNames[controlName] || controlName;
  }
}

/**
 * Utility function to create reactive forms with common validation patterns
 */
export interface FormFieldConfig {
  value?: any;
  validators?: ValidatorFn[];
  disabled?: boolean;
}

export interface AuthFormConfig {
  email?: FormFieldConfig;
  password?: FormFieldConfig;
  confirmPassword?: FormFieldConfig;
  displayName?: FormFieldConfig;
}

export class FormBuilderHelper {
  static createAuthForm(config: AuthFormConfig = {}) {
    return {
      email: [config.email?.value || '', config.email?.validators || []],
      password: [config.password?.value || '', config.password?.validators || []],
      ...(config.confirmPassword && {
        confirmPassword: [
          config.confirmPassword.value || '',
          config.confirmPassword.validators || [],
        ],
      }),
      ...(config.displayName && {
        displayName: [config.displayName.value || '', config.displayName.validators || []],
      }),
    };
  }
}
