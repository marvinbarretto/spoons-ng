import { AnalysisTheme, PhotoQualityMetrics } from './llm-types';

/**
 * Factory for generating LLM prompts based on analysis themes
 * Supports photo quality assessment and flexible theme-based detection
 */
export class LLMPromptFactory {
  /**
   * Build a comprehensive analysis prompt for a given theme
   */
  static buildAnalysisPrompt(theme: AnalysisTheme): string {
    return `
      Analyze this image for ${theme.description.toLowerCase()}.
      
      DETECTION CRITERIA:
      Primary elements to detect: ${theme.targetElements.join(', ')}
      ${theme.bonusElements ? `Bonus elements (extra points): ${theme.bonusElements.join(', ')}` : ''}
      Minimum confidence required: ${theme.minimumConfidence}%
      
      PHOTO QUALITY ASSESSMENT (Weight: ${Math.round(theme.qualityWeight * 100)}%):
      Evaluate these quality factors:
      - Focus/Sharpness: Is the image clear and in focus?
      - Lighting: Is the lighting adequate and well-balanced?
      - Composition: Is the subject well-framed and clearly visible?
      
      Respond with valid JSON only:
      {
        "detected": true/false,
        "confidence": 0-100,
        "reasoning": "Brief explanation of detection decision",
        "photoQuality": {
          "overall": 0-100,
          "focus": 0-100,
          "lighting": 0-100,
          "composition": 0-100,
          "factors": ["list", "of", "quality", "observations"]
        },
        "themeElements": {
          "found": ["detected", "elements"],
          "missing": ["expected", "but", "missing"],
          "bonus": ["bonus", "elements", "found"]
        },
        "visualElements": ["general", "visual", "observations"],
        "story": ["engaging", "observations", "about", "the", "photo"]
      }
    `;
  }

  /**
   * Build a simplified prompt for backward compatibility with carpet detection
   */
  static buildCarpetPrompt(): string {
    return `
      Analyze this image to determine if it shows a carpet or floor covering.
      
      Also assess the photo quality based on clarity, focus, and lighting.
      Photo quality should reflect how clean and clear the photograph is - fewer distractions, not blurry, well-lit, etc.

      Respond with valid JSON only:
      {
        "isCarpet": true/false,
        "confidence": 0-100,
        "photoQuality": 0-100
      }
    `;
  }

  /**
   * Build a photo quality-only assessment prompt
   */
  static buildQualityAssessmentPrompt(): string {
    return `
      Assess the technical quality of this photograph.
      
      Evaluate these factors:
      - Focus/Sharpness: How clear and sharp is the image?
      - Lighting: How well-lit and balanced is the lighting?
      - Composition: How well-framed and composed is the shot?
      
      Respond with valid JSON only:
      {
        "overall": 0-100,
        "focus": 0-100,
        "lighting": 0-100,
        "composition": 0-100,
        "factors": ["list", "of", "specific", "quality", "observations"]
      }
    `;
  }

  /**
   * Calculate quality bonus points based on photo metrics and theme weight
   */
  static calculateQualityBonus(quality: PhotoQualityMetrics, theme: AnalysisTheme): number {
    const baseBonus = quality.overall * theme.qualityWeight;

    // Additional bonus for exceptional photos (90%+ overall quality)
    const exceptionalBonus = quality.overall >= 90 ? 10 : 0;

    // Bonus for balanced quality (all factors above 70)
    const balancedBonus = [quality.focus, quality.lighting, quality.composition].every(
      factor => factor >= 70
    )
      ? 5
      : 0;

    return Math.round(Math.min(baseBonus + exceptionalBonus + balancedBonus, 100));
  }

  /**
   * Validate theme configuration
   */
  static validateTheme(theme: AnalysisTheme): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!theme.id || theme.id.trim() === '') {
      errors.push('Theme ID is required');
    }

    if (!theme.targetElements || theme.targetElements.length === 0) {
      errors.push('At least one target element is required');
    }

    if (theme.qualityWeight < 0 || theme.qualityWeight > 1) {
      errors.push('Quality weight must be between 0 and 1');
    }

    if (theme.minimumConfidence < 0 || theme.minimumConfidence > 100) {
      errors.push('Minimum confidence must be between 0 and 100');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
