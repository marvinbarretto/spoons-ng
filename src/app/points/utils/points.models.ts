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
  // Raw photo quality value from carpet detection (0-100) for simplified access
  photoQuality?: number;
};

export type CheckInPointsData = {
  pubId: string;
  distanceFromHome: number;
  isFirstVisit: boolean;
  isFirstEver: boolean;
  currentStreak: number;
  carpetConfirmed: boolean;
  sharedSocial: boolean;
  isHomePub: boolean; // Whether this is the user's designated home pub
};
