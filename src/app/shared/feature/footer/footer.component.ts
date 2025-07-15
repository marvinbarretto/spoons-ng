import { Component } from '@angular/core';
import { DevDebugComponent } from "../../utils/dev-debug/dev-debug.component";
import { ChangeDetectionStrategy } from '@angular/core';
import { APP_VERSION } from '../../utils/version';
import { environment } from '../../../../environments/environment';


@Component({
  selector: 'app-footer',
  imports: [DevDebugComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="footer">
        <app-dev-debug />
      <div class="footer-content">
        <p>&copy; {{ currentYear }} Spoonscount {{ version }}</p>
      </div>
    </footer>
  `,
  styles: `
.footer {
      background-color: var(--background-darkest, #f8fafc);
      color: var(--text-secondary, #64748b);
      padding: 2rem 1rem 1rem;
      text-align: center;
      border-top: 1px solid var(--border, #e2e8f0);

      /* ✅ Add bottom padding on mobile to account for fixed nav */
      padding-bottom: calc(1rem + env(safe-area-inset-bottom));

      @media (max-width: 767px) {
        /* ✅ Add space for fixed footer nav on mobile */
        padding-bottom: calc(70px + env(safe-area-inset-bottom));
      }

      @media (min-width: 768px) {
        /* ✅ Normal padding on desktop */
        padding-bottom: 1rem;
      }
    }

    .footer-content {
      max-width: 1200px;
      margin: 0 auto;

      p {
        margin: 0.5rem 0;
        font-size: 0.875rem;
      }

      .version {
        opacity: 0.7;
        font-size: 0.75rem;
      }
    }
  `
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
  readonly version = APP_VERSION;
}
