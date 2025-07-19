// src/app/shared/data-access/overlay.service.ts
import {
  ComponentRef,
  EnvironmentInjector,
  Injectable,
  Injector,
  Type,
  EventEmitter,
} from '@angular/core';
import {
  Overlay,
  OverlayRef,
  OverlayConfig,
  GlobalPositionStrategy,
} from '@angular/cdk/overlay';
import {
  ComponentPortal,
} from '@angular/cdk/portal';
import { FocusTrap, FocusTrapFactory } from '@angular/cdk/a11y';
import { Subscription } from 'rxjs';

export interface OverlayResult<T, R = any> {
  componentRef: ComponentRef<T>;
  overlayRef: OverlayRef;
  result: Promise<R | undefined>;
  close: (value?: R) => void;
}

@Injectable({ providedIn: 'root' })
export class OverlayService {
  private overlayRef?: OverlayRef;
  private focusTrap?: FocusTrap;
  private backdropSubscription?: Subscription;
  private keydownSubscription?: Subscription;
  private resultResolver?: (value: any) => void;

  private keydownListener = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.close();
    }
  };

  constructor(
    private overlay: Overlay,
    private injector: Injector,
    private environmentInjector: EnvironmentInjector,
    private focusTrapFactory: FocusTrapFactory
  ) {}

  private createResponsivePositionStrategy(): GlobalPositionStrategy {
    return this.overlay.position()
      .global()
      .centerHorizontally()
      .centerVertically();
  }

  /**
   * Open an overlay component with promise-based result handling
   */
  open<T, R = any>(
    component: Type<T>,
    config: Partial<OverlayConfig> = {},
    inputs: Record<string, any> = {}
  ): OverlayResult<T, R> {
    // Close any existing overlay
    if (this.overlayRef) {
      this.close();
    }

    // Create overlay
    this.overlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'overlay-backdrop',
      panelClass: 'overlay-panel',
      scrollStrategy: this.overlay.scrollStrategies.block(),
      positionStrategy: this.createResponsivePositionStrategy(),
      maxWidth: '90vw',
      maxHeight: '90vh',
      minWidth: '320px',
      width: 'auto',
      height: 'auto',
      ...config,
    });

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    // Create component
    const portal = new ComponentPortal(component, null, this.injector);
    const componentRef = this.overlayRef.attach(portal);

    // Set inputs
    for (const [key, value] of Object.entries(inputs)) {
      if (componentRef.setInput) {
        componentRef.setInput(key, value);
      } else {
        (componentRef.instance as any)[key] = value;
      }
    }

    // Create result promise
    const resultPromise = new Promise<R | undefined>((resolve) => {
      this.resultResolver = resolve;

      // Handle backdrop click
      this.backdropSubscription = this.overlayRef!.backdropClick().subscribe(() => {
        this.close(undefined);
      });

      // Handle escape key
      document.addEventListener('keydown', this.keydownListener);

      // Check if component has a result output (modern output() or legacy EventEmitter)
      const instance = componentRef.instance as any;
      console.log('[OverlayService] Checking for result output on component:', {
        hasResult: !!instance.result,
        resultType: instance.result?.constructor?.name,
        isEventEmitter: instance.result instanceof EventEmitter,
        hasSubscribe: instance.result && typeof instance.result.subscribe === 'function'
      });

      if (instance.result && typeof instance.result.subscribe === 'function') {
        console.log('[OverlayService] Setting up result subscription for modal closure');
        const resultSub = instance.result.subscribe((value: R) => {
          console.log('[OverlayService] Result emitted, closing modal with value:', value);
          resultSub.unsubscribe();
          this.close(value);
        });
        console.log('[OverlayService] Result subscription created successfully');
      } else {
        console.log('[OverlayService] No valid result output found - modal will not auto-close on result emission');
      }

      // Support legacy callback pattern for backward compatibility
      if (typeof instance.closeCallback === 'undefined') {
        instance.closeCallback = (value: R) => {
          this.close(value);
        };
      }
    });

    // Setup focus trap
    const element = this.overlayRef.overlayElement;
    this.focusTrap = this.focusTrapFactory.create(element);
    this.focusTrap.focusInitialElementWhenReady();

    // Return overlay result
    return {
      componentRef,
      overlayRef: this.overlayRef,
      result: resultPromise,
      close: (value?: R) => this.close(value)
    };
  }

  /**
   * Close the overlay and resolve the promise
   */
  close(value?: any): void {
    // Resolve the promise if we have a resolver
    if (this.resultResolver) {
      this.resultResolver(value);
      this.resultResolver = undefined;
    }

    // Restore body scroll
    document.body.style.overflow = '';

    // Cleanup subscriptions
    this.backdropSubscription?.unsubscribe();
    this.backdropSubscription = undefined;

    // Cleanup overlay
    this.overlayRef?.dispose();
    this.overlayRef = undefined;

    // Cleanup focus trap
    this.focusTrap?.destroy();
    this.focusTrap = undefined;

    // Remove event listeners
    document.removeEventListener('keydown', this.keydownListener);
  }

  /**
   * Legacy method for components to close themselves
   * @deprecated Use the close method from the OverlayResult instead
   */
  closeFromComponent(value?: any): void {
    console.warn('[OverlayService] closeFromComponent is deprecated. Use the close method from OverlayResult.');
    this.close(value);
  }
}
