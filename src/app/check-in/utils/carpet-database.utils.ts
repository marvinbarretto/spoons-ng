/**
 * Carpet database utilities extracted from carpet-signatures.ts
 * Provides real carpet data for location-aware threshold adjustment
 */

export type CarpetSignature = {
  colors: string[];           // 3-4 dominant hex colors
  pattern: 'geometric' | 'ornamental' | 'plain' | 'mixed';
  brightness: number;         // 0-1 (dark to light)
  complexity: number;         // 0-1 (simple to complex)
  textureScore: number;       // 0-1 (smooth to rough)
  contrast: number;           // 0-1 (low to high contrast)
};

export type CarpetData = {
  pubId: string;
  pubName: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  signature: CarpetSignature;
  description: string;         // For debugging
};

// Real carpet database from Watford pubs - useful for validation and testing
export const CARPET_DATABASE: CarpetData[] = [
  {
    pubId: "moon_under_water_watford",
    pubName: "The Moon Under Water",
    location: {
      lat: 51.6581,
      lng: -0.3960,
      address: "Watford High Street"
    },
    signature: {
      colors: ["#ff4500", "#dc143c", "#696969", "#f5deb3"],
      pattern: "geometric",
      brightness: 0.6,
      complexity: 0.7,
      textureScore: 0.8,
      contrast: 0.9
    },
    description: "Bold geometric squares - orange, red, gray, cream pattern"
  },
  {
    pubId: "crown_watford",
    pubName: "The Crown",
    location: {
      lat: 51.6575,
      lng: -0.3955,
      address: "Watford High Street"
    },
    signature: {
      colors: ["#2f4f4f", "#daa520", "#f5f5dc", "#8b4513"],
      pattern: "ornamental",
      brightness: 0.7,
      complexity: 0.9,
      textureScore: 0.6,
      contrast: 0.6
    },
    description: "Ornamental leaf pattern - teal, gold, cream with circular motifs"
  },
  {
    pubId: "red_lion_watford",
    pubName: "The Red Lion",
    location: {
      lat: 51.6570,
      lng: -0.3965,
      address: "Watford Town Centre"
    },
    signature: {
      colors: ["#8b0000", "#4682b4", "#daa520", "#2f4f4f"],
      pattern: "mixed",
      brightness: 0.5,
      complexity: 0.95,
      textureScore: 0.9,
      contrast: 0.8
    },
    description: "Complex patchwork with diamond patterns - burgundy, blue, gold, slate"
  },
  {
    pubId: "weatherspoons_watford_central",
    pubName: "The Woolpack",
    location: {
      lat: 51.6560,
      lng: -0.3950,
      address: "Watford Central"
    },
    signature: {
      colors: ["#f5f5dc", "#8b4513", "#cd853f", "#696969"],
      pattern: "ornamental",
      brightness: 0.8,
      complexity: 0.7,
      textureScore: 0.5,
      contrast: 0.4
    },
    description: "Traditional ornamental - beige base with brown and gold flourishes"
  },
  {
    pubId: "corner_pin_watford",
    pubName: "The Corner Pin",
    location: {
      lat: 51.6590,
      lng: -0.3970,
      address: "Watford North"
    },
    signature: {
      colors: ["#000080", "#f0f0f0", "#8b0000", "#daa520"],
      pattern: "geometric",
      brightness: 0.6,
      complexity: 0.4,
      textureScore: 0.3,
      contrast: 0.9
    },
    description: "Simple geometric stripes - navy, white, burgundy, gold"
  }
];

/**
 * Get carpet data by pub ID
 */
export function getCarpetByPubId(pubId: string): CarpetData | undefined {
  return CARPET_DATABASE.find(carpet => carpet.pubId === pubId);
}

/**
 * Get all carpets in database
 */
export function getAllCarpets(): CarpetData[] {
  return CARPET_DATABASE;
}

/**
 * Get carpets near a location
 */
export function getCarpetsByLocation(lat: number, lng: number, radiusKm: number = 0.1): CarpetData[] {
  return CARPET_DATABASE.filter(carpet => {
    const distance = calculateDistance(lat, lng, carpet.location.lat, carpet.location.lng);
    return distance <= radiusKm;
  });
}

/**
 * Get carpets by pattern type
 */
export function getCarpetsByPattern(pattern: CarpetSignature['pattern']): CarpetData[] {
  return CARPET_DATABASE.filter(carpet => carpet.signature.pattern === pattern);
}

/**
 * Calculate distance between two coordinates in kilometers
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI/180);
}

/**
 * Calculate color similarity between two color arrays
 */
export function calculateCarpetColorSimilarity(colors1: string[], colors2: string[]): number {
  let totalSimilarity = 0;
  let comparisons = 0;

  for (const color1 of colors1.slice(0, 3)) {
    let bestMatch = 0;
    for (const color2 of colors2.slice(0, 3)) {
      const similarity = calculateSingleColorSimilarity(color1, color2);
      bestMatch = Math.max(bestMatch, similarity);
    }
    totalSimilarity += bestMatch;
    comparisons++;
  }

  return comparisons > 0 ? totalSimilarity / comparisons : 0;
}

/**
 * Calculate similarity between two individual colors
 */
function calculateSingleColorSimilarity(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);

  if (!rgb1 || !rgb2) return 0;

  // Weighted Euclidean distance (perceptual)
  const deltaR = (rgb1[0] - rgb2[0]) * 0.3;
  const deltaG = (rgb1[1] - rgb2[1]) * 0.59;
  const deltaB = (rgb1[2] - rgb2[2]) * 0.11;

  const distance = Math.sqrt(deltaR * deltaR + deltaG * deltaG + deltaB * deltaB);
  return Math.max(0, 1 - distance / 255);
}

/**
 * Convert hex color to RGB array
 */
function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : null;
}

/**
 * Get pattern-specific thresholds based on carpet database
 */
export function getPatternThresholds(pattern: CarpetSignature['pattern']) {
  const carpetsOfType = getCarpetsByPattern(pattern);
  
  if (carpetsOfType.length === 0) {
    // Return default thresholds if no data
    return {
      sharpness: 10,
      contrast: 20,
      edgeDensity: 15,
      textureComplexity: 10
    };
  }

  // Calculate average values for this pattern type
  const avgBrightness = carpetsOfType.reduce((sum, c) => sum + c.signature.brightness, 0) / carpetsOfType.length;
  const avgComplexity = carpetsOfType.reduce((sum, c) => sum + c.signature.complexity, 0) / carpetsOfType.length;
  const avgTexture = carpetsOfType.reduce((sum, c) => sum + c.signature.textureScore, 0) / carpetsOfType.length;
  const avgContrast = carpetsOfType.reduce((sum, c) => sum + c.signature.contrast, 0) / carpetsOfType.length;

  // Convert 0-1 values to gate threshold ranges
  return {
    sharpness: Math.round(avgTexture * 50), // 0-50 range
    contrast: Math.round(avgContrast * 100), // 0-100 range
    edgeDensity: Math.round(avgComplexity * 50), // 0-50 range
    textureComplexity: Math.round(avgComplexity * 50) // 0-50 range
  };
}