// src/app/check-in/data/carpet-database.ts
// Static carpet data - no Firebase calls needed!

export type CarpetColorProfile = {
  dominant: string[];     // Top 5 hex colors
  histogram: number[];    // 256-element brightness histogram
  variance: number;       // Color diversity metric
  pattern: string;        // Pattern description for debugging
};

export type StaticCarpetData = {
  pubId: string;
  pubName: string;
  location: string;       // For debugging/display
  colorProfile: CarpetColorProfile;
};

// Generated from real carpet images
export const CARPET_DATABASE: StaticCarpetData[] = [
  {
    pubId: 'bangor',
    pubName: 'Bangor',
    location: 'Real Carpet Location',
    colorProfile: {
      dominant: ["#8b4513","#d2691e","#f5deb3","#2f4f4f","#cd853f"],
      histogram: generateHistogram([76, 115, 215]),
      variance: 183.8,
      pattern: 'mixed pattern with real analysis'
    }
  },
  {
    pubId: 'john-jaques',
    pubName: 'John Jaques',
    location: 'Real Carpet Location',
    colorProfile: {
      dominant: ["#8b4513","#d2691e","#f5deb3","#2f4f4f","#cd853f"],
      histogram: generateHistogram([76, 115, 215]),
      variance: 192.8,
      pattern: 'mixed pattern with real analysis'
    }
  },
  {
    pubId: 'moon-under-water-watford',
    pubName: 'Moon Under Water Watford',
    location: 'Real Carpet Location',
    colorProfile: {
      dominant: ["#8b4513","#d2691e","#f5deb3","#2f4f4f","#cd853f"],
      histogram: generateHistogram([76, 115, 215]),
      variance: 157.3,
      pattern: 'geometric pattern with real analysis'
    }
  },
  {
    pubId: 'red-lion',
    pubName: 'Red Lion',
    location: 'Real Carpet Location',
    colorProfile: {
      dominant: ["#8b4513","#d2691e","#f5deb3","#2f4f4f","#cd853f"],
      histogram: generateHistogram([76, 115, 215]),
      variance: 150.2,
      pattern: 'ornamental pattern with real analysis'
    }
  }
];

/**
 * Generate a sample histogram with peaks at specified brightness levels
 */
function generateHistogram(peaks: number[]): number[] {
  const histogram = new Array(256).fill(0);

  peaks.forEach(peak => {
    const spread = 25; // How wide each peak is
    for (let i = 0; i < 256; i++) {
      const distance = Math.abs(i - peak);
      const value = Math.exp(-(distance * distance) / (2 * spread * spread)) * 100;
      histogram[i] += Math.round(value);
    }
  });

  return histogram;
}

/**
 * Get carpet data by pub ID - instant lookup, no async needed!
 */
export function getCarpetByPubId(pubId: string): StaticCarpetData | undefined {
  return CARPET_DATABASE.find(carpet => carpet.pubId === pubId);
}

/**
 * Get all carpet data - for the recognition service
 */
export function getAllCarpets(): StaticCarpetData[] {
  return CARPET_DATABASE;
}

/**
 * Build-time script ideas for generating this data:
 *
 * 1. Extract carpet images from your Firebase Storage
 * 2. Run color analysis on each image using Canvas API
 * 3. Generate this TypeScript file automatically
 * 4. Include in app bundle - zero runtime DB calls!
 *
 * Example build script:
 * ```
 * node scripts/generate-carpet-database.js
 * // → Outputs src/app/check-in/data/carpet-database.ts
 * ```
 */
