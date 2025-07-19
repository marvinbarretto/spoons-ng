export type LeaderboardPeriod = 'monthly' | 'all-time';

export type LeaderboardEntry = {
  userId: string;
  displayName: string;
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
};

export type LeaderboardSortBy = 'points' | 'pubs' | 'checkins';

export type LeaderboardFilters = {
  sortBy: LeaderboardSortBy;
  period: LeaderboardPeriod;
  showRealUsersOnly: boolean;
};
