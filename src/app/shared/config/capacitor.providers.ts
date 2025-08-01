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
  ]);
}

/**
 * Capacitor plugin package names for dynamic imports
 */
export const CAPACITOR_PLUGINS = {
  CORE: '@capacitor/core',
  CAMERA: '@capacitor/camera',
  APP: '@capacitor/app',
  PUSH_NOTIFICATIONS: '@capacitor/push-notifications',
  STATUS_BAR: '@capacitor/status-bar',
  HAPTICS: '@capacitor/haptics',
  GEOLOCATION: '@capacitor/geolocation',
} as const;

export type CapacitorPlugin = (typeof CAPACITOR_PLUGINS)[keyof typeof CAPACITOR_PLUGINS];

/**
 * Platform feature detection utilities
 */
export const PLATFORM_FEATURES = {
  CAMERA: 'Camera',
  GEOLOCATION: 'Geolocation',
  PUSH_NOTIFICATIONS: 'PushNotifications',
  APP_BADGE: 'App',
  STATUS_BAR: 'StatusBar',
  HAPTICS: 'Haptics',
} as const;

export type PlatformFeature = (typeof PLATFORM_FEATURES)[keyof typeof PLATFORM_FEATURES];
