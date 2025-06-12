// src/app/shared/data-access/overlay.service.ts
import {
  ComponentRef,
  EnvironmentInjector,
  Injectable,
  Injector,
  Type,
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

@Injectable({ providedIn: 'root' })
export class OverlayService {
  private overlayRef?: OverlayRef;
  private focusTrap?: FocusTrap;
  private backdropSubscription?: Subscription;

  private keydownListener = (event: KeyboardEvent) => {
    if (event.key === 'Escape') this.close();
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

  open<T>(
    component: Type<T>,
    config: Partial<OverlayConfig> = {},
    inputs: Record<string, any> = {}
  ): {
    componentRef: ComponentRef<T>;
    close: (value?: any) => void;
  } {
    if (this.overlayRef) this.close();

    this.overlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'overlay-backdrop',
      panelClass: 'overlay-panel',
      scrollStrategy: this.overlay.scrollStrategies.block(),
      positionStrategy: this.createResponsivePositionStrategy(),
      // ✅ Responsive width/height constraints
      maxWidth: '95vw',
      maxHeight: '95vh',
      minWidth: '320px',
      width: 'auto',
      height: 'auto',
      ...config,
    });

    this.backdropSubscription = this.overlayRef.backdropClick().subscribe(() => this.close());
    document.addEventListener('keydown', this.keydownListener);

    // ✅ Prevent body scroll when modal is open (mobile fix)
    document.body.style.overflow = 'hidden';

    const portal = new ComponentPortal(component, null, this.injector, this.environmentInjector);
    const componentRef = this.overlayRef.attach(portal);

    // Set inputs if provided
    for (const [key, value] of Object.entries(inputs)) {
      if (componentRef.setInput) {
        componentRef.setInput(key, value);
      } else {
        (componentRef.instance as any)[key] = value;
      }
    }

    const element = this.overlayRef.overlayElement;
    this.focusTrap = this.focusTrapFactory.create(element);
    this.focusTrap.focusInitialElementWhenReady();

    const close = (value?: any) => this.close(value);

    return { componentRef, close };
  }

  close(value?: any): void {
    // ✅ Restore body scroll
    document.body.style.overflow = '';

    this.backdropSubscription?.unsubscribe();
    this.backdropSubscription = undefined;

    this.overlayRef?.dispose();
    this.overlayRef = undefined;
    this.focusTrap?.destroy();
    this.focusTrap = undefined;
    document.removeEventListener('keydown', this.keydownListener);
  }

  closeFromComponent(value?: any): void {
    this.close(value);
  }
}
