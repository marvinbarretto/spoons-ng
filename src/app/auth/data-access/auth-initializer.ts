// import { inject } from '@angular/core';
// import { provideAppInitializer } from '@angular/core';
// import { AuthStore } from './auth.store';
// import { SsrPlatformService } from '@fourfold/angular-foundation';

// export const provideAuthInitializer = () =>
//   provideAppInitializer(() => {
//     const authStore = inject(AuthStore);
//     const ssr = inject(SsrPlatformService);

//     return (
//       ssr.onlyOnBrowser(() => authStore.bootstrapFromCookie()) ?? undefined
//     );
//   });
