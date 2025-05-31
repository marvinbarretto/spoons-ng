// TODO: Can we make this enum and does it help us?
export type ThemeType =
  | 'Default'
  | 'Dark'
  | 'HighContrast'
  | 'CVDSafe'
;

export type Theme = {
  name: string;
  tokens: {
    background: string;
    text: string;

    // Buttons
    buttonPrimaryBase: string;
    buttonPrimaryHover: string;
    buttonPrimaryActive: string;
    buttonPrimaryText: string;
    buttonPrimaryDisabled: string;

    buttonSecondaryBase: string;
    buttonSecondaryHover: string;
    buttonSecondaryActive: string;
    buttonSecondaryText: string;
    buttonSecondaryDisabled: string;

    // Links
    linkBase: string;
    linkHover: string;
    linkActive: string;

    // Subtle surfaces
    subtleLighter: string;
    subtleDarker: string;
    onSubtleLighter: string;
    onSubtleDarker: string;

    // Accent
    accentBase: string;
    accentText: string;

    // Optional
    shadow?: string;
    overlay?: string;
  };
};


export const themeTokens: Record<string, Theme> = {
  Default: {
    name: 'Default',
    tokens: {
      background: '#EFF7F6',
      text: '#181C14',

      buttonPrimaryBase: '#007BFF',
      buttonPrimaryHover: '#0069D9',
      buttonPrimaryActive: '#0056B3',
      buttonPrimaryText: '#FFFFFF',
      buttonPrimaryDisabled: '#CCCCCC',

      buttonSecondaryBase: '#6C757D',
      buttonSecondaryHover: '#5A6268',
      buttonSecondaryActive: '#545B62',
      buttonSecondaryText: '#FFFFFF',
      buttonSecondaryDisabled: '#CCCCCC',

      linkBase: '#007BFF',
      linkHover: '#0069D9',
      linkActive: '#0056B3',

      subtleLighter: '#ECDFCC',
      subtleDarker: '#ECDFCC',
      onSubtleLighter: '#333333',
      onSubtleDarker: '#1E1E1E',

      accentBase: '#FFD54F',
      accentText: '#000000',

      shadow: 'rgba(0, 0, 0, 0.15)',
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
  },
  Dark: {
    name: 'Dark',
    tokens: {
      background: '#1E1E2F', // dark slate blue
      text: '#E0E6ED',       // soft light blue-gray text

      buttonPrimaryBase: '#3B82F6',   // Tailwind blue-500
      buttonPrimaryHover: '#2563EB',  // blue-600
      buttonPrimaryActive: '#1D4ED8', // blue-700
      buttonPrimaryText: '#F8FAFC',   // soft white
      buttonPrimaryDisabled: '#CCCCCC',

      buttonSecondaryBase: '#334155',   // slate-700
      buttonSecondaryHover: '#1E293B',  // slate-800
      buttonSecondaryActive: '#0F172A', // slate-900
      buttonSecondaryText: '#E2E8F0',   // slate-200
      buttonSecondaryDisabled: '#CCCCCC',

      linkBase: '#60A5FA',     // blue-400
      linkHover: '#3B82F6',    // blue-500
      linkActive: '#2563EB',   // blue-600

      subtleLighter: '#2D3142',   // dark steel
      subtleDarker: '#1C1F2B',    // navy blueish-black
      onSubtleLighter: '#CBD5E1', // slate-300
      onSubtleDarker: '#E2E8F0',  // slate-200

      accentBase: '#FFD54F',      // pastel red-pink
      accentText: '#1E1E2F',

      shadow: 'rgba(0, 0, 0, 0.7)',
      overlay: 'rgba(255, 255, 255, 0.04)',
    },
  },
  HighContrast: {
    name: 'High Contrast',
    tokens: {
      background: '#000000',
      text: '#FFFFFF',

      buttonPrimaryBase: '#FFFFFF',
      buttonPrimaryHover: '#CCCCCC',
      buttonPrimaryActive: '#999999',
      buttonPrimaryText: '#000000',
      buttonPrimaryDisabled: '#CCCCCC',

      buttonSecondaryBase: '#FFFF00',
      buttonSecondaryHover: '#CCCC00',
      buttonSecondaryActive: '#999900',
      buttonSecondaryText: '#000000',
      buttonSecondaryDisabled: '#CCCCCC',

      linkBase: '#00FFFF',
      linkHover: '#00DDDD',
      linkActive: '#00BBBB',

      subtleLighter: '#333333',
      subtleDarker: '#111111',
      onSubtleLighter: '#FFFFFF',
      onSubtleDarker: '#FFFFFF',

      accentBase: '#FF00FF',
      accentText: '#FFFFFF',

      shadow: 'rgba(255, 255, 255, 0.5)',
      overlay: 'rgba(255, 255, 255, 0.2)',
    },
  },
  CVDSafe: {
    name: 'CVD Safe',
    tokens: {
      background: '#F9F9F9',
      text: '#222222',

      buttonPrimaryBase: '#006BA6',       // Blue-ish
      buttonPrimaryHover: '#005A8C',
      buttonPrimaryActive: '#004971',
      buttonPrimaryText: '#FFFFFF',
      buttonPrimaryDisabled: '#CCCCCC',

      buttonSecondaryBase: '#FFB000',       // Orange-ish
      buttonSecondaryHover: '#D99900',
      buttonSecondaryActive: '#B38300',
      buttonSecondaryText: '#000000',
      buttonSecondaryDisabled: '#CCCCCC',

      linkBase: '#228C68',
      linkHover: '#1D7558',
      linkActive: '#185E48',

      subtleLighter: '#E6E6E6',
      subtleDarker: '#CCCCCC',
      onSubtleLighter: '#222222',
      onSubtleDarker: '#222222',

      accentBase: '#8E6C8A',         // Muted purple
      accentText: '#FFFFFF',

      shadow: 'rgba(0, 0, 0, 0.1)',
      overlay: 'rgba(0, 0, 0, 0.05)',
    },
  },
};

export const ALL_THEME_TYPES = Object.keys(themeTokens) as ThemeType[];

export const defaultTheme: { type: ThemeType; theme: Theme } = {
  type: 'Default',
  theme: themeTokens['Default'],
};
