import { effect, Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { signal } from '@angular/core';
import { UserPreferences } from '../utils/user-preferences.model';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class UserPreferencesStore {
  defaultPreferences: UserPreferences = {
    fontSize: 16,
    bgColor: '#FFFFEE',
    textColor: '#333333',
    lineHeight: 1.5,
    letterSpacing: 0.2,
  };

  signals = {
    fontSize: signal<number>(this.defaultPreferences.fontSize),
    bgColor: signal<string>(this.defaultPreferences.bgColor),
    textColor: signal<string>(this.defaultPreferences.textColor),
    lineHeight: signal<number>(this.defaultPreferences.lineHeight),
    letterSpacing: signal<number>(this.defaultPreferences.letterSpacing),
  };

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.loadFromLocalStorage();
    }

    this.setupEffects();
  }

  private setupEffects() {
    effect(() => {
      this.updateCSSVariable('--font-size', `${this.signals.fontSize()}px`);
    });

    effect(() => {
      this.updateCSSVariable('--background-color', this.signals.bgColor());
    });

    effect(() => {
      this.updateCSSVariable('--text-color', this.signals.textColor());
    });

    effect(() => {
      this.updateCSSVariable(
        '--line-height',
        this.signals.lineHeight().toString()
      );
    });

    effect(() => {
      this.updateCSSVariable(
        '--letter-spacing',
        `${this.signals.letterSpacing()}px`
      );
    });
  }

  // Update user preference and persist to localStorage

  updatePreference<K extends keyof UserPreferences>(
    preference: K,
    value: UserPreferences[K]
  ) {
    console.log(`Updating preference: ${preference} -> ${value}`);

    // Always fallback to the default if invalid
    if (value === null || value === undefined) {
      value = this.defaultPreferences[preference];
    }

    // Update the signal based on the preference type
    switch (preference) {
      case 'fontSize':
        this.signals.fontSize.set(value as number);
        break;
      case 'bgColor':
        this.signals.bgColor.set(value as string);
        break;
      case 'textColor':
        this.signals.textColor.set(value as string);
        break;
      case 'lineHeight':
        this.signals.lineHeight.set(value as number);
        break;
      case 'letterSpacing':
        this.signals.letterSpacing.set(value as number);
        break;
      default:
        console.error(`Unknown preference: ${preference}`);
        return;
    }

    // Store the valid value in localStorage
    if (
      value !== null &&
      value !== undefined &&
      isPlatformBrowser(this.platformId)
    ) {
      localStorage.setItem(preference, value.toString());
    } else {
      console.warn(`Invalid value for preference: ${preference}`, value);
    }
  }

  // Load preferences from localStorage and handle invalid values
  loadFromLocalStorage() {
    const fontSize = localStorage.getItem('fontSize');
    const bgColor = localStorage.getItem('bgColor');
    const textColor = localStorage.getItem('textColor');
    const lineHeight = localStorage.getItem('lineHeight');
    const letterSpacing = localStorage.getItem('letterSpacing');

    console.log(`Rehydrating fontSize from localStorage: ${fontSize}`);
    console.log(`Rehydrating bgColor from localStorage: ${bgColor}`);
    console.log(`Rehydrating textColor from localStorage: ${textColor}`);
    console.log(`Rehydrating lineHeight from localStorage: ${lineHeight}`);
    console.log(
      `Rehydrating letterSpacing from localStorage: ${letterSpacing}`
    );

    // Load valid values from localStorage or fallback to defaults
    this.signals.fontSize.set(
      fontSize ? Number(fontSize) : this.defaultPreferences.fontSize
    );
    this.signals.bgColor.set(
      bgColor ? bgColor : this.defaultPreferences.bgColor
    );
    this.signals.textColor.set(
      textColor ? textColor : this.defaultPreferences.textColor
    );
    this.signals.lineHeight.set(
      lineHeight ? Number(lineHeight) : this.defaultPreferences.lineHeight
    );
    this.signals.letterSpacing.set(
      letterSpacing
        ? Number(letterSpacing)
        : this.defaultPreferences.letterSpacing
    );
  }

  // Update a single CSS variable
  private updateCSSVariable(variable: string, value: string) {
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.style.setProperty(variable, value);
    }
  }

  resetToDefault() {
    this.signals.fontSize.set(this.defaultPreferences.fontSize);
    this.signals.bgColor.set(this.defaultPreferences.bgColor);
    this.signals.textColor.set(this.defaultPreferences.textColor);
    this.signals.lineHeight.set(this.defaultPreferences.lineHeight);
    this.signals.letterSpacing.set(this.defaultPreferences.letterSpacing);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('fontSize');
      localStorage.removeItem('bgColor');
      localStorage.removeItem('textColor');
      localStorage.removeItem('lineHeight');
      localStorage.removeItem('letterSpacing');
    }
  }
}
