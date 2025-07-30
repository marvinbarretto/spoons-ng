import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideZoneChangeDetection,
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
import { ThemeStore } from './shared/data-access/theme.store';
import { DevCacheBuster } from './shared/utils/dev-cache-buster';
import { TemplatePageTitleStrategy } from './TemplatePageTitleStrategy';

export const appConfig: ApplicationConfig = {
  providers: [
    ...firebaseProviders,
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
