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
  totalPoints: number;
  totalCheckins: number;
  lastActive?: string;
  currentStreak?: number;
  positionChange?: number; // +5 means moved up 5 spots, -3 means down 3
};

export type LeaderboardType = 'visits' | 'unique-pubs' | 'points';

export type LeaderboardTimeRange = 'all-time' | 'this-month' | 'this-week';

export type UserStats = {
  userId: string;
  totalVisits: number;
  uniquePubIds: Set<string>;  // Keep as Set during calculation
  firstCheckinDate: string;
};
