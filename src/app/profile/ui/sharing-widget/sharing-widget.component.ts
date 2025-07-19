// src/app/profile/ui/sharing-widget/sharing-widget.component.ts
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ShareService } from '../../../share/data-access/share.service';
import { SocialMediaService, type SocialMediaPlatform } from '../../../share/data-access/social-media.service';
import { getShareMessage } from '../../../share/data-access/share-messages';
import { SsrPlatformService } from '@fourfold/angular-foundation';
import { QrCodeComponent } from '@shared/ui/qr-code/qr-code.component';
import { BaseComponent } from '@shared/base/base.component';
import { IconComponent } from '@shared/ui/icon/icon.component';

@Component({
  selector: 'app-sharing-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [QrCodeComponent, IconComponent],
  template: `
    <div class="sharing-widget">
      <h2 class="widget-title">Share Spoonscount</h2>

      <div class="share-actions">
        <button
          (click)="share()"
          [disabled]="!canShare()"
          class="share-btn primary"
          type="button"
        >
          <app-icon name="share" size="sm" />
          Share via...
        </button>

        <button
          (click)="copyLink()"
          class="share-btn secondary"
          type="button"
        >
          <app-icon name="link" size="sm" />
          Copy Link
        </button>
      </div>

      <div class="social-section">
        <h3>Share on Social Media</h3>
        <div class="social-grid">
          <button
            (click)="shareToSocial('twitter')"
            class="social-btn"
            type="button"
          >
            <app-icon name="public" size="sm" />
            Twitter/X
          </button>

          <button
            (click)="shareToSocial('facebook')"
            class="social-btn"
            type="button"
          >
            <app-icon name="public" size="sm" />
            Facebook
          </button>

          <button
            (click)="shareToSocial('whatsapp')"
            class="social-btn"
            type="button"
          >
            <app-icon name="chat" size="sm" />
            WhatsApp
          </button>

          <button
            (click)="shareToSocial('telegram')"
            class="social-btn"
            type="button"
          >
            <app-icon name="send" size="sm" />
            Telegram
          </button>
        </div>
      </div>

      <div class="qr-section">
        <h3>QR Code</h3>
        <p class="qr-description">Share by scanning</p>
        <app-qr-code [url]="shareUrl()" />
      </div>
    </div>
  `,
  styles: `
    .sharing-widget {
      background: var(--background-light);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 1rem;
    }

    .widget-title {
      margin: 0 0 1.5rem 0;
      color: var(--text-primary);
      font-size: 1.25rem;
      font-weight: 600;
    }

    .share-actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 2rem;
    }

    .share-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.875rem;
      transition: all 0.2s ease;
    }

    .share-btn.primary {
      background: var(--primary);
      color: var(--on-primary);
    }

    .share-btn.primary:hover:not(:disabled) {
      background: var(--primary-dark);
      transform: translateY(-1px);
    }

    .share-btn.primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .share-btn.secondary {
      background: var(--background);
      color: var(--text-primary);
      border: 1px solid var(--border);
    }

    .share-btn.secondary:hover {
      background: var(--background-lighter);
      border-color: var(--primary);
    }

    .social-section {
      margin-bottom: 2rem;
    }

    .social-section h3 {
      margin: 0 0 1rem 0;
      color: var(--text-primary);
      font-size: 1rem;
      font-weight: 600;
    }

    .social-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 0.75rem;
    }

    .social-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: var(--background);
      border: 1px solid var(--border);
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .social-btn:hover {
      background: var(--background-lighter);
      border-color: var(--primary);
      transform: translateY(-1px);
    }

    .qr-section {
      text-align: center;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
    }

    .qr-section h3 {
      margin: 0 0 0.5rem 0;
      color: var(--text-primary);
      font-size: 1rem;
      font-weight: 600;
    }

    .qr-description {
      margin: 0 0 1rem 0;
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .share-actions {
        flex-direction: column;
      }

      .share-btn {
        width: 100%;
        justify-content: center;
      }

      .social-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
  `
})
export class SharingWidgetComponent extends BaseComponent {
  private readonly shareService = inject(ShareService);
  private readonly socialMediaService = inject(SocialMediaService);

  // TODO: This should come from environment config
  protected readonly shareUrl = signal('https://spoons-15e03.firebaseapp.com');

  protected readonly canShare = computed(() =>
    this.platform.isBrowser && !!navigator.share
  );

  constructor() {
    super();
    console.log('[SharingWidget] Component initialized');
  }

  share(): void {
    console.log('[SharingWidget] Native share triggered');
    this.platform.onlyOnBrowser(() =>
      this.shareService.shareApp(this.shareUrl())
    );
  }

  copyLink(): void {
    console.log('[SharingWidget] Copying link to clipboard');
    this.platform.onlyOnBrowser(() => {
      navigator.clipboard.writeText(this.shareUrl()).then(() => {
        console.log('[SharingWidget] Link copied successfully');
        this.showSuccess('Link copied to clipboard!');
      }).catch(error => {
        console.error('[SharingWidget] Failed to copy link:', error);
        this.showError('Failed to copy link');
      });
    });
  }

  shareToSocial(platform: SocialMediaPlatform): void {
    console.log(`[SharingWidget] Sharing to ${platform}`);
    const shareText = getShareMessage(platform);
    this.socialMediaService.shareToSocial(platform, this.shareUrl(), shareText);
  }
}
