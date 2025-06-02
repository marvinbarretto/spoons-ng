import { Component } from '@angular/core';
import { DevDebugComponent } from "../../utils/dev-debug/dev-debug.component";
import { ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-footer',
  imports: [DevDebugComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dev-debug></app-dev-debug>
    <footer class="footer">
      <p>
        &copy; {{ currentYear }} Spoons. All rights reserved.
      </p>
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
}
