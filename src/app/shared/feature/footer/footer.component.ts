import { Component } from '@angular/core';
import { DevDebugComponent } from "../../utils/dev-debug/dev-debug.component";
import { ChangeDetectionStrategy } from '@angular/core';
import { APP_VERSION } from '../../utils/version';

@Component({
  selector: 'app-footer',
  imports: [DevDebugComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dev-debug></app-dev-debug>
    <footer class="footer">
      <p>
        &copy; {{ currentYear }} Spooncount. All rights reserved.
      </p>
      <p>Version: {{ version }}</p>
    </footer>
  `,
  styles: `
    .footer {
      background-color: #333;
      color: #fff;
      padding: 1rem;
      text-align: center;
    }
    // TODO: Consilidate these styles centrally, use css variables
  `
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
  readonly version = APP_VERSION;
}
