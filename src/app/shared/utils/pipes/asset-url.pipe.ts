import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../../environments/environment';

@Pipe({
  name: 'assetUrl',
})
export class AssetUrlPipe implements PipeTransform {
  transform(path: string | null | undefined): string | null {
    if (!path) return null;

    // Return absolute URLs unchanged
    if (/^https?:\/\//i.test(path)) return path;

    // Prefix relative path with Strapi base URL
    return `${environment.strapiUrl}${path}`;
  }
}
