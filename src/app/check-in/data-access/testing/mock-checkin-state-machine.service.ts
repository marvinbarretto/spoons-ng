import { computed, Injectable, signal } from '@angular/core';
import { CheckinPhase } from '../checkin-state-machine.service';

/**
 * Mock implementation of CheckinStateMachineService for testing
 */
@Injectable()
export class MockCheckinStateMachineService {
  private readonly _phase = signal<CheckinPhase>('CAMERA_STARTING');
  private readonly _history = signal<CheckinPhase[]>([]);
  private readonly _error = signal<string | null>(null);

  readonly phase = this._phase.asReadonly();
  readonly history = this._history.asReadonly();
  readonly error = this._error.asReadonly();

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
    return phase === 'CAMERA_STARTING' || phase === 'WAITING_FOR_GATES';
  });

  transitionTo(newPhase: CheckinPhase): void {
    console.log(`[MockCheckinState] Transition: ${this._phase()} → ${newPhase}`);
    const currentPhase = this._phase();
    this._history.update(h => [...h, currentPhase]);
    this._phase.set(newPhase);
  }

  setError(message: string): void {
    console.log('[MockCheckinState] Error:', message);
    this._error.set(message);
  }

  reset(): void {
    console.log('[MockCheckinState] Resetting');
    this._phase.set('CAMERA_STARTING');
    this._history.set([]);
    this._error.set(null);
  }

  /**
   * Test helper to directly set phase without validation
   */
  setPhase(phase: CheckinPhase): void {
    this._phase.set(phase);
  }

  /**
   * Test helper to check if phase was visited
   */
  wasPhaseVisited(phase: CheckinPhase): boolean {
    return this._history().includes(phase);
  }
}
