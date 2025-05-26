export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface HslColor {
  h: number;
  s: number;
  l: number;
}

export function hexToRgb(hex: string): RgbColor | null {
  if (!hex || hex.length < 4 || hex.length > 7) {
    console.error('Invalid HEX color code.');
    return null;
  }

  let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => {
    return r + r + g + g + b + b;
  });

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    console.error('Invalid HEX color code.');
    return null;
  }

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

export function rgbToHex(rgb: RgbColor): string {
  if (rgb.r < 0 || rgb.r > 255 || rgb.g < 0 || rgb.g > 255 || rgb.b < 0 || rgb.b > 255) {
    console.error('Invalid RGB color values. Values should be between 0 and 255.');
    return ''; // Or throw an error, depending on desired error handling
  }
  return "#" + ((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1).toUpperCase();
}

export function rgbToHsl(rgb: RgbColor): HslColor {
  let { r, g, b } = rgb;
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToRgb(hsl: HslColor): RgbColor {
  let { h, s, l } = hsl;
  h /= 360;
  s /= 100;
  l /= 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

export function adjustBrightness(hexColor: string, percentage: number): string {
  const rgb = hexToRgb(hexColor);
  if (!rgb) {
    return ''; // Or throw an error
  }

  const hsl = rgbToHsl(rgb);

  hsl.l += percentage;
  hsl.l = Math.max(0, Math.min(100, hsl.l)); // Clamp lightness between 0 and 100

  const newRgb = hslToRgb(hsl);
  return rgbToHex(newRgb);
}



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
      background: '#ECDFCC',
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

      subtleLighter: adjustBrightness('#ECDFCC', 10),
      subtleDarker: adjustBrightness('#ECDFCC', -10),
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
