import { Injectable, inject, Renderer2, RendererFactory2 } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { DebugService } from '@shared/utils/debug.service';
import { AnalyticsService } from './analytics.service';

/**
 * Global Analytics Interceptor
 * Automatically tracks user interactions, navigation, and engagement patterns
 */
@Injectable({
  providedIn: 'root'
})
export class AnalyticsInterceptorService {
  private analytics = inject(AnalyticsService);
  private router = inject(Router);
  private rendererFactory = inject(RendererFactory2);
  private renderer = this.rendererFactory.createRenderer(null, null);
  private debug = inject(DebugService);
  
  private currentScreen = '';
  private screenStartTime = Date.now();
  private screenInteractions = 0;
  private isSetup = false;

  initializeGlobalTracking() {
    if (this.isSetup) return;
    this.isSetup = true;

    this.debug.standard('[AnalyticsInterceptor] 📊 Initializing global user behavior tracking');

    // Track navigation between screens
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.trackScreenChange(event.url);
    });

    // Set up global click/tap tracking
    this.setupGlobalTapTracking();
    
    // Track session start
    this.analytics.trackSessionStart();
  }

  private trackScreenChange(url: string) {
    const previousScreen = this.currentScreen;
    const timeOnPreviousScreen = Date.now() - this.screenStartTime;

    // Track time spent on previous screen
    if (previousScreen && timeOnPreviousScreen > 1000) { // Only track if > 1 second
      this.analytics.trackScreenTime(
        previousScreen,
        Math.floor(timeOnPreviousScreen / 1000),
        this.screenInteractions
      );
    }

    // Update current screen tracking
    this.currentScreen = this.getScreenName(url);
    this.screenStartTime = Date.now();
    this.screenInteractions = 0;

    // Track navigation
    if (previousScreen) {
      this.analytics.trackNavigation(previousScreen, this.currentScreen, 'tap');
    }

    this.debug.standard(`[AnalyticsInterceptor] 📱 Screen change: ${previousScreen} → ${this.currentScreen}`);
  }

  private getScreenName(url: string): string {
    // Convert URL to readable screen name
    if (url === '/' || url === '/home') return 'home';
    if (url.includes('/profile')) return 'profile';
    if (url.includes('/leaderboard')) return 'leaderboard';
    if (url.includes('/pubs')) return 'pubs';
    if (url.includes('/check-in')) return 'checkin';
    if (url.includes('/admin')) return 'admin';
    if (url.includes('/auth')) return 'auth';
    if (url.includes('/settings')) return 'settings';
    
    // Extract main section for unknown URLs
    const segments = url.split('/').filter(s => s.length > 0);
    return segments[0] || 'unknown';
  }

  private setupGlobalTapTracking() {
    if (typeof document === 'undefined') return;

    // Track all clicks/taps globally
    this.renderer.listen('document', 'click', (event: MouseEvent) => {
      this.handleTapEvent(event);
    });

    // Track touch events for mobile
    this.renderer.listen('document', 'touchstart', (event: TouchEvent) => {
      if (event.touches.length === 1) {
        const touch = event.touches[0];
        this.handleTouchEvent(touch, event.target as Element);
      }
    });
  }

  private handleTapEvent(event: MouseEvent) {
    const target = event.target as Element;
    const elementInfo = this.getElementInfo(target);
    
    this.debug.extreme(`[AnalyticsInterceptor] 👆 Tap detected:`, elementInfo);
    
    this.screenInteractions++;
    
    this.analytics.trackTapEvent(
      elementInfo.id,
      elementInfo.type,
      this.currentScreen,
      { x: event.clientX, y: event.clientY }
    );

    // Track specific feature interest based on what was tapped
    this.trackFeatureInteractionIntent(target);
  }

  private handleTouchEvent(touch: Touch, target: Element) {
    const elementInfo = this.getElementInfo(target);
    
    this.screenInteractions++;
    
    this.analytics.trackTapEvent(
      elementInfo.id,
      elementInfo.type,
      this.currentScreen,
      { x: touch.clientX, y: touch.clientY }
    );

    this.trackFeatureInteractionIntent(target);
  }

  private getElementInfo(element: Element): { id: string, type: 'button' | 'link' | 'card' | 'input' | 'icon' } {
    // Get meaningful element identifier
    const id = element.id || 
              element.getAttribute('data-testid') || 
              element.className.split(' ')[0] ||
              element.tagName.toLowerCase();

    // Determine element type
    let type: 'button' | 'link' | 'card' | 'input' | 'icon' = 'button';
    
    if (element.tagName === 'A' || element.closest('a')) type = 'link';
    else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') type = 'input';
    else if (element.classList.contains('card') || element.closest('.card')) type = 'card';
    else if (element.classList.contains('icon') || element.tagName === 'I') type = 'icon';
    
    return { id: id.substring(0, 50), type }; // Limit ID length for analytics
  }

  private trackFeatureInteractionIntent(target: Element) {
    const element = target.closest('[data-feature]') as HTMLElement;
    if (!element) return;

    const feature = element.dataset['feature'];
    if (feature) {
      this.analytics.trackFeatureInterest(feature, 'high', 0);
    }

    // Track specific UI patterns that indicate user intent
    if (target.closest('.leaderboard')) {
      this.analytics.trackSocialAction('view_leaderboard', this.currentScreen);
    }
    
    if (target.closest('.check-in-button')) {
      this.analytics.trackFeatureUsage('check_in_attempt', this.currentScreen);
    }

    if (target.closest('.share-button')) {
      this.analytics.trackSocialAction('share_checkin', this.currentScreen);
    }
  }

  // Call this when user does location-related actions
  trackLocationPermissionRequest() {
    this.analytics.trackFeatureUsage('location_permission_request', this.currentScreen);
  }

  trackLocationPermissionResult(granted: boolean) {
    if (granted) {
      this.analytics.trackFeatureUsage('location_permission_granted', this.currentScreen);
    } else {
      this.analytics.trackUserFriction('location_denied', this.currentScreen);
    }
  }

  // Call this when user performs check-in attempts
  trackCheckInFlowStart(pubId: string) {
    this.analytics.trackUserFlow('check_in_start', 'pub_checkin', 0, true);
    this.analytics.trackPubDiscovery(pubId, 'nearby'); // Adjust method as needed
  }

  trackCheckInFlowComplete(pubId: string, success: boolean, duration: number) {
    this.analytics.trackUserFlow('check_in_complete', 'pub_checkin', duration, success);
    
    if (success) {
      this.analytics.trackFeatureUsage('check_in_success', this.currentScreen, duration);
    } else {
      this.analytics.trackUserFriction('check_in_failed', this.currentScreen);
    }
  }

  // Performance tracking helpers
  trackLoadingTime(screen: string, loadTime: number) {
    if (loadTime > 3000) { // > 3 seconds is slow
      this.analytics.trackPerformanceIssue('slow_load', screen, 'high');
    } else if (loadTime > 1500) {
      this.analytics.trackPerformanceIssue('slow_load', screen, 'medium');
    }
  }
}