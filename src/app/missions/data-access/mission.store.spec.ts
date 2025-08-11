<<<<<<< HEAD
/**
 * @fileoverview Basic Unit Tests for MissionStore
 *
 * SCOPE: Administrative basic testing (~40% coverage)
 * FOCUS: Error prevention and core functionality
 * STRATEGY: Minimal but sufficient coverage for administrative data
 */

import { TestBed } from '@angular/core/testing';
import { useTestSuite } from '@shared/testing/core/mock-registry';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mission } from '../utils/mission.model';
import { MissionService } from './mission.service';
import { MissionStore } from './mission.store';

describe('MissionStore', () => {
  let store: MissionStore;
  let mockMissionService: any;

  // Use centralized mock registry
  const { mocks, cleanup } = useTestSuite('mission-store-tests');

  beforeEach(() => {
    // Create mock service with essential methods
    mockMissionService = {
      getAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [MissionStore, { provide: MissionService, useValue: mockMissionService }],
    });

    store = TestBed.inject(MissionStore);
  });

  afterEach(() => {
    cleanup();
  });

  // ===============================
  // BASIC LOADING FUNCTIONALITY
  // ===============================

  describe('loadOnce()', () => {
    it('should load missions and update signals on success', async () => {
      // Arrange
      const mockMissions: Mission[] = [
        {
          id: 'mission-1',
          name: 'Test Mission',
          description: 'A test mission',
          pubIds: ['pub-1', 'pub-2'],
        },
        {
          id: 'mission-2',
          name: 'Another Mission',
          description: 'Another test mission',
          pubIds: ['pub-3'],
        },
      ];
      mockMissionService.getAll.mockResolvedValue(mockMissions);

      // Act
      await store.loadOnce();

      // Assert
      expect(store.missions()).toEqual(mockMissions);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
      expect(mockMissionService.getAll).toHaveBeenCalledTimes(1);
    });

    it('should not reload if missions already exist (caching behavior)', async () => {
      // Arrange
      const mockMissions: Mission[] = [
        { id: 'mission-1', name: 'Test Mission', description: 'Test', pubIds: [] },
      ];
      mockMissionService.getAll.mockResolvedValue(mockMissions);

      // Load once
      await store.loadOnce();

      // Act - attempt to load again
      await store.loadOnce();

      // Assert - should only call service once due to caching
      expect(mockMissionService.getAll).toHaveBeenCalledTimes(1);
      expect(store.missions()).toEqual(mockMissions);
    });

    it('should set loading state correctly during operation', async () => {
      // Arrange
      mockMissionService.getAll.mockImplementation(() => {
        // Check loading state during async operation
        expect(store.loading()).toBe(true);
        return Promise.resolve([]);
      });

      // Act
      await store.loadOnce();

      // Assert
      expect(store.loading()).toBe(false);
    });
  });

  // ===============================
  // BASIC ERROR HANDLING
  // ===============================

  describe('error handling', () => {
    it('should handle loadOnce() service failures', async () => {
      // Arrange
      const mockError = new Error('Service unavailable');
      mockMissionService.getAll.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      await store.loadOnce();

      // Assert
      expect(store.error()).toBe(mockError);
      expect(store.loading()).toBe(false);
      expect(store.missions()).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('[MissionStore] Failed to load missions', mockError);

      consoleSpy.mockRestore();
    });

    it('should handle create() service failures', async () => {
      // Arrange
      const mockError = new Error('Create failed');
      const mission: Mission = { id: 'test-id', name: 'Test', description: 'Test', pubIds: [] };
      mockMissionService.create.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      await store.create(mission);

      // Assert
      expect(store.error()).toBe(mockError);
      expect(consoleSpy).toHaveBeenCalledWith('[MissionStore] Create failed', mockError);

      consoleSpy.mockRestore();
    });

    it('should handle update() service failures', async () => {
      // Arrange
      const mockError = new Error('Update failed');
      const mission: Mission = { id: 'test-id', name: 'Updated', description: 'Test', pubIds: [] };
      mockMissionService.update.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      await store.update(mission);

      // Assert
      expect(store.error()).toBe(mockError);
      expect(consoleSpy).toHaveBeenCalledWith('[MissionStore] Update failed', mockError);

      consoleSpy.mockRestore();
    });

    it('should handle delete() service failures', async () => {
      // Arrange
      const mockError = new Error('Delete failed');
      mockMissionService.delete.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      await store.delete('test-id');

      // Assert
      expect(store.error()).toBe(mockError);
      expect(consoleSpy).toHaveBeenCalledWith('[MissionStore] Delete failed', mockError);

      consoleSpy.mockRestore();
    });
  });

  // ===============================
  // BASIC CRUD OPERATIONS (Smoke Tests)
  // ===============================

  describe('CRUD operations', () => {
    it('should create mission and update cache on success', async () => {
      // Arrange
      const mission: Mission = {
        id: 'new-mission',
        name: 'New Mission',
        description: 'New mission description',
        pubIds: ['pub-1'],
      };
      mockMissionService.create.mockResolvedValue(undefined);

      // Act
      await store.create(mission);

      // Assert
      expect(mockMissionService.create).toHaveBeenCalledWith('new-mission', mission);
      expect(store.missions()).toContain(mission);
      expect(store.error()).toBeNull();
    });

    it('should update existing mission in cache on success', async () => {
      // Arrange - set initial mission in cache
      const originalMission: Mission = {
        id: 'mission-1',
        name: 'Original',
        description: 'Original',
        pubIds: [],
      };
      const updatedMission: Mission = {
        id: 'mission-1',
        name: 'Updated',
        description: 'Updated',
        pubIds: ['pub-1'],
      };

      // Load initial data
      mockMissionService.getAll.mockResolvedValue([originalMission]);
      await store.loadOnce();

      // Mock update service call
      mockMissionService.update.mockResolvedValue(undefined);

      // Act
      await store.update(updatedMission);

      // Assert
      expect(mockMissionService.update).toHaveBeenCalledWith('mission-1', updatedMission);
      expect(store.missions().find(m => m.id === 'mission-1')).toEqual(updatedMission);
      expect(store.error()).toBeNull();
    });

    it('should delete mission from cache on success', async () => {
      // Arrange - set initial missions in cache
      const missions: Mission[] = [
        { id: 'mission-1', name: 'Mission 1', description: 'Desc 1', pubIds: [] },
        { id: 'mission-2', name: 'Mission 2', description: 'Desc 2', pubIds: [] },
      ];

      // Load initial data
      mockMissionService.getAll.mockResolvedValue(missions);
      await store.loadOnce();

      // Mock delete service call
      mockMissionService.delete.mockResolvedValue(undefined);

      // Act
      await store.delete('mission-1');

      // Assert
      expect(mockMissionService.delete).toHaveBeenCalledWith('mission-1');
      expect(store.missions()).toHaveLength(1);
      expect(store.missions().find(m => m.id === 'mission-1')).toBeUndefined();
      expect(store.missions().find(m => m.id === 'mission-2')).toBeDefined();
      expect(store.error()).toBeNull();
    });
  });

  // ===============================
  // UTILITY FUNCTIONS
  // ===============================

  describe('getMissionById()', () => {
    it('should return mission when found', async () => {
      // Arrange
      const missions: Mission[] = [
        { id: 'mission-1', name: 'Mission 1', description: 'Desc 1', pubIds: [] },
        { id: 'mission-2', name: 'Mission 2', description: 'Desc 2', pubIds: [] },
      ];
      mockMissionService.getAll.mockResolvedValue(missions);
      await store.loadOnce();

      // Act
      const result = store.getMissionById('mission-1');

      // Assert
      expect(result).toEqual(missions[0]);
    });

    it('should return undefined when mission not found', async () => {
      // Arrange
      const missions: Mission[] = [
        { id: 'mission-1', name: 'Mission 1', description: 'Desc 1', pubIds: [] },
      ];
      mockMissionService.getAll.mockResolvedValue(missions);
      await store.loadOnce();

      // Act
      const result = store.getMissionById('nonexistent-id');

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined when no missions loaded', () => {
      // Act
      const result = store.getMissionById('any-id');

      // Assert
      expect(result).toBeUndefined();
    });
  });

  // ===============================
  // SIGNAL STATE VERIFICATION
  // ===============================

  describe('signal state', () => {
    it('should initialize with correct default signal values', () => {
      // Assert
      expect(store.missions()).toEqual([]);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
    });

    it('should maintain signal reactivity after operations', async () => {
      // Arrange
      const mission: Mission = { id: 'test', name: 'Test', description: 'Test', pubIds: [] };
      mockMissionService.create.mockResolvedValue(undefined);

      // Track signal updates
      const missionUpdates: Mission[][] = [];
      store.missions.set = vi.fn().mockImplementation(value => {
        missionUpdates.push([...value]);
      });

      // Act
      await store.create(mission);

      // Assert - signals should update reactively
      expect(store.missions()).toContain(mission);
    });
  });
});
=======
import { TestBed } from '@angular/core/testing';
import { MissionStore } from './mission.store';
import { MissionService } from './mission.service';
import { Mission } from '../utils/mission.model';
import { vi } from 'vitest';
import { waitForEffects } from '@shared/testing';

const MOCK_MISSIONS: Mission[] = [
  {
    id: 'mission1',
    name: 'Historic London',
    description: 'Visit historic pubs in London',
    pubIds: ['pub1', 'pub2'],
    category: 'regional',
    difficulty: 'medium',
    pointsReward: 100,
  },
  {
    id: 'mission2', 
    name: 'Quirky Pubs',
    description: 'Find the weirdest pubs',
    pubIds: ['pub3', 'pub4'],
    category: 'themed',
    subcategory: 'quirky',
    difficulty: 'hard',
    badgeRewardId: 'quirky-badge',
  },
];

describe('MissionStore', () => {
  let store: MissionStore;
  let missionService: vi.Mocked<MissionService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MissionStore,
        {
          provide: MissionService,
          useValue: {
            getAll: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
          },
        },
      ],
    });

    store = TestBed.inject(MissionStore);
    missionService = TestBed.inject(MissionService) as vi.Mocked<MissionService>;
  });

  it('should be created with initial state', () => {
    // ASSERT: Verify initial store state
    expect(store).toBeTruthy();
    expect(store.missions()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBe(null);
  });

  describe('loadOnce', () => {
    it('should load missions from service on first call', async () => {
      // ARRANGE: Set up service mock to return test missions
      missionService.getAll.mockResolvedValue(MOCK_MISSIONS);

      // ACT: Load missions for the first time
      await store.loadOnce();

      // ASSERT: Verify missions were loaded correctly
      expect(missionService.getAll).toHaveBeenCalledTimes(1);
      expect(store.missions()).toEqual(MOCK_MISSIONS);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBe(null);
    });

    it('should not reload missions if already cached', async () => {
      // ARRANGE: Load missions initially
      missionService.getAll.mockResolvedValue(MOCK_MISSIONS);
      await store.loadOnce();
      expect(store.missions()).toHaveLength(2);

      // ACT: Call loadOnce again
      await store.loadOnce();

      // ASSERT: Service should only have been called once
      expect(missionService.getAll).toHaveBeenCalledTimes(1);
      expect(store.missions()).toEqual(MOCK_MISSIONS);
    });

    it('should handle loading states correctly', async () => {
      // ARRANGE: Create a delayed promise to test loading state
      let resolvePromise: (missions: Mission[]) => void;
      const delayedPromise = new Promise<Mission[]>((resolve) => {
        resolvePromise = resolve;
      });
      missionService.getAll.mockReturnValue(delayedPromise);

      // ACT: Start loading (but don't await yet)
      const loadPromise = store.loadOnce();
      await waitForEffects(); // Let loading state update

      // ASSERT: Should be in loading state
      expect(store.loading()).toBe(true);
      expect(store.error()).toBe(null);

      // ACT: Complete the loading
      resolvePromise!(MOCK_MISSIONS);
      await loadPromise;

      // ASSERT: Should exit loading state
      expect(store.loading()).toBe(false);
      expect(store.missions()).toEqual(MOCK_MISSIONS);
    });

    it('should handle service errors gracefully', async () => {
      // ARRANGE: Set up service to throw error
      const error = new Error('Failed to load missions');
      missionService.getAll.mockRejectedValue(error);

      // ACT: Attempt to load missions
      await store.loadOnce();

      // ASSERT: Error should be captured and loading should stop
      expect(store.error()).toBe(error);
      expect(store.loading()).toBe(false);
      expect(store.missions()).toEqual([]); // Should remain empty on error
    });
  });

  describe('create', () => {
    it('should create mission and update local cache', async () => {
      // ARRANGE: Set up new mission data
      const newMission: Mission = {
        id: 'mission3',
        name: 'New Adventure',
        description: 'A new pub mission',
        pubIds: ['pub5', 'pub6'],
        category: 'themed',
        difficulty: 'easy',
      };

      // ARRANGE: Load initial missions
      missionService.getAll.mockResolvedValue(MOCK_MISSIONS);
      await store.loadOnce();

      // ARRANGE: Mock successful creation
      missionService.create.mockResolvedValue();

      // ACT: Create new mission
      await store.create(newMission);

      // ASSERT: Service should be called and cache updated
      expect(missionService.create).toHaveBeenCalledWith('mission3', newMission);
      expect(store.missions()).toHaveLength(3);
      expect(store.missions()).toContain(newMission);
    });

    it('should handle creation errors gracefully', async () => {
      // ARRANGE: Set up error scenario
      const error = new Error('Creation failed');
      const newMission: Mission = {
        id: 'mission3',
        name: 'Failed Mission',
        description: 'This will fail',
        pubIds: ['pub7'],
      };

      missionService.create.mockRejectedValue(error);

      // ACT: Attempt to create mission
      await store.create(newMission);

      // ASSERT: Error should be captured, cache unchanged
      expect(store.error()).toBe(error);
      expect(store.missions()).toEqual([]); // No missions added
    });
  });

  describe('update', () => {
    it('should update mission and sync with cache', async () => {
      // ARRANGE: Load initial missions
      missionService.getAll.mockResolvedValue(MOCK_MISSIONS);
      await store.loadOnce();

      // ARRANGE: Modify existing mission
      const updatedMission: Mission = {
        ...MOCK_MISSIONS[0],
        name: 'Updated Historic London',
        pointsReward: 200, // Changed reward
      };

      missionService.update.mockResolvedValue();

      // ACT: Update the mission
      await store.update(updatedMission);

      // ASSERT: Service called and cache updated
      expect(missionService.update).toHaveBeenCalledWith('mission1', updatedMission);
      
      const cachedMission = store.getMissionById('mission1');
      expect(cachedMission?.name).toBe('Updated Historic London');
      expect(cachedMission?.pointsReward).toBe(200);
      
      // Other missions should remain unchanged
      expect(store.missions()).toHaveLength(2);
      expect(store.getMissionById('mission2')?.name).toBe('Quirky Pubs');
    });

    it('should handle update errors gracefully', async () => {
      // ARRANGE: Load initial missions and set up error
      missionService.getAll.mockResolvedValue(MOCK_MISSIONS);
      await store.loadOnce();

      const error = new Error('Update failed');
      const updatedMission = { ...MOCK_MISSIONS[0], name: 'Failed Update' };
      missionService.update.mockRejectedValue(error);

      // ACT: Attempt to update mission
      await store.update(updatedMission);

      // ASSERT: Error captured, cache unchanged
      expect(store.error()).toBe(error);
      expect(store.getMissionById('mission1')?.name).toBe('Historic London'); // Original name
    });
  });

  describe('delete', () => {
    it('should delete mission and remove from cache', async () => {
      // ARRANGE: Load initial missions
      missionService.getAll.mockResolvedValue(MOCK_MISSIONS);
      await store.loadOnce();
      expect(store.missions()).toHaveLength(2);

      missionService.delete.mockResolvedValue();

      // ACT: Delete a mission
      await store.delete('mission1');

      // ASSERT: Service called and mission removed from cache
      expect(missionService.delete).toHaveBeenCalledWith('mission1');
      expect(store.missions()).toHaveLength(1);
      expect(store.getMissionById('mission1')).toBeUndefined();
      expect(store.getMissionById('mission2')).toBeDefined(); // Other mission remains
    });

    it('should handle deletion errors gracefully', async () => {
      // ARRANGE: Load initial missions and set up error
      missionService.getAll.mockResolvedValue(MOCK_MISSIONS);
      await store.loadOnce();

      const error = new Error('Deletion failed');
      missionService.delete.mockRejectedValue(error);

      // ACT: Attempt to delete mission
      await store.delete('mission1');

      // ASSERT: Error captured, cache unchanged
      expect(store.error()).toBe(error);
      expect(store.missions()).toHaveLength(2); // No missions deleted
      expect(store.getMissionById('mission1')).toBeDefined();
    });
  });

  describe('getMissionById', () => {
    beforeEach(async () => {
      // ARRANGE: Load missions for query tests
      missionService.getAll.mockResolvedValue(MOCK_MISSIONS);
      await store.loadOnce();
    });

    it('should find existing mission by ID', () => {
      // ACT: Look up existing mission
      const mission = store.getMissionById('mission1');

      // ASSERT: Mission should be found
      expect(mission).toBeDefined();
      expect(mission?.name).toBe('Historic London');
      expect(mission?.id).toBe('mission1');
    });

    it('should return undefined for non-existent mission', () => {
      // ACT: Look up non-existent mission
      const mission = store.getMissionById('non-existent');

      // ASSERT: Should return undefined
      expect(mission).toBeUndefined();
    });

    it('should return undefined when no missions are loaded', () => {
      // ARRANGE: Create fresh TestBed configuration with empty store
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          MissionStore,
          {
            provide: MissionService,
            useValue: {
              getAll: vi.fn(),
              create: vi.fn(),
              update: vi.fn(),
              delete: vi.fn(),
            },
          },
        ],
      });
      
      const freshStore = TestBed.inject(MissionStore);

      // ACT: Look up mission in empty store
      const mission = freshStore.getMissionById('mission1');

      // ASSERT: Should return undefined
      expect(mission).toBeUndefined();
    });
  });
});
>>>>>>> feat/store-unit-tests
