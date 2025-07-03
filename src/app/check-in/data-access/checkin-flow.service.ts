import { Injectable, signal, computed } from '@angular/core';

// State machine phases for check-in flow
export type CheckinPhase =
  | 'CAMERA_STARTING'
  | 'WAITING_FOR_GATES'
  | 'PHOTO_CAPTURED'
  | 'LLM_THINKING'
  | 'CHECK_IN_PROCESSING'
  | 'SUCCESS_MODAL';

/**
 * Orchestrates check-in user flow and state machine
 * 
 * SCOPE:
 * - Check-in phase management (CAMERA_STARTING → SUCCESS_MODAL)
 * - Phase transition logic and validation
 * - Timeout management and cleanup coordination
 * - UI state for different flow phases
 * - Safe timeout tracking to prevent memory leaks
 * 
 * DOES NOT HANDLE:
 * - Camera hardware or photo capture (handled by CameraService)
 * - Metrics validation or orientation monitoring (handled by specialized services)
 * - Business logic like points/badges calculation (handled by CheckInStore)
 * - LLM analysis implementation (handled by CheckinAnalysisService)
 */
@Injectable({
  providedIn: 'root'
})
export class CheckinFlowService {

  // Core phase state
  private readonly _currentPhase = signal<CheckinPhase>('CAMERA_STARTING');
  readonly currentPhase = this._currentPhase.asReadonly();

  // Flow control state
  private readonly _isProcessing = signal(false);
  readonly isProcessing = this._isProcessing.asReadonly();

  // Timeout tracking for cleanup
  private activeTimeouts: Set<number> = new Set();

  /**
   * Computed signal to determine if video should be shown
   * Video is visible during camera phases for live preview
   * 
   * @returns true if video element should be visible
   */
  readonly shouldShowVideo = computed(() => {
    const phase = this._currentPhase();
    const shouldShow = phase === 'CAMERA_STARTING' || phase === 'WAITING_FOR_GATES';
    
    console.log('[FlowService] 📺 Video visibility check:', {
      currentPhase: phase,
      shouldShowVideo: shouldShow
    });

    return shouldShow;
  });

  /**
   * Computed signal to determine if we're in a camera-active phase
   * Used for determining when to clean up camera resources
   * 
   * @returns true if camera should be active
   */
  readonly isCameraActive = computed(() => {
    const phase = this._currentPhase();
    return phase === 'CAMERA_STARTING' || phase === 'WAITING_FOR_GATES';
  });

  /**
   * Computed signal to determine if we're in a processing phase
   * Used for showing loading states and disabling interactions
   * 
   * @returns true if system is processing user input
   */
  readonly isInProcessingState = computed(() => {
    const phase = this._currentPhase();
    return phase === 'PHOTO_CAPTURED' || 
           phase === 'LLM_THINKING' || 
           phase === 'CHECK_IN_PROCESSING';
  });

  /**
   * Set the current phase with logging and validation
   * 
   * @param newPhase Phase to transition to
   * @param context Optional context for debugging
   */
  setPhase(newPhase: CheckinPhase, context?: string): void {
    const oldPhase = this._currentPhase();
    
    console.log('[FlowService] 🔄 === PHASE TRANSITION ===');
    console.log('[FlowService] 🔄 From:', oldPhase, '→ To:', newPhase);
    console.log('[FlowService] 🔄 Context:', context || 'No context provided');
    console.log('[FlowService] 🔄 Video will be shown:', newPhase === 'CAMERA_STARTING' || newPhase === 'WAITING_FOR_GATES');

    // Validate phase transition
    if (!this._isValidTransition(oldPhase, newPhase)) {
      console.warn('[FlowService] ⚠️ Invalid phase transition:', oldPhase, '→', newPhase);
    }

    this._currentPhase.set(newPhase);

    // Update processing state
    this._isProcessing.set(this.isInProcessingState());

    console.log('[FlowService] ✅ Phase transition completed');
  }

  /**
   * Create a safe timeout that will be automatically cleaned up
   * 
   * @param callback Function to execute after delay
   * @param delay Delay in milliseconds
   * @returns Timeout ID for manual cleanup if needed
   */
  createSafeTimeout(callback: () => void, delay: number): number {
    const timeoutId = window.setTimeout(() => {
      // Remove from active timeouts when it fires
      this.activeTimeouts.delete(timeoutId);
      callback();
    }, delay);

    // Track this timeout for cleanup
    this.activeTimeouts.add(timeoutId);
    
    console.log('[FlowService] ⏰ Created safe timeout:', timeoutId, 'delay:', delay + 'ms');
    
    return timeoutId;
  }

  /**
   * Clear a specific timeout and remove from tracking
   * 
   * @param timeoutId Timeout ID to clear
   */
  clearSafeTimeout(timeoutId: number): void {
    if (this.activeTimeouts.has(timeoutId)) {
      clearTimeout(timeoutId);
      this.activeTimeouts.delete(timeoutId);
      console.log('[FlowService] ⏰ Cleared safe timeout:', timeoutId);
    }
  }

  /**
   * Reset flow to initial state
   * Used for retry attempts or component reinitialization
   */
  resetFlow(): void {
    console.log('[FlowService] 🔄 Resetting flow to initial state');
    
    this.setPhase('CAMERA_STARTING', 'Flow reset');
    this._isProcessing.set(false);
    this._clearAllTimeouts();
  }

  /**
   * Get current flow state for debugging
   * 
   * @returns Current flow state information
   */
  getFlowDebugInfo(): {
    currentPhase: CheckinPhase;
    isProcessing: boolean;
    shouldShowVideo: boolean;
    isCameraActive: boolean;
    activeTimeouts: number;
  } {
    return {
      currentPhase: this._currentPhase(),
      isProcessing: this._isProcessing(),
      shouldShowVideo: this.shouldShowVideo(),
      isCameraActive: this.isCameraActive(),
      activeTimeouts: this.activeTimeouts.size
    };
  }

  /**
   * Complete check-in flow and transition to success
   * Called when check-in is successfully submitted
   */
  completeFlow(): void {
    console.log('[FlowService] 🎉 Completing check-in flow');
    this.setPhase('SUCCESS_MODAL', 'Check-in completed');
  }

  /**
   * Handle flow error and determine recovery action
   * 
   * @param error Error that occurred
   * @param allowRetry Whether to allow retry or exit
   */
  handleError(error: string, allowRetry: boolean = true): void {
    console.error('[FlowService] ❌ Flow error:', error);
    
    if (allowRetry) {
      console.log('[FlowService] 🔄 Allowing retry, resetting to gates');
      this.setPhase('WAITING_FOR_GATES', 'Error recovery');
    } else {
      console.log('[FlowService] 🚪 Critical error, flow cannot continue');
      // Let component handle exit logic
    }
  }

  /**
   * Clean up flow service state and resources
   * Called during component destruction
   */
  cleanup(): void {
    console.log('[FlowService] 🧹 Cleaning up flow service');
    
    this._clearAllTimeouts();
    this.resetFlow();
    
    console.log('[FlowService] ✅ Flow service cleanup completed');
  }

  // ==========================================
  // PRIVATE METHODS
  // ==========================================

  /**
   * Validate that a phase transition is allowed
   * Helps catch invalid state transitions during development
   * 
   * @param from Current phase
   * @param to Target phase
   * @returns true if transition is valid
   */
  private _isValidTransition(from: CheckinPhase, to: CheckinPhase): boolean {
    // Define valid transitions
    const validTransitions: Record<CheckinPhase, CheckinPhase[]> = {
      'CAMERA_STARTING': ['WAITING_FOR_GATES'],
      'WAITING_FOR_GATES': ['PHOTO_CAPTURED', 'CAMERA_STARTING'], // Allow retry
      'PHOTO_CAPTURED': ['LLM_THINKING'],
      'LLM_THINKING': ['CHECK_IN_PROCESSING', 'WAITING_FOR_GATES'], // Allow retry on LLM failure
      'CHECK_IN_PROCESSING': ['SUCCESS_MODAL'],
      'SUCCESS_MODAL': ['CAMERA_STARTING'] // Allow restart (though component usually exits)
    };

    return validTransitions[from]?.includes(to) ?? false;
  }

  /**
   * Clear all active timeouts to prevent memory leaks
   */
  private _clearAllTimeouts(): void {
    console.log('[FlowService] 🧹 Clearing active timeouts:', this.activeTimeouts.size);
    
    this.activeTimeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    
    this.activeTimeouts.clear();
    
    console.log('[FlowService] 🧹 All timeouts cleared');
  }
}