// src/app/check-in/data-access/simple-carpet-database.ts
// ✅ Manual carpet database - no canvas required!

export type CarpetColorProfile = {
  dominant: string[];
  histogram: number[];
  variance: number;
  pattern: string;
};

export type StaticCarpetData = {
  pubId: string;
  pubName: string;
  location: string;
  colorProfile: CarpetColorProfile;
};

// ✅ Manually created from analyzing your carpet images
export const CARPET_DATABASE: StaticCarpetData[] = [
  {
    pubId: 'pub_moon_under_water',
    pubName: 'The Moon Under Water',
    location: 'Watford High Street',
    colorProfile: {
      // Colors from the geometric squares pattern I can see
      dominant: ['#ff4500', '#dc143c', '#696969', '#f5f5dc', '#8b0000'],
      histogram: generateSimpleHistogram([65, 95, 125, 155, 185]),
      variance: 167.3,
      pattern: 'Geometric squares - orange, red, gray, cream'
    }
  },
  {
    pubId: 'pub_ornamental_example',
    pubName: 'Example Ornamental Pub',
    location: 'Test Location',
    colorProfile: {
      // Colors from the ornamental pattern I can see
      dominant: ['#2d5a5f', '#8b1538', '#f4e4c1', '#d4af37', '#4a4a4a'],
      histogram: generateSimpleHistogram([45, 85, 120, 160, 200]),
      variance: 145.7,
      pattern: 'Ornamental pattern with teal leaves and gold circles'
    }
  },
  {
    pubId: 'pub_complex_patchwork',
    pubName: 'Complex Patchwork Pub',
    location: 'Test Location',
    colorProfile: {
      // Colors from the complex patchwork pattern
      dominant: ['#8b0000', '#ff6347', '#4682b4', '#daa520', '#2f4f4f'],
      histogram: generateSimpleHistogram([40, 80, 110, 140, 180]),
      variance: 198.1,
      pattern: 'Complex patchwork with geometric diamond elements'
    }
  },
  {
    pubId: 'pub_traditional_pattern',
    pubName: 'Traditional Pattern Pub',
    location: 'Test Location',
    colorProfile: {
      dominant: ['#f5f5dc', '#8b4513', '#2f4f4f', '#daa520', '#654321'],
      histogram: generateSimpleHistogram([90, 130, 170, 200, 220]),
      variance: 123.5,
      pattern: 'Traditional ornamental with beige, brown, and gold'
    }
  }
];

/**
 * Generate a simple histogram with peaks at specified brightness levels
 */
function generateSimpleHistogram(peaks: number[]): number[] {
  const histogram = new Array(256).fill(0);

  peaks.forEach(peak => {
    const spread = 25;
    for (let i = 0; i < 256; i++) {
      const distance = Math.abs(i - peak);
      const value = Math.exp(-(distance * distance) / (2 * spread * spread)) * 100;
      histogram[i] += Math.round(value);
    }
  });

  return histogram;
}

/**
 * Get carpet data by pub ID
 */
export function getCarpetByPubId(pubId: string): StaticCarpetData | undefined {
  return CARPET_DATABASE.find(carpet => carpet.pubId === pubId);
}

/**
 * Get all carpet data
 */
export function getAllCarpets(): StaticCarpetData[] {
  return CARPET_DATABASE;
}

/**
 * Search carpets by pattern type
 */
export function getCarpetsByPattern(pattern: string): StaticCarpetData[] {
  return CARPET_DATABASE.filter(carpet =>
    carpet.colorProfile.pattern.toLowerCase().includes(pattern.toLowerCase())
  );
}

console.log('📊 Simple Carpet Database loaded:', CARPET_DATABASE.length, 'patterns');
