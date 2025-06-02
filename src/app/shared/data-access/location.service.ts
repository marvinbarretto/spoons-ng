// location.service.ts
import { Injectable, signal, inject } from '@angular/core';
import { SsrPlatformService } from '../utils/ssr/ssr-platform.service';

export type GeoLocation = {
  lat: number;
  lng: number;
};

@Injectable({ providedIn: 'root' })
export class LocationService {
  private platform = inject(SsrPlatformService);

  readonly location = signal<GeoLocation | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);

  constructor() {
    this.getCurrentLocation();
  }

  getCurrentLocation(): void {
    if (!this.platform.isBrowser) {
      console.log('[LocationService] ❌ Not running in browser — skipping location');
      return;
    }

    if (!('geolocation' in navigator)) {
      this.error.set('Geolocation not supported');
      console.warn('[LocationService] ❌ Geolocation API not available');
      return;
    }

    this.loading.set(true);
    console.log('[LocationService] 📍 Attempting to get current position...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        this.location.set(coords);
        console.log('[LocationService] ✅ Position acquired:', coords);
        this.loading.set(false);
      },
      (error) => {
        this.error.set(error.message);
        console.warn('[LocationService] ❌ Geolocation error', {
          code: error.code,
          message: error.message
        });
        this.loading.set(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: 5000,
      }
    );
  }
}
