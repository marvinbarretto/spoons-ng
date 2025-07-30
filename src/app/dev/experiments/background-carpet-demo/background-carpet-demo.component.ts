import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { BaseComponent } from '../../../shared/base/base.component';
import { BackgroundCarpetComponent } from '../../../shared/ui/background-carpet/background-carpet.component';
import { BackgroundCarpetService } from '../../../shared/ui/background-carpet/background-carpet.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

@Component({
  selector: 'app-background-carpet-demo',
  standalone: true,
  imports: [CommonModule, ButtonComponent, BackgroundCarpetComponent],
  template: `
    <!-- Background component -->
    <app-background-carpet></app-background-carpet>

    <div class="demo-container">
      <div class="demo-content">
        <h3>🏠 Subtle Background Carpets</h3>
        <p>
          A very subtle animated background using pub carpet images. Perfect for ambient page
          backgrounds.
        </p>

        <div class="controls-panel">
          <div class="control-group">
            <h4>Basic Controls</h4>
            <div class="controls-row">
              <app-button
                [variant]="settings().enabled ? 'primary' : 'outline'"
                size="sm"
                (click)="toggleEnabled()"
              >
                {{ settings().enabled ? 'Enabled' : 'Disabled' }}
              </app-button>

              <app-button variant="secondary" size="sm" (click)="resetSettings()">
                Reset to Defaults
              </app-button>
            </div>
          </div>

          <div class="control-group">
            <h4>Opacity Control</h4>
            <div class="slider-control">
              <label for="opacity">Opacity: {{ (settings().opacity * 100).toFixed(0) }}%</label>
              <input
                id="opacity"
                type="range"
                min="0"
                max="0.5"
                step="0.01"
                [value]="settings().opacity"
                (input)="updateOpacity($event)"
                class="slider"
              />
            </div>
          </div>

          <div class="control-group">
            <h4>Animation Intensity</h4>
            <div class="slider-control">
              <label for="intensity">Speed: {{ settings().intensity.toFixed(1) }}x</label>
              <input
                id="intensity"
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                [value]="settings().intensity"
                (input)="updateIntensity($event)"
                class="slider"
              />
            </div>
          </div>

          <div class="control-group">
            <h4>Tile Size</h4>
            <div class="radio-group">
              <label class="radio-option">
                <input
                  type="radio"
                  name="tileSize"
                  value="small"
                  [checked]="settings().tileSize === 'small'"
                  (change)="updateTileSize('small')"
                />
                Small (40px)
              </label>
              <label class="radio-option">
                <input
                  type="radio"
                  name="tileSize"
                  value="medium"
                  [checked]="settings().tileSize === 'medium'"
                  (change)="updateTileSize('medium')"
                />
                Medium (60px)
              </label>
              <label class="radio-option">
                <input
                  type="radio"
                  name="tileSize"
                  value="large"
                  [checked]="settings().tileSize === 'large'"
                  (change)="updateTileSize('large')"
                />
                Large (80px)
              </label>
            </div>
          </div>

          <div class="control-group">
            <h4>Performance Mode</h4>
            <div class="radio-group">
              <label class="radio-option">
                <input
                  type="radio"
                  name="performance"
                  value="low"
                  [checked]="settings().performance === 'low'"
                  (change)="updatePerformance('low')"
                />
                Low (1 FPS, <200 tiles)
              </label>
              <label class="radio-option">
                <input
                  type="radio"
                  name="performance"
                  value="medium"
                  [checked]="settings().performance === 'medium'"
                  (change)="updatePerformance('medium')"
                />
                Medium (2 FPS, <400 tiles)
              </label>
              <label class="radio-option">
                <input
                  type="radio"
                  name="performance"
                  value="high"
                  [checked]="settings().performance === 'high'"
                  (change)="updatePerformance('high')"
                />
                High (4 FPS, <800 tiles)
              </label>
            </div>
          </div>
        </div>

        <div class="info-panel">
          <h4>Background Info</h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Status:</span>
              <span class="info-value">{{ settings().enabled ? 'Active' : 'Disabled' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Opacity:</span>
              <span class="info-value">{{ (settings().opacity * 100).toFixed(0) }}%</span>
            </div>
            <div class="info-item">
              <span class="info-label">Animation Speed:</span>
              <span class="info-value">{{ settings().intensity }}x</span>
            </div>
            <div class="info-item">
              <span class="info-label">Tile Size:</span>
              <span class="info-value">{{ getTileSizeLabel() }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Performance:</span>
              <span class="info-value">{{ settings().performance }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Max Tiles:</span>
              <span class="info-value">{{ backgroundService.getMaxTiles() }}</span>
            </div>
          </div>
        </div>

        <div class="usage-info">
          <h4>Usage</h4>
          <p>This background effect is designed to be very subtle and performance-conscious:</p>
          <ul>
            <li>
              <strong>Automatic optimizations:</strong> Disables on low battery, reduced motion, or
              poor performance
            </li>
            <li>
              <strong>Carpet transitions:</strong> Tiles randomly switch between pub carpet images
              every 30-120 seconds
            </li>
            <li>
              <strong>Responsive:</strong> Adjusts tile count and size based on device capabilities
            </li>
            <li><strong>Configurable:</strong> Settings persist in localStorage</li>
          </ul>

          <p>
            <strong>To use globally:</strong> Add
            <code>&lt;app-background-carpet&gt;&lt;/app-background-carpet&gt;</code> to your app
            root component.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .demo-container {
        position: relative;
        z-index: 1;
        padding: 2rem;
        max-width: 800px;
        margin: 0 auto;
      }

      .demo-content {
        background: var(--background);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 2rem;
        box-shadow: 0 4px 12px var(--shadow);
      }

      .demo-content h3 {
        margin-bottom: 1rem;
        color: var(--text);
      }

      .demo-content p {
        margin-bottom: 2rem;
        color: var(--text-muted);
      }

      .controls-panel {
        background: var(--background-lighter);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 2rem;
      }

      .control-group {
        margin-bottom: 1.5rem;
      }

      .control-group:last-child {
        margin-bottom: 0;
      }

      .control-group h4 {
        margin-bottom: 0.75rem;
        color: var(--text);
        font-size: 1rem;
      }

      .controls-row {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .slider-control {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .slider-control label {
        color: var(--text-muted);
        font-size: 0.9rem;
      }

      .slider {
        width: 200px;
        accent-color: var(--primary);
      }

      .radio-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .radio-option {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--text-muted);
        font-size: 0.9rem;
        cursor: pointer;
      }

      .radio-option input[type='radio'] {
        accent-color: var(--primary);
      }

      .info-panel {
        background: var(--background-lighter);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 2rem;
      }

      .info-panel h4 {
        margin-bottom: 1rem;
        color: var(--text);
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 0.75rem;
      }

      .info-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem;
        background: var(--background);
        border-radius: 4px;
        border: 1px solid var(--border);
      }

      .info-label {
        color: var(--text-muted);
        font-size: 0.9rem;
      }

      .info-value {
        color: var(--text);
        font-weight: 500;
        font-size: 0.9rem;
      }

      .usage-info {
        background: var(--background-lighter);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 1.5rem;
      }

      .usage-info h4 {
        margin-bottom: 1rem;
        color: var(--text);
      }

      .usage-info p {
        margin-bottom: 1rem;
        color: var(--text-muted);
      }

      .usage-info ul {
        margin-bottom: 1rem;
        padding-left: 1.5rem;
      }

      .usage-info li {
        margin-bottom: 0.5rem;
        color: var(--text-muted);
      }

      .usage-info code {
        background: var(--background);
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.85rem;
        border: 1px solid var(--border);
      }
    `,
  ],
})
export class BackgroundCarpetDemoComponent extends BaseComponent {
  protected readonly backgroundService = inject(BackgroundCarpetService);
  protected readonly settings = this.backgroundService.settings;

  toggleEnabled(): void {
    this.backgroundService.toggleEnabled();
  }

  updateOpacity(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.backgroundService.setOpacity(parseFloat(target.value));
  }

  updateIntensity(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.backgroundService.setIntensity(parseFloat(target.value));
  }

  updateTileSize(size: 'small' | 'medium' | 'large'): void {
    this.backgroundService.updateSettings({ tileSize: size });
  }

  updatePerformance(performance: 'low' | 'medium' | 'high'): void {
    this.backgroundService.setPerformanceMode(performance);
  }

  resetSettings(): void {
    this.backgroundService.resetToDefaults();
  }

  getTileSizeLabel(): string {
    const sizeMap = {
      small: '40px',
      medium: '60px',
      large: '80px',
    };
    return sizeMap[this.settings().tileSize];
  }
}
