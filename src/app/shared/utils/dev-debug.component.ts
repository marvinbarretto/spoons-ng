import { Component, inject } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { AuthStore } from '../../auth/data-access/auth.store';
import { environment } from '../../../environments/environment';
import { PanelStore } from '../ui/panel/panel.store';
import { ViewportService } from '../data-access/viewport.service';
import { DeviceCapabilityService } from './device-capability-check.service';

@Component({
  selector: 'app-dev-debug',
  standalone: true,
  imports: [JsonPipe],
  template: `
    <div class="debug-panel">
      <pre>User: {{ user$$() | json }}</pre>
      <pre>Token: {{ token$$() }}</pre>
      <pre>Mobile view: {{ isMobile$$() }}</pre>
      <pre>Active panel: {{ activePanel$$() }}</pre>
      <pre>Device Pixel Ratio: {{ devicePixelRatio$$ }}</pre>
      <pre>Hardware Concurrency: {{ hardwareConcurrency$$ }}</pre>
      <pre>Is Low Power Device: {{ isLowPowerDevice$$ }}</pre>
      <pre>Is Touch Device: {{ isTouchDevice$$ }}</pre>
      <pre>Connection Type: {{ connectionType$$ }}</pre>
      <pre>Effective Connection Type: {{ effectiveConnectionType$$ }}</pre>
      <pre>Device Memory (GB): {{ deviceMemoryGB$$ }}</pre>
    </div>
  `,
  styles: [
    `
      .debug-panel {
        position: fixed;
        bottom: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        font-size: 12px;
        padding: 10px;
        max-width: 300px;
        z-index: 1000;
      }
    `,
  ],
})
export class DevDebugComponent {
  private readonly authStore = inject(AuthStore);
  private readonly panelStore = inject(PanelStore);
  private readonly viewport = inject(ViewportService);
  private readonly device = inject(DeviceCapabilityService);

  user$$ = this.authStore.user$$;
  token$$ = this.authStore.token$$;
  isMobile$$ = this.viewport.isMobile$$;
  activePanel$$ = this.panelStore.activePanel;
  devicePixelRatio$$ = this.device!.devicePixelRatio$$();
  hardwareConcurrency$$ = this.device!.hardwareConcurrency$$();
  prefersReducedMotion$$ = this.device!.prefersReducedMotion$$();
  isLowPowerDevice$$ = this.device!.isLowPowerDevice$$();
  isTouchDevice$$ = this.device!.isTouchDevice$$();
  connectionType$$ = this.device!.connectionType$$();
  effectiveConnectionType$$ = this.device!.effectiveConnectionType$$();
  deviceMemoryGB$$ = this.device!.deviceMemoryGB$$();

  isDev = !environment.production;
}
