export type LeaderboardEntry = {
  userId: string;
  displayName: string;
  totalVisits: number;
  uniquePubs: number;
  joinedDate: string;
  rank: number;
  photoURL?: string;
  email?: string;
  realDisplayName?: string;
  isAnonymous?: boolean;
  // Later: totalPoints, badges, streaks, etc.
};

export type LeaderboardType = 'visits' | 'unique-pubs' | 'points';

export type LeaderboardTimeRange = 'all-time' | 'monthly' | 'weekly';

export type UserStats = {
  userId: string;
  totalVisits: number;
  uniquePubIds: Set<string>;  // Keep as Set during calculation
  firstCheckinDate: string;
};
