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

  constructor() {
    console.log('[AnalyticsService] Initialized', {
      analyticsEnabled: !!this.analytics,
      production: environment.production
    });
  }

  // Deep user behavior tracking
  trackCheckIn(pubId: string, isFirstTime: boolean, carpetVerified: boolean, timeSpent?: number) {
    if (!this.analytics) return;
    
    logEvent(this.analytics, 'check_in_completed', {
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
    if (!this.analytics) return;
    
    logEvent(this.analytics, 'user_journey', {
      step,
      timestamp: Date.now()
    });
  }

  // Feature usage with context
  trackFeatureUsage(feature: string, context?: string, timeSpent?: number) {
    if (!this.analytics) return;
    
    logEvent(this.analytics, 'feature_engagement', {
      feature_name: feature,
      context: context || 'unknown',
      time_spent_seconds: timeSpent || 0,
      timestamp: Date.now()
    });
  }

  // Navigation and user flow tracking
  trackNavigation(from: string, to: string, method: 'tap' | 'swipe' | 'back' | 'link') {
    if (!this.analytics) return;
    
    logEvent(this.analytics, 'navigation', {
      from_screen: from,
      to_screen: to,
      navigation_method: method,
      timestamp: Date.now()
    });
  }

  // Discovery behavior insights
  trackPubDiscovery(pubId: string, discoveryMethod: 'search' | 'nearby' | 'map' | 'random' | 'friend_share') {
    if (!this.analytics) return;
    
    logEvent(this.analytics, 'pub_discovery', {
      pub_id: pubId,
      discovery_method: discoveryMethod,
      timestamp: Date.now()
    });
  }

  // Session tracking for engagement analysis
  trackSessionStart() {
    if (!this.analytics) return;
    
    logEvent(this.analytics, 'session_start', {
      timestamp: Date.now()
    });
  }

  trackSessionEnd(duration: number) {
    if (!this.analytics) return;
    
    logEvent(this.analytics, 'session_end', {
      duration_seconds: duration,
      timestamp: Date.now()
    });
  }

  // Social and sharing behavior
  trackSocialAction(action: 'share_checkin' | 'share_badge' | 'view_leaderboard' | 'compare_stats', context?: string) {
    if (!this.analytics) return;
    
    logEvent(this.analytics, 'social_action', {
      action,
      context: context || 'unknown',
      timestamp: Date.now()
    });
  }

  // Habit formation tracking
  trackUsagePattern(pattern: 'daily_streak' | 'weekend_warrior' | 'lunch_checker' | 'evening_crawler', streak?: number) {
    if (!this.analytics) return;
    
    logEvent(this.analytics, 'usage_pattern', {
      pattern,
      streak_count: streak || 0,
      timestamp: Date.now()
    });
  }

  // Time-based behavior analysis
  trackSessionType(type: 'quick_checkin' | 'exploration' | 'social_browsing' | 'data_analysis', duration: number) {
    if (!this.analytics) return;
    
    logEvent(this.analytics, 'session_type', {
      session_type: type,
      duration_seconds: duration,
      hour_of_day: new Date().getHours(),
      day_of_week: new Date().getDay(),
      timestamp: Date.now()
    });
  }

  // Error and friction tracking
  trackUserFriction(frictionType: 'location_denied' | 'camera_failed' | 'slow_loading' | 'network_error', screen: string) {
    if (!this.analytics) return;
    
    logEvent(this.analytics, 'user_friction', {
      friction_type: frictionType,
      screen,
      timestamp: Date.now()
    });
  }
}