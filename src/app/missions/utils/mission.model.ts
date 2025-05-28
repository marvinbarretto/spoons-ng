export type Mission = {
  id: string;
  title: string;
  description: string;
  pubIds: string[]; // pubs included in the mission
  badgeRewardId?: string; // optional
};
