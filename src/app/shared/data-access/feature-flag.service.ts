import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FeatureFlagService {
  constructor() {
    console.log('Environment feature flags at service initialization:', environment.featureFlags);
  }

  isEnabled(flag: keyof typeof environment.featureFlags | string): boolean {
    if (!environment.production && environment.ENABLE_ALL_FEATURES_FOR_DEV) {
      return true;
    }

    // Handle nested feature flags like 'checkinGates.pointDown'
    if (flag.includes('.')) {
      const [parentKey, childKey] = flag.split('.');
      const parentFlag =
        environment.featureFlags[parentKey as keyof typeof environment.featureFlags];
      if (parentFlag && typeof parentFlag === 'object') {
        const childFlag = (parentFlag as any)[childKey];
        return typeof childFlag === 'boolean' ? childFlag : false;
      }
      return false;
    }

    const flagValue = environment.featureFlags[flag as keyof typeof environment.featureFlags];
    return typeof flagValue === 'boolean' ? flagValue : false;
  }
}
