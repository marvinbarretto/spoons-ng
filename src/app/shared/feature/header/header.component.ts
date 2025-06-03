import {
  Component,
  HostBinding,
  AfterViewInit,
  computed,
  ElementRef,
  ViewChild,
  inject,
} from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

import { BaseComponent } from '../../data-access/base.component';
import { FeatureFlagPipe } from '../../utils/feature-flag.pipe';
import { PanelStore, PanelType } from '../../ui/panel/panel.store';
import { ViewportService } from '../../data-access/viewport.service';
import { UserInfoComponent } from "../user-info/user-info.component";
import { NavComponent } from "../nav/nav.component";

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  imports: [
    RouterModule,
    CommonModule,
    FeatureFlagPipe,
    UserInfoComponent,
    NavComponent,
  ],
})
export class HeaderComponent extends BaseComponent implements AfterViewInit {
  // 🔧 Services
  private readonly router = inject(Router);
  private readonly panelStore = inject(PanelStore);
  private readonly viewportService = inject(ViewportService);

  // 📡 Observables (rare cases)
  private readonly currentRoute$ = this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    map(event => event.url)
  );

  // 📡 Signals - reactive router tracking
  private readonly currentRoute = toSignal(this.currentRoute$, {
    initialValue: this.router.url
  });

  // 📡 Computed signals
  readonly isHomepage = computed(() => this.currentRoute() === '/');
  readonly isMobile = this.viewportService.isMobile;

  // 🎭 Template refs
  @ViewChild('headerRef', { static: false }) headerRef!: ElementRef;
  @ViewChild('panelTrigger', { static: false }) panelTriggerRef!: ElementRef;

  protected override onInit(): void {
    console.log('[HeaderComponent] Current route:', this.currentRoute());
    console.log('[HeaderComponent] Is homepage:', this.isHomepage());
  }

  ngAfterViewInit(): void {
    this.onlyOnBrowser(() => {
      this.updatePanelOrigin();
    });
  }

  // 🎬 Event handlers
  onTogglePanel(panel: PanelType): void {
    this.onlyOnBrowser(() => {
      // Position panel relative to the clicked trigger
      const button = this.panelTriggerRef?.nativeElement as HTMLElement;
      if (button) {
        const y = button.getBoundingClientRect().bottom + window.scrollY;
        this.panelStore.setOriginY(y);
      }
      this.panelStore.toggle(panel);
    });
  }

  // 🎬 Private methods
  private updatePanelOrigin(): void {
    const rect = this.headerRef?.nativeElement?.getBoundingClientRect();
    if (rect) {
      const offsetY = rect.bottom + window.scrollY;
      this.panelStore.setOriginY(offsetY);
    }
  }

  // 🎨 Host bindings
  @HostBinding('class.is-mobile')
  get isMobileClass(): boolean {
    return this.isMobile();
  }

  @HostBinding('class.is-homepage')
  get isHomepageClass(): boolean {
    return this.isHomepage();
  }
}
