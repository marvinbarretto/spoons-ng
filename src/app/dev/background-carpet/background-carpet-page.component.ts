import { Component, inject, signal } from '@angular/core';

import { BaseComponent } from '../../shared/base/base.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { BackgroundCarpetComponent } from '../../shared/ui/background-carpet/background-carpet.component';
import { BackgroundCarpetService } from '../../shared/ui/background-carpet/background-carpet.service';

@Component({
  selector: 'app-background-carpet-page',
  standalone: true,
  imports: [ButtonComponent, BackgroundCarpetComponent],
  template: `
    <!-- Background component in action -->
    <app-background-carpet></app-background-carpet>
    
    <!-- Floating controls overlay -->
    <div class="controls-overlay" [class.collapsed]="isCollapsed()">
      <div class="controls-header">
        <h3>🏠 Background Carpet Controls</h3>
        <app-button
          variant="outline"
          size="xs"
          (click)="toggleCollapsed()">
          {{ isCollapsed() ? '▲' : '▼' }}
        </app-button>
      </div>
      
      @if (!isCollapsed()) {
        <div class="controls-content">
          <div class="control-section">
            <div class="control-group">
              <app-button
                [variant]="settings().enabled ? 'primary' : 'outline'"
                size="sm"
                (click)="toggleEnabled()">
                {{ settings().enabled ? '✅ Enabled' : '❌ Disabled' }}
              </app-button>
              
              
              <app-button
                variant="secondary"
                size="sm"
                (click)="resetSettings()">
                🔄 Reset
              </app-button>
            </div>
          </div>

          <div class="control-section">
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
                class="slider">
            </div>

            <div class="slider-control">
              <label for="intensity">Animation Speed: {{ settings().intensity.toFixed(1) }}x</label>
              <input 
                id="intensity"
                type="range" 
                min="0.1" 
                max="2" 
                step="0.1" 
                [value]="settings().intensity" 
                (input)="updateIntensity($event)"
                class="slider">
            </div>
          </div>

          <div class="control-section">
            <div class="select-control">
              <label for="tileSize">Tile Size:</label>
              <select 
                id="tileSize" 
                [value]="settings().tileSize" 
                (change)="updateTileSize($event)"
                class="select">
                <option value="small">Small (40px)</option>
                <option value="medium">Medium (60px)</option>
                <option value="large">Large (80px)</option>
              </select>
            </div>

            <div class="select-control">
              <label for="performance">Performance:</label>
              <select 
                id="performance" 
                [value]="settings().performance" 
                (change)="updatePerformance($event)"
                class="select">
                <option value="low">Low (1 FPS)</option>
                <option value="medium">Medium (2 FPS)</option>
                <option value="high">High (4 FPS)</option>
              </select>
            </div>
          </div>

          <div class="info-section">
            <div class="info-item">
              <span>Max Tiles:</span>
              <span>{{ backgroundService.getMaxTiles() }}</span>
            </div>
            <div class="info-item">
              <span>Transition Timing:</span>
              <span>5-15 seconds</span>
            </div>
            <div class="info-item">
              <span>Update Interval:</span>
              <span>{{ backgroundService.getUpdateInterval() }}ms</span>
            </div>
          </div>
        </div>
      }
    </div>

    <!-- Main content area with sample text -->
    <div class="content-area">
      <div class="content-card">
        <h1>🏠 Subtle Background Carpet Animation</h1>
        <p class="lead">
          Experience the gentle, ambient carpet background animation designed for pub-themed applications.
        </p>

        <div class="feature-grid">
          <div class="feature-card">
            <h3>🎯 Subtle Design</h3>
            <p>Very low opacity (15% default) ensures it never interferes with content readability while adding visual interest.</p>
          </div>

          <div class="feature-card">
            <h3>⚡ Performance Optimized</h3>
            <p>Uses requestIdleCallback, visibility detection, and smart throttling to maintain <1% CPU usage.</p>
          </div>

          <div class="feature-card">
            <h3>🔧 Fully Configurable</h3>
            <p>Adjust opacity, animation speed, tile size, and performance settings. All preferences persist automatically.</p>
          </div>

          <div class="feature-card">
            <h3>🏠 Authentic Carpets</h3>
            <p>Uses real pub carpet images from your collection: Bangor, John Jaques, Moon Under Water, and Red Lion.</p>
          </div>

          <div class="feature-card">
            <h3>📱 Responsive</h3>
            <p>Automatically adjusts tile count and size based on device capabilities and user preferences.</p>
          </div>

          <div class="feature-card">
            <h3>♿ Accessible</h3>
            <p>Respects reduced motion preferences and automatically disables on low battery or poor performance.</p>
          </div>
        </div>

        <div class="implementation-info">
          <h3>Implementation</h3>
          <p>To add this background to any page, simply include:</p>
          <div class="code-block">
            <code>&lt;app-background-carpet&gt;&lt;/app-background-carpet&gt;</code>
          </div>
          <p>The component will automatically handle all performance optimizations and user preferences.</p>
        </div>

        <div class="sample-content">
          <h3>Sample Content</h3>
          <p>
            This is sample content to demonstrate how the background works with real page content. 
            The carpet animation should be barely noticeable as individual tiles occasionally fade 
            between different carpet textures.
          </p>
          
          <p>
            Notice how the background provides a subtle texture without being distracting or 
            impacting readability. The animation is intentionally very slow and gentle - 
            you might see a tile change every 30-120 seconds.
          </p>

          <div class="sample-list">
            <h4>Available Carpet Textures:</h4>
            <ul>
              <li><strong>Bangor</strong> - Traditional pub carpet pattern</li>
              <li><strong>John Jaques</strong> - Classic design with geometric elements</li>
              <li><strong>Moon Under Water</strong> - Wetherspoons-style carpet</li>
              <li><strong>Red Lion</strong> - Traditional pub aesthetic</li>
            </ul>
          </div>

          <p>
            The background system automatically cycles between these carpet images, 
            creating an organic, ever-changing subtle texture that enhances the 
            pub atmosphere of your application.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .controls-overlay {
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--background);
      border: 2px solid var(--border);
      border-radius: 12px;
      box-shadow: 0 8px 24px var(--shadow);
      z-index: 1000;
      min-width: 280px;
      max-width: 320px;
      transition: all 0.3s ease;
    }

    .controls-overlay.collapsed {
      max-height: 60px;
      overflow: hidden;
    }

    .controls-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid var(--border);
    }

    .controls-header h3 {
      margin: 0;
      font-size: 1rem;
      color: var(--text);
    }

    .controls-content {
      padding: 1rem;
    }

    .control-section {
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }

    .control-section:last-child {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }

    .control-group {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .slider-control {
      margin-bottom: 0.75rem;
    }

    .slider-control:last-child {
      margin-bottom: 0;
    }

    .slider-control label {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    .slider {
      width: 100%;
      accent-color: var(--primary);
    }

    .select-control {
      margin-bottom: 0.75rem;
    }

    .select-control:last-child {
      margin-bottom: 0;
    }

    .select-control label {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    .select {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--background-lighter);
      color: var(--text);
      font-size: 0.9rem;
    }

    .info-section {
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.25rem;
    }

    .activity-highlight {
      background: var(--primary);
      color: var(--primary-contrast);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      margin-bottom: 0.5rem;
    }

    .activity-value {
      font-weight: bold;
      font-size: 1.1rem;
    }

    .content-area {
      min-height: 100vh;
      padding: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .content-card {
      max-width: 800px;
      background: var(--background);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 3rem;
      box-shadow: 0 8px 32px var(--shadow);
      margin-right: 340px; /* Space for controls overlay */
    }

    .content-card h1 {
      margin-bottom: 1rem;
      color: var(--text);
      text-align: center;
    }

    .lead {
      font-size: 1.25rem;
      color: var(--text-secondary);
      text-align: center;
      margin-bottom: 3rem;
      line-height: 1.6;
    }

    .feature-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }

    .feature-card {
      background: var(--background-lighter);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.5rem;
    }

    .feature-card h3 {
      margin-bottom: 0.75rem;
      color: var(--text);
      font-size: 1.1rem;
    }

    .feature-card p {
      color: var(--text-muted);
      font-size: 0.95rem;
      line-height: 1.5;
      margin: 0;
    }

    .implementation-info {
      background: var(--background-lighter);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 2rem;
      margin-bottom: 3rem;
    }

    .implementation-info h3 {
      margin-bottom: 1rem;
      color: var(--text);
    }

    .implementation-info p {
      color: var(--text-muted);
      margin-bottom: 1rem;
    }

    .code-block {
      background: var(--background-darkest);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 1rem;
      margin: 1rem 0;
      font-family: monospace;
      overflow-x: auto;
    }

    .code-block code {
      color: var(--accent);
      font-size: 0.9rem;
    }

    .sample-content {
      line-height: 1.7;
    }

    .sample-content h3 {
      margin-bottom: 1rem;
      color: var(--text);
    }

    .sample-content h4 {
      margin: 2rem 0 1rem 0;
      color: var(--text);
    }

    .sample-content p {
      margin-bottom: 1.5rem;
      color: var(--text-muted);
    }

    .sample-list ul {
      padding-left: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .sample-list li {
      margin-bottom: 0.5rem;
      color: var(--text-muted);
    }

    .sample-list strong {
      color: var(--text);
    }

    @media (max-width: 768px) {
      .controls-overlay {
        position: relative;
        top: auto;
        right: auto;
        margin: 1rem;
        width: calc(100% - 2rem);
        max-width: none;
      }

      .content-card {
        margin-right: 0;
        padding: 2rem;
      }

      .content-area {
        padding: 1rem;
      }
    }
  `]
})
export class BackgroundCarpetPageComponent extends BaseComponent {
  protected readonly backgroundService = inject(BackgroundCarpetService);
  protected readonly settings = this.backgroundService.settings;
  protected readonly isCollapsed = signal(false);

  toggleCollapsed(): void {
    this.isCollapsed.set(!this.isCollapsed());
  }

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

  updateTileSize(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.backgroundService.updateSettings({ 
      tileSize: target.value as 'small' | 'medium' | 'large' 
    });
  }

  updatePerformance(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.backgroundService.setPerformanceMode(
      target.value as 'low' | 'medium' | 'high'
    );
  }


  resetSettings(): void {
    this.backgroundService.resetToDefaults();
  }
}