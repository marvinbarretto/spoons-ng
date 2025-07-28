import { Injectable } from '@angular/core';
import { orderBy, where } from '@angular/fire/firestore';
import { FirestoreCrudService } from '@fourfold/angular-foundation';
import { nanoid } from 'nanoid';
import { CreateFeedbackInput, Feedback } from '../utils/feedback.model';

@Injectable({
  providedIn: 'root',
})
export class FeedbackService extends FirestoreCrudService<Feedback> {
  protected override path = 'feedback';

  async submitFeedback(
    input: CreateFeedbackInput,
    userId: string,
    userEmail: string | undefined,
    userDisplayName: string
  ): Promise<{ id: string }> {
    const feedbackId = nanoid();

    const feedbackData: Feedback = {
      id: feedbackId,
      userId,
      userEmail: userEmail || '',
      userDisplayName,
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

    await this.create(feedbackData);
    return { id: feedbackId };
  }

  async getUserFeedback(userId: string): Promise<Feedback[]> {
    return this.getDocsWhere<Feedback>(
      this.path,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
  }

  async getPendingFeedback(): Promise<Feedback[]> {
    return this.getDocsWhere<Feedback>(
      this.path,
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
  }

  async updateFeedbackStatus(
    feedbackId: string,
    status: Feedback['status'],
    adminNotes?: string
  ): Promise<void> {
    const updateData: Partial<Feedback> = {
      status,
      updatedAt: new Date(),
    };

    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    return this.update(feedbackId, updateData);
  }
}
