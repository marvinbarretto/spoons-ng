import { Pipe, PipeTransform } from '@angular/core';
import { FeatureFlagService } from '../data-access/feature-flag.service';
import { environment } from '../../../environments/environment';
@Pipe({
  name: 'featureFlag',
  standalone: true,
})
export class FeatureFlagPipe implements PipeTransform {
  constructor(private featureFlagService: FeatureFlagService) {}

  transform(flag: keyof typeof environment.featureFlags): boolean {
    return this.featureFlagService.isEnabled(flag);
  }
}
