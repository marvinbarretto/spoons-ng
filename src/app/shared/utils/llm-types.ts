export type LLMRequest = {
  prompt: string;
  image?: string; // base64 data URL
  type?: 'carpet-detection' | 'general' | 'themed-analysis';
  theme?: AnalysisTheme;
};

export type LLMResponse<T = any> = {
  success: boolean;
  data: T;
  error?: string;
  tokensUsed?: number;
  cached: boolean;
};

export type CarpetDetectionResult = {
  isCarpet: boolean;
  confidence: number;
  reasoning: string;
  visualElements: string[];
  story?: string[]; // Array of engaging observations about the carpet
  photoQuality?: number; // 0-100 overall photo quality score for clarity/focus/lighting
};

export type PhotoQualityMetrics = {
  overall: number; // 0-100 overall quality score
  focus: number; // 0-100 sharpness/focus quality
  lighting: number; // 0-100 lighting quality
  composition: number; // 0-100 composition quality
  factors: string[]; // Descriptive quality factors
};

export type AnalysisTheme = {
  id: string;
  name: string;
  description: string;
  targetElements: string[]; // What to look for (e.g., ['carpet', 'floor'], ['guinness', 'beer', 'pint'])
  bonusElements?: string[]; // Optional bonus elements for extra points
  qualityWeight: number; // 0-1, how much photo quality affects scoring
  minimumConfidence: number; // 0-100, minimum confidence required
};

export type PhotoAnalysisResult = {
  // Core detection
  detected: boolean;
  confidence: number;
  reasoning: string;

  // Photo quality assessment
  photoQuality: PhotoQualityMetrics;
  qualityBonus: number; // 0-100, bonus points for photo quality

  // Theme-specific data
  themeId: string;
  themeElements: {
    found: string[]; // Elements that were detected
    missing: string[]; // Expected elements that weren't found
    bonus: string[]; // Bonus elements that were found
  };

  // Visual analysis
  visualElements: string[];
  story?: string[]; // Engaging observations

  // Legacy compatibility
  isCarpet?: boolean; // For backward compatibility with carpet detection
};

export type LLMStreamChunk = {
  text: string;
  isComplete: boolean;
  chunkIndex: number;
};

export type LLMStreamResponse<T = any> = {
  success: boolean;
  stream: AsyncIterable<LLMStreamChunk>;
  error?: string;
  cached: boolean;
};

// Predefined analysis themes
export const ANALYSIS_THEMES = {
  CARPET: {
    id: 'carpet',
    name: 'Carpet Detection',
    description: 'Detect pub carpets and floor coverings',
    targetElements: ['carpet', 'rug', 'floor covering', 'mat'],
    bonusElements: ['pattern', 'vintage', 'unique design'],
    qualityWeight: 0.3,
    minimumConfidence: 60,
  } as AnalysisTheme,

  GUINNESS: {
    id: 'guinness',
    name: 'Guinness Promotion',
    description: 'Detect Guinness beer and related promotional items',
    targetElements: ['guinness', 'stout', 'pint', 'black beer'],
    bonusElements: ['guinness tap', 'guinness glass', 'promotional material', 'perfect pour'],
    qualityWeight: 0.4,
    minimumConfidence: 70,
  } as AnalysisTheme,

  GENERAL: {
    id: 'general',
    name: 'General Pub Analysis',
    description: 'General pub photo analysis',
    targetElements: ['pub', 'bar', 'interior'],
    bonusElements: ['historic features', 'unique character', 'atmosphere'],
    qualityWeight: 0.2,
    minimumConfidence: 50,
  } as AnalysisTheme,
} as const;
