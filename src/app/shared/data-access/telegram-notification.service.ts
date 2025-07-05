import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Feedback } from '../../feedback/utils/feedback.model';

@Injectable({
  providedIn: 'root'
})
export class TelegramNotificationService {
  private readonly http = inject(HttpClient);
  private readonly botToken = environment.telegram?.botToken;
  private readonly chatId = environment.telegram?.chatId;
  private readonly baseUrl = 'https://api.telegram.org/bot';

  async sendFeedbackNotification(feedback: Feedback): Promise<void> {
    if (!this.botToken || !this.chatId) {
      console.warn('[TelegramNotificationService] Telegram not configured, skipping notification');
      return;
    }

    try {
      const message = this.formatFeedbackMessage(feedback);
      await this.sendMessage(message);
      console.log('[TelegramNotificationService] Feedback notification sent successfully');
    } catch (error) {
      // Don't throw - we don't want Telegram errors to affect feedback submission
      console.error('[TelegramNotificationService] Failed to send notification:', error);
    }
  }

  private formatFeedbackMessage(feedback: Feedback): string {
    const typeEmoji = {
      bug: '🐛',
      suggestion: '💡',
      confusion: '❓'
    };

    const emoji = typeEmoji[feedback.type] || '📝';
    const userAgent = this.parseUserAgent(feedback.context.userAgent);

    let message = `${emoji} *New Feedback: ${feedback.type}*\n\n`;
    message += `👤 *From:* ${this.escapeMarkdown(feedback.userDisplayName)}\n`;

    if (feedback.userEmail) {
      message += `📧 *Email:* ${this.escapeMarkdown(feedback.userEmail)}\n`;
    }

    message += `\n💬 *Message:*\n${this.escapeMarkdown(feedback.message)}\n\n`;
    message += `🔗 *URL:* ${this.escapeMarkdown(this.extractPath(feedback.context.currentUrl))}\n`;
    message += `📱 *Device:* ${userAgent}\n`;
    message += `📐 *Viewport:* ${feedback.context.viewport.width}x${feedback.context.viewport.height}\n`;
    message += `🕐 *Time:* ${new Date(feedback.createdAt).toLocaleString()}`;

    return message;
  }

  private async sendMessage(text: string): Promise<void> {
    const url = `${this.baseUrl}${this.botToken}/sendMessage`;

    const payload = {
      chat_id: this.chatId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    };

    await firstValueFrom(this.http.post(url, payload));
  }

  private escapeMarkdown(text: string): string {
    // Escape special Markdown characters
    return text.replace(/[*_`\[\]()~>#+=|{}.!-]/g, '\\$&');
  }

  private extractPath(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname + urlObj.search + urlObj.hash;
    } catch {
      // If URL parsing fails, return the original URL
      return url;
    }
  }

  private parseUserAgent(userAgent: string): string {
    // Simple user agent parsing for better readability
    if (userAgent.includes('Chrome')) {
      if (userAgent.includes('Edg/')) return 'Edge Browser';
      return 'Chrome Browser';
    }
    if (userAgent.includes('Firefox')) return 'Firefox Browser';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari Browser';
    if (userAgent.includes('Mobile')) return 'Mobile Browser';
    return 'Unknown Browser';
  }

  async sendTestNotification(): Promise<boolean> {
    console.log('[TelegramNotificationService] 🧪 Sending test notification...');

    if (!this.botToken || !this.chatId) {
      console.warn('[TelegramNotificationService] ⚠️ Bot token or chat ID not configured');
      return false;
    }

    const testFeedback: Feedback = {
      id: 'test-' + Date.now(),
      userId: 'test-user-12345678',
      userEmail: 'test@example.com',
      userDisplayName: 'Test User',
      type: 'bug',
      message: 'This is a test notification to verify Telegram integration is working correctly.',
      context: {
        userAgent: navigator.userAgent,
        currentUrl: window.location.href,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        timestamp: new Date()
      },
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      await this.sendFeedbackNotification(testFeedback);
      console.log('[TelegramNotificationService] ✅ Test notification sent successfully');
      return true;
    } catch (error) {
      console.error('[TelegramNotificationService] ❌ Test notification failed:', error);
      return false;
    }
  }
}
