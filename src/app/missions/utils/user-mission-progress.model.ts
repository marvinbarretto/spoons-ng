export type UserMissionProgress = {
  id: string; // composite key: userId_missionId
  userId: string;
  missionId: string;
  startedAt: Date;
  completedAt?: Date;
  completedPubIds: string[]; // pubs visited for this mission
  isCompleted: boolean;
  progressPercentage: number; // 0-100
  lastUpdated: Date;
};

export type UserMissionProgressWithMission = UserMissionProgress & {
  mission: import('./mission.model').Mission;
};

export type MissionDisplayData = {
  mission: import('./mission.model').Mission;
  progress?: UserMissionProgress;
  isActive: boolean;
  isCompleted: boolean;
  progressPercentage: number;
  completedCount: number;
  totalCount: number;
};