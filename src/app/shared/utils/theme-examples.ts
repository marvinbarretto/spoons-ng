import { ANALYSIS_THEMES, AnalysisTheme } from './llm-types';

/**
 * Example theme configurations for different promotions and challenges
 * Demonstrates how to configure the LLM analysis system for various use cases
 */

// Example: Guinness promotion - detect Guinness products for bonus points
export const GUINNESS_PROMO_THEME: AnalysisTheme = {
  id: 'guinness-promo-2024',
  name: 'Guinness Summer Promotion',
  description: 'Detect Guinness beer and promotional items for bonus points',
  targetElements: ['guinness', 'stout', 'pint of guinness', 'black beer', 'dark stout'],
  bonusElements: [
    'guinness tap',
    'guinness glass',
    'guinness logo',
    'promotional material',
    'perfect pour',
    'guinness branded items',
    'shamrock',
    'harp logo',
  ],
  qualityWeight: 0.4, // Higher weight for promotions - clear photos get more bonus
  minimumConfidence: 70, // Higher threshold to ensure accurate detection
};

// Example: Food photography challenge
export const FOOD_CHALLENGE_THEME: AnalysisTheme = {
  id: 'pub-food-challenge',
  name: 'Pub Food Photography Challenge',
  description: 'Capture delicious pub food for the monthly challenge',
  targetElements: [
    'food',
    'meal',
    'plate',
    'pub food',
    'fish and chips',
    'burger',
    'sunday roast',
    'pie',
  ],
  bonusElements: [
    'garnish',
    'presentation',
    'appetizing',
    'well-plated',
    'colorful',
    'fresh ingredients',
    'traditional pub fare',
  ],
  qualityWeight: 0.6, // Very high weight - food photography needs excellent quality
  minimumConfidence: 60,
};

// Example: Historic pub features
export const HISTORIC_PUB_THEME: AnalysisTheme = {
  id: 'historic-features',
  name: 'Historic Pub Features',
  description: 'Document historic and architectural features of traditional pubs',
  targetElements: [
    'historic feature',
    'original beam',
    'fireplace',
    'old signage',
    'traditional bar',
    'period detail',
    'vintage fixture',
  ],
  bonusElements: [
    'tudor beams',
    'inglenook fireplace',
    'carved detail',
    'stained glass',
    'brass fittings',
    'original tiles',
    'period authenticity',
    'heritage feature',
  ],
  qualityWeight: 0.3, // Medium weight - detail matters more than perfect quality
  minimumConfidence: 65,
};

// Example: Christmas/Holiday theme
export const CHRISTMAS_THEME: AnalysisTheme = {
  id: 'christmas-2024',
  name: 'Christmas Pub Decorations',
  description: 'Spot festive Christmas decorations in pubs',
  targetElements: [
    'christmas decoration',
    'festive decoration',
    'christmas tree',
    'holiday decoration',
    'christmas lights',
    'wreath',
    'tinsel',
  ],
  bonusElements: [
    'christmas tree',
    'fairy lights',
    'baubles',
    'garland',
    'holly',
    'mistletoe',
    'santa decoration',
    'reindeer',
    'christmas village',
    'advent calendar',
  ],
  qualityWeight: 0.2, // Lower weight - atmosphere more important than technical quality
  minimumConfidence: 55,
};

// Example: Dog-friendly pub theme
export const DOG_FRIENDLY_THEME: AnalysisTheme = {
  id: 'dog-friendly-pubs',
  name: 'Dog-Friendly Pub Challenge',
  description: 'Find pubs that welcome our four-legged friends',
  targetElements: [
    'dog',
    'pet',
    'dog bowl',
    'pet-friendly sign',
    'dog treats',
    'water bowl for dogs',
  ],
  bonusElements: [
    'happy dog',
    'dog treats',
    'pet menu',
    'dog bed',
    'welcome pets sign',
    'dog-friendly area',
    'multiple dogs',
    'dog toys',
  ],
  qualityWeight: 0.35,
  minimumConfidence: 75, // Higher confidence needed to avoid false positives
};

/**
 * Helper function to get theme by ID
 */
export function getThemeById(themeId: string): AnalysisTheme | undefined {
  // Check built-in themes first
  const builtInTheme = Object.values(ANALYSIS_THEMES).find(theme => theme.id === themeId);
  if (builtInTheme) return builtInTheme;

  // Check example themes
  const exampleThemes = [
    GUINNESS_PROMO_THEME,
    FOOD_CHALLENGE_THEME,
    HISTORIC_PUB_THEME,
    CHRISTMAS_THEME,
    DOG_FRIENDLY_THEME,
  ];

  return exampleThemes.find(theme => theme.id === themeId);
}

/**
 * Example of how to use the themed analysis system in a service
 */
export class ThemeAnalysisExample {
  /**
   * Example: Analyze photo for current Guinness promotion
   */
  static async analyzeForGuinnessPromo(llmService: any, imageData: string) {
    console.log('🍺 Analyzing photo for Guinness promotion...');

    const result = await llmService.analyzePhotoWithTheme(imageData, GUINNESS_PROMO_THEME);

    if (result.success && result.data.detected) {
      const basePoints = 10; // Base points for any Guinness detection
      const qualityBonus = result.data.qualityBonus; // 0-100 based on photo quality
      const bonusElements = result.data.themeElements.bonus.length * 5; // 5 points per bonus element

      const totalPoints = basePoints + qualityBonus + bonusElements;

      console.log(`🎉 Guinness detected! Points: ${totalPoints}`);
      console.log(`  - Base points: ${basePoints}`);
      console.log(`  - Quality bonus: ${qualityBonus}`);
      console.log(
        `  - Bonus elements: ${bonusElements} (${result.data.themeElements.bonus.join(', ')})`
      );

      return {
        detected: true,
        points: totalPoints,
        details: result.data,
      };
    }

    return {
      detected: false,
      points: 0,
      details: result.data,
    };
  }

  /**
   * Example: Dynamic theme selection based on current mission or promotion
   */
  static selectThemeForMission(missionType: string): AnalysisTheme {
    switch (missionType) {
      case 'guinness-promo':
        return GUINNESS_PROMO_THEME;
      case 'food-challenge':
        return FOOD_CHALLENGE_THEME;
      case 'historic-pubs':
        return HISTORIC_PUB_THEME;
      case 'christmas-special':
        return CHRISTMAS_THEME;
      case 'dog-friendly':
        return DOG_FRIENDLY_THEME;
      default:
        return ANALYSIS_THEMES.GENERAL;
    }
  }
}
