// ===== SIMPLIFIED THEME SYSTEM =====
export type ThemeType = 'sage' | 'amber' | 'slate' | 'coral' | 'forest';

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
  sage: {
    name: 'Sage',
    isDark: false,
    colors: {
      // ===== NEW SEMANTIC PROPERTIES =====
      // Background scales
      background: '#fafaf9',          // Main app background
      backgroundLighter: '#ffffff',   // Widget backgrounds
      backgroundLightest: '#f4f4f3',  // Elevated surfaces
      backgroundDarker: '#f0f0ef',    // Recessed areas
      backgroundDarkest: '#e8e7e5',   // Deep contrast

      // Text scales
      text: '#2d2c26',                // Primary text
      textSecondary: '#4f4d45',       // Secondary text
      textMuted: '#7c7970',           // Disabled/muted text

      // Border scales
      border: '#e8e7e5',              // Default borders
      borderStrong: '#d6d4d1',        // Emphasized borders

      // Interactive colors
      accent: '#5d7a5c',              // Primary actions (sage green)
      accentHover: '#4a624a',         // Primary hover
      accentContrast: '#ffffff',      // Text on accent

      secondary: '#e8e7e5',           // Secondary actions
      secondaryHover: '#d6d4d1',      // Secondary hover
      secondaryContrast: '#2d2c26',   // Text on secondary

      // Semantic colors
      success: '#16a34a',
      warning: '#eab308',
      error: '#dc2626',
      info: '#0ea5e9',

      // ===== DEPRECATED PROPERTIES (backward compatibility) =====
      surface: '#ffffff',
      surfaceElevated: '#f4f4f3',
      primary: '#5d7a5c',
      primaryHover: '#4a624a',
      primaryActive: '#3d503d',
      primaryText: '#ffffff',
      secondaryActive: '#a8a5a0',
      secondaryText: '#2d2c26',
      successText: '#ffffff',
      warningText: '#422006',
      errorText: '#ffffff',
      infoText: '#ffffff',
      borderSecondary: '#f4f4f3',
      overlay: 'rgba(45, 44, 38, 0.5)',
      shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      link: '#5d7a5c',
      linkHover: '#4a624a',
      linkVisited: '#7a9279',
      light: '#f6f7f6',
      lighter: '#e3e8e3',
      dark: '#334033',
      darker: '#2a352a',
      accentLight: '#fef9c3'
    }
  },

  amber: {
    name: 'Amber',
    isDark: false,
    colors: {
      // ===== NEW SEMANTIC PROPERTIES =====
      // Background scales
      background: '#fefdf9',          // Main app background
      backgroundLighter: '#fffef5',   // Widget backgrounds
      backgroundLightest: '#ffffff',  // Elevated surfaces
      backgroundDarker: '#fef9ed',    // Recessed areas
      backgroundDarkest: '#fbefd4',   // Deep contrast

      // Text scales
      text: '#42260b',                // Primary text
      textSecondary: '#744b1b',       // Secondary text
      textMuted: '#8f5a1a',           // Disabled/muted text

      // Border scales
      border: '#fbefd4',              // Default borders
      borderStrong: '#f7e0b0',        // Emphasized borders

      // Interactive colors
      accent: '#eab308',              // Primary actions (amber)
      accentHover: '#ca8a04',         // Primary hover
      accentContrast: '#422006',      // Text on accent

      secondary: '#fbefd4',           // Secondary actions
      secondaryHover: '#f7e0b0',      // Secondary hover
      secondaryContrast: '#42260b',   // Text on secondary

      // Semantic colors
      success: '#16a34a',
      warning: '#f59e0b',
      error: '#dc2626',
      info: '#0ea5e9',

      // ===== DEPRECATED PROPERTIES (backward compatibility) =====
      surface: '#ffffff',
      surfaceElevated: '#fef9ed',
      primary: '#eab308',
      primaryHover: '#ca8a04',
      primaryActive: '#a16207',
      primaryText: '#422006',
      secondaryActive: '#f0c674',
      secondaryText: '#42260b',
      successText: '#ffffff',
      warningText: '#451a03',
      errorText: '#ffffff',
      infoText: '#ffffff',
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
      accentLight: '#e7ddd9'
    }
  },

  slate: {
    name: 'Slate',
    isDark: true,
    colors: {
      // ===== NEW SEMANTIC PROPERTIES =====
      // Background scales (darker to lighter for dark theme)
      background: '#0f1419',          // Main app background
      backgroundLighter: '#1c2128',   // Widget backgrounds
      backgroundLightest: '#292e37',  // Elevated surfaces
      backgroundDarker: '#0c1015',    // Recessed areas
      backgroundDarkest: '#060709',   // Deep contrast

      // Text scales
      text: '#f3f4f6',                // Primary text
      textSecondary: '#d1d5db',       // Secondary text
      textMuted: '#9ca3af',           // Disabled/muted text

      // Border scales
      border: '#373d47',              // Default borders
      borderStrong: '#4d5662',        // Emphasized borders

      // Interactive colors
      accent: '#94a3b8',              // Primary actions (light slate)
      accentHover: '#cbd5e1',         // Primary hover
      accentContrast: '#0f1419',      // Text on accent

      secondary: '#373d47',           // Secondary actions
      secondaryHover: '#4d5662',      // Secondary hover
      secondaryContrast: '#f3f4f6',   // Text on secondary

      // Semantic colors
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',

      // ===== DEPRECATED PROPERTIES (backward compatibility) =====
      surface: '#1c2128',
      surfaceElevated: '#292e37',
      primary: '#708090',
      primaryHover: '#94a3b8',
      primaryActive: '#cbd5e1',
      primaryText: '#0f1419',
      secondaryActive: '#6b7280',
      secondaryText: '#f3f4f6',
      successText: '#0f1419',
      warningText: '#0f1419',
      errorText: '#f3f4f6',
      infoText: '#f3f4f6',
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
      accentLight: '#c084fc'
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
  type: 'sage',
  theme: themes.sage
};
