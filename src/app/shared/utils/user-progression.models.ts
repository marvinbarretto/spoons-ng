// src/app/shared/models/user-progression.model.ts

/**
 * User experience stages based on check-in activity and engagement
 */
export type UserStage =
  | 'guest'        // Not logged in
  | 'brandNew'     // Anonymous user, 0 check-ins - needs onboarding
  | 'firstTime'    // 1-2 check-ins - learning the app
  | 'earlyUser'    // 3-9 check-ins - getting familiar with features
  | 'regularUser'  // 10-24 check-ins - comfortable with core functionality
  | 'explorer'     // 25-49 check-ins OR 10+ unique pubs - engaged user
  | 'powerUser';   // 50+ check-ins - expert level user

/**
 * Milestone information for user progression
 */
export type UserMilestone = {
  target: number;
  type: MilestoneType;
  description: string;
};

/**
 * Types of milestones users can achieve
 */
export type MilestoneType =
  | 'first-checkin'    // First ever check-in
  | 'early-user'       // 3 check-ins milestone
  | 'regular'          // 10 check-ins milestone
  | 'explorer'         // 25 check-ins milestone
  | 'power-user'       // 50 check-ins milestone
  | 'pub-explorer'     // 10 unique pubs milestone
  | 'pub-master'       // 25 unique pubs milestone
  | 'milestone';       // General milestone (25, 50, 75, 100, etc.)

/**
 * User progression statistics
 */
export type UserProgressionStats = {
  stage: UserStage;
  totalCheckins: number;
  uniquePubs: number;
  nextMilestone: UserMilestone;
  checkinsToNextMilestone: number;
  stageMessage: string;
};

/**
 * UI behavior flags based on user stage
 */
export type UserStageUIFlags = {
  shouldShowWelcomeFlow: boolean;
  shouldShowBadges: boolean;
  shouldShowProgressFeatures: boolean;
  shouldShowAdvancedFeatures: boolean;
};

/**
 * Complete user progression context for components
 */
export type UserProgressionContext = UserProgressionStats & UserStageUIFlags;
