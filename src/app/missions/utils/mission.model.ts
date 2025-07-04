export type Mission = {
  id: string;
  name: string;
  description: string;
  pubIds: string[]; // pubs included in the mission
  badgeRewardId?: string; // optional
  pointsReward?: number; // optional
  timeLimitHours?: number; // optional
  // Enhanced properties for new mission system
  category?: 'regional' | 'themed';
  subcategory?: 'historical' | 'geographic' | 'quirky' | 'transport' | 'social' | 'completion' | 'dark-political' | 'weird-wonderful';
  difficulty?: 'easy' | 'medium' | 'hard' | 'extreme';
  emoji?: string;
  featured?: boolean;
  country?: string;
  region?: string;
  requiredPubs?: number; // for regional missions
  totalPubs?: number; // for regional missions
};
