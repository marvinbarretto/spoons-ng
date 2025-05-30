import {
  Component,
  HostBinding,
  HostListener,
  inject,
  OnInit,
} from '@angular/core';
import { PanelStore } from './panel.store';
import { SsrPlatformService } from '../../../shared/utils/ssr/ssr-platform.service';
import { computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-panel',
  standalone: true,
  imports: [CommonModule, A11yModule],
  templateUrl: './panel.component.html',
  styleUrls: ['./panel.component.scss'],
})
export class PanelComponent implements OnInit {
  readonly panelStore = inject(PanelStore);
  private readonly ssr = inject(SsrPlatformService);
  private readonly router = inject(Router);

  readonly isVisible = computed(() => this.panelStore.activePanel() !== null);

  @HostBinding('class.visible') get visibleClass() {
    return this.isVisible();
  }

  constructor() {
    this.ssr.onlyOnBrowser(() => {
      effect(() => {
        const visible = this.isVisible();
        // console.log(`[PanelComponent] visibility changed:`, visible);
        document.body.style.overflow = visible ? 'hidden' : '';
      });
    });
  }

  ngOnInit(): void {
    this.ssr.onlyOnBrowser(() => {
      this.router.events
        .pipe(filter(e => e instanceof NavigationEnd))
        .subscribe(() => {
          // console.log(`[PanelComponent] route changed, closing panel`);
          this.close();
        });
    });
  }

  close() {
    // console.log('[PanelComponent] close() called');
    this.panelStore.close();
  }

  @HostListener('document:keydown.escape')
  handleEscape() {
    if (this.isVisible()) {
      // console.log('[PanelComponent] Escape key pressed, closing panel');
      this.close();
    }
  }
}

