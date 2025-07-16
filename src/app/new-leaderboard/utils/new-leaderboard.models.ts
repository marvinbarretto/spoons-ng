export type NewLeaderboardEntry = {
  userId: string;
  displayName: string;
  totalPoints: number;
  uniquePubs: number;
  totalCheckins: number;
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
  showRealUsersOnly: boolean;
};