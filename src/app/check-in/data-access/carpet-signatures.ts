// src/app/check-in/data-access/carpet-signatures.ts
// 🎯 Manual carpet signatures for testing recognition

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

// 🎨 Manual carpet database based on your images
export const CARPET_DATABASE: CarpetData[] = [

  // ✅ Geometric Square Pattern (Red/Orange/Gray)
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

  // ✅ Ornamental Pattern (Teal/Gold/Cream)
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

  // ✅ Complex Patchwork Pattern (Multi-colored Diamonds)
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

  // ✅ Traditional Ornamental (Beige/Brown/Gold)
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

  // ✅ Simple Geometric Stripes
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
  },

  // ✅ Dark Ornamental Pattern
  {
    pubId: "princes_head_watford",
    pubName: "The Prince's Head",
    location: {
      lat: 51.6565,
      lng: -0.3945,
      address: "Watford South"
    },
    signature: {
      colors: ["#2f2f2f", "#8b0000", "#daa520", "#4a4a4a"],
      pattern: "ornamental",
      brightness: 0.3,
      complexity: 0.8,
      textureScore: 0.7,
      contrast: 0.7
    },
    description: "Dark ornamental pattern - charcoal base with burgundy and gold accents"
  },

  // ✅ Floral Ornamental (Green/Pink/Cream)
  {
    pubId: "royal_oak_watford",
    pubName: "The Royal Oak",
    location: {
      lat: 51.6580,
      lng: -0.3940,
      address: "Watford East"
    },
    signature: {
      colors: ["#228b22", "#dda0dd", "#f5f5dc", "#8b4513"],
      pattern: "ornamental",
      brightness: 0.7,
      complexity: 0.85,
      textureScore: 0.6,
      contrast: 0.5
    },
    description: "Floral ornamental - forest green, plum, cream with leafy patterns"
  },

  // ✅ Bold Geometric Diamonds
  {
    pubId: "spotted_dog_watford",
    pubName: "The Spotted Dog",
    location: {
      lat: 51.6585,
      lng: -0.3935,
      address: "Watford West"
    },
    signature: {
      colors: ["#ff6347", "#4169e1", "#ffd700", "#000000"],
      pattern: "geometric",
      brightness: 0.7,
      complexity: 0.8,
      textureScore: 0.9,
      contrast: 0.95
    },
    description: "Bold geometric diamonds - tomato red, royal blue, gold, black"
  },

  // ✅ Subtle Mixed Pattern
  {
    pubId: "Essex_arms_watford",
    pubName: "The Essex Arms",
    location: {
      lat: 51.6595,
      lng: -0.3925,
      address: "Watford North East"
    },
    signature: {
      colors: ["#d2b48c", "#8fbc8f", "#cd853f", "#696969"],
      pattern: "mixed",
      brightness: 0.75,
      complexity: 0.6,
      textureScore: 0.4,
      contrast: 0.3
    },
    description: "Subtle mixed pattern - tan, sage green, peru, dim gray"
  },

  // ✅ High Contrast Geometric
  {
    pubId: "moon_watford_junction",
    pubName: "The Moon (Junction)",
    location: {
      lat: 51.6600,
      lng: -0.3920,
      address: "Watford Junction"
    },
    signature: {
      colors: ["#000000", "#ffffff", "#ff0000", "#0000ff"],
      pattern: "geometric",
      brightness: 0.5,
      complexity: 0.5,
      textureScore: 0.8,
      contrast: 1.0
    },
    description: "High contrast geometric - black, white, red, blue checkerboard"
  }

];

// ✅ Helper functions for recognition
export function getCarpetByPubId(pubId: string): CarpetData | undefined {
  return CARPET_DATABASE.find(carpet => carpet.pubId === pubId);
}

export function getAllCarpets(): CarpetData[] {
  return CARPET_DATABASE;
}

export function getCarpetsByLocation(lat: number, lng: number, radiusKm: number = 0.1): CarpetData[] {
  return CARPET_DATABASE.filter(carpet => {
    const distance = calculateDistance(lat, lng, carpet.location.lat, carpet.location.lng);
    return distance <= radiusKm;
  });
}

export function getCarpetsByPattern(pattern: CarpetSignature['pattern']): CarpetData[] {
  return CARPET_DATABASE.filter(carpet => carpet.signature.pattern === pattern);
}

// ✅ Distance calculation helper
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

function toRadians(degrees: number): number {
  return degrees * (Math.PI/180);
}

// ✅ Pattern similarity helpers
export function calculateColorSimilarity(colors1: string[], colors2: string[]): number {
  let totalSimilarity = 0;
  let comparisons = 0;

  for (const color1 of colors1.slice(0, 3)) {
    let bestMatch = 0;
    for (const color2 of colors2.slice(0, 3)) {
      const similarity = calculateColorDistance(color1, color2);
      bestMatch = Math.max(bestMatch, similarity);
    }
    totalSimilarity += bestMatch;
    comparisons++;
  }

  return comparisons > 0 ? totalSimilarity / comparisons : 0;
}

function calculateColorDistance(hex1: string, hex2: string): number {
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

function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : null;
}

// ✅ Debug info
console.log(`📊 Carpet Database loaded: ${CARPET_DATABASE.length} signatures`);
console.log(`🎨 Pattern distribution:`, {
  geometric: CARPET_DATABASE.filter(c => c.signature.pattern === 'geometric').length,
  ornamental: CARPET_DATABASE.filter(c => c.signature.pattern === 'ornamental').length,
  mixed: CARPET_DATABASE.filter(c => c.signature.pattern === 'mixed').length,
  plain: CARPET_DATABASE.filter(c => c.signature.pattern === 'plain').length
});
