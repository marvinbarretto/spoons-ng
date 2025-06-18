export type PointsTransaction = {
  id: string;
  userId: string;
  type: 'check-in' | 'social' | 'streak' | 'achievement';
  action: string;
  points: number;
  breakdown: PointsBreakdown;
  pubId?: string;
  createdAt: Date;
};

export type PointsBreakdown = {
  base: number;
  distance: number;
  bonus: number;
  multiplier: number;
  total: number;
  reason: string;
};

export type CheckInPointsData = {
  pubId: string;
  distanceFromHome: number;
  isFirstVisit: boolean;
  isFirstEver: boolean;
  currentStreak: number;
  hasPhoto: boolean;
  sharedSocial: boolean;
};
