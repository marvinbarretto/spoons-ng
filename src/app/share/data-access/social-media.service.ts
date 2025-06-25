import { Injectable, inject } from '@angular/core';
import { SsrPlatformService } from '../../shared/utils/ssr/ssr-platform.service';

export type SocialMediaPlatform = 'twitter' | 'facebook' | 'whatsapp' | 'telegram';

@Injectable({
  providedIn: 'root'
})
export class SocialMediaService {
  private readonly _platform = inject(SsrPlatformService);

  shareToSocial(platform: SocialMediaPlatform, url: string, text?: string): void {
    this._platform.onlyOnBrowser(() => {
      const shareUrl = this.buildShareUrl(platform, url, text);
      
      console.log(`[SocialMedia] Sharing to ${platform}:`, { url, text, shareUrl });
      
      // Open in new window/tab
      window.open(shareUrl, '_blank', 'width=600,height=400');
    });
  }

  private buildShareUrl(platform: SocialMediaPlatform, url: string, text?: string): string {
    const encodedUrl = encodeURIComponent(url);
    const encodedText = text ? encodeURIComponent(text) : '';
    
    switch (platform) {
      case 'twitter':
        // TODO: Implement Twitter/X sharing
        console.log('[SocialMedia] Twitter share stub - would share:', { url, text });
        return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
        
      case 'facebook':
        // TODO: Implement Facebook sharing (requires app ID for better integration)
        console.log('[SocialMedia] Facebook share stub - would share:', { url });
        return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        
      case 'whatsapp':
        // TODO: Implement WhatsApp sharing
        console.log('[SocialMedia] WhatsApp share stub - would share:', { url, text });
        const whatsappText = text ? `${encodedText}%20${encodedUrl}` : encodedUrl;
        return `https://wa.me/?text=${whatsappText}`;
        
      case 'telegram':
        // TODO: Implement Telegram sharing
        console.log('[SocialMedia] Telegram share stub - would share:', { url, text });
        return `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
        
      default:
        console.error('[SocialMedia] Unknown platform:', platform);
        return '';
    }
  }

  // Future methods to implement:
  
  // async shareWithImage(platform: SocialPlatform, url: string, text?: string, imageUrl?: string): Promise<void> {
  //   console.log('[SocialMedia] Share with image stub:', { platform, url, text, imageUrl });
  //   // TODO: Implement sharing with images (requires platform-specific APIs)
  // }
  
  // async getShareCount(platform: SocialPlatform, url: string): Promise<number> {
  //   console.log('[SocialMedia] Get share count stub:', { platform, url });
  //   // TODO: Implement fetching share counts (requires API keys)
  //   return 0;
  // }
  
  // canShare(platform: SocialPlatform): boolean {
  //   console.log('[SocialMedia] Check if can share stub:', { platform });
  //   // TODO: Implement platform availability checks
  //   return true;
  // }
}