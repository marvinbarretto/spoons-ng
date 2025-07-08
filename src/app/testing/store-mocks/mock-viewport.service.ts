import { signal, computed } from '@angular/core';

export class MockViewportService {
  private _isMobile = signal(false);
  private _isDesktop = signal(true);
  private _screenWidth = signal(1024);
  private _screenHeight = signal(768);

  // Expose as readonly to match real ViewportService
  readonly isMobile = this._isMobile.asReadonly();
  readonly isDesktop = this._isDesktop.asReadonly();
  readonly screenWidth = this._screenWidth.asReadonly();
  readonly screenHeight = this._screenHeight.asReadonly();

  readonly isTablet = computed(() => !this._isMobile() && !this._isDesktop());
  readonly orientation = computed(() => this._screenWidth() > this._screenHeight() ? 'landscape' : 'portrait');

  // Test helper methods
  setMobile(isMobile: boolean): void {
    this._isMobile.set(isMobile);
    this._isDesktop.set(!isMobile);
  }

  setDesktop(isDesktop: boolean): void {
    this._isDesktop.set(isDesktop);
    this._isMobile.set(!isDesktop);
  }

  setScreenSize(width: number, height: number): void {
    this._screenWidth.set(width);
    this._screenHeight.set(height);
  }

  // Mock implementations
  checkViewport(): void {
    // Mock implementation
  }

  onResize(): void {
    // Mock implementation
  }
}