// src/app/feedback/feature/feedback-admin/feedback-admin.component.ts
import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeedbackStore } from '../../data-access/feedback.store';
import { Feedback } from '../../utils/feedback.model';

type FeedbackFilter = 'all' | 'pending' | 'resolved' | 'wontfix';
type FeedbackTypeFilter = 'all' | 'bug' | 'suggestion' | 'confusion';

@Component({
  selector: 'app-feedback-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="feedback-admin">
      <header class="admin-header">
        <h1>Feedback Management</h1>
        <div class="header-stats">
          <span class="stat">
            <strong>{{ pendingCount() }}</strong> Pending
          </span>
          <span class="stat">
            <strong>{{ resolvedCount() }}</strong> Resolved
          </span>
          <span class="stat">
            <strong>{{ wontfixCount() }}</strong> Won't Fix
          </span>
          <span class="stat">
            <strong>{{ totalCount() }}</strong> Total
          </span>
        </div>
      </header>

      <!-- Filters -->
      <section class="filters-section">
        <div class="filter-group">
          <label>Status:</label>
          <button 
            *ngFor="let status of statusFilters"
            class="filter-btn"
            [class.active]="statusFilter() === status"
            (click)="statusFilter.set(status)"
          >
            {{ status | titlecase }}
            ({{ getCountForStatus(status) }})
          </button>
        </div>
        
        <div class="filter-group">
          <label>Type:</label>
          <button 
            *ngFor="let type of typeFilters"
            class="filter-btn"
            [class.active]="typeFilter() === type"
            (click)="typeFilter.set(type)"
          >
            {{ type | titlecase }}
            ({{ getCountForType(type) }})
          </button>
        </div>
      </section>

      <!-- Feedback List -->
      <section class="feedback-list">
        @if (loading()) {
          <div class="loading">Loading feedback...</div>
        } @else if (error()) {
          <div class="error">Error: {{ error() }}</div>
        } @else if (filteredFeedback().length === 0) {
          <div class="empty-state">
            <p>No feedback found matching your filters.</p>
          </div>
        } @else {
          <div class="feedback-grid">
            @for (feedback of filteredFeedback(); track feedback.id) {
              <div class="feedback-card" [class.resolved]="feedback.status === 'resolved'">
                <div class="card-header">
                  <div class="feedback-meta">
                    <span class="feedback-type" [class]="feedback.type">
                      {{ getFeedbackIcon(feedback.type) }} {{ feedback.type | titlecase }}
                    </span>
                    <span class="feedback-date">
                      {{ formatDate(feedback.createdAt) }}
                    </span>
                  </div>
                  <span class="feedback-status" [class]="feedback.status">
                    {{ feedback.status | titlecase }}
                  </span>
                </div>

                <div class="feedback-content">
                  <p class="feedback-message">{{ feedback.message }}</p>
                  
                  @if (feedback.context) {
                    <div class="feedback-metadata">
                      <strong>Context:</strong>
                      <pre>{{ formatMetadata(feedback.context) }}</pre>
                    </div>
                  }

                  @if (feedback.adminNotes) {
                    <div class="admin-notes">
                      <strong>Admin Notes:</strong>
                      <p>{{ feedback.adminNotes }}</p>
                    </div>
                  }
                </div>

                <div class="card-actions">
                  @if (feedback.status === 'pending') {
                    <div class="admin-controls">
                      <textarea
                        class="admin-input"
                        [(ngModel)]="adminNotes[feedback.id]"
                        placeholder="Add admin notes (optional)..."
                        rows="2"
                      ></textarea>
                      <div class="action-buttons">
                        <button 
                          class="btn btn-resolve"
                          (click)="resolveFeedback(feedback.id)"
                          [disabled]="isUpdating()"
                        >
                          Mark Resolved
                        </button>
                        <button 
                          class="btn btn-dismiss"
                          (click)="dismissFeedback(feedback.id)"
                          [disabled]="isUpdating()"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  } @else {
                    <button 
                      class="btn btn-reopen"
                      (click)="reopenFeedback(feedback.id)"
                      [disabled]="isUpdating()"
                    >
                      Reopen
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }
      </section>

      <!-- Debug Info -->
      @if (isDevMode()) {
        <section class="debug-section">
          <h3>Debug Info</h3>
          <div class="debug-info">
            <p>FeedbackStore data source: {{ dataSourceInfo() }}</p>
            <p>Total items in store: {{ allFeedback().length }}</p>
            <p>Filters applied: Status={{ statusFilter() }}, Type={{ typeFilter() }}</p>
          </div>
        </section>
      }
    </div>
  `,
  styleUrl: './feedback-admin.component.scss'
})
export class FeedbackAdminComponent {
  private readonly feedbackStore = inject(FeedbackStore);

  // Store data
  readonly allFeedback = this.feedbackStore.data;
  readonly loading = this.feedbackStore.loading;
  readonly error = this.feedbackStore.error;

  // Computed counts
  readonly pendingCount = computed(() => this.feedbackStore.pendingFeedback().length);
  readonly resolvedCount = computed(() => this.feedbackStore.resolvedFeedback().length);
  readonly wontfixCount = computed(() => this.allFeedback().filter(f => f.status === 'wontfix').length);
  readonly totalCount = computed(() => this.allFeedback().length);

  // Filters
  readonly statusFilter = signal<FeedbackFilter>('all');
  readonly typeFilter = signal<FeedbackTypeFilter>('all');
  
  readonly statusFilters: FeedbackFilter[] = ['all', 'pending', 'resolved', 'wontfix'];
  readonly typeFilters: FeedbackTypeFilter[] = ['all', 'bug', 'suggestion', 'confusion'];

  // Admin notes for each feedback item
  readonly adminNotes: Record<string, string> = {};

  // Update state
  readonly isUpdating = signal(false);

  // Filtered feedback based on current filters
  readonly filteredFeedback = computed(() => {
    let feedback = this.allFeedback();
    
    // Apply status filter
    if (this.statusFilter() !== 'all') {
      feedback = feedback.filter(f => f.status === this.statusFilter());
    }
    
    // Apply type filter
    if (this.typeFilter() !== 'all') {
      feedback = feedback.filter(f => f.type === this.typeFilter());
    }
    
    // Sort by date (newest first)
    return feedback.sort((a, b) => {
      const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt;
      const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt;
      return dateB.getTime() - dateA.getTime();
    });
  });

  async resolveFeedback(feedbackId: string): Promise<void> {
    console.log('🔧 [FeedbackAdmin] Resolving feedback:', feedbackId);
    this.isUpdating.set(true);
    try {
      await this.feedbackStore.updateFeedbackStatus(
        feedbackId, 
        'resolved', 
        this.adminNotes[feedbackId]
      );
      delete this.adminNotes[feedbackId];
      console.log('✅ [FeedbackAdmin] Feedback resolved successfully');
    } catch (error) {
      console.error('❌ [FeedbackAdmin] Failed to resolve feedback:', error);
    } finally {
      this.isUpdating.set(false);
    }
  }

  async dismissFeedback(feedbackId: string): Promise<void> {
    console.log('🔧 [FeedbackAdmin] Dismissing feedback:', feedbackId);
    this.isUpdating.set(true);
    try {
      await this.feedbackStore.updateFeedbackStatus(
        feedbackId, 
        'wontfix', 
        this.adminNotes[feedbackId] || 'Dismissed by admin'
      );
      delete this.adminNotes[feedbackId];
      console.log('✅ [FeedbackAdmin] Feedback dismissed successfully');
    } catch (error) {
      console.error('❌ [FeedbackAdmin] Failed to dismiss feedback:', error);
    } finally {
      this.isUpdating.set(false);
    }
  }

  async reopenFeedback(feedbackId: string): Promise<void> {
    console.log('🔧 [FeedbackAdmin] Reopening feedback:', feedbackId);
    this.isUpdating.set(true);
    try {
      await this.feedbackStore.updateFeedbackStatus(feedbackId, 'pending');
      console.log('✅ [FeedbackAdmin] Feedback reopened successfully');
    } catch (error) {
      console.error('❌ [FeedbackAdmin] Failed to reopen feedback:', error);
    } finally {
      this.isUpdating.set(false);
    }
  }

  getCountForStatus(status: FeedbackFilter): number {
    if (status === 'all') return this.totalCount();
    if (status === 'pending') return this.pendingCount();
    if (status === 'resolved') return this.resolvedCount();
    if (status === 'wontfix') return this.wontfixCount();
    return 0;
  }

  getCountForType(type: FeedbackTypeFilter): number {
    if (type === 'all') return this.totalCount();
    return this.allFeedback().filter(f => f.type === type).length;
  }

  getFeedbackIcon(type: Feedback['type']): string {
    switch (type) {
      case 'bug': return '🐛';
      case 'suggestion': return '💡';
      case 'confusion': return '❓';
      default: return '💬';
    }
  }

  formatDate(dateInput: string | Date): string {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatMetadata(metadata: any): string {
    return JSON.stringify(metadata, null, 2);
  }

  dataSourceInfo(): string {
    return 'FeedbackStore (Firestore: feedback/{userId}/items)';
  }

  isDevMode(): boolean {
    return true; // You can use Angular's isDevMode() here
  }
}