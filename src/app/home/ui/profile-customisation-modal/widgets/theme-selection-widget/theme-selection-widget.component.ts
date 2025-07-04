// src/app/home/ui/profile-customization-modal/widgets/theme-selection-widget/theme-selection-widget.component.ts
import { Component, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeStore } from '@shared/data-access/theme.store';
import type { ThemeType } from '@shared/utils/theme.tokens';

@Component({
  selector: 'app-theme-selection-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="theme-selection-widget">
      <h3 class="widget-title">🎨 App Theme</h3>

      <!-- ✅ Current theme display -->
      <div class="current-theme">
        <div class="theme-preview" [attr.data-theme]="currentTheme()">
          <div class="preview-colors">
            <span class="color-swatch primary" [style.background-color]="currentThemeColors().colors.primary"></span>
            <span class="color-swatch surface" [style.background-color]="currentThemeColors().colors.backgroundLighter"></span>
            <span class="color-swatch accent" [style.background-color]="currentThemeColors().colors.success"></span>
          </div>
        </div>
        <div class="theme-info">
          <span class="theme-name">{{ currentThemeColors().name }}</span>
          <span class="theme-mode">{{ isDark() ? 'Dark' : 'Light' }} mode</span>
        </div>
      </div>

      <!-- ✅ Quick toggle -->
      <button
        type="button"
        class="quick-toggle-btn"
        (click)="toggleDarkMode()"
      >
        @if (isDark()) {
          <span class="toggle-icon">☀️</span>
          <span>Switch to Light</span>
        } @else {
          <span class="toggle-icon">🌙</span>
          <span>Switch to Dark</span>
        }
      </button>

      <!-- ✅ Theme grid -->
      <div class="theme-grid">
        @for (themeOption of themeOptions(); track themeOption.type) {
          <button
            type="button"
            class="theme-option"
            [class.selected]="currentTheme() === themeOption.type"
            (click)="selectTheme(themeOption.type)"
            [attr.aria-pressed]="currentTheme() === themeOption.type"
          >
            <div class="theme-preview small">
              <div class="preview-colors">
                <span class="color-swatch" [style.background-color]="themeOption.theme.colors.primary"></span>
                <span class="color-swatch" [style.background-color]="themeOption.theme.colors.backgroundLighter"></span>
                <span class="color-swatch" [style.background-color]="themeOption.theme.colors.success"></span>
              </div>
            </div>
            <span class="theme-label">{{ themeOption.theme.name }}</span>
            @if (currentTheme() === themeOption.type) {
              <span class="check-icon">✓</span>
            }
          </button>
        }
      </div>
    </div>
  `,
  styles: `
    .theme-selection-widget {
      padding: 1rem;
      background: var(--color-backgroundLightest-elevated);
      border: 1px solid var(--color-border);
      border-radius: 8px;
    }

    .widget-title {
      margin: 0 0 1rem 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text);
    }

    /* ✅ Current Theme Display */
    .current-theme {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: var(--color-backgroundLightest);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      margin-bottom: 1rem;
    }

    .theme-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .theme-name {
      font-weight: 600;
      color: var(--color-text);
      font-size: 0.875rem;
    }

    .theme-mode {
      font-size: 0.75rem;
      color: var(--color-text-secondary);
    }

    /* ✅ Color Swatches */
    .preview-colors {
      display: flex;
      gap: 0.25rem;
    }

    .color-swatch {
      width: 1rem;
      height: 1rem;
      border-radius: 50%;
      border: 1px solid rgba(0, 0, 0, 0.1);
    }

    .theme-preview.small .color-swatch {
      width: 0.75rem;
      height: 0.75rem;
    }

    /* ✅ Quick Toggle */
    .quick-toggle-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem;
      background: var(--color-primary);
      color: var(--color-primary-text);
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 1rem;
      font-weight: 500;
    }

    .quick-toggle-btn:hover {
      background: var(--color-primary-hover);
      transform: translateY(-1px);
    }

    .toggle-icon {
      font-size: 1rem;
    }

    /* ✅ Theme Grid */
    .theme-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 0.75rem;
    }

    .theme-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      background: var(--color-backgroundLightest);
      border: 2px solid var(--color-border);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    }

    .theme-option:hover {
      border-color: var(--color-primary);
      transform: translateY(-1px);
    }

    .theme-option.selected {
      border-color: var(--color-primary);
      background: var(--color-primary);
      color: var(--color-primary-text);
    }

    .theme-label {
      font-size: 0.75rem;
      font-weight: 500;
      text-align: center;
    }

    .check-icon {
      position: absolute;
      top: 0.25rem;
      right: 0.25rem;
      font-size: 0.75rem;
      font-weight: bold;
    }

    /* ✅ Responsive */
    @media (max-width: 640px) {
      .theme-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .current-theme {
        flex-direction: column;
        text-align: center;
      }
    }
  `
})
export class ThemeSelectionWidgetComponent {
  private readonly themeStore = inject(ThemeStore);

  // ✅ Reactive data
  readonly currentTheme = this.themeStore.themeType;
  readonly currentThemeColors = this.themeStore.theme;
  readonly isDark = this.themeStore.isDark;
  readonly themeOptions = computed(() => this.themeStore.getAllThemes());

  // ✅ Actions
  selectTheme(themeType: ThemeType): void {
    this.themeStore.setTheme(themeType);
  }

  toggleDarkMode(): void {
    this.themeStore.toggleTheme();
  }
}
