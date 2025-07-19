import { Component, computed, inject, signal } from '@angular/core';
import { ShareService } from '../../data-access/share.service';
import { SocialMediaService, type SocialMediaPlatform } from '../../data-access/social-media.service';
import { getShareMessage } from '../../data-access/share-messages';
import { SsrPlatformService } from '@fourfold/angular-foundation';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { QrCodeComponent } from '../../../shared/ui/qr-code/qr-code.component';
import { BaseComponent } from '../../../shared/base/base.component';

@Component({
  selector: 'app-share-panel',
  imports: [ButtonComponent, QrCodeComponent],
  template: `
    <section class="share-panel">
      <div class="share-actions">
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
      </div>

      <div class="social-buttons">
        <h3>Share on Social Media</h3>
        <div class="social-grid">
          <app-button
            (click)="shareToSocial('twitter')"
            variant="secondary"
            size="sm">
            Twitter/X
          </app-button>

          <app-button
            (click)="shareToSocial('facebook')"
            variant="secondary"
            size="sm">
            Facebook
          </app-button>

          <app-button
            (click)="shareToSocial('whatsapp')"
            variant="secondary"
            size="sm">
            WhatsApp
          </app-button>

          <app-button
            (click)="shareToSocial('telegram')"
            variant="secondary"
            size="sm">
            Telegram
          </app-button>
        </div>
      </div>

      <app-qr-code [url]="shareUrl()" />
    </section>
  `,
  styles: [`
    .share-panel {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .share-actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .social-buttons {
      margin-top: 1rem;
    }

    .social-buttons h3 {
      margin-bottom: 0.75rem;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .social-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 0.5rem;
    }
  `]
})
export class SharePanelComponent extends BaseComponent {
  private readonly _share: ShareService = inject(ShareService);
  private readonly _socialMedia: SocialMediaService = inject(SocialMediaService);
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
        this.showSuccess('Link copied!');
      });
    });
  }

  shareToSocial(socialMediaPlatform: SocialMediaPlatform): void {
    const shareText = getShareMessage(socialMediaPlatform);
    this._socialMedia.shareToSocial(socialMediaPlatform, this.shareUrl(), shareText);
  }
}
