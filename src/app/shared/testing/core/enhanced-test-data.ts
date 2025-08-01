/**
 * @fileoverview Enhanced Test Data Management
 * 
 * Advanced scenario-based test data factories with realistic relationships,
 * temporal data generation, and complex business logic scenarios.
 * Builds upon existing test-data.ts patterns.
 */

import { 
  createTestUser, 
  createTestPub, 
  createTestCheckIn, 
  createTestBadge, 
  createTestMission,
  testDataUtils
} from '../test-data';

// ===================================
// ENHANCED SCENARIO TYPES
// ===================================

export interface TestScenarioConfig {
  name: string;
  description?: string;
  users: number;
  pubs: number;
  timespan: {
    start: Date;
    end: Date;
  };
  checkInFrequency: 'low' | 'medium' | 'high' | 'custom';
  customCheckInRate?: number; // check-ins per day per user
  includeWeekends?: boolean;
  includeHolidays?: boolean;
  userTypes?: Array<'casual' | 'regular' | 'power' | 'champion'>;
  pubTypes?: Array<'local' | 'chain' | 'tourist' | 'premium'>;
  challenges?: Array<'first_timer' | 'streak' | 'explorer' | 'social'>;
}

export interface RelatedDataSet {
  users: any[];
  pubs: any[];
  checkIns: any[];
  badges: any[];
  missions: any[];
  pointsTransactions: any[];
  userBadges: any[];
  userStats: any[];
}

export interface TemporalPattern {
  pattern: 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'custom';
  peakHours?: number[];
  peakDays?: number[];
  variance?: number; // 0-1, how much randomness
  customDistribution?: Array<{ hour: number; weight: number }>;
}

export interface UserJourneyStep {
  action: 'register' | 'first_checkin' | 'regular_checkin' | 'badge_earned' | 'milestone' | 'inactivity';
  timestamp: Date;
  data: any;
  pointsEarned?: number;
  badgesEarned?: string[];
}

// ===================================
// ENHANCED SCENARIO BUILDER
// ===================================

export class TestScenarioBuilder {
  private config: Partial<TestScenarioConfig> = {};
  private temporalPattern: TemporalPattern = { pattern: 'daily' };
  private relationships: Map<string, string[]> = new Map();

  /**
   * Set basic scenario parameters
   */
  withUsers(count: number): TestScenarioBuilder {
    this.config.users = count;
    return this;
  }

  withPubs(count: number): TestScenarioBuilder {
    this.config.pubs = count;
    return this;
  }

  withTimespan(start: Date, end: Date): TestScenarioBuilder {
    this.config.timespan = { start, end };
    return this;
  }

  withCheckInFrequency(frequency: TestScenarioConfig['checkInFrequency'], customRate?: number): TestScenarioBuilder {
    this.config.checkInFrequency = frequency;
    if (customRate) {
      this.config.customCheckInRate = customRate;
    }
    return this;
  }

  withUserTypes(types: TestScenarioConfig['userTypes']): TestScenarioBuilder {
    this.config.userTypes = types;
    return this;
  }

  withPubTypes(types: TestScenarioConfig['pubTypes']): TestScenarioBuilder {
    this.config.pubTypes = types;
    return this;
  }

  withTemporalPattern(pattern: TemporalPattern): TestScenarioBuilder {
    this.temporalPattern = pattern;
    return this;
  }

  withRelationships(entityType: string, relatedIds: string[]): TestScenarioBuilder {
    this.relationships.set(entityType, relatedIds);
    return this;
  }

  /**
   * Build the complete scenario dataset
   */
  build(scenarioName: string): RelatedDataSet {
    const scenario: TestScenarioConfig = {
      name: scenarioName,
      users: 10,
      pubs: 5,
      timespan: { 
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      },
      checkInFrequency: 'medium',
      includeWeekends: true,
      userTypes: ['casual', 'regular'],
      pubTypes: ['local', 'chain'],
      ...this.config
    };

    return this.generateScenarioData(scenario);
  }

  /**
   * Generate realistic scenario data with relationships
   */
  private generateScenarioData(scenario: TestScenarioConfig): RelatedDataSet {
    console.log(`🏗️  Building test scenario: ${scenario.name}`);

    // Generate base entities
    const users = this.generateUsers(scenario);
    const pubs = this.generatePubs(scenario);
    
    // Generate temporal data
    const checkIns = this.generateCheckIns(scenario, users, pubs);
    const pointsTransactions = this.generatePointsTransactions(checkIns);
    
    // Generate achievements
    const badges = this.generateBadges(scenario);
    const userBadges = this.generateUserBadges(users, badges, checkIns);
    const missions = this.generateMissions(scenario);
    
    // Generate user statistics
    const userStats = this.generateUserStats(users, checkIns, userBadges);

    console.log(`✅ Generated scenario with ${users.length} users, ${pubs.length} pubs, ${checkIns.length} check-ins`);

    return {
      users,
      pubs,
      checkIns,
      badges,
      missions,
      pointsTransactions,
      userBadges,
      userStats
    };
  }

  private generateUsers(scenario: TestScenarioConfig): any[] {
    const userTypes = scenario.userTypes || ['casual', 'regular'];
    
    return Array.from({ length: scenario.users }, (_, i) => {
      const userType = userTypes[i % userTypes.length];
      const baseUser = createTestUser({
        uid: `test-user-${i}`,
        displayName: `${userType.charAt(0).toUpperCase() + userType.slice(1)} User ${i}`,
        email: `${userType}.user${i}@example.com`
      });

      // Add user-type specific properties
      const userTypeProps = this.getUserTypeProperties(userType);
      
      return {
        ...baseUser,
        userType,
        ...userTypeProps,
        registrationDate: this.generateRegistrationDate(scenario.timespan!.start, scenario.timespan!.end)
      };
    });
  }

  private generatePubs(scenario: TestScenarioConfig): any[] {
    const pubTypes = scenario.pubTypes || ['local', 'chain'];
    
    return Array.from({ length: scenario.pubs }, (_, i) => {
      const pubType = pubTypes[i % pubTypes.length];
      const basePub = createTestPub({
        id: `pub-${i}`,
        name: `${pubType.charAt(0).toUpperCase() + pubType.slice(1)} Pub ${i}`,
        postcode: `PUB${i.toString().padStart(2, '0')}`
      });

      const pubTypeProps = this.getPubTypeProperties(pubType);
      const location = testDataUtils.generateUKCoordinates();

      return {
        ...basePub,
        pubType,
        ...pubTypeProps,
        ...location
      };
    });
  }

  private generateCheckIns(scenario: TestScenarioConfig, users: any[], pubs: any[]): any[] {
    const checkIns: any[] = [];
    const checkInRate = this.getCheckInRate(scenario.checkInFrequency!, scenario.customCheckInRate);
    
    users.forEach(user => {
      const userCheckInCount = this.calculateUserCheckIns(user.userType, checkInRate, scenario.timespan!);
      const userCheckIns = this.generateUserCheckIns(user, pubs, userCheckInCount, scenario.timespan!);
      checkIns.push(...userCheckIns);
    });

    return checkIns.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  private generateUserCheckIns(user: any, pubs: any[], count: number, timespan: { start: Date; end: Date }): any[] {
    const checkIns: any[] = [];
    const userPubPreferences = this.getUserPubPreferences(user.userType, pubs);
    
    for (let i = 0; i < count; i++) {
      const pub = this.selectPubForUser(userPubPreferences, user.userType);
      const timestamp = this.generateCheckInTimestamp(timespan, this.temporalPattern);
      const points = this.calculateCheckInPoints(user, pub, checkIns.length);
      
      checkIns.push(createTestCheckIn({
        id: `checkin-${user.uid}-${i}`,
        userId: user.uid,
        pubId: pub.id,
        timestamp: timestamp.toISOString(),
        dateKey: timestamp.toISOString().split('T')[0],
        points,
        isFirstTime: checkIns.length === 0,
        pubName: pub.name,
        pubType: pub.pubType
      }));
    }

    return checkIns;
  }

  private generatePointsTransactions(checkIns: any[]): any[] {
    return checkIns.map(checkIn => ({
      id: `transaction-${checkIn.id}`,
      userId: checkIn.userId,
      points: checkIn.points,
      type: 'checkin',
      description: `Points from ${checkIn.pubName} check-in`,
      timestamp: checkIn.timestamp,
      metadata: {
        pubId: checkIn.pubId,
        checkinId: checkIn.id,
        pubType: checkIn.pubType
      }
    }));
  }

  private generateBadges(scenario: TestScenarioConfig): any[] {
    const badgeTemplates = [
      { name: 'First Timer', description: 'First pub check-in', category: 'milestone', rarity: 'common' },
      { name: 'Regular', description: '10 check-ins', category: 'milestone', rarity: 'common' },
      { name: 'Explorer', description: 'Visit 5 different pubs', category: 'exploration', rarity: 'uncommon' },
      { name: 'Weekender', description: 'Check-in on weekends', category: 'social', rarity: 'uncommon' },
      { name: 'Streak Master', description: '7 days in a row', category: 'dedication', rarity: 'rare' },
      { name: 'Local Legend', description: '50 check-ins', category: 'milestone', rarity: 'rare' },
      { name: 'Pub Champion', description: '100 check-ins', category: 'milestone', rarity: 'legendary' }
    ];

    return badgeTemplates.map((template, i) => createTestBadge({
      id: `badge-${i}`,
      name: template.name,
      description: template.description,
      category: template.category,
      rarity: template.rarity,
      iconUrl: `https://example.com/badges/${template.name.toLowerCase().replace(' ', '-')}.png`
    }));
  }

  private generateUserBadges(users: any[], badges: any[], checkIns: any[]): any[] {
    const userBadges: any[] = [];
    
    users.forEach(user => {
      const userCheckIns = checkIns.filter(c => c.userId === user.uid);
      const earnedBadges = this.calculateEarnedBadges(user, userCheckIns, badges);
      
      earnedBadges.forEach(badge => {
        userBadges.push({
          id: `user-badge-${user.uid}-${badge.id}`,
          userId: user.uid,
          badgeId: badge.id,
          earnedAt: badge.earnedAt,
          badge: badge
        });
      });
    });

    return userBadges;
  }

  private generateMissions(scenario: TestScenarioConfig): any[] {
    const missionTemplates = [
      { title: 'Daily Explorer', description: 'Visit 3 pubs today', type: 'daily', target: 3, points: 50 },
      { title: 'Weekend Warrior', description: 'Check-in 5 times this weekend', type: 'weekend', target: 5, points: 100 },
      { title: 'New Discoveries', description: 'Visit 2 new pubs this week', type: 'weekly', target: 2, points: 75 },
      { title: 'Social Butterfly', description: 'Check-in with friends 3 times', type: 'social', target: 3, points: 80 }
    ];

    return missionTemplates.map((template, i) => ({
      id: `mission-${i}`,
      title: template.title,
      description: template.description,
      type: template.type,
      difficulty: template.target <= 2 ? 'easy' : template.target <= 4 ? 'medium' : 'hard',
      pointsReward: template.points,
      requirements: {
        action: 'checkin',
        target: template.target
      },
      isActive: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }));
  }

  private generateUserStats(users: any[], checkIns: any[], userBadges: any[]): any[] {
    return users.map(user => {
      const userCheckIns = checkIns.filter(c => c.userId === user.uid);
      const uniquePubs = new Set(userCheckIns.map(c => c.pubId)).size;
      const totalPoints = userCheckIns.reduce((sum, c) => sum + c.points, 0);
      const badgeCount = userBadges.filter(ub => ub.userId === user.uid).length;
      
      return {
        userId: user.uid,
        totalCheckIns: userCheckIns.length,
        uniquePubsVisited: uniquePubs,
        totalPoints,
        badgeCount,
        averagePointsPerCheckIn: userCheckIns.length > 0 ? Math.round(totalPoints / userCheckIns.length) : 0,
        firstCheckIn: userCheckIns.length > 0 ? userCheckIns[0].timestamp : null,
        lastCheckIn: userCheckIns.length > 0 ? userCheckIns[userCheckIns.length - 1].timestamp : null,
        checkInStreak: this.calculateStreak(userCheckIns),
        favoriteDay: this.calculateFavoriteDay(userCheckIns),
        userLevel: Math.floor(totalPoints / 100) + 1
      };
    });
  }

  // Helper methods for realistic data generation
  private getUserTypeProperties(userType: string): any {
    const typeProperties = {
      casual: { averageCheckInsPerWeek: 1, preferredTimeSlots: [18, 19, 20] },
      regular: { averageCheckInsPerWeek: 3, preferredTimeSlots: [17, 18, 19, 20, 21] },
      power: { averageCheckInsPerWeek: 8, preferredTimeSlots: [12, 17, 18, 19, 20, 21, 22] },
      champion: { averageCheckInsPerWeek: 15, preferredTimeSlots: Array.from({ length: 12 }, (_, i) => i + 11) }
    };
    return typeProperties[userType as keyof typeof typeProperties] || typeProperties.casual;
  }

  private getPubTypeProperties(pubType: string): any {
    const typeProperties = {
      local: { popularity: 0.6, busyHours: [18, 19, 20, 21], weekendMultiplier: 1.5 },
      chain: { popularity: 0.8, busyHours: [12, 17, 18, 19, 20, 21], weekendMultiplier: 2.0 },
      tourist: { popularity: 0.4, busyHours: [12, 13, 18, 19, 20], weekendMultiplier: 3.0 },
      premium: { popularity: 0.3, busyHours: [19, 20, 21, 22], weekendMultiplier: 1.2 }
    };
    return typeProperties[pubType as keyof typeof typeProperties] || typeProperties.local;
  }

  private getCheckInRate(frequency: string, customRate?: number): number {
    if (customRate) return customRate;
    
    const rates = {
      low: 0.5,    // 0.5 check-ins per day per user
      medium: 1.5, // 1.5 check-ins per day per user
      high: 4.0    // 4 check-ins per day per user
    };
    return rates[frequency as keyof typeof rates] || rates.medium;
  }

  private calculateUserCheckIns(userType: string, baseRate: number, timespan: { start: Date; end: Date }): number {
    const days = Math.ceil((timespan.end.getTime() - timespan.start.getTime()) / (24 * 60 * 60 * 1000));
    const userMultipliers = { casual: 0.5, regular: 1.0, power: 2.0, champion: 4.0 };
    const multiplier = userMultipliers[userType as keyof typeof userMultipliers] || 1.0;
    
    return Math.floor(days * baseRate * multiplier * (0.8 + Math.random() * 0.4)); // Add variance
  }

  private getUserPubPreferences(userType: string, pubs: any[]): any[] {
    // Different user types prefer different pub types
    const preferences = {
      casual: pubs.filter(p => ['local', 'chain'].includes(p.pubType)),
      regular: pubs, // Visit all types
      power: pubs.filter(p => ['local', 'chain', 'premium'].includes(p.pubType)),
      champion: pubs // Visit all types frequently
    };
    
    const filtered = preferences[userType as keyof typeof preferences] || pubs;
    
    // If no preferences match, return all pubs as fallback
    return filtered.length > 0 ? filtered : pubs;
  }

  private selectPubForUser(preferredPubs: any[], userType: string): any {
    if (preferredPubs.length === 0) {
      throw new Error('No preferred pubs available for user');
    }
    
    // Power users and champions explore more, others stick to favorites
    const explorationRate = { casual: 0.3, regular: 0.5, power: 0.7, champion: 0.9 };
    const rate = explorationRate[userType as keyof typeof explorationRate] || 0.5;
    
    if (Math.random() < rate) {
      // Explore new pub
      return preferredPubs[Math.floor(Math.random() * preferredPubs.length)];
    } else {
      // Stick to first few pubs (favorites)
      const favoriteCount = Math.min(3, preferredPubs.length);
      return preferredPubs[Math.floor(Math.random() * favoriteCount)];
    }
  }

  private generateCheckInTimestamp(timespan: { start: Date; end: Date }, pattern: TemporalPattern): Date {
    const totalMs = timespan.end.getTime() - timespan.start.getTime();
    let randomMs = Math.random() * totalMs;
    
    // Apply temporal pattern
    if (pattern.pattern === 'daily' && pattern.peakHours) {
      const date = new Date(timespan.start.getTime() + randomMs);
      const hour = pattern.peakHours[Math.floor(Math.random() * pattern.peakHours.length)];
      date.setHours(hour, Math.floor(Math.random() * 60));
      return date;
    }
    
    return new Date(timespan.start.getTime() + randomMs);
  }

  private generateRegistrationDate(start: Date, end: Date): string {
    // Users register throughout the timespan, but more at the beginning
    const totalMs = end.getTime() - start.getTime();
    const registrationMs = Math.random() * totalMs * 0.7; // Most register in first 70% of timespan
    return new Date(start.getTime() + registrationMs).toISOString();
  }

  private calculateCheckInPoints(user: any, pub: any, checkInNumber: number): number {
    let basePoints = 10;
    
    // First check-in bonus
    if (checkInNumber === 0) basePoints += 40;
    
    // Premium pub bonus
    if (pub && pub.pubType === 'premium') basePoints += 5;
    
    // User type multipliers
    const userMultipliers = { casual: 1.0, regular: 1.1, power: 1.2, champion: 1.3 };
    const multiplier = userMultipliers[user.userType as keyof typeof userMultipliers] || 1.0;
    
    return Math.floor(basePoints * multiplier);
  }

  private calculateEarnedBadges(user: any, checkIns: any[], badges: any[]): any[] {
    const earned: any[] = [];
    const uniquePubs = new Set(checkIns.map(c => c.pubId));
    
    badges.forEach(badge => {
      let earnedAt: Date | null = null;
      
      switch (badge.name) {
        case 'First Timer':
          if (checkIns.length > 0) earnedAt = new Date(checkIns[0].timestamp);
          break;
        case 'Regular':
          if (checkIns.length >= 10) earnedAt = new Date(checkIns[9].timestamp);
          break;
        case 'Explorer':
          if (uniquePubs.size >= 5) {
            const fifthPubCheckIn = checkIns.find((c, i) => {
              const pubsSoFar = new Set(checkIns.slice(0, i + 1).map(ci => ci.pubId));
              return pubsSoFar.size >= 5;
            });
            if (fifthPubCheckIn) earnedAt = new Date(fifthPubCheckIn.timestamp);
          }
          break;
        case 'Local Legend':
          if (checkIns.length >= 50) earnedAt = new Date(checkIns[49].timestamp);
          break;
        case 'Pub Champion':
          if (checkIns.length >= 100) earnedAt = new Date(checkIns[99].timestamp);
          break;
      }
      
      if (earnedAt) {
        earned.push({ ...badge, earnedAt: earnedAt.toISOString() });
      }
    });
    
    return earned;
  }

  private calculateStreak(checkIns: any[]): number {
    if (checkIns.length === 0) return 0;
    
    const dates = checkIns.map(c => c.dateKey).sort();
    const uniqueDates = [...new Set(dates)];
    
    let currentStreak = 1;
    let maxStreak = 1;
    
    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1]);
      const currDate = new Date(uniqueDates[i]);
      const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000));
      
      if (daysDiff === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    
    return maxStreak;
  }

  private calculateFavoriteDay(checkIns: any[]): string {
    if (checkIns.length === 0) return 'None';
    
    const dayCounts = checkIns.reduce((acc, c) => {
      const day = new Date(c.timestamp).getDay();
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
      acc[dayName] = (acc[dayName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(dayCounts).sort(([,a], [,b]) => b - a)[0][0];
  }
}

// ===================================
// USER JOURNEY SIMULATOR
// ===================================

export class UserJourneySimulator {
  private steps: UserJourneyStep[] = [];

  /**
   * Simulate a complete user journey from registration to power user
   */
  simulateUserJourney(userType: 'casual' | 'regular' | 'power' | 'champion', durationDays: number = 30): UserJourneyStep[] {
    const startDate = new Date();
    const journeySteps: UserJourneyStep[] = [];

    // Registration
    journeySteps.push({
      action: 'register',
      timestamp: startDate,
      data: { userType, registrationSource: 'organic' }
    });

    // First check-in (usually within first few days)
    const firstCheckInDate = new Date(startDate.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000);
    journeySteps.push({
      action: 'first_checkin',
      timestamp: firstCheckInDate,
      data: { pubId: 'pub-1', nervousness: 0.8 },
      pointsEarned: 50,
      badgesEarned: ['first-timer']
    });

    // Regular activity based on user type
    const checkInsPerWeek = { casual: 1, regular: 3, power: 8, champion: 15 }[userType];
    const totalCheckIns = Math.floor((durationDays / 7) * checkInsPerWeek);

    for (let i = 1; i < totalCheckIns; i++) {
      const checkInDate = new Date(
        firstCheckInDate.getTime() + 
        (i / totalCheckIns) * durationDays * 24 * 60 * 60 * 1000 +
        Math.random() * 24 * 60 * 60 * 1000 // Add some randomness
      );

      journeySteps.push({
        action: 'regular_checkin',
        timestamp: checkInDate,
        data: { 
          pubId: `pub-${Math.floor(Math.random() * 5) + 1}`,
          confidence: Math.min(0.9, 0.3 + (i / totalCheckIns) * 0.6)
        },
        pointsEarned: 10 + Math.floor(Math.random() * 10)
      });
    }

    // Add milestone achievements
    this.addMilestoneSteps(journeySteps, userType);

    return journeySteps.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private addMilestoneSteps(steps: UserJourneyStep[], userType: string): void {
    const checkInSteps = steps.filter(s => s.action.includes('checkin'));
    
    // 10th check-in milestone
    if (checkInSteps.length >= 10) {
      const tenthCheckIn = checkInSteps[9];
      steps.push({
        action: 'milestone',
        timestamp: new Date(tenthCheckIn.timestamp.getTime() + 1000),
        data: { milestone: 'regular_user', checkInCount: 10 },
        badgesEarned: ['regular']
      });
    }

    // Power user milestones
    if (userType === 'power' || userType === 'champion') {
      if (checkInSteps.length >= 50) {
        const fiftiethCheckIn = checkInSteps[49];
        steps.push({
          action: 'milestone',
          timestamp: new Date(fiftiethCheckIn.timestamp.getTime() + 1000),
          data: { milestone: 'local_legend', checkInCount: 50 },
          badgesEarned: ['local-legend']
        });
      }
    }
  }
}

// ===================================
// CONVENIENCE FUNCTIONS
// ===================================

/**
 * Create scenario builder with fluent API
 */
export function createScenario(): TestScenarioBuilder {
  return new TestScenarioBuilder();
}

/**
 * Generate quick test scenarios
 */
export const TestScenarios = {
  /**
   * New user first week experience
   */
  newUserFirstWeek: () => createScenario()
    .withUsers(1)
    .withPubs(3)
    .withTimespan(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date())
    .withCheckInFrequency('low')
    .withUserTypes(['casual'])
    .withPubTypes(['local'])
    .build('newUserFirstWeek'),

  /**
   * Active community scenario
   */
  activeCommunity: () => createScenario()
    .withUsers(25)
    .withPubs(15)
    .withTimespan(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date())
    .withCheckInFrequency('medium')
    .withUserTypes(['casual', 'regular', 'power'])
    .withPubTypes(['local', 'chain', 'premium'])
    .withTemporalPattern({
      pattern: 'daily',
      peakHours: [18, 19, 20, 21],
      variance: 0.3
    })
    .build('activeCommunity'),

  /**
   * Power user ecosystem
   */
  powerUserEcosystem: () => createScenario()
    .withUsers(5)
    .withPubs(20)
    .withTimespan(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), new Date())
    .withCheckInFrequency('high')
    .withUserTypes(['power', 'champion'])
    .withPubTypes(['local', 'chain', 'tourist', 'premium'])
    .build('powerUserEcosystem'),

  /**
   * Weekend social scenario
   */
  weekendSocial: () => createScenario()
    .withUsers(15)
    .withPubs(8)
    .withTimespan(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
    .withCheckInFrequency('medium')
    .withUserTypes(['casual', 'regular'])
    .withPubTypes(['local', 'chain'])
    .withTemporalPattern({
      pattern: 'weekly',
      peakDays: [5, 6], // Friday, Saturday
      peakHours: [19, 20, 21, 22]
    })
    .build('weekendSocial'),

  /**
   * Testing edge cases
   */
  edgeCases: () => createScenario()
    .withUsers(3)
    .withPubs(50) // Many pubs, few users
    .withTimespan(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date())
    .withCheckInFrequency('custom', 0.1) // Very low activity
    .withUserTypes(['casual'])
    .withPubTypes(['tourist'])
    .build('edgeCases')
};

/**
 * Simulate user journey patterns
 */
export function simulateUserJourney(userType: 'casual' | 'regular' | 'power' | 'champion', durationDays?: number): UserJourneyStep[] {
  const simulator = new UserJourneySimulator();
  return simulator.simulateUserJourney(userType, durationDays);
}

/**
 * Generate realistic test data for integration tests
 */
export function generateIntegrationTestData(scenarioName: keyof typeof TestScenarios): RelatedDataSet {
  return TestScenarios[scenarioName]();
}