import { ApplicationConfig, ErrorHandler, inject, provideAppInitializer, provideZoneChangeDetection, isDevMode } from '@angular/core';
import { provideRouter, TitleStrategy } from '@angular/router';

import { appRoutes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { USER_THEME_TOKEN } from '../libs/tokens/user-theme.token';
import { ThemeStore } from './shared/data-access/theme.store';
// import { provideAuthInitializer } from './auth/data-access/auth-initializer';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { GlobalErrorHandler } from './shared/utils/global-error-handler';
import { environment } from '../environments/environment';
import { DeviceCapabilityService } from './shared/utils/device-capability-check.service';
import { TemplatePageTitleStrategy } from './TemplatePageTitleStrategy';
import { firebaseProviders } from '../../firebase.config';
import { provideServiceWorker } from '@angular/service-worker';


export const appConfig: ApplicationConfig = {
  providers: [
    ...firebaseProviders,
    { provide: DeviceCapabilityService, useClass: DeviceCapabilityService },
    { provide: USER_THEME_TOKEN, useValue: 'default' },
    provideAppInitializer(() => {
      inject(ThemeStore);
    }),
    // provideClientHydration(withEventReplay()),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    // TODO: Vertify if its useful
    // provideAuthInitializer(),
    provideHttpClient(withFetch()),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    { provide: 'environment', useValue: environment },
    { provide: TitleStrategy, useClass: TemplatePageTitleStrategy }, provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          })
  ]
};
