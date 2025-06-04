/**
 * User tier system for progressive feature unlocking
 */

export type UserTier = 'anonymous' | 'registered' | 'premium';

/**
 * Check user's current tier based on their account status
 * @param user - Current user object
 * @returns User tier level
 */
export function getUserTier(user: any): UserTier {
  if (!user) return 'anonymous';
  if (user.isAnonymous) return 'anonymous';
  if (user.emailVerified) return 'premium';
  return 'registered';
}

/**
 * Feature limits and capabilities by tier
 */
export const TIER_LIMITS = {
  anonymous: {
    maxPubsTracked: 50,           // Let them get hooked first
    leaderboardVisible: true,      // Show them what they're competing for
    canEarnBadges: false,         // Incentive to upgrade
    canCustomizeProfile: false,
    canExportData: false,
    showsInGlobalLeaderboard: false, // They see it but aren't ranked
  },
  registered: {
    maxPubsTracked: Infinity,
    leaderboardVisible: true,
    canEarnBadges: true,
    canCustomizeProfile: true,
    canExportData: true,
    showsInGlobalLeaderboard: true,
  },
  premium: {
    maxPubsTracked: Infinity,
    leaderboardVisible: true,
    canEarnBadges: true,
    canCustomizeProfile: true,
    canExportData: true,
    showsInGlobalLeaderboard: true,
    earlyFeatureAccess: true,
  }
} as const;

/**
 * Get contextual upgrade message based on user's progress
 * @param visitedPubsCount - Number of pubs user has visited
 * @param tier - Current user tier
 * @returns Upgrade message or null if no message needed
 */
export function getUpgradeMessage(visitedPubsCount: number, tier: UserTier): string | null {
  if (tier !== 'anonymous') return null;

  const limit = TIER_LIMITS.anonymous.maxPubsTracked;

  // Early encouragement (75% through limit)
  if (visitedPubsCount >= limit * 0.75) {
    return `You're at ${visitedPubsCount}/${limit} pubs! Sign up to track unlimited pubs and earn badges 🏆`;
  }

  // Competitive hook (30+ pubs shows serious engagement)
  if (visitedPubsCount >= 30) {
    return `${visitedPubsCount} pubs! You're clearly enjoying this. Sign up to compete on the global leaderboard! 🥇`;
  }

  // Achievement unlock tease (15+ pubs shows commitment)
  if (visitedPubsCount >= 15) {
    return `Nice work! Sign up to unlock badges and track your pub-crawling achievements 🏅`;
  }

  return null;
}

/**
 * Check if user can perform a specific action
 * @param tier - User's current tier
 * @param action - Action they want to perform
 * @returns Whether action is allowed
 */
export function canPerformAction(tier: UserTier, action: keyof typeof TIER_LIMITS.anonymous): boolean {
  return TIER_LIMITS[tier][action] as boolean;
}

/**
 * Get user's remaining pub tracking allowance
 * @param visitedPubsCount - Current pub count
 * @param tier - User tier
 * @returns Remaining pubs they can track, or null if unlimited
 */
export function getRemainingPubAllowance(visitedPubsCount: number, tier: UserTier): number | null {
  if (tier !== 'anonymous') return null;

  const limit = TIER_LIMITS.anonymous.maxPubsTracked;
  return Math.max(0, limit - visitedPubsCount);
}
