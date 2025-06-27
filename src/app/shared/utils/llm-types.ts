export type LLMRequest = {
  prompt: string;
  image?: string; // base64 data URL
  type?: 'carpet-detection' | 'general';
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
};
