import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeStore } from '../../data-access/theme.store';
import { ThemeType } from '../../utils/theme.tokens';
import { ALL_THEME_TYPES } from '../../utils/theme.tokens';
import { PanelStore } from '../../ui/panel/panel.store';

@Component({
  selector: 'app-theme-selector',
  imports: [CommonModule],
  templateUrl: './theme-selector.component.html',
  styleUrl: './theme-selector.component.scss',
})
export class ThemeSelectorComponent {
  private readonly themeStore = inject(ThemeStore);
  private readonly panelStore = inject(PanelStore);

  readonly currentTheme = this.themeStore.themeType;

  themeOptions: ThemeType[] = ALL_THEME_TYPES;

  setTheme(type: ThemeType) {
    console.log('[ThemeSelectorComponent] setTheme() called', type);
    this.themeStore.setTheme(type);
    this.panelStore.close();
  }

  // get currentTheme() {
  //   console.log('[ThemeSelectorComponent] currentTheme() called');
  //   return this.themeStore.themeType();
  // }
}
