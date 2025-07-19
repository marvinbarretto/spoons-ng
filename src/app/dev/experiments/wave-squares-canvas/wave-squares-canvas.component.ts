import { Component, signal, ElementRef, ViewChild, OnDestroy, AfterViewInit, inject } from '@angular/core';

import { BaseComponent } from '../../../shared/base/base.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CarpetImageService } from '../shared/carpet-image.service';

interface Square {
  x: number;
  y: number;
  size: number;
  flipProgress: number; // 0 to 1, where 0.5 is mid-flip
  isFlipping: boolean;
  delay: number;
  row: number;
  col: number;
}

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
  selector: 'app-wave-squares-canvas',
  standalone: true,
  imports: [ButtonComponent],
  template: `
    <div class="wave-squares-container">
      <div class="controls">
        <h3>🌊 Wave Squares - Canvas Version</h3>
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
            </div>
          </div>
        </div>
      </div>

      <div class="canvas-container">
        <canvas 
          #canvas
          width="400" 
          height="400"
          class="wave-canvas">
        </canvas>
      </div>

      <div class="info">
        <p><strong>Total Squares:</strong> {{ squares().length }}</p>
        <p><strong>Pattern:</strong> {{ pattern() }}</p>
        <p><strong>Animation:</strong> {{ isAnimating() ? 'Running' : 'Stopped' }}</p>
        <p><strong>FPS:</strong> {{ fps() }}</p>
        <p><strong>Approach:</strong> HTML5 Canvas + RequestAnimationFrame</p>
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

    .canvas-container {
      display: flex;
      justify-content: center;
      background: var(--background-lighter);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
    }

    .wave-canvas {
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--background);
      cursor: pointer;
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
  `]
})
export class WaveSquaresCanvasComponent extends BaseComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  
  private ctx!: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private waveStartTime = 0;
  private lastFrameTime = 0;
  private frameCount = 0;
  private lastFpsUpdate = 0;

  protected readonly carpetService = inject(CarpetImageService);
  protected readonly isAnimating = signal(false);
  protected readonly waveSpeed = signal(1.5);
  protected readonly gridSize = signal(10);
  protected readonly pattern = signal<PatternType>('wave');
  protected readonly squares = signal<Square[]>([]);
  protected readonly fps = signal(0);
  protected readonly colorConfig = signal<ColorConfig>({
    type: 'flat',
    frontColor: '#dc3545',
    backColor: '#007bff'
  });

  constructor() {
    super();
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.initializeSquares();
    this.draw();
  }

  ngOnDestroy(): void {
    this.stopAnimation();
  }

  startWave(): void {
    if (this.isAnimating()) return;

    this.isAnimating.set(true);
    this.waveStartTime = performance.now();
    this.resetSquares();
    this.animate();
  }

  stopWave(): void {
    this.isAnimating.set(false);
    this.stopAnimation();
  }

  resetWave(): void {
    this.stopWave();
    this.resetSquares();
    this.draw();
  }

  updateSpeed(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.waveSpeed.set(parseFloat(target.value));
  }

  updatePattern(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.pattern.set(target.value as PatternType);
    this.initializeSquares();
    if (this.isAnimating()) {
      this.resetWave();
      this.startWave();
    }
  }

  updateGridSize(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.gridSize.set(parseInt(target.value));
    this.initializeSquares();
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
      default:
        config = { type: 'flat', frontColor: '#dc3545', backColor: '#007bff' };
    }
    
    this.colorConfig.set(config);
  }

  private initializeSquares(): void {
    const canvas = this.canvasRef.nativeElement;
    const gridSize = this.gridSize();
    const squareSize = (canvas.width - 20) / gridSize; // 20px total padding
    const squares: Square[] = [];

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const delay = this.calculateDelay(row, col, gridSize);
        
        squares.push({
          x: 10 + col * squareSize,
          y: 10 + row * squareSize,
          size: squareSize - 2, // 2px gap
          flipProgress: 0,
          isFlipping: false,
          delay,
          row,
          col
        });
      }
    }

    this.squares.set(squares);
  }

  private calculateDelay(row: number, col: number, gridSize: number): number {
    const pattern = this.pattern();
    const baseDelay = 100; // Base delay between squares
    
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
      flipProgress: 0,
      isFlipping: false
    }));
    this.squares.set(resetSquares);
  }

  private animate(): void {
    if (!this.isAnimating()) return;

    const currentTime = performance.now();
    const elapsedTime = currentTime - this.waveStartTime;
    
    // Update FPS
    this.updateFPS(currentTime);

    // Update squares
    const squares = this.squares().map(square => {
      const adjustedDelay = square.delay / this.waveSpeed();
      const shouldFlip = elapsedTime >= adjustedDelay;
      
      if (shouldFlip && !square.isFlipping) {
        return { ...square, isFlipping: true };
      }
      
      if (square.isFlipping) {
        const flipDuration = 600 / this.waveSpeed(); // 600ms flip duration
        const flipElapsed = elapsedTime - adjustedDelay;
        const progress = Math.min(flipElapsed / flipDuration, 1);
        
        // Smooth easing function
        const easedProgress = this.easeInOutSine(progress);
        
        if (progress >= 1) {
          return { ...square, flipProgress: 1, isFlipping: false };
        }
        
        return { ...square, flipProgress: easedProgress };
      }
      
      return square;
    });

    this.squares.set(squares);
    this.draw();

    // Check if wave is complete and should restart
    const maxDelay = Math.max(...this.squares().map(s => s.delay));
    const waveDuration = (maxDelay + 1000) / this.waveSpeed();
    
    if (elapsedTime >= waveDuration) {
      this.waveStartTime = currentTime;
      this.resetSquares();
    }

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  private draw(): void {
    if (!this.ctx) return;

    const canvas = this.canvasRef.nativeElement;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw squares
    this.squares().forEach(square => {
      this.drawSquare(square);
    });
  }

  private drawSquare(square: Square): void {
    const { x, y, size, flipProgress } = square;
    const centerX = x + size / 2;
    const centerY = y + size / 2;

    // Calculate 3D flip effect
    const scaleX = Math.cos(flipProgress * Math.PI);
    const width = Math.abs(scaleX) * size;
    const height = size;

    // Add slight scaling effect during flip
    const scale = 1 + Math.sin(flipProgress * Math.PI) * 0.1;
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;

    const config = this.colorConfig();
    const rectX = centerX - scaledWidth / 2;
    const rectY = centerY - scaledHeight / 2;

    // Draw based on configuration type
    if (config.type === 'image') {
      this.drawImageSquare(rectX, rectY, scaledWidth, scaledHeight, flipProgress, config);
    } else {
      this.drawColorSquare(rectX, rectY, scaledWidth, scaledHeight, flipProgress, config);
    }

    // Add border
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(rectX, rectY, scaledWidth, scaledHeight);
  }

  private drawColorSquare(x: number, y: number, width: number, height: number, flipProgress: number, config: ColorConfig): void {
    // Determine color based on flip progress and configuration
    const color = flipProgress < 0.5 ? config.frontColor : config.backColor;
    
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);
  }

  private drawImageSquare(x: number, y: number, width: number, height: number, flipProgress: number, config: ColorConfig): void {
    let image: HTMLImageElement | undefined;
    
    if (flipProgress < 0.5) {
      // Front side
      if (config.frontImage === 'random') {
        image = this.carpetService.getRandomCarpet()?.image;
      } else if (config.frontImage) {
        image = this.carpetService.getCarpetById(config.frontImage)?.image;
      }
    } else {
      // Back side
      if (config.backImage === 'random') {
        image = this.carpetService.getRandomCarpet()?.image;
      } else if (config.backImage) {
        image = this.carpetService.getCarpetById(config.backImage)?.image;
      }
    }

    if (image && image.complete) {
      // Draw image to fit the square
      this.ctx.drawImage(image, x, y, width, height);
    } else {
      // Fallback to color if image not loaded
      const fallbackColor = flipProgress < 0.5 ? config.frontColor : config.backColor;
      this.ctx.fillStyle = fallbackColor;
      this.ctx.fillRect(x, y, width, height);
    }
  }

  private easeInOutSine(t: number): number {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }

  private updateFPS(currentTime: number): void {
    this.frameCount++;
    
    if (currentTime - this.lastFpsUpdate >= 1000) {
      this.fps.set(Math.round(this.frameCount));
      this.frameCount = 0;
      this.lastFpsUpdate = currentTime;
    }
  }

  private stopAnimation(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}