import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { SsrPlatformService } from './ssr/ssr-platform.service';

@Injectable({ providedIn: 'root' })
export class DeviceCapabilityService {
  private readonly platform = inject(SsrPlatformService);

  readonly devicePixelRatio = signal(1);
  readonly hasHighDpi = signal(false);
  readonly prefersReducedMotion = signal(false);
  readonly hardwareConcurrency = signal(1);
  readonly isTouchDevice = signal(false);
  readonly userAgent = signal('');
  readonly connectionType = signal<'wifi' | 'cellular' | 'none' | 'unknown'>('unknown');
  readonly effectiveConnectionType = signal<'slow-2g' | '2g' | '3g' | '4g' | 'unknown'>('unknown');
  readonly deviceMemoryGB = signal<number | null>(null);

  readonly isLowPowerDevice = computed(() =>
    this.hardwareConcurrency() < 2 || this.prefersReducedMotion()
  );

  constructor() {

    if (this.platform.isBrowser) {
      effect(() => {
        const win = this.platform.getWindow();
        if (!win) return;

        const nav = win.navigator;

        const dpi = win.devicePixelRatio || 1;
        const motionPref = win.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const cores = nav.hardwareConcurrency || 1;
        const ua = nav.userAgent || '';

        const touch =
          'ontouchstart' in win ||
          (typeof nav.maxTouchPoints === 'number' && nav.maxTouchPoints > 0);

        const connection = (nav as any).connection || {};
        const connectionType = connection.type ?? 'unknown';
        const effectiveType = connection.effectiveType ?? 'unknown';

        const memory = 'deviceMemory' in nav ? (nav as any).deviceMemory : null;

        // Set signals
        this.devicePixelRatio.set(dpi);
        this.hasHighDpi.set(dpi >= 1.5);
        this.prefersReducedMotion.set(motionPref);
        this.hardwareConcurrency.set(cores);
        this.userAgent.set(ua);
        this.isTouchDevice.set(touch);
        this.connectionType.set(connectionType);
        this.effectiveConnectionType.set(effectiveType);
        this.deviceMemoryGB.set(memory);

        // Log raw diagnostics
        // console.group('%c[DeviceCapabilityService] 🧠 Raw Device Insights', 'color: #7c4dff; font-weight: bold');
        // console.log('userAgent:', ua);
        // console.log('devicePixelRatio:', dpi);
        // console.log('hasHighDpi:', dpi >= 1.5);
        // console.log('hardwareConcurrency:', cores);
        // console.log('prefersReducedMotion:', motionPref);
        // console.log('isTouchDevice:', touch);
        // console.log('connectionType:', connectionType);
        // console.log('effectiveConnectionType:', effectiveType);
        // console.log('deviceMemoryGB:', memory);
        // console.groupEnd();
      });
    }
  }
}
