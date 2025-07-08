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

    // Interactive colors (primary, secondary, accent)
    primary: string;             // Primary actions
    primaryHover: string;        // Primary hover
    onPrimary: string;     // Text on primary

    secondary: string;           // Secondary actions
    secondaryHover: string;      // Secondary hover
    onSecondary: string;   // Text on secondary

    accent: string;              // Pop color that contrasts with theme
    accentHover: string;         // Accent hover
    onAccent: string;      // Text on accent

    // Semantic colors (status indicators)
    success: string;
    warning: string;
    error: string;
    info: string;

    // ===== DEPRECATED (kept for backward compatibility) =====

    // Overlays & Shadows
    overlay: string;
    shadow: string;
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
      primary: '#059669',             // Primary actions (deeper emerald)
      primaryHover: '#047857',        // Primary hover
      onPrimary: '#ffffff',     // Text on primary

      secondary: '#f0fdf4',           // Secondary actions (very light)
      secondaryHover: '#dcfce7',      // Secondary hover
      onSecondary: '#166534',   // Text on secondary

      accent: '#ff6b6b',              // Bright coral that pops against green
      accentHover: '#ff5252',         // Accent hover
      onAccent: '#ffffff',      // Text on accent

      // Semantic colors
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',

      // Overlays & Shadows
      overlay: 'rgba(20, 83, 45, 0.5)',
      shadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)'
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
      primary: '#f59e0b',             // Primary actions (deeper golden)
      primaryHover: '#d97706',        // Primary hover
      onPrimary: '#ffffff',     // Text on primary

      secondary: '#fffbeb',           // Secondary actions (very light)
      secondaryHover: '#fef3c7',      // Secondary hover
      onSecondary: '#b45309',   // Text on secondary

      accent: '#3b82f6',              // Electric blue that pops against yellow
      accentHover: '#2563eb',         // Accent hover
      onAccent: '#ffffff',      // Text on accent

      // Semantic colors
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',

      // Overlays & Shadows
      overlay: 'rgba(146, 64, 14, 0.5)',
      shadow: '0 4px 6px -1px rgba(251, 191, 36, 0.3)'
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
      primary: '#a78bfa',             // Primary actions (brighter purple)
      primaryHover: '#c4b5fd',        // Primary hover
      onPrimary: '#0f0b1a',     // Text on primary

      secondary: '#44375a',           // Secondary actions (muted dark)
      secondaryHover: '#5b4d70',      // Secondary hover
      onSecondary: '#f8fafc',   // Text on secondary

      accent: '#ff6b9d',              // Bright pink that pops against purple
      accentHover: '#ff5e8a',         // Accent hover
      onAccent: '#ffffff',      // Text on accent

      // Semantic colors
      success: '#68d391',
      warning: '#f6d55c',
      error: '#fc8181',
      info: '#63b3ed',

      // Overlays & Shadows
      overlay: 'rgba(15, 11, 26, 0.85)',
      shadow: '0 4px 6px -1px rgba(183, 148, 246, 0.25)'
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
      primary: '#f97316',             // Primary actions (coral)
      primaryHover: '#ea580c',        // Primary hover
      onPrimary: '#ffffff',     // Text on primary

      secondary: '#fdeee7',           // Secondary actions
      secondaryHover: '#fad9d0',      // Secondary hover
      onSecondary: '#4a1a0e',   // Text on secondary

      accent: '#8b5cf6',              // Purple that pops against coral
      accentHover: '#7c3aed',         // Accent hover
      onAccent: '#ffffff',      // Text on accent

      // Semantic colors
      success: '#14b8a6',
      warning: '#f59e0b',
      error: '#dc2626',
      info: '#0ea5e9',

      // Overlays & Shadows
      overlay: 'rgba(74, 26, 14, 0.5)',
      shadow: '0 4px 6px -1px rgba(249, 115, 22, 0.2)'
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
      primary: '#48bb78',             // Primary actions (green)
      primaryHover: '#68d391',        // Primary hover
      onPrimary: '#0c1910',     // Text on primary

      secondary: '#2d3e2d',           // Secondary actions
      secondaryHover: '#405640',      // Secondary hover
      onSecondary: '#f5f9f5',   // Text on secondary

      accent: '#fbbf24',              // Golden yellow that pops against green
      accentHover: '#f59e0b',         // Accent hover
      onAccent: '#0c1910',      // Text on accent

      // Semantic colors
      success: '#48bb78',
      warning: '#d4a053',
      error: '#f56565',
      info: '#4299e1',

      // Overlays & Shadows
      overlay: 'rgba(0, 0, 0, 0.8)',
      shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.6)'
    }
  }
};

export const defaultTheme: { type: ThemeType; theme: Theme } = {
  type: 'forest',
  theme: themes.forest
};
