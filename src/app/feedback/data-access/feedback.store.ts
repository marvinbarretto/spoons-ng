import { Injectable, Injector, computed, inject, runInInjectionContext } from '@angular/core';
import { TelegramNotification, TelegramNotificationService } from '@fourfold/angular-foundation';
import { BaseStore } from '../../shared/base/base.store';
import { CreateFeedbackInput, Feedback, FeedbackSubmissionResult } from '../utils/feedback.model';
import { FeedbackService } from './feedback.service';

@Injectable({
  providedIn: 'root',
})
export class FeedbackStore extends BaseStore<Feedback> {
  private readonly feedbackService = inject(FeedbackService);
  private readonly telegramService = inject(TelegramNotificationService);
  private readonly injector = inject(Injector);

  protected override async fetchData(): Promise<Feedback[]> {
    const userId = this.userId();
    if (!userId) {
      return [];
    }

    // Use runInInjectionContext to fix Firebase injection context warning
    return runInInjectionContext(this.injector, () => {
      return this.feedbackService.getUserFeedback(userId);
    });
  }

  async submitFeedback(input: CreateFeedbackInput): Promise<FeedbackSubmissionResult> {
    console.log('[FeedbackStore] Starting feedback submission...', {
      type: input.type,
      messageLength: input.message?.length || 0,
    });

    try {
      this._loading.set(true);
      this._error.set(null);

      const user = this.authStore.user();
      console.log('[FeedbackStore] User auth check:', { hasUser: !!user, userId: user?.uid });

      if (!user) {
        console.error('[FeedbackStore] No authenticated user found');
        return {
          success: false,
          error: 'User not authenticated',
        };
      }

      console.log('[FeedbackStore] Calling FeedbackService.submitFeedback...');
      const result = await this.feedbackService.submitFeedback(
        input,
        user.uid,
        user.email || '',
        user.displayName || 'Anonymous'
      );
      console.log('[FeedbackStore] FeedbackService returned:', result);

      // Add the new feedback to local state immediately for better UX
      const newFeedback: Feedback = {
        id: result.id,
        userId: user.uid,
        userEmail: user.email || '',
        userDisplayName: user.displayName || 'Anonymous',
        type: input.type,
        message: input.message,
        context: {
          userAgent: navigator.userAgent,
          currentUrl: window.location.href,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          timestamp: new Date(),
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.addItem(newFeedback);

      // Send Telegram notification (fire and forget - don't await)
      const telegramNotification: TelegramNotification = {
        title: `New Feedback: ${newFeedback.type}`,
        message: newFeedback.message,
        type: newFeedback.type,
        userId: newFeedback.userId,
        userDisplayName: newFeedback.userDisplayName,
        userEmail: newFeedback.userEmail,
        timestamp: newFeedback.createdAt,
        url: newFeedback.context?.currentUrl,
        metadata: {
          userAgent: newFeedback.context?.userAgent,
          viewport: newFeedback.context?.viewport,
          status: newFeedback.status,
        },
      };

      this.telegramService.sendNotification(telegramNotification).catch(error => {
        console.error('[FeedbackStore] Failed to send Telegram notification:', error);
      });

      console.log('[FeedbackStore] About to show success toast');
      console.log('[FeedbackStore] ToastService instance:', this.toastService);
      this.toastService.success('Feedback submitted successfully!');
      console.log(
        '[FeedbackStore] Success toast called - checking toasts signal:',
        this.toastService.toasts()
      );
      console.log('[FeedbackStore] Success toast shown');

      const successResult = {
        success: true,
        feedbackId: result.id,
      };
      console.log('[FeedbackStore] Returning success result:', successResult);
      return successResult;
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to submit feedback';
      this._error.set(errorMessage);
      this.toastService.error(errorMessage);
      console.error('[FeedbackStore] Error submitting feedback:', error);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      this._loading.set(false);
    }
  }

  async updateFeedbackStatus(
    feedbackId: string,
    status: Feedback['status'],
    adminNotes?: string
  ): Promise<void> {
    try {
      await this.feedbackService.updateFeedbackStatus(feedbackId, status, adminNotes);

      // Update local state
      this.updateItem(item => item.id === feedbackId, {
        status,
        updatedAt: new Date(),
        ...(adminNotes && { adminNotes }),
      });

      this.toastService.success('Feedback status updated');
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to update feedback status';
      this._error.set(errorMessage);
      this.toastService.error(errorMessage);
      console.error('[FeedbackStore] Error updating feedback status:', error);
    }
  }

  // Computed signals for different feedback types
  readonly bugReports = computed(() => {
    return this.data().filter(f => f.type === 'bug');
  });

  readonly suggestions = computed(() => {
    return this.data().filter(f => f.type === 'suggestion');
  });

  readonly confusions = computed(() => {
    return this.data().filter(f => f.type === 'confusion');
  });

  readonly pendingFeedback = computed(() => {
    return this.data().filter(f => f.status === 'pending');
  });

  readonly resolvedFeedback = computed(() => {
    return this.data().filter(f => f.status === 'resolved');
  });
}
