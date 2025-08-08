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
// Lottie removed - not used in production yet
import { firebaseProviders } from '../../firebase.config';
import { environment } from '../environments/environment';
import { USER_THEME_TOKEN } from '../libs/tokens/user-theme.token';
import { appRoutes } from './app.routes';
import { AbstractLocationService } from './shared/data-access/abstract-location.service';
import { CapacitorLocationService } from './shared/data-access/capacitor-location.service';
import { PlatformServiceFactory } from './shared/data-access/platform-service-factory';
import { ThemeStore } from './shared/data-access/theme.store';
import { WebLocationService } from './shared/data-access/web-location.service';
import { DevCacheBuster } from './shared/utils/dev-cache-buster';
import { TemplatePageTitleStrategy } from './TemplatePageTitleStrategy';
import { MobileInitializationService } from './shared/data-access/mobile/mobile-initialization.service';
import { MobileLocationOptimizer } from './shared/data-access/mobile/mobile-location-optimizer.service';

export const appConfig: ApplicationConfig = {
  providers: [
    ...firebaseProviders,
    
    // Platform Services
    PlatformServiceFactory,
    WebLocationService,
    CapacitorLocationService,
    
    // Mobile Optimization Services
    MobileInitializationService,
    MobileLocationOptimizer,
    {
      provide: AbstractLocationService,
      useFactory: (factory: PlatformServiceFactory) => {
        console.log('[AppConfig] 🏭 Creating AbstractLocationService via factory...');
        return factory.getLocationService();
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
    // Lottie providers removed - not needed for production
    provideAppInitializer(() => {
      inject(ThemeStore);

      // Setup development cache busting tools
      if (isDevMode() || !environment.production) {
        inject(DevCacheBuster).setupDevConsoleShortcuts();
      }
    }),
    provideAppInitializer(async () => {
      // MOBILE OPTIMIZATION: Initialize mobile-specific optimizations
      // Only runs on native platforms (Android/iOS), graceful on web
      console.log('[AppConfig] 📱 Starting mobile initialization...');
      
      const mobileInit = inject(MobileInitializationService);
      console.log('[AppConfig] 📱 MobileInitializationService injected:', !!mobileInit);
      
      try {
        console.log('[AppConfig] 📱 Calling initializeMobileOptimizations...');
        const result = await mobileInit.initializeMobileOptimizations();
        console.log('[AppConfig] 📱 Mobile optimization result:', result);
        
        // Enable debug commands in development
        if (isDevMode() || !environment.production) {
          console.log('[AppConfig] 📱 Enabling mobile debug commands...');
          mobileInit.enableMobileDebugCommands();
          console.log('[AppConfig] 📱 Mobile debug commands enabled');
        }
      } catch (error) {
        console.error('[AppConfig] 📱 Mobile optimization failed (non-critical):', error);
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
