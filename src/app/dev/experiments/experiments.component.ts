import { Component } from '@angular/core';

import { RouterModule } from '@angular/router';
import { BeerLoadingComponent } from './beer-loading/beer-loading.component';
import { WaveSquaresDomComponent } from './wave-squares-dom/wave-squares-dom.component';
import { WaveSquaresCanvasComponent } from './wave-squares-canvas/wave-squares-canvas.component';
import { BaseComponent } from '../../shared/base/base.component';

@Component({
  selector: 'app-experiments',
  standalone: true,
  imports: [RouterModule, BeerLoadingComponent, WaveSquaresDomComponent, WaveSquaresCanvasComponent],
  template: `
    <div class="experiments-container">
      <header class="experiments-header">
        <h1>🧪 Experiments</h1>
        <p>Testing ground for new UI components and animations</p>
      </header>

      <div class="experiments-grid">
        <div class="experiment-card">
          <h2>🍺 Beer Loading Animation</h2>
          <p>Lottie-powered loading animations with beer theme</p>
          <div class="experiment-demo">
            <app-beer-loading></app-beer-loading>
          </div>
        </div>

        <div class="experiment-card">
          <h2>🌊 Wave Squares - DOM</h2>
          <p>CSS Grid + Transform3D wave animation with 100 squares</p>
          <div class="experiment-demo">
            <app-wave-squares-dom></app-wave-squares-dom>
          </div>
        </div>

        <div class="experiment-card">
          <h2>🎨 Wave Squares - Canvas</h2>
          <p>HTML5 Canvas + RequestAnimationFrame wave animation</p>
          <div class="experiment-demo">
            <app-wave-squares-canvas></app-wave-squares-canvas>
          </div>
        </div>

        <div class="experiment-card">
          <h2>🏠 Subtle Background Carpets</h2>
          <p>Performance-optimized ambient carpet background animation</p>
          <div class="experiment-demo">
            <div class="placeholder-content">
              <span class="placeholder-icon">🏠</span>
              <span>Dedicated page for carpet background testing</span>
              <a href="/dev/background-carpet" class="demo-link">Open Carpet Background Demo →</a>
            </div>
          </div>
        </div>

        <div class="experiment-card placeholder">
          <h2>🎯 Future Experiments</h2>
          <p>More creative components coming soon...</p>
          <div class="experiment-demo">
            <div class="placeholder-content">
              <span class="placeholder-icon">🚀</span>
              <span>Stay tuned!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .experiments-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .experiments-header {
      text-align: center;
      margin-bottom: 3rem;
    }

    .experiments-header h1 {
      font-size: 2.5rem;
      color: var(--text);
      margin-bottom: 0.5rem;
    }

    .experiments-header p {
      color: var(--text-muted);
      font-size: 1.1rem;
    }

    .experiments-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 2rem;
    }

    .experiment-card {
      background: var(--background-lighter);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 2px 8px var(--shadow);
      transition: transform 0.2s ease;
    }

    .experiment-card:hover {
      transform: translateY(-2px);
    }

    .experiment-card h2 {
      color: var(--text);
      margin-bottom: 0.5rem;
    }

    .experiment-card p {
      color: var(--text-muted);
      margin-bottom: 1.5rem;
    }

    .experiment-demo {
      background: var(--background);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 2rem;
      min-height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .demo-link {
      display: inline-block;
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      background: var(--primary);
      color: var(--primary-contrast);
      text-decoration: none;
      border-radius: 6px;
      font-size: 0.9rem;
      transition: background-color 0.2s ease;
    }

    .demo-link:hover {
      background: var(--primary-hover);
    }

    .placeholder-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      color: var(--text-muted);
    }

    .placeholder-icon {
      font-size: 3rem;
    }

    .placeholder.experiment-card {
      opacity: 0.7;
    }
  `]
})
export class ExperimentsComponent extends BaseComponent {

}
