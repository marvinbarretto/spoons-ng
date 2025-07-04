// ===== SIMPLIFIED THEME SYSTEM =====
export type ThemeType = 'fresh' | 'sunshine' | 'midnight' | 'coral' | 'forest';

export type Theme = {
  name: string;
  isDark: boolean;
  colors: {
    // ===== NEW SEMANTIC PROPERTIES =====
    // Background scales (5 levels)
    background: string;          // Main app background
    backgroundLighter: string;   // Widget backgrounds
    backgroundLightest: string;  // Elevated surfaces
    backgroundDarker: string;    // Recessed areas
    backgroundDarkest: string;   // Deep contrast

    // Text scales (3 levels)
    text: string;                // Primary text
    textSecondary: string;       // Secondary text
    textMuted: string;           // Disabled/muted text

    // Border scales (2 levels)
    border: string;              // Default borders
    borderStrong: string;        // Emphasized borders

    // Interactive colors (2 accent colors)
    accent: string;              // Primary actions
    accentHover: string;         // Primary hover
    accentContrast: string;      // Text on accent

    secondary: string;           // Secondary actions
    secondaryHover: string;      // Secondary hover
    secondaryContrast: string;   // Text on secondary

    // Semantic colors (status indicators)
    success: string;
    warning: string;
    error: string;
    info: string;

    // ===== DEPRECATED (kept for backward compatibility) =====
    // @deprecated Use backgroundLighter instead
    surface: string;
    // @deprecated Use backgroundLightest instead
    surfaceElevated: string;

    // @deprecated Use accent instead
    primary: string;
    // @deprecated Use accentHover instead
    primaryHover: string;
    // @deprecated Use accent instead
    primaryActive: string;
    // @deprecated Use accentContrast instead
    primaryText: string;

    // @deprecated Use secondaryHover instead
    secondaryActive: string;
    // @deprecated Use secondaryContrast instead
    secondaryText: string;

    // @deprecated Semantic colors now use theme text color
    successText: string;
    warningText: string;
    errorText: string;
    infoText: string;

    // @deprecated Use border instead
    borderSecondary: string;

    // Overlays & Shadows (kept as useful)
    overlay: string;
    shadow: string;

    // @deprecated Use accent for links
    link: string;
    linkHover: string;
    linkVisited: string;

    // @deprecated Use background scales instead
    light: string;
    lighter: string;
    dark: string;
    darker: string;
    // @deprecated accent is now a primary property
    accentLight: string;
  };
};

// ===== THEME DEFINITIONS =====

export const themes: Record<ThemeType, Theme> = {
  fresh: {
    name: 'Forest Fresh',
    isDark: false,
    colors: {
      // ===== NEW SEMANTIC PROPERTIES =====
      // Background scales
      background: '#f8fcf8',          // Main app background
      backgroundLighter: '#ffffff',   // Widget backgrounds
      backgroundLightest: '#f0fdf0',  // Elevated surfaces
      backgroundDarker: '#ecfdf5',    // Recessed areas
      backgroundDarkest: '#dcfce7',   // Deep contrast

      // Text scales
      text: '#14532d',                // Primary text
      textSecondary: '#166534',       // Secondary text
      textMuted: '#15803d',           // Disabled/muted text

      // Border scales
      border: '#dcfce7',              // Default borders
      borderStrong: '#bbf7d0',        // Emphasized borders

      // Interactive colors
      accent: '#059669',              // Primary actions (deeper emerald)
      accentHover: '#047857',         // Primary hover
      accentContrast: '#ffffff',      // Text on accent

      secondary: '#f0fdf4',           // Secondary actions (very light)
      secondaryHover: '#dcfce7',      // Secondary hover
      secondaryContrast: '#166534',   // Text on secondary

      // Semantic colors
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',

      // ===== DEPRECATED PROPERTIES (backward compatibility) =====
      surface: '#ffffff',
      surfaceElevated: '#f0fdf0',
      primary: '#059669',
      primaryHover: '#047857',
      primaryActive: '#065f46',
      primaryText: '#ffffff',
      secondaryActive: '#dcfce7',
      secondaryText: '#166534',
      successText: '#ffffff',
      warningText: '#451a03',
      errorText: '#ffffff',
      infoText: '#ffffff',
      borderSecondary: '#f0fdf0',
      overlay: 'rgba(20, 83, 45, 0.5)',
      shadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)',
      link: '#059669',
      linkHover: '#047857',
      linkVisited: '#065f46',
      light: '#f0fdf4',
      lighter: '#dcfce7',
      dark: '#166534',
      darker: '#14532d',
      accentLight: '#a7f3d0'
    }
  },

  sunshine: {
    name: 'Sunshine',
    isDark: false,
    colors: {
      // ===== NEW SEMANTIC PROPERTIES =====
      // Background scales
      background: '#fffbeb',          // Main app background
      backgroundLighter: '#ffffff',   // Widget backgrounds
      backgroundLightest: '#fefce8',  // Elevated surfaces
      backgroundDarker: '#fef3c7',    // Recessed areas
      backgroundDarkest: '#fde68a',   // Deep contrast

      // Text scales
      text: '#92400e',                // Primary text
      textSecondary: '#b45309',       // Secondary text
      textMuted: '#d97706',           // Disabled/muted text

      // Border scales
      border: '#fde68a',              // Default borders
      borderStrong: '#fcd34d',        // Emphasized borders

      // Interactive colors
      accent: '#f59e0b',              // Primary actions (deeper golden)
      accentHover: '#d97706',         // Primary hover
      accentContrast: '#ffffff',      // Text on accent

      secondary: '#fffbeb',           // Secondary actions (very light)
      secondaryHover: '#fef3c7',      // Secondary hover
      secondaryContrast: '#b45309',   // Text on secondary

      // Semantic colors
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',

      // ===== DEPRECATED PROPERTIES (backward compatibility) =====
      surface: '#ffffff',
      surfaceElevated: '#fefce8',
      primary: '#f59e0b',
      primaryHover: '#d97706',
      primaryActive: '#b45309',
      primaryText: '#ffffff',
      secondaryActive: '#fef3c7',
      secondaryText: '#b45309',
      successText: '#ffffff',
      warningText: '#451a03',
      errorText: '#ffffff',
      infoText: '#ffffff',
      borderSecondary: '#fefce8',
      overlay: 'rgba(146, 64, 14, 0.5)',
      shadow: '0 4px 6px -1px rgba(251, 191, 36, 0.3)',
      link: '#f59e0b',
      linkHover: '#d97706',
      linkVisited: '#b45309',
      light: '#fffbeb',
      lighter: '#fef3c7',
      dark: '#b45309',
      darker: '#92400e',
      accentLight: '#fef3c7'
    }
  },

  midnight: {
    name: 'Midnight Pastels',
    isDark: true,
    colors: {
      // ===== NEW SEMANTIC PROPERTIES =====
      // Background scales (darker to lighter for dark theme)
      background: '#0f0b1a',          // Main app background
      backgroundLighter: '#1a1625',   // Widget backgrounds
      backgroundLightest: '#2d2438',  // Elevated surfaces
      backgroundDarker: '#0a0612',    // Recessed areas
      backgroundDarkest: '#050308',   // Deep contrast

      // Text scales
      text: '#f8fafc',                // Primary text
      textSecondary: '#e2e8f0',       // Secondary text
      textMuted: '#cbd5e1',           // Disabled/muted text

      // Border scales
      border: '#44375a',              // Default borders
      borderStrong: '#5b4d70',        // Emphasized borders

      // Interactive colors
      accent: '#a78bfa',              // Primary actions (brighter purple)
      accentHover: '#c4b5fd',         // Primary hover
      accentContrast: '#0f0b1a',      // Text on accent

      secondary: '#44375a',           // Secondary actions (muted dark)
      secondaryHover: '#5b4d70',      // Secondary hover
      secondaryContrast: '#f8fafc',   // Text on secondary

      // Semantic colors
      success: '#68d391',
      warning: '#f6d55c',
      error: '#fc8181',
      info: '#63b3ed',

      // ===== DEPRECATED PROPERTIES (backward compatibility) =====
      surface: '#1a1625',
      surfaceElevated: '#2d2438',
      primary: '#a78bfa',
      primaryHover: '#c4b5fd',
      primaryActive: '#e9d5ff',
      primaryText: '#0f0b1a',
      secondaryActive: '#5b4d70',
      secondaryText: '#f8fafc',
      successText: '#0f0b1a',
      warningText: '#0f0b1a',
      errorText: '#f8fafc',
      infoText: '#f8fafc',
      borderSecondary: '#2d2438',
      overlay: 'rgba(15, 11, 26, 0.85)',
      shadow: '0 4px 6px -1px rgba(183, 148, 246, 0.25)',
      link: '#b794f6',
      linkHover: '#d6bcfa',
      linkVisited: '#a78bfa',
      light: '#44375a',
      lighter: '#5b4d70',
      dark: '#1a1625',
      darker: '#0f0b1a',
      accentLight: '#fbb6ce'
    }
  },

  coral: {
    name: 'Coral',
    isDark: false,
    colors: {
      // ===== NEW SEMANTIC PROPERTIES =====
      // Background scales
      background: '#fefcfb',          // Main app background
      backgroundLighter: '#ffffff',   // Widget backgrounds
      backgroundLightest: '#fff9f6',  // Elevated surfaces
      backgroundDarker: '#fef7f4',    // Recessed areas
      backgroundDarkest: '#fdeee7',   // Deep contrast

      // Text scales
      text: '#4a1a0e',                // Primary text
      textSecondary: '#863521',       // Secondary text
      textMuted: '#a33f24',           // Disabled/muted text

      // Border scales
      border: '#fdeee7',              // Default borders
      borderStrong: '#fad9d0',        // Emphasized borders

      // Interactive colors
      accent: '#f97316',              // Primary actions (coral)
      accentHover: '#ea580c',         // Primary hover
      accentContrast: '#ffffff',      // Text on accent

      secondary: '#fdeee7',           // Secondary actions
      secondaryHover: '#fad9d0',      // Secondary hover
      secondaryContrast: '#4a1a0e',   // Text on secondary

      // Semantic colors
      success: '#14b8a6',
      warning: '#f59e0b',
      error: '#dc2626',
      info: '#0ea5e9',

      // ===== DEPRECATED PROPERTIES (backward compatibility) =====
      surface: '#ffffff',
      surfaceElevated: '#fef7f4',
      primary: '#f97316',
      primaryHover: '#ea580c',
      primaryActive: '#c2410c',
      primaryText: '#ffffff',
      secondaryActive: '#f5b5a3',
      secondaryText: '#4a1a0e',
      successText: '#ffffff',
      warningText: '#451a03',
      errorText: '#ffffff',
      infoText: '#ffffff',
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
      accentLight: '#ccfbf1'
    }
  },

  forest: {
    name: 'Forest',
    isDark: true,
    colors: {
      // ===== NEW SEMANTIC PROPERTIES =====
      // Background scales (darker to lighter for dark theme)
      background: '#0a0f0a',          // Main app background
      backgroundLighter: '#141a14',   // Widget backgrounds
      backgroundLightest: '#1f2a1f',  // Elevated surfaces
      backgroundDarker: '#070b07',    // Recessed areas
      backgroundDarkest: '#040604',   // Deep contrast

      // Text scales
      text: '#f5f9f5',                // Primary text
      textSecondary: '#e8f0e8',       // Secondary text
      textMuted: '#c8dcc8',           // Disabled/muted text

      // Border scales
      border: '#2d3e2d',              // Default borders
      borderStrong: '#405640',        // Emphasized borders

      // Interactive colors
      accent: '#48bb78',              // Primary actions (green)
      accentHover: '#68d391',         // Primary hover
      accentContrast: '#0c1910',      // Text on accent

      secondary: '#2d3e2d',           // Secondary actions
      secondaryHover: '#405640',      // Secondary hover
      secondaryContrast: '#f5f9f5',   // Text on secondary

      // Semantic colors
      success: '#48bb78',
      warning: '#d4a053',
      error: '#f56565',
      info: '#4299e1',

      // ===== DEPRECATED PROPERTIES (backward compatibility) =====
      surface: '#141a14',
      surfaceElevated: '#1f2a1f',
      primary: '#38a169',
      primaryHover: '#48bb78',
      primaryActive: '#68d391',
      primaryText: '#0c1910',
      secondaryActive: '#577057',
      secondaryText: '#f5f9f5',
      successText: '#0c1910',
      warningText: '#1a1106',
      errorText: '#f5f9f5',
      infoText: '#f5f9f5',
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
      accentLight: '#f0d085'
    }
  }
};

export const defaultTheme: { type: ThemeType; theme: Theme } = {
  type: 'fresh',
  theme: themes.fresh
};
