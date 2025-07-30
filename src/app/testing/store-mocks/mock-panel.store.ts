import { computed, signal } from '@angular/core';

export class MockPanelStore {
  private _isOpen = signal(false);
  private _panelType = signal<string | null>(null);
  private _panelData = signal<any>(null);
  private _loading = signal(false);
  private _error = signal<string | null>(null);

  // Expose as readonly to match real PanelStore
  readonly isOpen = this._isOpen.asReadonly();
  readonly panelType = this._panelType.asReadonly();
  readonly panelData = this._panelData.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly hasPanel = computed(() => !!this._panelType());
  readonly isLoading = computed(() => this._loading());
  readonly hasError = computed(() => !!this._error());

  // Test helper methods
  setOpen(isOpen: boolean): void {
    this._isOpen.set(isOpen);
  }

  setPanelType(type: string | null): void {
    this._panelType.set(type);
  }

  setPanelData(data: any): void {
    this._panelData.set(data);
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  setError(error: string | null): void {
    this._error.set(error);
  }

  // Mock implementations
  openPanel(type: string, data?: any): void {
    this._panelType.set(type);
    this._panelData.set(data);
    this._isOpen.set(true);
  }

  closePanel(): void {
    this._isOpen.set(false);
    this._panelType.set(null);
    this._panelData.set(null);
  }

  toggle(panelType: string): void {
    if (this._isOpen() && this._panelType() === panelType) {
      this.closePanel();
    } else {
      this.openPanel(panelType);
    }
  }

  setOriginY(y: number): void {
    // Mock implementation - just a no-op for testing
  }

  reset(): void {
    this._isOpen.set(false);
    this._panelType.set(null);
    this._panelData.set(null);
    this._loading.set(false);
    this._error.set(null);
  }
}
