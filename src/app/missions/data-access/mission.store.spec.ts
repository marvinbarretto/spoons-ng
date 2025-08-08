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
