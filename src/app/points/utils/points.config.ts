export const POINTS_CONFIG = {
  checkIn: {
    base: 5,
    firstTime: 10,
    firstEver: 25,
    homePub: 3, // Bonus points for checking into your home pub
  },

  distance: {
    pointsPerKm: 0.5,
    maxDistanceBonus: 50,
    minDistance: 0.1,
  },

  social: {
    share: 5,
  },

  carpet: {
    confirmed: 5, // Bonus for LLM-confirmed carpet photos
  },

  photoQuality: {
    highQuality: 10,    // 80-89% overall quality score
    exceptional: 15,    // 90%+ overall quality score
    perfect: 20,        // 95%+ with all factors > 85%
  },

  streaks: {
    daily: {
      "3": 10,
      "7": 25,
      "14": 50,
      "30": 100,
    } as Record<string, number>
  },

  achievements: {
    landlord: 20,
    explorer: 15,
    local: 30,
    homePubLoyalty: 5, // Bonus for frequent visits to home pub
  }
} as const;
