import { InjectionToken } from '@angular/core';
import { ThemeType, themeTokens } from '../../app/shared/utils/theme.tokens';

export function generateInlineThemeCss(themeType: ThemeType): string {
  const theme = themeTokens[themeType] ?? themeTokens['Default'];
  const vars = Object.entries(theme.tokens)
    .map(([key, value]) => {
      return `--color-${key}: ${value};`;
    })
    .join('\n');

  return `<style id="server-theme">
    :root {
      ${vars}
    }
  </style>`;
}

export const USER_THEME_TOKEN = new InjectionToken<ThemeType>('UserTheme');
