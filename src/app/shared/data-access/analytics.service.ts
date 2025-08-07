import { Injectable, inject } from '@angular/core';
import { Analytics, logEvent, getAnalytics } from '@angular/fire/analytics';
import { environment } from '../../../environments/environment';

export interface UserBehaviorMetrics {
  sessionDuration: number;
  checkInsPerSession: number;
  pubsVisitedPerSession: number;
  featureUsage: Record<string, number>;
  navigationPatterns: Record<string, number>;
  timeOfDayUsage: Record<string, number>;
  dayOfWeekUsage: Record<string, number>;
  locationPatterns: Record<string, number>;
  movementPatterns: Record<string, number>; // stationary vs mobile usage
  tapHeatmap: Record<string, number>; // UI interaction patterns
}

export interface UsageInsights {
  userJourneyFlow: {
    appOpen: number;
    firstCheckIn: number;
    secondCheckIn: number;
    regularUser: number; // 5+ check-ins
    powerUser: number; // 20+ check-ins
  };
  engagementDepth: {
    quickCheckIns: number; // < 30 seconds
    engagedSessions: number; // 1-5 minutes
    deepSessions: number; // 5+ minutes
  };
  discoveryBehavior: {
    exploreNewPubs: number;
    revisitFavorites: number;
    chainExploration: number; // visiting multiple pubs in one session
  };
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private analytics = inject(Analytics, { optional: true });
  private sessionStartTime = Date.now();
  private lastLocationUpdate = Date.now();
  private isUserMoving = false;

  constructor() {
    console.log('[AnalyticsService] Initialized', {
      analyticsEnabled: !!this.analytics,
      production: environment.production
    });
    
    this.initializeSessionTracking();
  }

  private logEventSafely(eventName: string, parameters?: Record<string, any>) {
    if (!this.analytics || this.analytics === null) return;
    
    try {
      logEvent(this.analytics, eventName, parameters);
    } catch (error) {
      console.warn(`[AnalyticsService] Failed to log event '${eventName}':`, error);
    }
  }

  private initializeSessionTracking() {
    if (typeof window !== 'undefined') {
      // Track page visibility changes for session analysis
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.trackSessionPause();
        } else {
          this.trackSessionResume();
        }
      });

      // Track app going to background/foreground
      window.addEventListener('blur', () => this.trackSessionPause());
      window.addEventListener('focus', () => this.trackSessionResume());
    }
  }

  // Deep user behavior tracking
  trackCheckIn(pubId: string, isFirstTime: boolean, carpetVerified: boolean, timeSpent?: number) {
    this.logEventSafely('check_in_completed', {
      pub_id: pubId,
      is_first_time: isFirstTime,
      carpet_verified: carpetVerified,
      time_spent_seconds: timeSpent || 0,
      hour_of_day: new Date().getHours(),
      day_of_week: new Date().getDay(),
      timestamp: Date.now()
    });
  }

  trackUserJourney(step: 'app_open' | 'first_checkin' | 'second_checkin' | 'regular_user' | 'power_user') {
    this.logEventSafely('user_journey', {
      step,
      timestamp: Date.now()
    });
  }

  // Feature usage with context
  trackFeatureUsage(feature: string, context?: string, timeSpent?: number) {
    this.logEventSafely('feature_engagement', {
      feature_name: feature,
      context: context || 'unknown',
      time_spent_seconds: timeSpent || 0,
      timestamp: Date.now()
    });
  }

  // Navigation and user flow tracking
  trackNavigation(from: string, to: string, method: 'tap' | 'swipe' | 'back' | 'link') {
    this.logEventSafely('navigation', {
      from_screen: from,
      to_screen: to,
      navigation_method: method,
      timestamp: Date.now()
    });
  }

  // Discovery behavior insights
  trackPubDiscovery(pubId: string, discoveryMethod: 'search' | 'nearby' | 'map' | 'random' | 'friend_share') {
    this.logEventSafely('pub_discovery', {
      pub_id: pubId,
      discovery_method: discoveryMethod,
      timestamp: Date.now()
    });
  }

  // Session tracking for engagement analysis
  trackSessionStart() {
    this.logEventSafely('session_start', {
      timestamp: Date.now()
    });
  }

  trackSessionEnd(duration: number) {
    this.logEventSafely('session_end', {
      duration_seconds: duration,
      timestamp: Date.now()
    });
  }

  // Social and sharing behavior
  trackSocialAction(action: 'share_checkin' | 'share_badge' | 'view_leaderboard' | 'compare_stats', context?: string) {
    this.logEventSafely('social_action', {
      action,
      context: context || 'unknown',
      timestamp: Date.now()
    });
  }

  // Habit formation tracking
  trackUsagePattern(pattern: 'daily_streak' | 'weekend_warrior' | 'lunch_checker' | 'evening_crawler', streak?: number) {
    this.logEventSafely('usage_pattern', {
      pattern,
      streak_count: streak || 0,
      timestamp: Date.now()
    });
  }

  // Time-based behavior analysis
  trackSessionType(type: 'quick_checkin' | 'exploration' | 'social_browsing' | 'data_analysis', duration: number) {
    this.logEventSafely('session_type', {
      session_type: type,
      duration_seconds: duration,
      hour_of_day: new Date().getHours(),
      day_of_week: new Date().getDay(),
      timestamp: Date.now()
    });
  }

  // Error and friction tracking
  trackUserFriction(
    frictionType: 
      | 'location_denied' 
      | 'camera_failed' 
      | 'slow_loading' 
      | 'network_error'
      | 'check_in_modal_error'
      | 'daily_limit_exceeded'
      | 'proximity_check_failed'
      | 'leaderboard_load_failed'
      | 'check_in_failed'
      | 'location_not_native'
      | 'location_permission_denied'
      | 'location_permission_error', 
    screen: string
  ) {
    this.logEventSafely('user_friction', {
      friction_type: frictionType,
      screen,
      timestamp: Date.now()
    });
  }

  // LOCATION & MOVEMENT TRACKING - Key for "on the move" insights
  trackLocationContext(context: 'stationary' | 'walking' | 'transport' | 'unknown', accuracy?: number) {
    this.isUserMoving = context !== 'stationary';
    
    this.logEventSafely('location_context', {
      movement_type: context,
      location_accuracy: accuracy || 0,
      session_duration: this.getSessionDuration(),
      timestamp: Date.now()
    });
  }

  trackLocationUpdate(latitude: number, longitude: number, accuracy?: number, speed?: number) {
    const timeSinceLastUpdate = Date.now() - this.lastLocationUpdate;
    this.lastLocationUpdate = Date.now();
    
    // Determine movement context from speed/time
    let movementContext: 'stationary' | 'walking' | 'transport' | 'unknown' = 'unknown';
    if (speed !== undefined) {
      if (speed < 0.5) movementContext = 'stationary';
      else if (speed < 5) movementContext = 'walking';  
      else movementContext = 'transport';
    }
    
    this.logEventSafely('location_update', {
      accuracy,
      speed: speed || 0,
      movement_context: movementContext,
      time_since_last: timeSinceLastUpdate,
      is_moving: this.isUserMoving,
      timestamp: Date.now()
    });
  }

  // TAP & INTERACTION HEATMAP
  trackTapEvent(elementId: string, elementType: 'button' | 'link' | 'card' | 'input' | 'icon', screen: string, coordinates?: {x: number, y: number}) {
    this.logEventSafely('tap_interaction', {
      element_id: elementId,
      element_type: elementType,
      screen,
      tap_x: coordinates?.x || 0,
      tap_y: coordinates?.y || 0,
      session_duration: this.getSessionDuration(),
      is_moving: this.isUserMoving,
      timestamp: Date.now()
    });
  }

  // DETAILED SESSION ANALYTICS
  trackSessionPause() {
    this.logEventSafely('session_pause', {
      session_duration: this.getSessionDuration(),
      hour_of_day: new Date().getHours(),
      timestamp: Date.now()
    });
  }

  trackSessionResume() {
    this.logEventSafely('session_resume', {
      session_duration: this.getSessionDuration(),
      hour_of_day: new Date().getHours(),
      timestamp: Date.now()
    });
  }

  // SCREEN TIME & ENGAGEMENT DEPTH
  trackScreenTime(screen: string, timeSpent: number, interactions: number, scrollDepth?: number) {
    this.logEventSafely('screen_engagement', {
      screen,
      time_spent_seconds: timeSpent,
      interaction_count: interactions,
      scroll_depth_percent: scrollDepth || 0,
      engagement_rate: interactions / Math.max(timeSpent / 60, 1), // interactions per minute
      is_moving: this.isUserMoving,
      timestamp: Date.now()
    });
  }

  // USER FLOW & JOURNEY MAPPING
  trackUserFlow(flowStep: string, flowName: string, stepDuration: number, success: boolean) {
    this.logEventSafely('user_flow', {
      flow_name: flowName,
      flow_step: flowStep,
      step_duration: stepDuration,
      flow_success: success,
      is_moving: this.isUserMoving,
      timestamp: Date.now()
    });
  }

  // FEATURE INTEREST TRACKING (what users explore vs ignore)
  trackFeatureInterest(feature: string, interestLevel: 'high' | 'medium' | 'low', timeToEngage?: number) {
    this.logEventSafely('feature_interest', {
      feature,
      interest_level: interestLevel,
      time_to_engage: timeToEngage || 0,
      session_duration: this.getSessionDuration(),
      timestamp: Date.now()
    });
  }

  // PERFORMANCE & FRUSTRATION TRACKING
  trackPerformanceIssue(issueType: 'slow_load' | 'app_crash' | 'ui_lag' | 'data_sync', screen: string, severity: 'low' | 'medium' | 'high') {
    this.logEventSafely('performance_issue', {
      issue_type: issueType,
      screen,
      severity,
      session_duration: this.getSessionDuration(),
      timestamp: Date.now()
    });
  }

  private getSessionDuration(): number {
    return Math.floor((Date.now() - this.sessionStartTime) / 1000);
  }

  // Reset session tracking (call when user starts new session)
  resetSession() {
    this.sessionStartTime = Date.now();
    this.lastLocationUpdate = Date.now();
    this.isUserMoving = false;
  }
}