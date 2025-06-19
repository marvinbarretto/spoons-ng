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

// ✅ This data would be generated once from your carpet images
// and bundled with the app - no runtime DB calls!
export const CARPET_DATABASE: StaticCarpetData[] = [
  {
    pubId: 'pub_crown_watford',
    pubName: 'The Crown',
    location: 'Watford High Street',
    colorProfile: {
      dominant: ['#2d5a5f', '#8b1538', '#f4e4c1', '#d4af37', '#4a4a4a'],
      histogram: generateHistogram([45, 85, 120, 160, 200]), // Peaks at these brightness levels
      variance: 145.7,
      pattern: 'Floral/leaf pattern with teal, burgundy, cream, gold'
    }
  },
  {
    pubId: 'pub_moon_watford',
    pubName: 'The Moon Under Water',
    location: 'Watford High Street',
    colorProfile: {
      dominant: ['#ff4500', '#dc143c', '#696969', '#f5f5dc', '#8b0000'],
      histogram: generateHistogram([65, 95, 125, 155, 185]),
      variance: 167.3,
      pattern: 'Geometric squares - orange, red, gray, cream'
    }
  },
  {
    pubId: 'pub_test_complex',
    pubName: 'Test Complex Pattern',
    location: 'Test Location',
    colorProfile: {
      dominant: ['#8b0000', '#ff6347', '#4682b4', '#daa520', '#2f4f4f'],
      histogram: generateHistogram([40, 80, 110, 140, 180]),
      variance: 198.1,
      pattern: 'Complex patchwork with geometric elements'
    }
  },
  {
    pubId: 'pub_test_traditional',
    pubName: 'Test Traditional Pattern',
    location: 'Test Location',
    colorProfile: {
      dominant: ['#f5f5dc', '#8b4513', '#2f4f4f', '#daa520', '#654321'],
      histogram: generateHistogram([90, 130, 170, 200, 220]),
      variance: 123.5,
      pattern: 'Traditional paisley - cream, brown, dark slate'
    }
  }
  // ✅ In production, this would contain all 800 pubs
  // Generated from a build script that processes carpet images
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
