import { computed, Injectable, signal } from '@angular/core';

// State machine phases
export type CheckinPhase =
  | 'CAMERA_STARTING'
  | 'WAITING_FOR_GATES'
  | 'PHOTO_CAPTURED'
  | 'LLM_THINKING'
  | 'NOT_CARPET_DETECTED'
  | 'CHECK_IN_PROCESSING'
  | 'SUCCESS_MODAL';

@Injectable({ providedIn: 'root' })
export class CheckinStateMachineService {
  // Private state
  private readonly _phase = signal<CheckinPhase>('CAMERA_STARTING');
  private readonly _history = signal<CheckinPhase[]>([]);
  private readonly _error = signal<string | null>(null);

  // Public readonly signals
  readonly phase = this._phase.asReadonly();
  readonly history = this._history.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed helpers
  readonly isCapturing = computed(() => {
    const phase = this.phase();
    return phase === 'PHOTO_CAPTURED' || phase === 'LLM_THINKING';
  });

  readonly canRetry = computed(() => {
    const phase = this.phase();
    return phase === 'NOT_CARPET_DETECTED';
  });

  readonly isProcessing = computed(() => {
    const phase = this.phase();
    return phase === 'LLM_THINKING' || phase === 'CHECK_IN_PROCESSING';
  });

  readonly showVideo = computed(() => {
    const phase = this.phase();
    const shouldShow = phase === 'CAMERA_STARTING' || phase === 'WAITING_FOR_GATES';

    console.log('[CheckinState] Video visibility check:', {
      phase,
      shouldShow,
    });

    return shouldShow;
  });

  /**
   * Transition to a new phase with logging and validation
   */
  transitionTo(newPhase: CheckinPhase): void {
    const currentPhase = this._phase();

    console.log('[CheckinState] 🔄 === PHASE TRANSITION ===');
    console.log(`[CheckinState] 🔄 From: ${currentPhase} → To: ${newPhase}`);

    // Validate transition is allowed
    if (!this.isTransitionAllowed(currentPhase, newPhase)) {
      console.error(`[CheckinState] ❌ Invalid transition: ${currentPhase} → ${newPhase}`);
      return;
    }

    // Update history
    this._history.update(h => [...h, currentPhase]);

    // Set new phase
    this._phase.set(newPhase);

    // Clear error on successful transitions
    if (newPhase !== 'NOT_CARPET_DETECTED') {
      this._error.set(null);
    }
  }

  /**
   * Set an error message
   */
  setError(message: string): void {
    console.error('[CheckinState] Error:', message);
    this._error.set(message);
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    console.log('[CheckinState] Resetting to initial state');
    this._phase.set('CAMERA_STARTING');
    this._history.set([]);
    this._error.set(null);
  }

  /**
   * Check if a phase transition is allowed
   */
  private isTransitionAllowed(from: CheckinPhase, to: CheckinPhase): boolean {
    // Define allowed transitions
    const allowedTransitions: Record<CheckinPhase, CheckinPhase[]> = {
      CAMERA_STARTING: ['WAITING_FOR_GATES'],
      WAITING_FOR_GATES: ['PHOTO_CAPTURED', 'CAMERA_STARTING'],
      PHOTO_CAPTURED: ['LLM_THINKING'],
      LLM_THINKING: ['NOT_CARPET_DETECTED', 'CHECK_IN_PROCESSING'],
      NOT_CARPET_DETECTED: ['WAITING_FOR_GATES', 'CAMERA_STARTING'],
      CHECK_IN_PROCESSING: ['SUCCESS_MODAL', 'WAITING_FOR_GATES'],
      SUCCESS_MODAL: ['CAMERA_STARTING'],
    };

    return allowedTransitions[from]?.includes(to) ?? false;
  }
}
