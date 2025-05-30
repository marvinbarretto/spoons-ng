import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FeatureFlagService {
  constructor() {
    console.log(
      'Environment feature flags at service initialization:',
      environment.featureFlags
    );
  }

  isEnabled(flag: keyof typeof environment.featureFlags): boolean {
    if (!environment.production && environment.ENABLE_ALL_FEATURES_FOR_DEV) {
      return true;
    }

    return environment.featureFlags[flag] ?? false; // Default to false if the flag is undefined
  }
}
