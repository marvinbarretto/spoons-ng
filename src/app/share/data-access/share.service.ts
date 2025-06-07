import { Injectable, inject } from '@angular/core';
import { SsrPlatformService } from '../../shared/utils/ssr/ssr-platform.service';


@Injectable({ providedIn: 'root' })
export class ShareService {
  private readonly _platform = inject(SsrPlatformService);

  shareApp(url: string): void {
    this._platform.onlyOnBrowser(() => {
      if (!navigator.share) {
        console.warn('[Share] Web Share API not supported');
        return;
      }

      navigator
        .share({
          title: 'Spoons',
          text: 'Check in to pubs. Claim your local. Become the Landlord!',
          url,
        })
        .catch((err) => {
          console.warn('[Share] Cancelled or failed', err);
        });
    });
  }
}
