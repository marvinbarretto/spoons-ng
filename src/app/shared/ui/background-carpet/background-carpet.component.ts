import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  ViewChild,
} from '@angular/core';

import { CarpetImageService } from '../../../dev/experiments/shared/carpet-image.service';
import { BaseComponent } from '../../base/base.component';
import { BackgroundCarpetService } from './background-carpet.service';

interface BackgroundTile {
  x: number;
  y: number;
  size: number;
  currentCarpet: string;
  nextCarpet: string;
  transitionProgress: number; // 0 to 1
  nextTransitionTime: number; // timestamp for next transition
  isTransitioning: boolean;
}

@Component({
  selector: 'app-background-carpet',
  standalone: true,
  imports: [],
  template: `
    <canvas
      #backgroundCanvas
      class="background-carpet-canvas"
      [style.opacity]="backgroundService.settings().opacity"
      [style.display]="backgroundService.settings().enabled ? 'block' : 'none'"
    >
    </canvas>
  `,
  styles: [
    `
      .background-carpet-canvas {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: -10;
        pointer-events: none;
        transition: opacity 0.5s ease;
      }
    `,
  ],
})
export class BackgroundCarpetComponent extends BaseComponent implements AfterViewInit, OnDestroy {
  @ViewChild('backgroundCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private lastUpdateTime = 0;
  private tiles: BackgroundTile[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private visibilityChangeHandler: (() => void) | null = null;

  protected readonly carpetService = inject(CarpetImageService);
  protected readonly backgroundService = inject(BackgroundCarpetService);

  protected readonly tileSize = computed(() => {
    return this.backgroundService.getTileSize();
  });

  constructor() {
    super();
    this.setupVisibilityChangeHandler();
    this.setupSettingsEffects();
  }

  private setupSettingsEffects(): void {
    // React to enabled state changes
    effect(() => {
      const enabled = this.backgroundService.settings().enabled;
      if (enabled) {
        this.startAnimation();
      } else {
        this.stopAnimation();
      }
    });

    // React to tile size or performance changes
    effect(() => {
      const settings = this.backgroundService.settings();
      // Trigger re-initialization when relevant settings change
      if (this.ctx) {
        this.initializeTiles();
      }
    });
  }

  ngAfterViewInit(): void {
    this.initializeCanvas();
    this.initializeTiles();
    this.startAnimation();
    this.setupResizeObserver();
  }

  ngOnDestroy(): void {
    this.stopAnimation();
    this.cleanupObservers();
  }

  private initializeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resizeCanvas();
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';

    this.ctx.scale(dpr, dpr);

    // Re-initialize tiles when canvas size changes
    this.initializeTiles();
  }

  private initializeTiles(): void {
    const tileSize = this.tileSize();
    const cols = Math.ceil(window.innerWidth / tileSize) + 1; // +1 for partial tiles
    const rows = Math.ceil(window.innerHeight / tileSize) + 1;
    const maxTiles = this.backgroundService.getMaxTiles();

    this.tiles = [];
    let tileCount = 0;

    for (let row = 0; row < rows && tileCount < maxTiles; row++) {
      for (let col = 0; col < cols && tileCount < maxTiles; col++) {
        const carpets = this.carpetService.getAllLoadedCarpets();
        if (carpets.length < 2) continue; // Need at least 2 carpets for transitions

        const currentCarpet = carpets[Math.floor(Math.random() * carpets.length)].id;
        let nextCarpet = currentCarpet;
        while (nextCarpet === currentCarpet && carpets.length > 1) {
          nextCarpet = carpets[Math.floor(Math.random() * carpets.length)].id;
        }

        this.tiles.push({
          x: col * tileSize,
          y: row * tileSize,
          size: tileSize,
          currentCarpet,
          nextCarpet,
          transitionProgress: 0,
          nextTransitionTime: this.calculateNextTransitionTime(),
          isTransitioning: false,
        });

        tileCount++;
      }
    }
  }

  private calculateNextTransitionTime(): number {
    // Random delay between 5-15 seconds for better visibility, adjusted by intensity
    const baseDelay = 5000 + Math.random() * 10000; // 5-15 seconds
    const adjustedDelay = baseDelay / this.backgroundService.settings().intensity;
    return Date.now() + adjustedDelay;
  }

  private startAnimation(): void {
    if (!this.backgroundService.settings().enabled || this.animationId) return;

    // Use requestIdleCallback if available for better performance
    if ('requestIdleCallback' in window) {
      this.animateWithIdleCallback();
    } else {
      this.animate();
    }
  }

  private animateWithIdleCallback(): void {
    if (!this.backgroundService.settings().enabled) return;

    (window as any).requestIdleCallback(
      () => {
        this.updateAndRender();
        // Schedule next frame
        this.animationId = requestAnimationFrame(() => this.animateWithIdleCallback());
      },
      { timeout: 1000 }
    ); // 1 second timeout to ensure regular updates
  }

  private animate(): void {
    if (!this.backgroundService.settings().enabled) return;

    this.updateAndRender();
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  private updateAndRender(): void {
    const currentTime = Date.now();

    // Throttle updates based on performance setting
    const updateInterval = this.backgroundService.getUpdateInterval();
    if (currentTime - this.lastUpdateTime < updateInterval) {
      return;
    }

    this.lastUpdateTime = currentTime;

    let needsRedraw = false;

    // Update tiles
    this.tiles.forEach(tile => {
      // Check if it's time to start a new transition
      if (!tile.isTransitioning && currentTime >= tile.nextTransitionTime) {
        this.startTileTransition(tile);
        needsRedraw = true;
      }

      // Update ongoing transitions
      if (tile.isTransitioning) {
        tile.transitionProgress += 0.02; // Slow transition (50 frames = ~25 seconds at 2fps)

        if (tile.transitionProgress >= 1) {
          this.completeTileTransition(tile);
        }
        needsRedraw = true;
      }
    });

    if (needsRedraw) {
      this.render();
    }
  }

  private startTileTransition(tile: BackgroundTile): void {
    const carpets = this.carpetService.getAllLoadedCarpets();
    if (carpets.length < 2) return;

    // Choose a new carpet different from current
    let newCarpet = tile.currentCarpet;
    while (newCarpet === tile.currentCarpet && carpets.length > 1) {
      newCarpet = carpets[Math.floor(Math.random() * carpets.length)].id;
    }

    tile.nextCarpet = newCarpet;
    tile.transitionProgress = 0;
    tile.isTransitioning = true;
  }

  private completeTileTransition(tile: BackgroundTile): void {
    tile.currentCarpet = tile.nextCarpet;
    tile.transitionProgress = 0;
    tile.isTransitioning = false;
    tile.nextTransitionTime = this.calculateNextTransitionTime();
  }

  private render(): void {
    if (!this.ctx) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // Draw tiles
    this.tiles.forEach(tile => {
      this.drawTile(tile);
    });
  }

  private drawTile(tile: BackgroundTile): void {
    const currentImage = this.carpetService.getCarpetById(tile.currentCarpet)?.image;

    if (!currentImage || !currentImage.complete) {
      return; // Skip if image not loaded
    }

    if (tile.isTransitioning) {
      // Fade transition between carpets
      const nextImage = this.carpetService.getCarpetById(tile.nextCarpet)?.image;

      if (nextImage && nextImage.complete) {
        // Draw current carpet with fading opacity
        this.ctx.globalAlpha = 1 - tile.transitionProgress;
        this.ctx.drawImage(currentImage, tile.x, tile.y, tile.size, tile.size);

        // Draw next carpet with increasing opacity
        this.ctx.globalAlpha = tile.transitionProgress;
        this.ctx.drawImage(nextImage, tile.x, tile.y, tile.size, tile.size);

        // Reset global alpha
        this.ctx.globalAlpha = 1;
      } else {
        // Fallback to current carpet only
        this.ctx.drawImage(currentImage, tile.x, tile.y, tile.size, tile.size);
      }
    } else {
      // Draw current carpet
      this.ctx.drawImage(currentImage, tile.x, tile.y, tile.size, tile.size);
    }
  }

  private stopAnimation(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
    });
    this.resizeObserver.observe(document.body);
  }

  private setupVisibilityChangeHandler(): void {
    this.visibilityChangeHandler = () => {
      if (document.hidden) {
        this.stopAnimation();
      } else if (this.backgroundService.settings().enabled) {
        this.startAnimation();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }

  private cleanupObservers(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    }
  }
}
