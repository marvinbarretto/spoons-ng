import { ApplicationConfig, ErrorHandler, inject, provideAppInitializer, provideZoneChangeDetection, isDevMode } from '@angular/core';
import { provideRouter, TitleStrategy, withPreloading } from '@angular/router';
import { OnboardingAwarePreloadingStrategy } from './shared/strategies/onboarding-aware-preloading.strategy';

import { appRoutes } from './app.routes';
import { USER_THEME_TOKEN } from '../libs/tokens/user-theme.token';
import { ThemeStore } from './shared/data-access/theme.store';
import { DevCacheBuster } from './shared/utils/dev-cache-buster';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { environment } from '../environments/environment';
import { TemplatePageTitleStrategy } from './TemplatePageTitleStrategy';
import { firebaseProviders } from '../../firebase.config';
import { provideServiceWorker } from '@angular/service-worker';
import { provideCacheableAnimationLoader, provideLottieOptions } from 'ngx-lottie';
import player from 'lottie-web';


export const appConfig: ApplicationConfig = {
  providers: [
    ...firebaseProviders,
    { provide: USER_THEME_TOKEN, useValue: 'light' },
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
    { provide: TitleStrategy, useClass: TemplatePageTitleStrategy }, provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          })
  ]
};
