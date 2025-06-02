import { inject, Injectable, signal } from '@angular/core';
import { SsrPlatformService } from '../utils/ssr/ssr-platform.service';
import { BREAKPOINTS } from '../utils/constants';

@Injectable({ providedIn: 'root' })
export class ViewportService {
  readonly isMobile = signal(false);
  private readonly platform = inject(SsrPlatformService);

  constructor() {
    if (this.platform.isServer) return;
    const check = () =>
      this.isMobile.set(window.innerWidth < BREAKPOINTS.DESKTOP_MIN);
    window.addEventListener('resize', check);
    check(); // initial
  }
}
