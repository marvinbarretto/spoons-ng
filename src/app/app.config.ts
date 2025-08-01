import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideZoneChangeDetection,
  APP_INITIALIZER,
} from '@angular/core';
import { provideRouter, TitleStrategy, withPreloading } from '@angular/router';
import { TELEGRAM_CONFIG } from '@fourfold/angular-foundation';
import { OnboardingAwarePreloadingStrategy } from './shared/strategies/onboarding-aware-preloading.strategy';

import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import player from 'lottie-web';
import { provideCacheableAnimationLoader, provideLottieOptions } from 'ngx-lottie';
import { firebaseProviders } from '../../firebase.config';
import { environment } from '../environments/environment';
import { USER_THEME_TOKEN } from '../libs/tokens/user-theme.token';
import { appRoutes } from './app.routes';
import { AbstractLocationService } from './shared/data-access/abstract-location.service';
import { CapacitorLocationService } from './shared/data-access/capacitor-location.service';
import { PlatformServiceFactory } from './shared/data-access/platform-service-factory';
import { ThemeStore } from './shared/data-access/theme.store';
import { WebLocationService } from './shared/data-access/web-location.service';
import { AbstractCameraService } from './shared/data-access/abstract-camera.service';
import { WebCameraService } from './shared/data-access/web-camera.service';
import { CapacitorCameraService } from './check-in/data-access/capacitor-camera.service';
import { DevCacheBuster } from './shared/utils/dev-cache-buster';
import { TemplatePageTitleStrategy } from './TemplatePageTitleStrategy';

export const appConfig: ApplicationConfig = {
  providers: [
    ...firebaseProviders,
    
    // Platform Services
    PlatformServiceFactory,
    WebLocationService,
    CapacitorLocationService,
    WebCameraService,
    CapacitorCameraService,
    {
      provide: AbstractLocationService,
      useFactory: (factory: PlatformServiceFactory) => {
        console.log('[AppConfig] 🏭 Creating AbstractLocationService via factory...');
        return factory.getLocationService();
      },
      deps: [PlatformServiceFactory]
    },
    {
      provide: AbstractCameraService,
      useFactory: (factory: PlatformServiceFactory) => {
        console.log('[AppConfig] 🏭 Creating AbstractCameraService via factory...');
        return factory.getCameraService();
      },
      deps: [PlatformServiceFactory]
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (factory: PlatformServiceFactory) => () => factory.initialize(),
      deps: [PlatformServiceFactory],
      multi: true
    },
    
    { provide: USER_THEME_TOKEN, useValue: 'light' },
    {
      provide: TELEGRAM_CONFIG,
      useValue: {
        botToken: environment.telegram?.botToken,
        chatId: environment.telegram?.chatId,
      },
    },
    provideLottieOptions({ player: () => player }),
    provideCacheableAnimationLoader(),
    provideAppInitializer(() => {
      inject(ThemeStore);

      // Setup development cache busting tools
      if (isDevMode() || !environment.production) {
        inject(DevCacheBuster).setupDevConsoleShortcuts();
      }
    }),
    provideAppInitializer(async () => {
      // CRITICAL: Initialize Firebase for Capacitor plugins
      const { Capacitor } = await import('@capacitor/core');
      console.log('[AppConfig] [CRITICAL] App initializer called');
      console.log('[AppConfig] [CRITICAL] Platform info:', {
        isNativePlatform: Capacitor.isNativePlatform(),
        platform: Capacitor.getPlatform(),
        isPluginAvailable: Capacitor.isPluginAvailable('FirebaseAuthentication')
      });
      
      if (Capacitor.isNativePlatform()) {
        try {
          console.log('[AppConfig] [CRITICAL] Checking if Capacitor Firebase App is available...');
          // Just check if we can access the plugin - don't initialize manually
          // The plugin should auto-initialize from GoogleService-Info.plist
          console.log('[AppConfig] [CRITICAL] Native platform detected - Firebase should auto-initialize from config files');
        } catch (error) {
          console.error('[AppConfig] [CRITICAL] Error checking Capacitor Firebase availability:', error);
        }
      }
    }),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes, withPreloading(OnboardingAwarePreloadingStrategy)),
    provideHttpClient(withFetch()),
    { provide: 'environment', useValue: environment },
    { provide: TitleStrategy, useClass: TemplatePageTitleStrategy },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
