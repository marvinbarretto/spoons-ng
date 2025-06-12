// ===== SIMPLIFIED THEME SYSTEM =====
export type ThemeType = 'sage' | 'amber' | 'slate' | 'coral' | 'forest';

export type Theme = {
  name: string;
  isDark: boolean;
  colors: {
    // Background & Surface
    background: string;
    surface: string;
    surfaceElevated: string;

    // Text
    text: string;
    textSecondary: string;
    textMuted: string;

    // Interactive States
    primary: string;
    primaryHover: string;
    primaryActive: string;
    primaryText: string;

    secondary: string;
    secondaryHover: string;
    secondaryActive: string;
    secondaryText: string;

    // Semantic States
    success: string;
    successText: string;
    warning: string;
    warningText: string;
    error: string;
    errorText: string;
    info: string;
    infoText: string;

    // Borders & Dividers
    border: string;
    borderSecondary: string;

    // Overlays & Shadows
    overlay: string;
    shadow: string;

    // Links
    link: string;
    linkHover: string;
    linkVisited: string;

    // ✅ Simple color variables for gradients/accents
    light: string;       // For gradients, hover states
    lighter: string;     // Subtle backgrounds
    dark: string;        // For contrast, dark elements
    darker: string;      // Deep contrast
    accent: string;      // Pop color
    accentLight: string; // Light version of accent
  };
};

// ===== THEME DEFINITIONS =====

export const themes: Record<ThemeType, Theme> = {
  sage: {
    name: 'Sage',
    isDark: false,
    colors: {
      // Core colors
      background: '#fafaf9',
      surface: '#ffffff',
      surfaceElevated: '#f4f4f3',

      // Text hierarchy
      text: '#2d2c26',
      textSecondary: '#4f4d45',
      textMuted: '#7c7970',

      // Primary interactions
      primary: '#5d7a5c',
      primaryHover: '#4a624a',
      primaryActive: '#3d503d',
      primaryText: '#ffffff',

      // Secondary interactions
      secondary: '#e8e7e5',
      secondaryHover: '#d6d4d1',
      secondaryActive: '#a8a5a0',
      secondaryText: '#2d2c26',

      // Semantic states
      success: '#16a34a',
      successText: '#ffffff',
      warning: '#eab308',
      warningText: '#422006',
      error: '#dc2626',
      errorText: '#ffffff',
      info: '#0ea5e9',
      infoText: '#ffffff',

      // Structure
      border: '#e8e7e5',
      borderSecondary: '#f4f4f3',
      overlay: 'rgba(45, 44, 38, 0.5)',
      shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',

      // Links
      link: '#5d7a5c',
      linkHover: '#4a624a',
      linkVisited: '#7a9279',

      // ✅ Simple variables for gradients/styling
      light: '#f6f7f6',
      lighter: '#e3e8e3',
      dark: '#334033',
      darker: '#2a352a',
      accent: '#eab308',
      accentLight: '#fef9c3'
    }
  },

  amber: {
    name: 'Amber',
    isDark: false,
    colors: {
      background: '#fefdf9',
      surface: '#ffffff',
      surfaceElevated: '#fef9ed',

      text: '#42260b',
      textSecondary: '#744b1b',
      textMuted: '#8f5a1a',

      primary: '#eab308',
      primaryHover: '#ca8a04',
      primaryActive: '#a16207',
      primaryText: '#422006',

      secondary: '#fbefd4',
      secondaryHover: '#f7e0b0',
      secondaryActive: '#f0c674',
      secondaryText: '#42260b',

      success: '#16a34a',
      successText: '#ffffff',
      warning: '#f59e0b',
      warningText: '#451a03',
      error: '#dc2626',
      errorText: '#ffffff',
      info: '#0ea5e9',
      infoText: '#ffffff',

      border: '#fbefd4',
      borderSecondary: '#fef9ed',
      overlay: 'rgba(66, 38, 11, 0.5)',
      shadow: '0 4px 6px -1px rgba(233, 179, 8, 0.2)',

      link: '#ca8a04',
      linkHover: '#a16207',
      linkVisited: '#8b6c5c',

      light: '#fefce8',
      lighter: '#fef9c3',
      dark: '#854d0e',
      darker: '#713f12',
      accent: '#8b6c5c',
      accentLight: '#e7ddd9'
    }
  },

  slate: {
    name: 'Slate',
    isDark: true,
    colors: {
      background: '#0f1419',
      surface: '#1c2128',
      surfaceElevated: '#292e37',

      text: '#f3f4f6',
      textSecondary: '#d1d5db',
      textMuted: '#9ca3af',

      primary: '#708090',
      primaryHover: '#94a3b8',
      primaryActive: '#cbd5e1',
      primaryText: '#0f1419',

      secondary: '#373d47',
      secondaryHover: '#4d5662',
      secondaryActive: '#6b7280',
      secondaryText: '#f3f4f6',

      success: '#22c55e',
      successText: '#0f1419',
      warning: '#f59e0b',
      warningText: '#0f1419',
      error: '#ef4444',
      errorText: '#f3f4f6',
      info: '#3b82f6',
      infoText: '#f3f4f6',

      border: '#373d47',
      borderSecondary: '#292e37',
      overlay: 'rgba(0, 0, 0, 0.8)',
      shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',

      link: '#94a3b8',
      linkHover: '#cbd5e1',
      linkVisited: '#a855f7',

      light: '#475569',
      lighter: '#64748b',
      dark: '#1e293b',
      darker: '#0c1220',
      accent: '#a855f7',
      accentLight: '#c084fc'
    }
  },

  coral: {
    name: 'Coral',
    isDark: false,
    colors: {
      background: '#fefcfb',
      surface: '#ffffff',
      surfaceElevated: '#fef7f4',

      text: '#4a1a0e',
      textSecondary: '#863521',
      textMuted: '#a33f24',

      primary: '#f97316',
      primaryHover: '#ea580c',
      primaryActive: '#c2410c',
      primaryText: '#ffffff',

      secondary: '#fdeee7',
      secondaryHover: '#fad9d0',
      secondaryActive: '#f5b5a3',
      secondaryText: '#4a1a0e',

      success: '#14b8a6',
      successText: '#ffffff',
      warning: '#f59e0b',
      warningText: '#451a03',
      error: '#dc2626',
      errorText: '#ffffff',
      info: '#0ea5e9',
      infoText: '#ffffff',

      border: '#fdeee7',
      borderSecondary: '#fef7f4',
      overlay: 'rgba(74, 26, 14, 0.5)',
      shadow: '0 4px 6px -1px rgba(249, 115, 22, 0.2)',

      link: '#ea580c',
      linkHover: '#c2410c',
      linkVisited: '#14b8a6',

      light: '#fff7ed',
      lighter: '#ffedd5',
      dark: '#9a3412',
      darker: '#7c2d12',
      accent: '#14b8a6',
      accentLight: '#ccfbf1'
    }
  },

  forest: {
    name: 'Forest',
    isDark: true,
    colors: {
      background: '#0a0f0a',
      surface: '#141a14',
      surfaceElevated: '#1f2a1f',

      text: '#f5f9f5',
      textSecondary: '#e8f0e8',
      textMuted: '#c8dcc8',

      primary: '#38a169',
      primaryHover: '#48bb78',
      primaryActive: '#68d391',
      primaryText: '#0c1910',

      secondary: '#2d3e2d',
      secondaryHover: '#405640',
      secondaryActive: '#577057',
      secondaryText: '#f5f9f5',

      success: '#48bb78',
      successText: '#0c1910',
      warning: '#d4a053',
      warningText: '#1a1106',
      error: '#f56565',
      errorText: '#f5f9f5',
      info: '#4299e1',
      infoText: '#f5f9f5',

      border: '#2d3e2d',
      borderSecondary: '#1f2a1f',
      overlay: 'rgba(0, 0, 0, 0.8)',
      shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.6)',

      link: '#68d391',
      linkHover: '#9ae6b4',
      linkVisited: '#d4a053',

      light: '#22543d',
      lighter: '#2d7054',
      dark: '#14291a',
      darker: '#0c1910',
      accent: '#d4a053',
      accentLight: '#f0d085'
    }
  }
};

export const defaultTheme: { type: ThemeType; theme: Theme } = {
  type: 'sage',
  theme: themes.sage
};
