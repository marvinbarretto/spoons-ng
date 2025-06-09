import {
  ComponentRef,
  EnvironmentInjector,
  Injectable,
  Injector,
  Signal,
  signal,
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

  private createCentrePositionStrategy(): GlobalPositionStrategy {
    return this.overlay.position()
      .global()
      .centerHorizontally()
      .centerVertically();
  }

  // ✅ Your preferred API - restored!
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
      positionStrategy: this.createCentrePositionStrategy(),
      ...config,
    });

    this.backdropSubscription = this.overlayRef.backdropClick().subscribe(() => this.close());
    document.addEventListener('keydown', this.keydownListener);

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

    // ✅ Return the API you prefer
    const close = (value?: any) => this.close(value);

    return { componentRef, close };
  }

  close(value?: any): void {
    this.backdropSubscription?.unsubscribe();
    this.backdropSubscription = undefined;

    this.overlayRef?.dispose();
    this.overlayRef = undefined;
    this.focusTrap?.destroy();
    this.focusTrap = undefined;
    document.removeEventListener('keydown', this.keydownListener);
  }

  // ✅ Keep this for components that want to close themselves
  closeFromComponent(value?: any): void {
    this.close(value);
  }
}
