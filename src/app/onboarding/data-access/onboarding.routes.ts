import { Routes } from '@angular/router';

export const ONBOARDING_ROUTES: Routes = [
  {
    path: 'welcome',
    loadComponent: () => 
      import('../ui/steps/welcome-message-step.component').then(m => m.WelcomeMessageStepComponent),
    data: { step: 'welcome' }
  },
  {
    path: 'display-name',
    loadComponent: () => 
      import('../ui/steps/display-name-step.component').then(m => m.DisplayNameStepComponent),
    data: { step: 'display-name' }
  },
  {
    path: 'profile',
    loadComponent: () => 
      import('../ui/steps/customize-profile-step.component').then(m => m.CustomizeProfileStepComponent),
    data: { step: 'profile' }
  },
  {
    path: 'local',
    loadComponent: () => 
      import('../ui/steps/choose-local-step.component').then(m => m.ChooseLocalStepComponent),
    data: { step: 'local' }
  },
  {
    path: '',
    redirectTo: 'welcome',
    pathMatch: 'full'
  }
];