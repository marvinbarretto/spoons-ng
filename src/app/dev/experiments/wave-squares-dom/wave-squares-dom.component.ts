import { Component, signal, computed, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../shared/base/base.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CarpetImageService } from '../shared/carpet-image.service';

type PatternType = 'wave' | 'random' | 'ripple' | 'rows' | 'columns' | 'spiral';
type ColorType = 'flat' | 'gradient' | 'image';

interface ColorConfig {
  type: ColorType;
  frontColor: string;
  backColor: string;
  frontGradient?: string[];
  backGradient?: string[];
  frontImage?: string;
  backImage?: string;
}

@Component({
  selector: 'app-wave-squares-dom',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  template: `
    <div class="wave-squares-container">
      <div class="controls">
        <h3>🌊 Wave Squares - DOM Version</h3>
        <div class="button-group">
          <app-button
            variant="primary"
            size="sm"
            (click)="startWave()"
            [disabled]="isAnimating()">
            Start Animation
          </app-button>
          <app-button
            variant="secondary"
            size="sm"
            (click)="stopWave()"
            [disabled]="!isAnimating()">
            Stop Animation
          </app-button>
          <app-button
            variant="outline"
            size="sm"
            (click)="resetWave()">
            Reset
          </app-button>
        </div>

        <div class="configuration-panel">
          <div class="config-row">
            <div class="config-group">
              <label for="pattern">Pattern:</label>
              <select id="pattern" [value]="pattern()" (change)="updatePattern($event)" class="config-select">
                <option value="wave">Wave</option>
                <option value="random">Random</option>
                <option value="ripple">Ripple</option>
                <option value="rows">Rows</option>
                <option value="columns">Columns</option>
                <option value="spiral">Spiral</option>
              </select>
            </div>
            
            <div class="config-group">
              <label for="speed">Speed:</label>
              <input 
                id="speed"
                type="range" 
                min="0.5" 
                max="3" 
                step="0.1" 
                [value]="waveSpeed()" 
                (input)="updateSpeed($event)"
                class="config-slider">
              <span>{{ waveSpeed() }}x</span>
            </div>
          </div>

          <div class="config-row">
            <div class="config-group">
              <label for="gridSize">Grid Size:</label>
              <input 
                id="gridSize"
                type="range" 
                min="5" 
                max="15" 
                step="1" 
                [value]="gridSize()" 
                (input)="updateGridSize($event)"
                class="config-slider">
              <span>{{ gridSize() }}x{{ gridSize() }}</span>
            </div>
            
            <div class="config-group">
              <label for="colorType">Visual:</label>
              <select id="colorType" [value]="colorConfig().type" (change)="updateColorType($event)" class="config-select">
                <option value="flat">Flat Colors</option>
                <option value="gradient">Gradients</option>
                <option value="image">Images</option>
              </select>
            </div>
          </div>

          @if (colorConfig().type === 'flat') {
            <div class="config-row">
              <div class="config-group">
                <label for="frontColor">Front Color:</label>
                <input 
                  id="frontColor"
                  type="color" 
                  [value]="colorConfig().frontColor" 
                  (input)="updateColor('front', $event)"
                  class="color-picker">
              </div>
              <div class="config-group">
                <label for="backColor">Back Color:</label>
                <input 
                  id="backColor"
                  type="color" 
                  [value]="colorConfig().backColor" 
                  (input)="updateColor('back', $event)"
                  class="color-picker">
              </div>
            </div>
          }

          @if (colorConfig().type === 'image') {
            <div class="config-row">
              <div class="config-group">
                <label for="frontImage">Front Image:</label>
                <select 
                  id="frontImage" 
                  [value]="colorConfig().frontImage || ''" 
                  (change)="updateImage('front', $event)"
                  class="config-select">
                  <option value="">Select Carpet</option>
                  <option value="random">Random</option>
                  @for (carpet of carpetService.images(); track carpet.id) {
                    <option [value]="carpet.id">{{ carpet.displayName }}</option>
                  }
                </select>
              </div>
              <div class="config-group">
                <label for="backImage">Back Image:</label>
                <select 
                  id="backImage" 
                  [value]="colorConfig().backImage || ''" 
                  (change)="updateImage('back', $event)"
                  class="config-select">
                  <option value="">Select Carpet</option>
                  <option value="random">Random</option>
                  @for (carpet of carpetService.images(); track carpet.id) {
                    <option [value]="carpet.id">{{ carpet.displayName }}</option>
                  }
                </select>
              </div>
            </div>
          }

          <div class="preset-themes">
            <label>Quick Themes:</label>
            <div class="theme-buttons">
              <app-button variant="outline" size="xs" (click)="applyTheme('sunset')">🌅 Sunset</app-button>
              <app-button variant="outline" size="xs" (click)="applyTheme('ocean')">🌊 Ocean</app-button>
              <app-button variant="outline" size="xs" (click)="applyTheme('forest')">🌲 Forest</app-button>
              <app-button variant="outline" size="xs" (click)="applyTheme('neon')">⚡ Neon</app-button>
              <app-button variant="outline" size="xs" (click)="applyTheme('carpets')">🏠 Carpets</app-button>
            </div>
          </div>
        </div>
      </div>

      <div class="squares-grid" [class.animating]="isAnimating()" [style.grid-template-columns]="'repeat(' + gridSize() + ', 1fr)'">
        @for (square of squares(); track square.id) {
          <div 
            class="square"
            [class.flipped]="square.flipped"
            [style.animation-delay]="square.delay + 'ms'"
            [style.animation-duration]="(1000 / waveSpeed()) + 'ms'">
            <div class="square-inner">
              <div class="square-front" [style]="getFrontStyle(square)"></div>
              <div class="square-back" [style]="getBackStyle(square)"></div>
            </div>
          </div>
        }
      </div>

      <div class="info">
        <p><strong>Total Squares:</strong> {{ squares().length }}</p>
        <p><strong>Pattern:</strong> {{ pattern() }}</p>
        <p><strong>Animation:</strong> {{ isAnimating() ? 'Running' : 'Stopped' }}</p>
        <p><strong>Approach:</strong> DOM Elements + CSS Transforms</p>
      </div>
    </div>
  `,
  styles: [`
    .wave-squares-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 1rem;
      max-width: 600px;
      margin: 0 auto;
    }

    .controls {
      text-align: center;
    }

    .controls h3 {
      margin-bottom: 1rem;
      color: var(--text);
    }

    .button-group {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }

    .configuration-panel {
      background: var(--background-lighter);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
      margin-top: 1rem;
    }

    .config-row {
      display: flex;
      gap: 1rem;
      margin-bottom: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .config-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    .config-select {
      padding: 0.25rem 0.5rem;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--background);
      color: var(--text);
      font-size: 0.9rem;
    }

    .config-slider {
      width: 80px;
      accent-color: var(--primary);
    }

    .color-picker {
      width: 40px;
      height: 25px;
      border: 1px solid var(--border);
      border-radius: 4px;
      cursor: pointer;
    }

    .preset-themes {
      border-top: 1px solid var(--border);
      padding-top: 0.75rem;
      margin-top: 0.75rem;
    }

    .preset-themes label {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    .theme-buttons {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .squares-grid {
      display: grid;
      gap: 2px;
      padding: 1rem;
      background: var(--background-lighter);
      border: 1px solid var(--border);
      border-radius: 8px;
      aspect-ratio: 1;
      max-width: 400px;
      margin: 0 auto;
    }

    .square {
      min-height: 30px;
      perspective: 1000px;
      cursor: pointer;
    }

    .square-inner {
      position: relative;
      width: 100%;
      height: 100%;
      transition: transform 0.6s;
      transform-style: preserve-3d;
    }

    .square.flipped .square-inner {
      transform: rotateY(180deg);
    }

    .square-front,
    .square-back {
      position: absolute;
      width: 100%;
      height: 100%;
      backface-visibility: hidden;
      border-radius: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
      font-weight: bold;
    }

    .square-front {
      background: #dc3545;
      color: white;
    }

    .square-back {
      background: #007bff;
      color: white;
      transform: rotateY(180deg);
    }

    /* Wave animation */
    .squares-grid.animating .square {
      animation: wave-flip 1s ease-in-out;
    }

    @keyframes wave-flip {
      0% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.1);
      }
      100% {
        transform: scale(1);
      }
    }

    .squares-grid.animating .square .square-inner {
      animation: flip-animation 1s ease-in-out;
    }

    @keyframes flip-animation {
      0% {
        transform: rotateY(0deg);
      }
      50% {
        transform: rotateY(90deg);
      }
      100% {
        transform: rotateY(180deg);
      }
    }

    .info {
      text-align: center;
      background: var(--background-lighter);
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid var(--border);
    }

    .info p {
      margin: 0.25rem 0;
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    /* Hover effects */
    .square:hover {
      transform: scale(1.05);
      transition: transform 0.2s ease;
    }

    .square:hover .square-inner {
      transform: rotateY(180deg);
    }

    @media (prefers-reduced-motion: reduce) {
      .square-inner {
        transition: none;
      }
      
      .squares-grid.animating .square {
        animation: none;
      }
      
      .squares-grid.animating .square .square-inner {
        animation: none;
      }
    }
  `]
})
export class WaveSquaresDomComponent extends BaseComponent implements OnDestroy {
  private waveTimeout: any;
  private waveInterval: any;

  protected readonly carpetService = inject(CarpetImageService);
  protected readonly isAnimating = signal(false);
  protected readonly waveSpeed = signal(1.5);
  protected readonly gridSize = signal(10);
  protected readonly pattern = signal<PatternType>('wave');
  protected readonly colorConfig = signal<ColorConfig>({
    type: 'flat',
    frontColor: '#dc3545',
    backColor: '#007bff'
  });
  protected readonly squares = signal(this.generateSquares());

  constructor() {
    super();
  }

  ngOnDestroy(): void {
    this.clearWaveTimers();
  }

  startWave(): void {
    if (this.isAnimating()) return;

    this.isAnimating.set(true);
    this.resetSquares();
    this.triggerWave();
  }

  stopWave(): void {
    this.isAnimating.set(false);
    this.clearWaveTimers();
  }

  resetWave(): void {
    this.stopWave();
    this.resetSquares();
  }

  updateSpeed(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.waveSpeed.set(parseFloat(target.value));
  }

  updatePattern(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.pattern.set(target.value as PatternType);
    this.squares.set(this.generateSquares());
    if (this.isAnimating()) {
      this.resetWave();
      this.startWave();
    }
  }

  updateGridSize(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.gridSize.set(parseInt(target.value));
    this.squares.set(this.generateSquares());
    if (this.isAnimating()) {
      this.resetWave();
      this.startWave();
    }
  }

  updateColorType(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const currentConfig = this.colorConfig();
    this.colorConfig.set({
      ...currentConfig,
      type: target.value as ColorType
    });
  }

  updateColor(side: 'front' | 'back', event: Event): void {
    const target = event.target as HTMLInputElement;
    const currentConfig = this.colorConfig();
    
    if (side === 'front') {
      this.colorConfig.set({
        ...currentConfig,
        frontColor: target.value
      });
    } else {
      this.colorConfig.set({
        ...currentConfig,
        backColor: target.value
      });
    }
  }

  updateImage(side: 'front' | 'back', event: Event): void {
    const target = event.target as HTMLSelectElement;
    const currentConfig = this.colorConfig();
    
    if (side === 'front') {
      this.colorConfig.set({
        ...currentConfig,
        frontImage: target.value
      });
    } else {
      this.colorConfig.set({
        ...currentConfig,
        backImage: target.value
      });
    }
  }

  applyTheme(theme: string): void {
    let config: ColorConfig;
    
    switch (theme) {
      case 'sunset':
        config = { type: 'flat', frontColor: '#ff6b35', backColor: '#f7931e' };
        break;
      case 'ocean':
        config = { type: 'flat', frontColor: '#006994', backColor: '#47b5ff' };
        break;
      case 'forest':
        config = { type: 'flat', frontColor: '#2d5016', backColor: '#68b82f' };
        break;
      case 'neon':
        config = { type: 'flat', frontColor: '#ff0080', backColor: '#00ff80' };
        break;
      case 'carpets':
        config = { type: 'image', frontColor: '#dc3545', backColor: '#007bff', frontImage: 'random', backImage: 'random' };
        break;
      default:
        config = { type: 'flat', frontColor: '#dc3545', backColor: '#007bff' };
    }
    
    this.colorConfig.set(config);
  }

  getFrontStyle(square: any): string {
    const config = this.colorConfig();
    
    if (config.type === 'image') {
      let imageUrl = '';
      if (config.frontImage === 'random') {
        const randomCarpet = this.carpetService.getRandomCarpet();
        imageUrl = randomCarpet?.path || '';
      } else if (config.frontImage) {
        const carpet = this.carpetService.getCarpetById(config.frontImage);
        imageUrl = carpet?.path || '';
      }
      
      if (imageUrl) {
        return `background-image: url('${imageUrl}'); background-size: cover; background-position: center;`;
      }
    }
    
    return `background-color: ${config.frontColor};`;
  }

  getBackStyle(square: any): string {
    const config = this.colorConfig();
    
    if (config.type === 'image') {
      let imageUrl = '';
      if (config.backImage === 'random') {
        const randomCarpet = this.carpetService.getRandomCarpet();
        imageUrl = randomCarpet?.path || '';
      } else if (config.backImage) {
        const carpet = this.carpetService.getCarpetById(config.backImage);
        imageUrl = carpet?.path || '';
      }
      
      if (imageUrl) {
        return `background-image: url('${imageUrl}'); background-size: cover; background-position: center;`;
      }
    }
    
    return `background-color: ${config.backColor};`;
  }

  private generateSquares() {
    const squares = [];
    const gridSize = this.gridSize();
    
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const delay = this.calculateDelay(row, col, gridSize);
        
        squares.push({
          id: row * gridSize + col,
          row,
          col,
          flipped: false,
          delay
        });
      }
    }
    
    return squares;
  }

  private calculateDelay(row: number, col: number, gridSize: number): number {
    const pattern = this.pattern();
    
    switch (pattern) {
      case 'wave':
        // Diagonal wave from top-left
        const distance = Math.sqrt(row * row + col * col);
        return distance * 80;
        
      case 'random':
        // Random delay between 0 and 2000ms
        return Math.random() * 2000;
        
      case 'ripple':
        // Circular ripple from center
        const centerRow = (gridSize - 1) / 2;
        const centerCol = (gridSize - 1) / 2;
        const rippleDistance = Math.sqrt(
          Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2)
        );
        return rippleDistance * 120;
        
      case 'rows':
        // Sequential rows
        return row * 200;
        
      case 'columns':
        // Sequential columns
        return col * 200;
        
      case 'spiral':
        // Spiral from outside to inside
        const minDist = Math.min(row, col, gridSize - 1 - row, gridSize - 1 - col);
        const maxDist = Math.max(row, col, gridSize - 1 - row, gridSize - 1 - col);
        return (maxDist - minDist) * 150;
        
      default:
        return 0;
    }
  }

  private resetSquares(): void {
    const resetSquares = this.squares().map(square => ({
      ...square,
      flipped: false
    }));
    this.squares.set(resetSquares);
  }

  private triggerWave(): void {
    if (!this.isAnimating()) return;

    const squares = this.squares();
    const maxDelay = Math.max(...squares.map(s => s.delay));
    
    // Trigger flip for each square based on its delay
    squares.forEach(square => {
      this.waveTimeout = setTimeout(() => {
        if (this.isAnimating()) {
          const updatedSquares = this.squares().map(s => 
            s.id === square.id ? { ...s, flipped: !s.flipped } : s
          );
          this.squares.set(updatedSquares);
        }
      }, square.delay / this.waveSpeed());
    });

    // Schedule next wave
    this.waveTimeout = setTimeout(() => {
      if (this.isAnimating()) {
        this.resetSquares();
        this.triggerWave();
      }
    }, (maxDelay + 1000) / this.waveSpeed());
  }

  private clearWaveTimers(): void {
    if (this.waveTimeout) {
      clearTimeout(this.waveTimeout);
    }
    if (this.waveInterval) {
      clearInterval(this.waveInterval);
    }
  }
}