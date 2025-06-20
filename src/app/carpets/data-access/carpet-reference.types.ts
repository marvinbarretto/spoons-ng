// src/app/carpets/data-access/carpet-reference.types.ts

export type ReferenceImageData = {
  id: string;
  name: string;
  colorProfile: {
    dominant: string[];
    variance: number;
    brightness: number;
    pattern: 'geometric' | 'ornamental' | 'plain' | 'mixed';
  };
  textureProfile: {
    contrast: number;
    edgeDensity: number;
    repetitionScore: number;
    patternType: 'geometric' | 'ornamental' | 'plain' | 'mixed';
  };
  geometricFeatures: {
    hasSquares: boolean;
    hasCircles: boolean;
    hasOrnamental: boolean;
    dominantShape: string;
    repetitionScore: number;
  };
  rawImageData?: string; // Base64 for debugging
};

export type CapturedFeatures = {
  colorProfile: {
    dominant: string[];
    variance: number;
    brightness: number;
    pattern: string;
  };
  textureProfile: {
    contrast: number;
    edgeDensity: number;
    repetitionScore: number;
    patternType: string;
  };
  geometricFeatures: {
    hasSquares: boolean;
    hasCircles: boolean;
    hasOrnamental: boolean;
    dominantShape: string;
    repetitionScore: number;
  };
};

export type MatchResult = {
  referenceId: string;
  referenceName: string;
  confidence: number;
  isMatch: boolean;
  colorSimilarity: number;
  textureSimilarity: number;
  geometricSimilarity: number;
  reasoning: string[];
};
