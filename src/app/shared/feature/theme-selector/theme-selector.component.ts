import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeStore } from '../../data-access/theme.store';
import { themes, type ThemeType } from '../../utils/theme.tokens';
import { PanelStore } from '../../ui/panel/panel.store';

@Component({
  selector: 'app-theme-selector',
  imports: [CommonModule],
  templateUrl: './theme-selector.component.html',
  styleUrl: './theme-selector.component.scss',
})
export class ThemeSelectorComponent {
  private readonly _themeStore = inject(ThemeStore);
  private readonly _panelStore = inject(PanelStore);

  // ✅ Following your signal conventions
  protected readonly currentTheme = this._themeStore.themeType;
  protected readonly isDark = this._themeStore.isDark;

  // ✅ Use the new themes object instead of ALL_THEME_TYPES
  protected readonly themeOptions = Object.entries(themes).map(([type, theme]) => ({
    type: type as ThemeType,
    ...theme
  }));

  protected readonly toggleLabel = () =>
    `Switch to ${this.isDark() ? 'light' : 'dark'} theme`;

  setTheme(type: ThemeType): void {
    this._themeStore.setTheme(type);
    this._panelStore.close();
  }

  toggleTheme(): void {
    this._themeStore.toggleTheme();
    this._panelStore.close();
  }
}
