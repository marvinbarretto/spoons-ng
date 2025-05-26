import {
  Component,
  HostBinding,
  signal,
  computed,
  OnDestroy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SsrPlatformService } from '../../../shared/utils/ssr/ssr-platform.service';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="hero">

      <div class="hero__content">
        <h2 class="strapline">
          strapline
        </h2>
      </div>
    </section>
  `,
  styleUrls: ['./hero.component.scss'],
})
export class HeroComponent implements OnDestroy {
  private readonly platform = inject(SsrPlatformService);

  // 1) start with a harmless default
  viewport = signal({ w: 0, h: 0 });

  // SSR guard & init + listener
  private onResize = () =>
    this.viewport.set({ w: window.innerWidth, h: window.innerHeight });

  constructor() {
    this.platform.onlyOnBrowser(() => {
      // initial set once on the browser
      this.onResize();
      window.addEventListener('resize', this.onResize);
    });
  }

  ngOnDestroy() {
    this.platform.onlyOnBrowser(() => {
      window.removeEventListener('resize', this.onResize);
    });
  }

  // 2) derive hero‐height based on your breakpoints
  @HostBinding('style.--hero-height')
  heroHeight = computed(() => {
    const w = this.viewport().w;
    // 320─860px → 50vh
    if (w < 1200) return `50vh`;
    // 1200─∞ → 65vh
    return `65vh`;
  });

  // 3) bottom offset for the content
  @HostBinding('style.--content-bottom')
  contentBottom = computed(() => {
    const w = this.viewport().w;
    // <860 → 3rem, otherwise 6rem
    return w < 860 ? `3rem` : `6rem`;
  });

  // 4) focal‐Y (object-position) lift at >=1200
  @HostBinding('style.--focal-y')
  focalY = computed(() => (this.viewport().w < 1200 ? `50%` : `15%`));

  // (X always center)
  @HostBinding('style.--focal-x')
focalX = computed(() => '50%');
}
