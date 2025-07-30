/**
 * @fileoverview ErrorLoggingService - Centralized error tracking and storage
 *
 * RESPONSIBILITIES:
 * - Capture and store errors with context and stack traces
 * - Categorize errors by type (check-in, points, badges, etc.)
 * - Provide admin interface to view and analyze errors
 * - Store errors in Firestore for persistence and analysis
 *
 * USAGE:
 * - Call logError() from try/catch blocks
 * - Include user context, operation details, and full stack traces
 * - Errors are automatically stored with timestamps and categorization
 */

import { Injectable, inject, signal } from '@angular/core';
import { FirestoreService } from '@fourfold/angular-foundation';
import { Timestamp } from 'firebase/firestore';
import { AuthStore } from '../../auth/data-access/auth.store';

export type ErrorCategory =
  | 'check-in'
  | 'points'
  | 'badges'
  | 'landlord'
  | 'missions'
  | 'auth'
  | 'database'
  | 'network'
  | 'validation'
  | 'unknown';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export type SystemError = {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  stackTrace?: string;
  timestamp: Timestamp;

  // User context
  userId?: string;
  userDisplayName?: string;
  isAnonymous?: boolean;

  // Operation context
  operation: string;
  operationContext?: Record<string, any>;

  // System context
  userAgent?: string;
  url?: string;

  // Resolution
  resolved?: boolean;
  resolvedAt?: Timestamp;
  resolvedBy?: string;
  resolution?: string;
};

@Injectable({ providedIn: 'root' })
export class ErrorLoggingService extends FirestoreService {
  private readonly authStore = inject(AuthStore);

  // Recent errors for quick access
  private readonly _recentErrors = signal<SystemError[]>([]);
  readonly recentErrors = this._recentErrors.asReadonly();

  // Error counts by category
  private readonly _errorCounts = signal<Record<ErrorCategory, number>>({
    'check-in': 0,
    points: 0,
    badges: 0,
    landlord: 0,
    missions: 0,
    auth: 0,
    database: 0,
    network: 0,
    validation: 0,
    unknown: 0,
  });
  readonly errorCounts = this._errorCounts.asReadonly();

  // Loading state
  private readonly _loading = signal(false);
  readonly loading = this._loading.asReadonly();

  /**
   * Log an error with full context
   */
  async logError(
    category: ErrorCategory,
    operation: string,
    error: Error | string,
    options: {
      severity?: ErrorSeverity;
      operationContext?: Record<string, any>;
      customMessage?: string;
    } = {}
  ): Promise<string> {
    const callId = Date.now();
    console.log(`[ErrorLoggingService] 🚨 Logging ${category} error (${callId}):`, {
      operation,
      error,
    });

    try {
      const user = this.authStore.user();
      const errorMessage = typeof error === 'string' ? error : error.message;
      const stackTrace = error instanceof Error ? error.stack : undefined;

      const systemError: Omit<SystemError, 'id'> = {
        category,
        severity: options.severity || this.determineSeverity(category, errorMessage),
        message: options.customMessage || errorMessage,
        stackTrace,
        timestamp: Timestamp.now(),

        // User context
        userId: user?.uid,
        userDisplayName: user?.displayName,
        isAnonymous: user?.isAnonymous,

        // Operation context
        operation,
        operationContext: options.operationContext,

        // System context
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,

        resolved: false,
      };

      console.log(`[ErrorLoggingService] 💾 Saving error to Firestore (${callId}):`, systemError);

      // Save to Firestore
      const docRef = await this.addDocToCollection('systemErrors', systemError);
      const errorId = docRef.id;

      console.log(`[ErrorLoggingService] ✅ Error saved with ID: ${errorId} (${callId})`);

      // Update local state
      const completeError: SystemError = {
        id: errorId,
        ...systemError,
      };

      this._recentErrors.update(errors => [completeError, ...errors].slice(0, 50)); // Keep latest 50
      this._errorCounts.update(counts => ({
        ...counts,
        [category]: counts[category] + 1,
      }));

      // Log to console for immediate debugging
      console.error(`[${category.toUpperCase()}] ${operation}:`, error);
      if (stackTrace) {
        console.error(`Stack trace:`, stackTrace);
      }
      if (options.operationContext) {
        console.error(`Context:`, options.operationContext);
      }

      return errorId;
    } catch (loggingError) {
      console.error(`[ErrorLoggingService] ❌ Failed to log error (${callId}):`, loggingError);
      // Still log to console even if Firestore fails
      console.error(`[${category.toUpperCase()}] ${operation}:`, error);
      throw loggingError;
    }
  }

  /**
   * Log a check-in specific error with context
   */
  async logCheckInError(
    operation: string,
    error: Error | string,
    context: {
      pubId?: string;
      userId?: string;
      pointsData?: any;
      carpetResult?: any;
      severity?: ErrorSeverity;
    }
  ): Promise<string> {
    return this.logError('check-in', operation, error, {
      severity: context.severity || 'high',
      operationContext: {
        pubId: context.pubId,
        userId: context.userId,
        pointsData: context.pointsData,
        carpetResult: context.carpetResult,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log a points specific error with context
   */
  async logPointsError(
    operation: string,
    error: Error | string,
    context: {
      userId?: string;
      pubId?: string;
      pointsData?: any;
      breakdown?: any;
      severity?: ErrorSeverity;
    }
  ): Promise<string> {
    return this.logError('points', operation, error, {
      severity: context.severity || 'high',
      operationContext: {
        userId: context.userId,
        pubId: context.pubId,
        pointsData: context.pointsData,
        breakdown: context.breakdown,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Load recent errors for admin dashboard
   */
  async loadRecentErrors(limit: number = 50): Promise<void> {
    this._loading.set(true);
    try {
      console.log('[ErrorLoggingService] 📡 Loading recent errors...');

      const errors = await this.getDocsWhere<SystemError>(
        'systemErrors'
        // Add ordering by timestamp desc when we implement it
      );

      // Sort by timestamp (most recent first) and limit
      const sortedErrors = errors
        .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())
        .slice(0, limit);

      this._recentErrors.set(sortedErrors);

      // Update error counts
      const counts: Record<ErrorCategory, number> = {
        'check-in': 0,
        points: 0,
        badges: 0,
        landlord: 0,
        missions: 0,
        auth: 0,
        database: 0,
        network: 0,
        validation: 0,
        unknown: 0,
      };

      errors.forEach(error => {
        counts[error.category] = (counts[error.category] || 0) + 1;
      });

      this._errorCounts.set(counts);

      console.log(`[ErrorLoggingService] ✅ Loaded ${sortedErrors.length} recent errors`);
      console.log('[ErrorLoggingService] 📊 Error counts by category:', counts);
    } catch (error) {
      console.error('[ErrorLoggingService] ❌ Failed to load recent errors:', error);
      throw error;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Mark an error as resolved
   */
  async resolveError(errorId: string, resolution: string): Promise<void> {
    try {
      const user = this.authStore.user();
      await this.updateDoc(`systemErrors/${errorId}`, {
        resolved: true,
        resolvedAt: Timestamp.now(),
        resolvedBy: user?.uid || 'unknown',
        resolution,
      });

      // Update local state
      this._recentErrors.update(errors =>
        errors.map(error =>
          error.id === errorId
            ? { ...error, resolved: true, resolvedAt: Timestamp.now(), resolution }
            : error
        )
      );

      console.log(`[ErrorLoggingService] ✅ Error ${errorId} marked as resolved`);
    } catch (error) {
      console.error(`[ErrorLoggingService] ❌ Failed to resolve error ${errorId}:`, error);
      throw error;
    }
  }

  /**
   * Get error statistics for admin dashboard
   */
  getErrorStats(): {
    totalErrors: number;
    unresolvedErrors: number;
    criticalErrors: number;
    recentErrors: number;
    topCategories: Array<{ category: ErrorCategory; count: number }>;
  } {
    const errors = this._recentErrors();
    const unresolvedErrors = errors.filter(e => !e.resolved);
    const criticalErrors = errors.filter(e => e.severity === 'critical');
    const recentErrors = errors.filter(
      e => e.timestamp.toMillis() > Date.now() - 24 * 60 * 60 * 1000 // Last 24 hours
    );

    const categoryCounts = this._errorCounts();
    const topCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category: category as ErrorCategory, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalErrors: errors.length,
      unresolvedErrors: unresolvedErrors.length,
      criticalErrors: criticalErrors.length,
      recentErrors: recentErrors.length,
      topCategories,
    };
  }

  /**
   * Determine error severity based on category and message
   */
  private determineSeverity(category: ErrorCategory, message: string): ErrorSeverity {
    // Critical errors that break core functionality
    if (
      message.includes('authentication') ||
      message.includes('permission denied') ||
      message.includes('network') ||
      message.includes('database')
    ) {
      return 'critical';
    }

    // High severity for user-facing failures
    if (category === 'check-in' || category === 'points' || message.includes('failed to')) {
      return 'high';
    }

    // Medium for degraded functionality
    if (category === 'badges' || category === 'landlord' || category === 'missions') {
      return 'medium';
    }

    // Low for minor issues
    return 'low';
  }

  /**
   * Clear all error state (for testing/development)
   */
  reset(): void {
    this._recentErrors.set([]);
    this._errorCounts.set({
      'check-in': 0,
      points: 0,
      badges: 0,
      landlord: 0,
      missions: 0,
      auth: 0,
      database: 0,
      network: 0,
      validation: 0,
      unknown: 0,
    });
    this._loading.set(false);
  }
}
