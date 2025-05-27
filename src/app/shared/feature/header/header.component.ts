import {
  Component,
  HostBinding,
  OnInit,
  inject,
  AfterViewInit,
  computed,
  signal,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { CommonModule } from '@angular/common';
import { FeatureFlagPipe } from '../../utils/feature-flag.pipe';
import { SsrPlatformService } from '../../utils/ssr/ssr-platform.service';
import { PageStore } from '../../../pages/data-access/page.store';
import { PanelStore, PanelType } from '../../ui/panel/panel.store';
import { ViewportService } from '../../data-access/viewport.service';
import { UserInfoComponent } from "../user-info/user-info.component";

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  imports: [
    RouterModule,
    CommonModule,
    FeatureFlagPipe,
    UserInfoComponent
],
})
export class HeaderComponent implements OnInit, AfterViewInit {
  private readonly router = inject(Router);
  private readonly platform = inject(SsrPlatformService);


  // TODO: Fix this and find better way, maybe abstract this to a helper ?
  // this.router.url is not reactive, so we need a signal
  // private readonly currentRoute$$ = signal<string>(this.router.url);
  private currentRoute$$ = signal<string>('');

  constructor() {
    this.router.events.subscribe(() => {
      this.currentRoute$$.set(this.router.url)
    })
  }

  readonly isHomepage$$ = computed(() => this.currentRoute$$() === '/');



  readonly pageStore = inject(PageStore);
  readonly panelStore = inject(PanelStore);
  readonly isMobile$$ = inject(ViewportService).isMobile$$;



  @ViewChild('headerRef', { static: false }) headerRef!: ElementRef;
  @ViewChild('panelTrigger', { static: false }) panelTriggerRef!: ElementRef;

  ngOnInit(): void {

    console.log('isHomepage$$', this.isHomepage$$());
    console.log('currentRoute$$', this.currentRoute$$());
  }


  ngAfterViewInit(): void {
    if (this.platform.isServer) return;
    this.updatePanelOrigin();
  }


  private updatePanelOrigin() {
    const rect = this.headerRef?.nativeElement?.getBoundingClientRect();
    const offsetY = rect.bottom + window.scrollY; // in case page is scrolled
    this.panelStore.setOriginY(offsetY);
  }

  // Opens or closes a panel based on current state
  togglePanel(panel: PanelType) {
    if (this.platform.isServer) return;

    // Position panel relative to the clicked trigger
    const button = this.panelTriggerRef?.nativeElement as HTMLElement;
    const y = button?.getBoundingClientRect().bottom + window.scrollY;

    this.panelStore.setOriginY(y);
    this.panelStore.toggle(panel);
  }



  @HostBinding('class.is-mobile') get isMobileClass() {
    return this.isMobile$$();
  }

  @HostBinding('class.is-homepage') get isHomepageClass() {
    return this.isHomepage$$();
  }
}
