/**
 * Test Data Factories
 * 
 * Clean, typed factories for creating test data
 */

// User test data
export const createTestUser = (overrides: any = {}) => ({
  uid: 'test-user-123',
  displayName: 'Test User',
  email: 'test@example.com',
  photoURL: 'https://example.com/avatar.jpg',
  isAnonymous: false,
  accentColor: '#FF6B35',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

// Pub test data
export const createTestPub = (overrides: any = {}) => ({
  id: 'pub-123',
  name: 'Test Pub',
  address: '123 Test Street, Test City',
  postcode: 'TE5T 1NG',
  latitude: 51.5074,
  longitude: -0.1278,
  region: 'Test Region',
  isOpen: true,
  hasFood: true,
  hasBeer: true,
  carpetPattern: 'test-pattern',
  ...overrides
});

// Check-in test data
export const createTestCheckIn = (overrides: any = {}) => ({
  id: 'checkin-123',
  userId: 'test-user-123',
  pubId: 'pub-123',
  timestamp: new Date().toISOString(),
  dateKey: new Date().toISOString().split('T')[0],
  points: 10,
  carpetImageUrl: 'https://example.com/carpet.jpg',
  carpetAnalysis: {
    pattern: 'geometric',
    colors: ['red', 'blue'],
    confidence: 0.85
  },
  ...overrides
});

// Badge test data
export const createTestBadge = (overrides: any = {}) => ({
  id: 'badge-123',
  name: 'Test Badge',
  description: 'A test badge',
  iconUrl: 'https://example.com/badge.png',
  category: 'achievement',
  rarity: 'common',
  requirements: {
    type: 'checkin',
    count: 5
  },
  ...overrides
});

// Mission test data
export const createTestMission = (overrides: any = {}) => ({
  id: 'mission-123',
  title: 'Test Mission',
  description: 'Complete this test mission',
  type: 'daily',
  difficulty: 'easy',
  pointsReward: 50,
  requirements: {
    action: 'checkin',
    target: 3
  },
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  isActive: true,
  ...overrides
});

// Points transaction test data
export const createTestPointsTransaction = (overrides: any = {}) => ({
  id: 'transaction-123',
  userId: 'test-user-123',
  points: 10,
  type: 'checkin',
  description: 'Points from pub check-in',
  timestamp: new Date().toISOString(),
  metadata: {
    pubId: 'pub-123',
    checkinId: 'checkin-123'
  },
  ...overrides
});

// Feedback test data
export const createTestFeedback = (overrides: any = {}) => ({
  id: 'feedback-123',
  userId: 'test-user-123',
  type: 'suggestion',
  message: 'Test feedback message',
  category: 'feature',
  priority: 'medium',
  status: 'submitted',
  timestamp: new Date().toISOString(),
  ...overrides
});

/**
 * Collection Factories (for testing stores with multiple items)
 */
export const createTestUsers = (count: number = 3) => 
  Array.from({ length: count }, (_, i) => createTestUser({
    uid: `test-user-${i}`,
    displayName: `Test User ${i}`,
    email: `test${i}@example.com`
  }));

export const createTestPubs = (count: number = 5) =>
  Array.from({ length: count }, (_, i) => createTestPub({
    id: `pub-${i}`,
    name: `Test Pub ${i}`,
    postcode: `TE${i}T 1NG`
  }));

export const createTestCheckIns = (count: number = 10) =>
  Array.from({ length: count }, (_, i) => createTestCheckIn({
    id: `checkin-${i}`,
    pubId: `pub-${i % 3}`, // Distribute across 3 pubs
    points: 10 + (i * 2)
  }));

export const createTestBadges = (count: number = 8) =>
  Array.from({ length: count }, (_, i) => createTestBadge({
    id: `badge-${i}`,
    name: `Test Badge ${i}`,
    rarity: i < 2 ? 'rare' : i < 5 ? 'uncommon' : 'common'
  }));

/**
 * Complex Test Scenarios
 */
export const testScenarios = {
  // New user scenario
  newUser: () => ({
    user: createTestUser({ displayName: 'New User' }),
    checkIns: [],
    badges: [],
    points: 0
  }),
  
  // Active user scenario
  activeUser: () => ({
    user: createTestUser({ displayName: 'Active User' }),
    checkIns: createTestCheckIns(25),
    badges: createTestBadges(5),
    points: 340
  }),
  
  // Power user scenario
  powerUser: () => ({
    user: createTestUser({ displayName: 'Power User' }),
    checkIns: createTestCheckIns(100),
    badges: createTestBadges(15),
    points: 1250
  }),
  
  // Empty database scenario
  emptyDatabase: () => ({
    users: [],
    pubs: [],
    checkIns: [],
    badges: []
  }),
  
  // Full database scenario
  fullDatabase: () => ({
    users: createTestUsers(10),
    pubs: createTestPubs(20),
    checkIns: createTestCheckIns(50),
    badges: createTestBadges(12)
  })
};

/**
 * Utility functions for test data manipulation
 */
export const testDataUtils = {
  // Generate unique IDs for testing
  generateId: (prefix: string = 'test') => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  
  // Create date ranges for testing
  createDateRange: (days: number) => ({
    start: new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString(),
    end: new Date().toISOString()
  }),
  
  // Generate random coordinates within UK
  generateUKCoordinates: () => ({
    latitude: 50 + Math.random() * 10, // Rough UK latitude range
    longitude: -6 + Math.random() * 8   // Rough UK longitude range
  })
};