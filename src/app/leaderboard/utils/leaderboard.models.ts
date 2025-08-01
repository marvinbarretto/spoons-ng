export type LeaderboardPeriod = 'monthly' | 'all-time';

export type LeaderboardScope = 'friends' | 'global' | 'regional';

export type LeaderboardEntry = {
  userId: string;
  displayName: string;
  email?: string;
  // All-time stats
  totalPoints: number;
  uniquePubs: number;
  totalCheckins: number;
  // Monthly stats (for current month)
  monthlyPoints: number;
  monthlyPubs: number;
  monthlyCheckins: number;
  // Display properties
  rank: number;
  photoURL?: string | null;
  isCurrentUser?: boolean;
  joinedDate: string;
  lastActive?: string;
  currentStreak?: number;
  // Regional data
  region?: string;
  country?: string;
  isFriend?: boolean;
};

export type LeaderboardSortBy = 'points' | 'pubs' | 'checkins';

export type LeaderboardFilters = {
  scope: LeaderboardScope;
  sortBy: LeaderboardSortBy;
  period: LeaderboardPeriod;
  showRealUsersOnly: boolean;
  selectedRegion?: string;
};
