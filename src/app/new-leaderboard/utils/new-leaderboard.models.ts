export type LeaderboardPeriod = 'monthly' | 'all-time';

export type NewLeaderboardEntry = {
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

export type NewLeaderboardSortBy = 'points' | 'pubs' | 'checkins';

export type NewLeaderboardFilters = {
  sortBy: NewLeaderboardSortBy;
  period: LeaderboardPeriod;
  showRealUsersOnly: boolean;
};