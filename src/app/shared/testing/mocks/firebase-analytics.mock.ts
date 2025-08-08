import { vi } from 'vitest';
import { signal } from '@angular/core';

/**
 * Centralized Firebase Analytics Mock
 * 
 * This mock provides complete Firebase Analytics functionality for testing,
 * including the missing Analytics interface that was causing test failures.
 * 
 * Features:
 * - Complete Analytics interface mock
 * - Signal-based event tracking for modern Angular patterns
 * - Realistic event logging simulation
 * - Test utilities for event verification
 */

export interface MockAnalyticsEvent {
  name: string;
  parameters?: Record<string, any>;
  timestamp: number;
}

/**
 * Create a comprehensive Firebase Analytics mock
 */
export function createFirebaseAnalyticsMock() {
  const events = signal<MockAnalyticsEvent[]>([]);
  
  // Mock Analytics interface - this was missing and causing the test failures
  const mockAnalytics = {
    app: {
      name: 'test-app',
      options: {}
    },
    _delegate: {},
    _app: {
      name: 'test-app'
    }
  };

  // Mock logEvent function with realistic behavior
  const logEvent = vi.fn().mockImplementation((analytics: any, eventName: string, parameters?: Record<string, any>) => {
    const event: MockAnalyticsEvent = {
      name: eventName,
      parameters: parameters || {},
      timestamp: Date.now()
    };
    
    events.update(current => [...current, event]);
    
    // Simulate network delay in realistic mode
    if (parameters?._realistic) {
      return new Promise(resolve => setTimeout(resolve, 10));
    }
  });

  // Mock getAnalytics function
  const getAnalytics = vi.fn().mockImplementation((app?: any) => {
    return mockAnalytics;
  });

  // Mock isSupported function
  const isSupported = vi.fn().mockImplementation(() => {
    return Promise.resolve(true);
  });

  // Mock Analytics constructor/interface
  const Analytics = vi.fn().mockImplementation(() => mockAnalytics);

  return {
    // Core Firebase Analytics exports (these were missing)
    Analytics,
    logEvent,
    getAnalytics,
    isSupported,
    
    // Additional common exports
    setUserId: vi.fn(),
    setUserProperties: vi.fn(),
    setAnalyticsCollectionEnabled: vi.fn(),
    
    // Test utilities for verification
    _getMockAnalytics: () => mockAnalytics,
    _getEvents: () => events(),
    _getEventsByName: (eventName: string) => events().filter(e => e.name === eventName),
    _getEventCount: () => events().length,
    _getLastEvent: () => {
      const allEvents = events();
      return allEvents[allEvents.length - 1] || null;
    },
    _clearEvents: () => events.set([]),
    _resetMocks: () => {
      events.set([]);
      vi.clearAllMocks();
    },
    
    // Signal-based access for reactive testing
    events: events.asReadonly()
  };
}

/**
 * Pre-configured mock for vi.mock() usage
 */
export const firebaseAnalyticsMock = createFirebaseAnalyticsMock();

/**
 * Default export for vi.mock() auto-hoisting
 */
export default {
  Analytics: firebaseAnalyticsMock.Analytics,
  logEvent: firebaseAnalyticsMock.logEvent,
  getAnalytics: firebaseAnalyticsMock.getAnalytics,
  isSupported: firebaseAnalyticsMock.isSupported,
  setUserId: firebaseAnalyticsMock.setUserId,
  setUserProperties: firebaseAnalyticsMock.setUserProperties,
  setAnalyticsCollectionEnabled: firebaseAnalyticsMock.setAnalyticsCollectionEnabled
};