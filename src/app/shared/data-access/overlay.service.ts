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


@Injectable({ providedIn: 'root' })
export class OverlayService {
  private overlayRef?: OverlayRef;
  private focusTrap?: FocusTrap;
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

  private createCentrePositionStrategy(): GlobalPositionStrategy {
    return this.overlay.position()
      .global()
      .centerHorizontally()
      .centerVertically();
  }

  open<T>(
    component: Type<T>,
    config: Partial<OverlayConfig> = {},
    inputs?: Record<string, any>
  ): { componentRef: ComponentRef<T>; close: () => void } {
    if (this.overlayRef) {
      this.close();
    }

    this.overlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'overlay-backdrop',
      panelClass: 'overlay-panel',
      scrollStrategy: this.overlay.scrollStrategies.block(),
      positionStrategy: this.createCentrePositionStrategy(),
      ...config,
    });

    this.overlayRef.backdropClick().subscribe(() => this.close());

    document.addEventListener('keydown', this.keydownListener);

    const portal = new ComponentPortal(component, null, this.injector, this.environmentInjector);
    const componentRef = this.overlayRef.attach(portal);

    if (inputs) {
      for (const [key, value] of Object.entries(inputs)) {
        if (componentRef.setInput) {
          componentRef.setInput(key, value);
        } else {
          (componentRef.instance as any)[key] = value;
        }
      }
    }

    const element = this.overlayRef.overlayElement;
    this.focusTrap = this.focusTrapFactory.create(element);
    this.focusTrap.focusInitialElementWhenReady();

    return {
      componentRef,
      close: () => this.close(),
    };
  }

  close(): void {
    this.overlayRef?.dispose();
    this.overlayRef = undefined;
    this.focusTrap?.destroy();
    document.removeEventListener('keydown', this.keydownListener);
  }
}

