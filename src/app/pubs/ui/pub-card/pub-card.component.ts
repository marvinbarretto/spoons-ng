import { Component, computed } from '@angular/core';
import { input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { Pub } from '../../utils/pub.models';

@Component({
  selector: 'app-pub-card',
  imports: [CommonModule],
  template: `
    <div class="pub-card">
      <h3>{{ pub().name }}</h3>
      <p>{{ pub().address }}</p>

      @if (distanceText()) {
        <p class="distance">{{ distanceText() }}</p>
      }

      @if (hasCheckedIn()) {
        <span class="checked-in">✅ Checked In</span>
      }

      <!-- Debug info during development -->
      @if (isDevelopment()) {
        <details class="debug">
          <summary>Debug Info</summary>
          <pre>{{ debugInfo() | json }}</pre>
        </details>
      }
    </div>
  `,
})
export class PubCardComponent {
  // ✅ New signal-based inputs
  readonly pub = input.required<Pub & { distance: number | null }>();
  readonly hasCheckedIn = input<boolean>(false);

  // ✅ Computed signal for distance text
  readonly distanceText = computed(() => {
    const distance = this.pub().distance;
    if (!distance) return '';
    return `${(distance / 1000).toFixed(1)}km away`;
  });

  // ✅ Development helper
  readonly isDevelopment = computed(() => !environment.production);

  // ✅ Debug info for development
  readonly debugInfo = computed(() => ({
    pubId: this.pub().id,
    distance: this.pub().distance,
    hasCheckedIn: this.hasCheckedIn(),
    location: this.pub().location
  }));
}
