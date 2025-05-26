import { signal, computed } from '@angular/core';
import { Injectable } from '@angular/core';

export type PanelType = 'theme' | 'search' | 'nav' | null;

@Injectable({ providedIn: 'root' })
export class PanelStore {
  // Stores the currently active panel
  private activePanel$$ = signal<PanelType>(null);

  // Computed accessor for the current panel
  readonly activePanel = computed(() => this.activePanel$$());

  // Whether any panel is open
  readonly isOpen = computed(() => !!this.activePanel$$());

  // Stores the Y position of the trigger (used for top positioning)
  private originY$$ = signal<number>(0);
  readonly originY = computed(() => this.originY$$());

  // Updates Y offset for the panel origin (top positioning)
  setOriginY(y: number) {
    this.originY$$.set(y);
  }

  // Open a panel without origin position
  open(panel: PanelType) {
    this.activePanel$$.set(panel);
  }

  // Open a panel and set the trigger's Y position
  openAt(panel: PanelType, originY: number) {
    this.originY$$.set(originY);
    this.open(panel);
  }

  // Close any open panel
  close() {
    this.activePanel$$.set(null);
  }

  // Toggle the panel open/closed
  toggle(panel: PanelType) {
    this.activePanel$$() === panel ? this.close() : this.open(panel);
  }
}
