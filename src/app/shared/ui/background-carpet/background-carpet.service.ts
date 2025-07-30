import { effect, Injectable, signal } from '@angular/core';

export interface BackgroundCarpetSettings {
  enabled: boolean;
  opacity: number; // 0 to 1
  intensity: number; // 0.1 to 2 (frequency multiplier)
  tileSize: 'small' | 'medium' | 'large'; // 40px, 60px, 80px
  performance: 'low' | 'medium' | 'high'; // affects tile count and update frequency
}

@Injectable({
  providedIn: 'root',
})
export class BackgroundCarpetService {
  private readonly STORAGE_KEY = 'background-carpet-settings';

  private readonly defaultSettings: BackgroundCarpetSettings = {
    enabled: true,
    opacity: 0.15,
    intensity: 1,
    tileSize: 'medium',
    performance: 'medium',
  };

  private readonly _settings = signal<BackgroundCarpetSettings>(this.loadSettings());

  readonly settings = this._settings.asReadonly();

  constructor() {
    // Auto-save settings when they change
    effect(() => {
      this.saveSettings(this._settings());
    });

    // Auto-disable on low battery or reduced motion
    this.setupPerformanceOptimizations();
  }

  updateSettings(partial: Partial<BackgroundCarpetSettings>): void {
    this._settings.set({
      ...this._settings(),
      ...partial,
    });
  }

  toggleEnabled(): void {
    this.updateSettings({ enabled: !this._settings().enabled });
  }

  setOpacity(opacity: number): void {
    this.updateSettings({
      opacity: Math.max(0, Math.min(1, opacity)),
    });
  }

  setIntensity(intensity: number): void {
    this.updateSettings({
      intensity: Math.max(0.1, Math.min(2, intensity)),
    });
  }

  setPerformanceMode(performance: 'low' | 'medium' | 'high'): void {
    this.updateSettings({ performance });
  }

  resetToDefaults(): void {
    this._settings.set({ ...this.defaultSettings });
  }

  // Get computed values based on settings
  getTileSize(): number {
    const sizeMap = {
      small: 40,
      medium: 60,
      large: 80,
    };
    return sizeMap[this._settings().tileSize];
  }

  getUpdateInterval(): number {
    const performanceMap = {
      low: 1000, // 1 FPS
      medium: 500, // 2 FPS
      high: 250, // 4 FPS
    };
    return performanceMap[this._settings().performance];
  }

  getMaxTiles(): number {
    const performanceMap = {
      low: 200, // Fewer tiles on low performance
      medium: 400, // Standard tile count
      high: 800, // More tiles on high performance
    };
    return performanceMap[this._settings().performance];
  }

  private loadSettings(): BackgroundCarpetSettings {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new settings
        return { ...this.defaultSettings, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load background carpet settings:', error);
    }
    return { ...this.defaultSettings };
  }

  private saveSettings(settings: BackgroundCarpetSettings): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save background carpet settings:', error);
    }
  }

  private setupPerformanceOptimizations(): void {
    // Disable on low battery
    if ('getBattery' in navigator) {
      (navigator as any)
        .getBattery()
        .then((battery: any) => {
          const checkBattery = () => {
            if (battery.level < 0.2 && !battery.charging) {
              this.updateSettings({ enabled: false });
            }
          };

          battery.addEventListener('levelchange', checkBattery);
          battery.addEventListener('chargingchange', checkBattery);
          checkBattery();
        })
        .catch(() => {
          // Battery API not supported, continue normally
        });
    }

    // Respect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.updateSettings({ enabled: false });
    }

    // Disable on mobile by default (can be re-enabled by user)
    if (window.innerWidth < 768) {
      this.updateSettings({
        enabled: false,
        performance: 'low',
        tileSize: 'large',
      });
    }

    // Monitor performance and auto-adjust
    this.setupPerformanceMonitoring();
  }

  private setupPerformanceMonitoring(): void {
    // Simple frame rate monitoring
    let frameCount = 0;
    let lastCheck = Date.now();

    const checkPerformance = () => {
      frameCount++;
      const now = Date.now();

      if (now - lastCheck >= 5000) {
        // Check every 5 seconds
        const fps = (frameCount * 1000) / (now - lastCheck);

        // If main thread FPS drops below 30, reduce background performance
        if (fps < 30 && this._settings().performance !== 'low') {
          console.log('Background carpet: Reducing performance due to low FPS');
          this.setPerformanceMode('low');
        }

        frameCount = 0;
        lastCheck = now;
      }

      if (this._settings().enabled) {
        requestAnimationFrame(checkPerformance);
      }
    };

    // Only monitor if background is enabled
    if (this._settings().enabled) {
      requestAnimationFrame(checkPerformance);
    }
  }
}
