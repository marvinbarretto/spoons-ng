// src/app/shared/models/user-progression.model.ts

import { User } from '@users/utils/user.model';

/**
 * User experience stages based on check-in activity
 */
export type UserExperienceLevel =
  | 'guest' // Not logged in
  | 'brandNew' // Anonymous user, 0 check-ins - needs onboarding
  | 'firstTime' // 1-2 check-ins - learning the app
  | 'earlyUser' // 3-9 check-ins - getting familiar with features
  | 'regularUser' // 10-24 check-ins - comfortable with core functionality
  | 'powerUser'; // 25+ check-ins - expert level user

export const USER_STAGES: UserExperienceLevel[] = [
  'guest',
  'brandNew',
  'firstTime',
  'earlyUser',
  'regularUser',
  'powerUser',
];

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
  | 'first-checkin' // First ever check-in
  | 'early-user' // 3 check-ins milestone
  | 'regular' // 10 check-ins milestone
  | 'power-user' // 25 check-ins milestone
  | 'milestone'; // General milestone (50, 75, 100, etc.)

export const MILESTONES: MilestoneType[] = [
  'first-checkin',
  'early-user',
  'regular',
  'power-user',
  'milestone',
];

export const MILESTONE_TARGETS: Record<MilestoneType, number> = {
  'first-checkin': 1,
  'early-user': 3,
  regular: 10,
  'power-user': 25,
  milestone: 50,
};

/**
 * User progression statistics
 */
export type UserProgressionStats = {
  stage: UserExperienceLevel;
  totalCheckins: number;
  uniquePubs: number;
  nextMilestone: UserMilestone;
  checkinsToNextMilestone: number;
  stageMessage: string;
};

/**
 * UI behavior flags based on user stage
 */
export type UserExperienceLevelUIFlags = {
  shouldShowWelcomeFlow: boolean;
  shouldShowBadges: boolean;
  shouldShowProgressFeatures: boolean;
  shouldShowAdvancedFeatures: boolean;
};

/**
 * Complete user progression context for components
 */
export type UserProgressionContext = UserProgressionStats & UserExperienceLevelUIFlags;

// src/app/shared/models/user-progression.model.ts (additional utilities)

/**
 * ✅ Calculate user stage based on activity
 */
export function getUserExperienceLevel(user: Pick<User, 'isAnonymous'>): UserExperienceLevel {
  if (!user) return 'guest';

  // Simplified - real calculation now done by UserProgressionService
  return user.isAnonymous ? 'brandNew' : 'regularUser';
}

/**
 * ✅ Get comprehensive progression statistics
 */
export function getUserProgressionStats(data: {
  stage: UserExperienceLevel;
  totalCheckins: number;
  uniquePubs: number;
}): UserProgressionStats {
  const { stage, totalCheckins, uniquePubs } = data;

  const nextMilestone = getNextMilestone(totalCheckins, uniquePubs);
  const checkinsToNextMilestone = Math.max(0, nextMilestone.target - totalCheckins);

  return {
    stage,
    totalCheckins,
    uniquePubs,
    nextMilestone,
    checkinsToNextMilestone,
    stageMessage: getStageMessage(stage, totalCheckins, uniquePubs),
  };
}

/**
 * ✅ Get UI behavior flags based on user stage
 */
export function getUserExperienceLevelUIFlags(
  stage: UserExperienceLevel
): UserExperienceLevelUIFlags {
  return {
    shouldShowWelcomeFlow: stage === 'brandNew' || stage === 'firstTime',
    shouldShowBadges: stage !== 'guest' && stage !== 'brandNew',
    shouldShowProgressFeatures: ['regularUser', 'powerUser'].includes(stage),
    shouldShowAdvancedFeatures: stage === 'powerUser',
  };
}

/**
 * ✅ Get next milestone for user
 */
function getNextMilestone(totalCheckins: number, uniquePubs: number): UserMilestone {
  // Check checkin-based milestones
  if (totalCheckins < 1) {
    return {
      target: 1,
      type: 'first-checkin',
      description: 'Complete your first pub check-in',
    };
  }

  if (totalCheckins < 3) {
    return {
      target: 3,
      type: 'early-user',
      description: 'Check in to 3 pubs to become an Early User',
    };
  }

  if (totalCheckins < 10) {
    return {
      target: 10,
      type: 'regular',
      description: 'Check in to 10 pubs to become a Regular',
    };
  }

  if (totalCheckins < 25) {
    return {
      target: 25,
      type: 'power-user',
      description: 'Check in to 25 pubs to become a Power User',
    };
  }

  // For power users, focus on next milestone (50, 75, 100, etc.)
  const nextMilestoneTarget = Math.ceil(totalCheckins / 25) * 25;
  return {
    target: nextMilestoneTarget,
    type: 'milestone',
    description: `Reach ${nextMilestoneTarget} total check-ins`,
  };
}

/**
 * ✅ Get contextual message for user's current stage
 */
function getStageMessage(
  stage: UserExperienceLevel,
  totalCheckins: number,
  uniquePubs: number
): string {
  switch (stage) {
    case 'guest':
      return 'Welcome to the pub crawl adventure!';
    case 'brandNew':
      return 'Ready to start your pub journey?';
    case 'firstTime':
      return `Great start! You've checked into ${totalCheckins} pub${totalCheckins > 1 ? 's' : ''}`;
    case 'earlyUser':
      return `Getting the hang of it! ${totalCheckins} check-ins and counting`;
    case 'regularUser':
      return `Solid progress! ${totalCheckins} check-ins across ${uniquePubs} pubs`;
    case 'powerUser':
      return `Pub crawling master! ${totalCheckins} check-ins across ${uniquePubs} pubs`;
    default:
      return 'Keep exploring new pubs!';
  }
}
