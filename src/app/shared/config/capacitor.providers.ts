import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { CapacitorPlatformService } from '@shared/data-access/capacitor-platform.service';

/**
 * Provides Capacitor platform services and configuration
 */
export function provideCapacitor(): EnvironmentProviders {
  return makeEnvironmentProviders([
    CapacitorPlatformService,
    {
      provide: 'CAPACITOR_CONFIG',
      useFactory: () => ({
        // Capacitor configuration options
        backButtonText: 'Back',
        iosScheme: 'spoons',
        androidScheme: 'spoons',
        server: {
          // Configure for dev/production
          androidScheme: 'https',
        },
      }),
    },
    {
      provide: 'PLATFORM_FEATURES',
      useFactory: (capacitorPlatform: CapacitorPlatformService) => ({
        // Platform feature flags
        hasCamera: capacitorPlatform.hasCamera(),
        hasGeolocation: capacitorPlatform.hasGeolocation(),
        hasPushNotifications: capacitorPlatform.hasPushNotifications(),
        hasAppBadge: capacitorPlatform.hasAppBadge(),
        hasStatusBar: capacitorPlatform.hasStatusBar(),
        hasHaptics: capacitorPlatform.hasHaptics(),
        
        // Platform detection flags
        isNative: capacitorPlatform.isNative(),
        isIOS: capacitorPlatform.isIOS(),
        isAndroid: capacitorPlatform.isAndroid(),
        isWeb: capacitorPlatform.isWeb(),
      }),
      deps: [CapacitorPlatformService],
    },
  ]);
}

/**
 * Capacitor feature detection utilities
 */
export const CAPACITOR_FEATURES = {
  CAMERA: 'camera',
  GEOLOCATION: 'geolocation', 
  PUSH_NOTIFICATIONS: 'push-notifications',
  APP_BADGE: 'app-badge',
  STATUS_BAR: 'status-bar',
  HAPTICS: 'haptics',
} as const;

export type CapacitorFeature = typeof CAPACITOR_FEATURES[keyof typeof CAPACITOR_FEATURES];