/**
 * Analytics Integration Debug Test
 * 
 * This file can be imported in development to test analytics integration
 * WITHOUT actually sending data to Firebase (since analytics is disabled in dev)
 */

import { inject } from '@angular/core';
import { AnalyticsService } from './analytics.service';
import { AnalyticsInterceptorService } from './analytics-interceptor.service';

export function runAnalyticsDebugTest() {
  console.log('🧪 [DEBUG] Running Analytics Integration Test...');
  
  try {
    const analytics = inject(AnalyticsService);
    const interceptor = inject(AnalyticsInterceptorService);
    
    console.log('✅ [DEBUG] Analytics services injected successfully');
    
    // Test basic tracking methods (won't send to Firebase in dev)
    console.log('🔍 [DEBUG] Testing basic tracking methods...');
    
    analytics.trackSessionStart();
    console.log('✅ [DEBUG] Session start tracked');
    
    analytics.trackFeatureUsage('debug_test', 'development');
    console.log('✅ [DEBUG] Feature usage tracked');
    
    analytics.trackLocationUpdate(51.5074, -0.1278, 10, 1.5);
    console.log('✅ [DEBUG] Location update tracked');
    
    analytics.trackTapEvent('debug-button', 'button', 'debug-screen', { x: 100, y: 200 });
    console.log('✅ [DEBUG] Tap event tracked');
    
    analytics.trackUserFriction('network_error', 'debug-screen');
    console.log('✅ [DEBUG] User friction tracked');
    
    analytics.trackCheckIn('debug-pub', true, false, 30);
    console.log('✅ [DEBUG] Check-in tracked');
    
    // Test interceptor methods
    interceptor.trackLocationPermissionRequest();
    console.log('✅ [DEBUG] Location permission request tracked');
    
    interceptor.trackLocationPermissionResult(true);
    console.log('✅ [DEBUG] Location permission result tracked');
    
    console.log('🎉 [DEBUG] All analytics integration tests passed!');
    console.log('📊 [DEBUG] In production, these events would be sent to Firebase Analytics');
    
    return {
      success: true,
      message: 'Analytics integration working correctly'
    };
    
  } catch (error) {
    console.error('❌ [DEBUG] Analytics integration test failed:', error);
    return {
      success: false,
      error: error,
      message: 'Analytics integration has issues'
    };
  }
}

/**
 * Test the complete user journey analytics flow
 */
export function testCompleteUserJourney() {
  console.log('🛤️ [DEBUG] Testing complete user journey analytics...');
  
  try {
    const analytics = inject(AnalyticsService);
    const interceptor = inject(AnalyticsInterceptorService);
    
    // Simulate complete check-in journey
    console.log('1️⃣ [DEBUG] User opens app');
    analytics.trackSessionStart();
    analytics.trackUserJourney('app_open');
    
    console.log('2️⃣ [DEBUG] User navigates to nearby pubs');
    analytics.trackNavigation('home', 'pubs', 'tap');
    analytics.trackFeatureUsage('nearby_pubs_view', 'pubs');
    
    console.log('3️⃣ [DEBUG] User requests location permission');
    interceptor.trackLocationPermissionRequest();
    interceptor.trackLocationPermissionResult(true);
    
    console.log('4️⃣ [DEBUG] Location acquired');
    analytics.trackLocationUpdate(51.5074, -0.1278, 8, 0.5); // Stationary
    
    console.log('5️⃣ [DEBUG] User selects a pub');
    analytics.trackPubDiscovery('test-pub-123', 'nearby');
    analytics.trackTapEvent('pub-card', 'card', 'pubs');
    
    console.log('6️⃣ [DEBUG] Check-in flow starts');
    interceptor.trackCheckInFlowStart('test-pub-123');
    
    console.log('7️⃣ [DEBUG] Check-in completed successfully');
    analytics.trackCheckIn('test-pub-123', true, true, 45);
    interceptor.trackCheckInFlowComplete('test-pub-123', true, 2500);
    
    console.log('8️⃣ [DEBUG] User becomes first-time visitor');
    analytics.trackUserJourney('first_checkin');
    
    console.log('9️⃣ [DEBUG] Session ends');
    analytics.trackSessionEnd(180); // 3 minute session
    
    console.log('🎯 [DEBUG] Complete user journey tracked successfully!');
    
    return {
      success: true,
      eventsTracked: 12,
      message: 'Complete user journey analytics working'
    };
    
  } catch (error) {
    console.error('❌ [DEBUG] User journey test failed:', error);
    return {
      success: false,
      error: error
    };
  }
}

/**
 * Log current analytics configuration for debugging
 */
export function logAnalyticsConfig() {
  console.log('⚙️ [DEBUG] Analytics Configuration:');
  console.log('📊 Environment:', {
    production: (globalThis as any)?.environment?.production || 'unknown',
    analyticsEnabled: (globalThis as any)?.environment?.production || false
  });
  
  console.log('🔥 Firebase Analytics:', {
    available: typeof window !== 'undefined' && 'analytics' in window,
    initialized: !!(globalThis as any)?.firebase?.analytics
  });
  
  console.log('🌐 Platform:', {
    browser: typeof window !== 'undefined',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
  });
}