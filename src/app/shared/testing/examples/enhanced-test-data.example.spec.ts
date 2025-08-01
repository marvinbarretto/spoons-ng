/**
 * @fileoverview Enhanced Test Data Examples
 * 
 * Demonstrates how to use the Enhanced Test Data Management system
 * for creating realistic, scenario-based test data with complex
 * relationships and temporal patterns.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  TestScenarioBuilder,
  UserJourneySimulator,
  createScenario,
  TestScenarios,
  simulateUserJourney,
  generateIntegrationTestData,
  type RelatedDataSet,
  type UserJourneyStep
} from '../core/enhanced-test-data';

describe('Enhanced Test Data Examples', () => {
  describe('Scenario Builder Usage', () => {
    it('should create a custom scenario with specific parameters', () => {
      const scenario = createScenario()
        .withUsers(10)
        .withPubs(5)
        .withTimespan(
          new Date('2024-01-01'),
          new Date('2024-01-31')
        )
        .withCheckInFrequency('medium')
        .withUserTypes(['casual', 'regular'])
        .withPubTypes(['local', 'chain'])
        .withTemporalPattern({
          pattern: 'daily',
          peakHours: [18, 19, 20, 21],
          variance: 0.2
        })
        .build('januaryActivity');

      // Verify basic structure
      expect(scenario.users).toHaveLength(10);
      expect(scenario.pubs).toHaveLength(5);
      expect(scenario.checkIns.length).toBeGreaterThan(0);
      expect(scenario.pointsTransactions.length).toBe(scenario.checkIns.length);

      // Verify user types are applied
      const userTypes = scenario.users.map(u => u.userType);
      expect(userTypes.every(type => ['casual', 'regular'].includes(type))).toBe(true);

      // Verify pub types are applied
      const pubTypes = scenario.pubs.map(p => p.pubType);
      expect(pubTypes.every(type => ['local', 'chain'].includes(type))).toBe(true);

      console.log(`Generated scenario with ${scenario.checkIns.length} check-ins over January 2024`);
    });

    it('should create realistic relationships between entities', () => {
      const scenario = createScenario()
        .withUsers(5)
        .withPubs(3)
        .withTimespan(
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          new Date()
        )
        .withCheckInFrequency('high')
        .withUserTypes(['power'])
        .build('powerUserTest');

      // Verify relationships
      scenario.checkIns.forEach(checkIn => {
        // Check-in should reference valid user and pub
        expect(scenario.users.some(u => u.uid === checkIn.userId)).toBe(true);
        expect(scenario.pubs.some(p => p.id === checkIn.pubId)).toBe(true);
      });

      scenario.pointsTransactions.forEach(transaction => {
        // Points transaction should reference valid check-in
        expect(scenario.checkIns.some(c => c.id === transaction.metadata.checkinId)).toBe(true);
      });

      scenario.userBadges.forEach(userBadge => {
        // User badge should reference valid user and badge
        expect(scenario.users.some(u => u.uid === userBadge.userId)).toBe(true);
        expect(scenario.badges.some(b => b.id === userBadge.badgeId)).toBe(true);
      });

      console.log(`Verified relationships for ${scenario.checkIns.length} check-ins`);
    });

    it('should generate realistic user statistics', () => {
      const scenario = createScenario()
        .withUsers(3)
        .withPubs(5)
        .withTimespan(
          new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          new Date()
        )
        .withCheckInFrequency('medium')
        .withUserTypes(['casual', 'regular', 'power'])
        .build('userStatsTest');

      scenario.userStats.forEach(stats => {
        // Basic validations
        expect(stats.totalCheckIns).toBeGreaterThanOrEqual(0);
        expect(stats.uniquePubsVisited).toBeLessThanOrEqual(scenario.pubs.length);
        expect(stats.totalPoints).toBeGreaterThanOrEqual(0);
        expect(stats.badgeCount).toBeGreaterThanOrEqual(0);
        
        // User level should be based on points
        const expectedLevel = Math.floor(stats.totalPoints / 100) + 1;
        expect(stats.userLevel).toBe(expectedLevel);
        
        // Average points should be realistic
        if (stats.totalCheckIns > 0) {
          expect(stats.averagePointsPerCheckIn).toBeGreaterThan(0);
          expect(stats.averagePointsPerCheckIn).toBeLessThan(100);
        }

        console.log(`User stats: ${stats.totalCheckIns} check-ins, ${stats.totalPoints} points, level ${stats.userLevel}`);
      });
    });
  });

  describe('Predefined Test Scenarios', () => {
    it('should provide realistic new user first week data', () => {
      const scenario = TestScenarios.newUserFirstWeek();

      expect(scenario.users).toHaveLength(1);
      expect(scenario.users[0].userType).toBe('casual');
      expect(scenario.pubs).toHaveLength(3);
      
      // New user should have limited activity
      expect(scenario.checkIns.length).toBeLessThan(10);
      
      // Should have earned first timer badge
      const userBadges = scenario.userBadges.filter(ub => ub.userId === scenario.users[0].uid);
      expect(userBadges.some(ub => ub.badge.name === 'First Timer')).toBe(true);

      console.log(`New user scenario: ${scenario.checkIns.length} check-ins in first week`);
    });

    it('should provide active community scenario', () => {
      const scenario = TestScenarios.activeCommunity();

      expect(scenario.users).toHaveLength(25);
      expect(scenario.pubs).toHaveLength(15);
      
      // Active community should have good activity spread
      const userStats = scenario.userStats;
      const totalCheckIns = userStats.reduce((sum, stats) => sum + stats.totalCheckIns, 0);
      const averageCheckInsPerUser = totalCheckIns / userStats.length;
      
      expect(averageCheckInsPerUser).toBeGreaterThan(5); // At least some activity
      expect(totalCheckIns).toBeGreaterThan(100); // Community-wide activity

      // Should have variety in user levels
      const userLevels = userStats.map(stats => stats.userLevel);
      const uniqueLevels = new Set(userLevels);
      expect(uniqueLevels.size).toBeGreaterThan(1);

      console.log(`Active community: ${totalCheckIns} total check-ins, ${uniqueLevels.size} different user levels`);
    });

    it('should provide power user ecosystem data', () => {
      const scenario = TestScenarios.powerUserEcosystem();

      expect(scenario.users).toHaveLength(5);
      expect(scenario.pubs).toHaveLength(20);
      
      // Power users should have high activity
      scenario.userStats.forEach(stats => {
        expect(stats.totalCheckIns).toBeGreaterThan(50);
        expect(stats.userLevel).toBeGreaterThan(5);
        expect(stats.uniquePubsVisited).toBeGreaterThan(10);
      });

      // Should have high-tier badges
      const badgeNames = scenario.userBadges.map(ub => ub.badge.name);
      expect(badgeNames.includes('Local Legend')).toBe(true);

      console.log(`Power user ecosystem: ${scenario.userStats.map(s => s.totalCheckIns).join(', ')} check-ins per user`);
    });

    it('should handle edge cases scenario', () => {
      const scenario = TestScenarios.edgeCases();

      expect(scenario.users).toHaveLength(3);
      expect(scenario.pubs).toHaveLength(50);
      
      // Low activity scenario
      const totalCheckIns = scenario.userStats.reduce((sum, stats) => sum + stats.totalCheckIns, 0);
      expect(totalCheckIns).toBeLessThan(100); // Very limited activity
      
      // Most pubs should have no visits
      const visitedPubs = new Set(scenario.checkIns.map(c => c.pubId));
      expect(visitedPubs.size).toBeLessThan(scenario.pubs.length / 2);

      console.log(`Edge cases: ${totalCheckIns} check-ins across ${visitedPubs.size}/${scenario.pubs.length} pubs`);
    });
  });

  describe('User Journey Simulation', () => {
    it('should simulate casual user journey', () => {
      const journey = simulateUserJourney('casual', 30);

      // Should start with registration
      expect(journey[0].action).toBe('register');
      expect(journey[0].data.userType).toBe('casual');

      // Should have first check-in within first few steps
      const firstCheckIn = journey.find(step => step.action === 'first_checkin');
      expect(firstCheckIn).toBeDefined();
      expect(firstCheckIn!.pointsEarned).toBeGreaterThan(40); // First timer bonus
      expect(firstCheckIn!.badgesEarned).toContain('first-timer');

      // Casual user should have limited activity
      const checkInSteps = journey.filter(step => step.action.includes('checkin'));
      expect(checkInSteps.length).toBeLessThan(10);

      console.log(`Casual user journey: ${checkInSteps.length} check-ins over 30 days`);
    });

    it('should simulate power user journey', () => {
      const journey = simulateUserJourney('power', 60);

      const checkInSteps = journey.filter(step => step.action.includes('checkin'));
      const milestoneSteps = journey.filter(step => step.action === 'milestone');

      // Power user should have high activity
      expect(checkInSteps.length).toBeGreaterThan(30);

      // Should hit milestones
      expect(milestoneSteps.length).toBeGreaterThan(0);
      const regularMilestone = milestoneSteps.find(step => 
        step.data.milestone === 'regular_user'
      );
      expect(regularMilestone).toBeDefined();

      // Journey should show progression
      const timestamps = journey.map(step => step.timestamp.getTime());
      expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b)); // Chronological order

      console.log(`Power user journey: ${checkInSteps.length} check-ins, ${milestoneSteps.length} milestones`);
    });

    it('should simulate champion user journey with advanced milestones', () => {
      const journey = simulateUserJourney('champion', 120);

      const checkInSteps = journey.filter(step => step.action.includes('checkin'));
      const milestoneSteps = journey.filter(step => step.action === 'milestone');

      // Champion should have very high activity
      expect(checkInSteps.length).toBeGreaterThan(100);

      // Should have multiple milestone achievements
      expect(milestoneSteps.length).toBeGreaterThan(1);
      
      // Should have legend milestone for champions
      const legendMilestone = milestoneSteps.find(step => 
        step.data.milestone === 'local_legend'
      );
      expect(legendMilestone).toBeDefined();

      // Should visit many different pubs
      const uniquePubs = new Set(checkInSteps.map(step => step.data.pubId));
      expect(uniquePubs.size).toBeGreaterThanOrEqual(5);

      console.log(`Champion user journey: ${checkInSteps.length} check-ins across ${uniquePubs.size} pubs`);
    });
  });

  describe('Integration Test Data Generation', () => {
    it('should generate consistent data for store integration tests', () => {
      const scenario = generateIntegrationTestData('activeCommunity');

      // Verify data consistency for store testing
      scenario.users.forEach(user => {
        const userCheckIns = scenario.checkIns.filter(c => c.userId === user.uid);
        const userStats = scenario.userStats.find(s => s.userId === user.uid);
        const userBadges = scenario.userBadges.filter(ub => ub.userId === user.uid);

        // Check-in count consistency
        expect(userStats!.totalCheckIns).toBe(userCheckIns.length);

        // Points calculation consistency
        const calculatedPoints = userCheckIns.reduce((sum, c) => sum + c.points, 0);
        expect(userStats!.totalPoints).toBe(calculatedPoints);

        // Badge count consistency
        expect(userStats!.badgeCount).toBe(userBadges.length);

        // Unique pubs consistency
        const uniquePubsFromCheckIns = new Set(userCheckIns.map(c => c.pubId)).size;
        expect(userStats!.uniquePubsVisited).toBe(uniquePubsFromCheckIns);
      });

      console.log(`Integration test data verified for ${scenario.users.length} users`);
    });

    it('should provide data suitable for DataAggregator testing', () => {
      const scenario = generateIntegrationTestData('powerUserEcosystem');

      // Calculate aggregated stats manually
      const totalUsers = scenario.users.length;
      const totalCheckIns = scenario.checkIns.length;
      const totalPoints = scenario.pointsTransactions.reduce((sum, tx) => sum + tx.points, 0);
      const uniquePubs = new Set(scenario.checkIns.map(c => c.pubId)).size;
      const totalBadges = scenario.userBadges.length;

      // Data should be suitable for aggregation testing
      expect(totalUsers).toBeGreaterThan(0);
      expect(totalCheckIns).toBeGreaterThan(0);
      expect(totalPoints).toBeGreaterThan(0);
      expect(uniquePubs).toBeGreaterThan(0);
      expect(totalBadges).toBeGreaterThan(0);

      // Verify user level distribution for leaderboard testing
      const userLevels = scenario.userStats.map(stats => stats.userLevel);
      const maxLevel = Math.max(...userLevels);
      const minLevel = Math.min(...userLevels);
      
      expect(maxLevel).toBeGreaterThan(minLevel); // Should have level variety
      expect(maxLevel).toBeGreaterThan(10); // Power users should be high level

      console.log(`DataAggregator test data: ${totalCheckIns} check-ins, ${totalPoints} points, levels ${minLevel}-${maxLevel}`);
    });

    it('should provide temporal patterns for SessionService testing', () => {
      const scenario = generateIntegrationTestData('weekendSocial');

      // Check temporal distribution
      const checkInsByDay = scenario.checkIns.reduce((acc, checkIn) => {
        const day = new Date(checkIn.timestamp).getDay();
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      // Weekend scenario should have more Friday/Saturday activity
      const weekendActivity = (checkInsByDay[5] || 0) + (checkInsByDay[6] || 0);
      const weekdayActivity = Object.entries(checkInsByDay)
        .filter(([day]) => ![5, 6].includes(parseInt(day)))
        .reduce((sum, [, count]) => sum + count, 0);

      expect(weekendActivity).toBeGreaterThan(0);
      
      // Time-based testing data
      const checkInHours = scenario.checkIns.map(c => new Date(c.timestamp).getHours());
      const eveningCheckIns = checkInHours.filter(hour => hour >= 18 && hour <= 22).length;
      
      expect(eveningCheckIns).toBeGreaterThan(0); // Social scenario should have evening activity

      console.log(`Temporal patterns: ${weekendActivity} weekend, ${weekdayActivity} weekday, ${eveningCheckIns} evening check-ins`);
    });
  });

  describe('Advanced Scenario Customization', () => {
    it('should support custom temporal patterns', () => {
      const lunchTimePattern = createScenario()
        .withUsers(5)
        .withPubs(3)
        .withTimespan(
          new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          new Date()
        )
        .withCheckInFrequency('medium')
        .withTemporalPattern({
          pattern: 'daily',
          peakHours: [12, 13], // Lunch time
          variance: 0.1
        })
        .build('lunchTimeScenario');

      // Most check-ins should be during lunch hours
      const lunchCheckIns = lunchTimePattern.checkIns.filter(c => {
        const hour = new Date(c.timestamp).getHours();
        return hour >= 12 && hour <= 13;
      });

      const lunchPercentage = lunchCheckIns.length / lunchTimePattern.checkIns.length;
      expect(lunchPercentage).toBeGreaterThan(0.5); // Most should be lunch time

      console.log(`Lunch time pattern: ${lunchPercentage * 100}% of check-ins during lunch hours`);
    });

    it('should support mixed user type scenarios', () => {
      const mixedScenario = createScenario()
        .withUsers(12)
        .withPubs(6)
        .withTimespan(
          new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
          new Date()
        )
        .withCheckInFrequency('medium')
        .withUserTypes(['casual', 'regular', 'power', 'champion'])
        .build('mixedUserTypes');

      // Should have variety in user behavior
      const userTypeDistribution = mixedScenario.users.reduce((acc, user) => {
        acc[user.userType] = (acc[user.userType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(Object.keys(userTypeDistribution).length).toBeGreaterThan(2);

      // Power users should have more activity than casual users
      const casualStats = mixedScenario.userStats.filter(s => 
        mixedScenario.users.find(u => u.uid === s.userId)?.userType === 'casual'
      );
      const powerStats = mixedScenario.userStats.filter(s => 
        mixedScenario.users.find(u => u.uid === s.userId)?.userType === 'power'
      );

      if (casualStats.length > 0 && powerStats.length > 0) {
        const avgCasualCheckIns = casualStats.reduce((sum, s) => sum + s.totalCheckIns, 0) / casualStats.length;
        const avgPowerCheckIns = powerStats.reduce((sum, s) => sum + s.totalCheckIns, 0) / powerStats.length;
        
        expect(avgPowerCheckIns).toBeGreaterThan(avgCasualCheckIns);
      }

      console.log(`Mixed scenario: ${JSON.stringify(userTypeDistribution)} user distribution`);
    });
  });
});