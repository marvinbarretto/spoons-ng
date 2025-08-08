/**
 * Analytics Integration Test
 *
 * This test verifies that our comprehensive Firebase Analytics integration
 * is working correctly across all services and components.
 */
import { TestBed } from '@angular/core/testing';
import { Analytics } from '@angular/fire/analytics';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CheckInService } from '@check-in/data-access/check-in.service';
import { AnalyticsInterceptorService } from './analytics-interceptor.service';
import { AnalyticsService } from './analytics.service';
import { CapacitorLocationService } from './capacitor-location.service';

// Mock Firebase Analytics - just the bare minimum exports needed
vi.mock('@angular/fire/analytics', () => ({
  Analytics: { app: {} }, // This was missing and causing the failure
  logEvent: vi.fn(),
  getAnalytics: () => ({ app: {} }),
  isSupported: () => Promise.resolve(true),
}));

// Mock environment for testing
vi.mock('../../../environments/environment', () => ({
  environment: {
    production: true, // Enable analytics for testing
  },
}));

describe('Analytics Integration', () => {
  let analyticsService: AnalyticsService;
  let analyticsInterceptor: AnalyticsInterceptorService;
  let checkInService: CheckInService;
  let locationService: CapacitorLocationService;
  let router: Router;
  let mockLogEvent: any;
  let mockAnalytics: Analytics;

  beforeEach(async () => {
    // Import the mocked functions
    const { logEvent, getAnalytics } = await import('@angular/fire/analytics');
    mockLogEvent = logEvent as any;
    mockAnalytics = (getAnalytics as any)() as Analytics;

    TestBed.configureTestingModule({
      providers: [
        AnalyticsService,
        AnalyticsInterceptorService,
        { provide: Analytics, useValue: mockAnalytics },
        {
          provide: Router,
          useValue: {
            events: {
              pipe: vi.fn(() => ({
                subscribe: vi.fn(),
              })),
            },
          },
        },
      ],
    });

    analyticsService = TestBed.inject(AnalyticsService);
    analyticsInterceptor = TestBed.inject(AnalyticsInterceptorService);

    // Clear mock calls for clean test isolation
    vi.clearAllMocks();
  });

  describe('AnalyticsService', () => {
    it('should track user check-ins with detailed context', () => {
      analyticsService.trackCheckIn('pub123', true, true, 45);

      expect(mockLogEvent).toHaveBeenCalledWith(mockAnalytics, 'check_in_completed', {
        pub_id: 'pub123',
        is_first_time: true,
        carpet_verified: true,
        time_spent_seconds: 45,
        hour_of_day: expect.any(Number),
        day_of_week: expect.any(Number),
        timestamp: expect.any(Number),
      });
    });

    it('should track location updates with movement context', () => {
      analyticsService.trackLocationUpdate(51.5074, -0.1278, 10, 2.5);

      expect(mockLogEvent).toHaveBeenCalledWith(mockAnalytics, 'location_update', {
        accuracy: 10,
        speed: 2.5,
        movement_context: 'walking',
        time_since_last: expect.any(Number),
        is_moving: false,
        timestamp: expect.any(Number),
      });
    });

    it('should track tap interactions with screen context', () => {
      analyticsService.trackTapEvent('check-in-button', 'button', 'home', { x: 100, y: 200 });

      expect(mockLogEvent).toHaveBeenCalledWith(mockAnalytics, 'tap_interaction', {
        element_id: 'check-in-button',
        element_type: 'button',
        screen: 'home',
        tap_x: 100,
        tap_y: 200,
        session_duration: expect.any(Number),
        is_moving: false,
        timestamp: expect.any(Number),
      });
    });

    it('should track user journey progression', () => {
      analyticsService.trackUserJourney('first_checkin');

      expect(mockLogEvent).toHaveBeenCalledWith(mockAnalytics, 'user_journey', {
        step: 'first_checkin',
        timestamp: expect.any(Number),
      });
    });

    it('should track session analytics', () => {
      analyticsService.trackSessionStart();
      analyticsService.trackSessionEnd(300);

      expect(mockLogEvent).toHaveBeenNthCalledWith(1, mockAnalytics, 'session_start', {
        timestamp: expect.any(Number),
      });

      expect(mockLogEvent).toHaveBeenNthCalledWith(2, mockAnalytics, 'session_end', {
        duration_seconds: 300,
        timestamp: expect.any(Number),
      });
    });

    it('should track user friction points', () => {
      analyticsService.trackUserFriction('location_denied', 'check_in_screen');

      expect(mockLogEvent).toHaveBeenCalledWith(mockAnalytics, 'user_friction', {
        friction_type: 'location_denied',
        screen: 'check_in_screen',
        timestamp: expect.any(Number),
      });
    });

    it('should track performance issues', () => {
      analyticsService.trackPerformanceIssue('slow_load', 'leaderboard', 'high');

      expect(mockLogEvent).toHaveBeenCalledWith(mockAnalytics, 'performance_issue', {
        issue_type: 'slow_load',
        screen: 'leaderboard',
        severity: 'high',
        session_duration: expect.any(Number),
        timestamp: expect.any(Number),
      });
    });

    it('should determine movement context correctly', () => {
      // Stationary
      analyticsService.trackLocationUpdate(51.5074, -0.1278, 10, 0.3);
      expect(mockLogEvent).toHaveBeenLastCalledWith(
        mockAnalytics,
        'location_update',
        expect.objectContaining({ movement_context: 'stationary' })
      );

      // Walking
      analyticsService.trackLocationUpdate(51.5074, -0.1278, 10, 3.0);
      expect(mockLogEvent).toHaveBeenLastCalledWith(
        mockAnalytics,
        'location_update',
        expect.objectContaining({ movement_context: 'walking' })
      );

      // Transport
      analyticsService.trackLocationUpdate(51.5074, -0.1278, 10, 15.0);
      expect(mockLogEvent).toHaveBeenLastCalledWith(
        mockAnalytics,
        'location_update',
        expect.objectContaining({ movement_context: 'transport' })
      );
    });
  });

  describe('AnalyticsInterceptorService', () => {
    it('should initialize global tracking', () => {
      // This would normally set up DOM event listeners
      expect(() => {
        analyticsInterceptor.initializeGlobalTracking();
      }).not.toThrow();
    });

    it('should provide location permission tracking methods', () => {
      analyticsInterceptor.trackLocationPermissionRequest();
      expect(mockLogEvent).toHaveBeenCalledWith(mockAnalytics, 'feature_engagement', {
        feature_name: 'location_permission_request',
        context: expect.any(String),
        time_spent_seconds: 0,
        timestamp: expect.any(Number),
      });

      analyticsInterceptor.trackLocationPermissionResult(true);
      expect(mockLogEvent).toHaveBeenCalledWith(mockAnalytics, 'feature_engagement', {
        feature_name: 'location_permission_granted',
        context: expect.any(String),
        time_spent_seconds: 0,
        timestamp: expect.any(Number),
      });

      analyticsInterceptor.trackLocationPermissionResult(false);
      expect(mockLogEvent).toHaveBeenCalledWith(mockAnalytics, 'user_friction', {
        friction_type: 'location_denied',
        screen: expect.any(String),
        timestamp: expect.any(Number),
      });
    });

    it('should track check-in flow events', () => {
      analyticsInterceptor.trackCheckInFlowStart('pub123');
      expect(mockLogEvent).toHaveBeenCalledWith(mockAnalytics, 'user_flow', {
        flow_name: 'pub_checkin',
        flow_step: 'check_in_start',
        step_duration: 0,
        flow_success: true,
        is_moving: false,
        timestamp: expect.any(Number),
      });

      analyticsInterceptor.trackCheckInFlowComplete('pub123', true, 2500);
      expect(mockLogEvent).toHaveBeenCalledWith(mockAnalytics, 'user_flow', {
        flow_name: 'pub_checkin',
        flow_step: 'check_in_complete',
        step_duration: 2500,
        flow_success: true,
        is_moving: false,
        timestamp: expect.any(Number),
      });
    });
  });

  describe('Integration Test Scenarios', () => {
    it('should track complete check-in user journey', () => {
      // Reset mock call count for this specific test
      mockLogEvent.mockClear();
      // 1. User requests location permission
      analyticsInterceptor.trackLocationPermissionRequest();

      // 2. Permission granted
      analyticsInterceptor.trackLocationPermissionResult(true);

      // 3. Location acquired
      analyticsService.trackLocationUpdate(51.5074, -0.1278, 5, 1.0);

      // 4. Check-in flow starts
      analyticsInterceptor.trackCheckInFlowStart('pub123');

      // 5. Check-in completed successfully
      analyticsService.trackCheckIn('pub123', true, true, 30);

      // 6. Check-in flow completes
      analyticsInterceptor.trackCheckInFlowComplete('pub123', true, 2000);

      // Verify all events were tracked - each step should generate analytics calls
      // Note: Some methods may generate multiple internal logEvent calls
      expect(mockLogEvent).toHaveBeenCalled();
      expect(mockLogEvent.mock.calls.length).toBeGreaterThanOrEqual(6);
    });

    it('should track user friction during check-in failure', () => {
      // 1. Location permission denied
      analyticsInterceptor.trackLocationPermissionResult(false);

      // 2. Check-in flow fails
      analyticsInterceptor.trackCheckInFlowComplete('pub123', false, 1000);

      // Verify friction tracking
      expect(mockLogEvent).toHaveBeenCalledWith(mockAnalytics, 'user_friction', expect.any(Object));
      expect(mockLogEvent).toHaveBeenCalledWith(
        mockAnalytics,
        'user_flow',
        expect.objectContaining({
          flow_success: false,
        })
      );
    });

    it('should track user engagement patterns', () => {
      // Track different types of user engagement
      analyticsService.trackFeatureUsage('leaderboard_view', 'home', 45);
      analyticsService.trackSocialAction('share_checkin', 'profile');
      analyticsService.trackUsagePattern('daily_streak', 5);

      expect(mockLogEvent).toHaveBeenCalledTimes(3);
    });
  });

  describe('Analytics Data Quality', () => {
    it('should include required timestamp in all events', () => {
      analyticsService.trackSessionStart();

      const lastCall = mockLogEvent.mock.calls[mockLogEvent.mock.calls.length - 1];
      const eventData = lastCall[2];

      expect(eventData).toHaveProperty('timestamp');
      expect(typeof eventData.timestamp).toBe('number');
      expect(eventData.timestamp).toBeGreaterThan(Date.now() - 1000); // Recent timestamp
    });

    it('should track contextual information consistently', () => {
      analyticsService.trackTapEvent('button1', 'button', 'home');

      const lastCall = mockLogEvent.mock.calls[mockLogEvent.mock.calls.length - 1];
      const eventData = lastCall[2];

      expect(eventData).toHaveProperty('screen', 'home');
      expect(eventData).toHaveProperty('session_duration');
      expect(eventData).toHaveProperty('is_moving');
    });
  });
});
