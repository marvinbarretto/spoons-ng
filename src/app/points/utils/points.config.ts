export const POINTS_CONFIG = {
  checkIn: {
    base: 5,
    firstTime: 10,
    firstEver: 25,
    homePub: 3, // Bonus points for checking into your home pub
  },

  distance: {
    pointsPerKm: 2,
    maxDistanceBonus: 50,
    minDistance: 0.1,
  },

  social: {
    share: 5,
    photo: 3,
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
