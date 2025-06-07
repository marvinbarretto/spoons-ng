import { Component, computed, inject, signal } from '@angular/core';
import { ShareService } from '../../data-access/share.service';
import { SsrPlatformService } from '../../../shared/utils/ssr/ssr-platform.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

@Component({
  selector: 'app-share-panel',
  imports: [ButtonComponent],
  template: `
    <section>

      <app-button
        (click)="share()"
        [disabled]="!canShare()"
        >
        Share via...
      </app-button>

      <app-button
        (click)="copyLink()"
        variant="secondary"
        >Copy Link
      </app-button>

      <!-- <app-qr-code [url]="shareUrl()" class="mt-4" /> -->
    </section>
  `,
})
export class SharePanelComponent {
  private readonly _share: ShareService = inject(ShareService);
  private readonly _platform: SsrPlatformService = inject(SsrPlatformService);


  protected readonly shareUrl = signal('https://spoons-15e03.firebaseapp.com');
  // TODO: Env variable

  protected readonly canShare = computed(() =>
    this._platform.isBrowser && !!navigator.share
  );

  share(): void {
    this._platform.onlyOnBrowser(() =>
      this._share.shareApp(this.shareUrl())
    );
  }

  copyLink(): void {
    this._platform.onlyOnBrowser(() => {
      navigator.clipboard.writeText(this.shareUrl()).then(() => {
        console.log('[Share] Link copied');
        // replace with toast if you have one
        alert('Link copied!');
      });
    });
  }
}
