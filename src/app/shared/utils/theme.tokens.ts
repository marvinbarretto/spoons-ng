// ===== NEW ELEGANT THEME SYSTEM =====
export type ThemeType = 'sage' | 'amber' | 'slate' | 'coral' | 'forest';

// Enhanced color scale structure
type ColorScale = {
  50: string;   // lightest
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;  // base/primary
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;  // darkest
};

type SemanticColors = {
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
};

export type Theme = {
  name: string;
  isDark: boolean;
  colors: {
    neutral: ColorScale;
    primary: ColorScale;
    accent: ColorScale;
    semantic: SemanticColors;
  };
};

// ===== ELEGANT THEME DEFINITIONS =====

export const themes: Record<ThemeType, Theme> = {
  sage: {
    name: 'Sage',
    isDark: false,
    colors: {
      // Sophisticated sage greens and warm neutrals
      neutral: {
        50: '#fafaf9',
        100: '#f4f4f3',
        200: '#e8e7e5',
        300: '#d6d4d1',
        400: '#a8a5a0',
        500: '#7c7970',
        600: '#626058',
        700: '#4f4d45',
        800: '#3f3e37',
        900: '#2d2c26',
        950: '#1a1916'
      },
      primary: {
        50: '#f6f7f6',
        100: '#e3e8e3',
        200: '#c7d1c7',
        300: '#9fb19f',
        400: '#7a9279',
        500: '#5d7a5c', // Sophisticated sage
        600: '#4a624a',
        700: '#3d503d',
        800: '#334033',
        900: '#2a352a',
        950: '#171c17'
      },
      accent: {
        50: '#fefce8',
        100: '#fef9c3',
        200: '#fef08a',
        300: '#fde047',
        400: '#facc15',
        500: '#eab308', // Warm golden yellow
        600: '#ca8a04',
        700: '#a16207',
        800: '#854d0e',
        900: '#713f12',
        950: '#422006'
      },
      semantic: {
        background: '#fafaf9',
        surface: '#ffffff',
        surfaceElevated: '#f4f4f3',
        text: '#2d2c26',
        textSecondary: '#4f4d45',
        textMuted: '#7c7970',
        primary: '#5d7a5c',
        primaryHover: '#4a624a',
        primaryActive: '#3d503d',
        primaryText: '#ffffff',
        secondary: '#e8e7e5',
        secondaryHover: '#d6d4d1',
        secondaryActive: '#a8a5a0',
        secondaryText: '#2d2c26',
        success: '#16a34a',
        successText: '#ffffff',
        warning: '#eab308',
        warningText: '#422006',
        error: '#dc2626',
        errorText: '#ffffff',
        info: '#0ea5e9',
        infoText: '#ffffff',
        border: '#e8e7e5',
        borderSecondary: '#f4f4f3',
        overlay: 'rgba(45, 44, 38, 0.5)',
        shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        link: '#5d7a5c',
        linkHover: '#4a624a',
        linkVisited: '#7a9279'
      }
    }
  },

  amber: {
    name: 'Amber',
    isDark: false,
    colors: {
      // Warm amber and rich earth tones
      neutral: {
        50: '#fefdf9',
        100: '#fef9ed',
        200: '#fbefd4',
        300: '#f7e0b0',
        400: '#f0c674',
        500: '#e7a940',
        600: '#d48c1f',
        700: '#b06f18',
        800: '#8f5a1a',
        900: '#744b1b',
        950: '#42260b'
      },
      primary: {
        50: '#fefce8',
        100: '#fef9c3',
        200: '#fef08a',
        300: '#fde047',
        400: '#facc15',
        500: '#eab308', // Rich amber
        600: '#ca8a04',
        700: '#a16207',
        800: '#854d0e',
        900: '#713f12',
        950: '#422006'
      },
      accent: {
        50: '#f4f1f0',
        100: '#e7ddd9',
        200: '#d1beb6',
        300: '#b79b8d',
        400: '#a0806f',
        500: '#8b6c5c', // Warm terracotta
        600: '#7a5a4e',
        700: '#654a42',
        800: '#543e39',
        900: '#473631',
        950: '#251c19'
      },
      semantic: {
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
        linkVisited: '#8b6c5c'
      }
    }
  },

  slate: {
    name: 'Slate',
    isDark: true,
    colors: {
      // Modern dark slate with blue undertones
      neutral: {
        50: '#0f1419',
        100: '#1c2128',
        200: '#292e37',
        300: '#373d47',
        400: '#4d5662',
        500: '#6b7280',
        600: '#9ca3af',
        700: '#d1d5db',
        800: '#e5e7eb',
        900: '#f3f4f6',
        950: '#ffffff'
      },
      primary: {
        50: '#0c1220',
        100: '#1e293b',
        200: '#334155',
        300: '#475569',
        400: '#64748b',
        500: '#708090', // Sophisticated slate blue
        600: '#94a3b8',
        700: '#cbd5e1',
        800: '#e2e8f0',
        900: '#f1f5f9',
        950: '#f8fafc'
      },
      accent: {
        50: '#1a0f1a',
        100: '#2d1b2d',
        200: '#4a2f4a',
        300: '#6b456b',
        400: '#8b5d8b',
        500: '#a855f7', // Rich purple accent
        600: '#c084fc',
        700: '#d8b4fe',
        800: '#e9d5ff',
        900: '#f3e8ff',
        950: '#faf5ff'
      },
      semantic: {
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
        linkVisited: '#a855f7'
      }
    }
  },

  coral: {
    name: 'Coral',
    isDark: false,
    colors: {
      // Warm coral and soft peachy tones
      neutral: {
        50: '#fefcfb',
        100: '#fef7f4',
        200: '#fdeee7',
        300: '#fad9d0',
        400: '#f5b5a3',
        500: '#ee8b6b',
        600: '#e06b4a',
        700: '#c4502e',
        800: '#a33f24',
        900: '#863521',
        950: '#4a1a0e'
      },
      primary: {
        50: '#fff7ed',
        100: '#ffedd5',
        200: '#fed7aa',
        300: '#fdba74',
        400: '#fb923c',
        500: '#f97316', // Vibrant coral
        600: '#ea580c',
        700: '#c2410c',
        800: '#9a3412',
        900: '#7c2d12',
        950: '#431407'
      },
      accent: {
        50: '#f0fdfa',
        100: '#ccfbf1',
        200: '#99f6e4',
        300: '#5eead4',
        400: '#2dd4bf',
        500: '#14b8a6', // Complementary teal
        600: '#0d9488',
        700: '#0f766e',
        800: '#115e59',
        900: '#134e4a',
        950: '#042f2e'
      },
      semantic: {
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
        linkVisited: '#14b8a6'
      }
    }
  },

  forest: {
    name: 'Forest',
    isDark: true,
    colors: {
      // Deep forest greens with natural accents
      neutral: {
        50: '#0a0f0a',
        100: '#141a14',
        200: '#1f2a1f',
        300: '#2d3e2d',
        400: '#405640',
        500: '#577057',
        600: '#7a9b7a',
        700: '#a3c4a3',
        800: '#c8dcc8',
        900: '#e8f0e8',
        950: '#f5f9f5'
      },
      primary: {
        50: '#0c1910',
        100: '#14291a',
        200: '#1a3d24',
        300: '#22543d',
        400: '#2d7054',
        500: '#38a169', // Rich forest green
        600: '#48bb78',
        700: '#68d391',
        800: '#9ae6b4',
        900: '#c6f6d5',
        950: '#f0fff4'
      },
      accent: {
        50: '#1a1106',
        100: '#2d1f0b',
        200: '#4a3518',
        300: '#6b4e26',
        400: '#8b6b35',
        500: '#d4a053', // Warm golden accent
        600: '#e4b968',
        700: '#f0d085',
        800: '#f7e4a7',
        900: '#fcf1c9',
        950: '#fef8e4'
      },
      semantic: {
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
        linkVisited: '#d4a053'
      }
    }
  }
};

export const defaultTheme: { type: ThemeType; theme: Theme } = {
  type: 'sage',
  theme: themes.sage
};
