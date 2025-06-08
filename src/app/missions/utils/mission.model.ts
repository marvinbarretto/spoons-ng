export type Mission = {
  id: string;
  name: string;
  description: string;
  pubIds: string[]; // pubs included in the mission
  badgeRewardId?: string; // optional
};
