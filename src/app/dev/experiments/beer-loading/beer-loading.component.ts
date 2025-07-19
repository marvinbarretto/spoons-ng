import { Component, signal, computed, OnDestroy } from '@angular/core';

import { LottieComponent } from 'ngx-lottie';
import { BaseComponent } from '@shared/base/base.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { AnimationItem } from 'lottie-web';

@Component({
  selector: 'app-beer-loading',
  standalone: true,
  imports: [LottieComponent, ButtonComponent],
  template: `
    <div class="beer-loading-container">
      <div class="controls">
        <h3>🍺 Beer Loading Animation</h3>
        <div class="button-group">
          <app-button
            variant="primary"
            size="sm"
            (click)="startAnimation()"
            [disabled]="isLoading()">
            Start Animation
          </app-button>
          <app-button
            variant="secondary"
            size="sm"
            (click)="stopAnimation()"
            [disabled]="!isLoading()">
            Stop Animation
          </app-button>
          <app-button
            variant="outline"
            size="sm"
            (click)="switchAnimation()">
            {{ currentAnimation() === 'bubbles' ? 'Switch to Pouring' : 'Switch to Bubbles' }}
          </app-button>
        </div>
      </div>

      <div class="animation-container">
        <div class="animation-wrapper">
          @if (currentAnimation() === 'bubbles') {
            <ng-lottie
              width="200px"
              height="200px"
              [options]="bubblesOptions()"
              (animationCreated)="onAnimationCreated($event)"
              class="lottie-animation">
            </ng-lottie>
          } @else {
            <ng-lottie
              width="200px"
              height="200px"
              [options]="pouringOptions()"
              (animationCreated)="onAnimationCreated($event)"
              class="lottie-animation">
            </ng-lottie>
          }
        </div>

        <div class="animation-info">
          <p><strong>Current:</strong> {{ currentAnimation() === 'bubbles' ? 'Beer Bubbles' : 'Beer Pouring' }}</p>
          <p><strong>Status:</strong> {{ isLoading() ? 'Playing' : 'Paused' }}</p>
        </div>
      </div>

      <div class="beer-themed-states">
        <h4>Beer-Themed Loading States</h4>
        <div class="state-examples">
          <div class="state-example">
            <div class="state-demo">
              <div class="beer-glass">
                <div class="beer-fill" [style.height.%]="beerFillLevel()"></div>
                <div class="beer-foam"></div>
              </div>
            </div>
            <span>CSS Beer Glass</span>
          </div>

          <div class="state-example">
            <div class="state-demo">
              <div class="beer-bubbles">
                <div class="bubble"></div>
                <div class="bubble"></div>
                <div class="bubble"></div>
              </div>
            </div>
            <span>CSS Bubbles</span>
          </div>

          <div class="state-example">
            <div class="state-demo">
              <div class="beer-tap">
                <div class="tap-handle"></div>
                <div class="beer-stream"></div>
              </div>
            </div>
            <span>CSS Beer Tap</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .beer-loading-container {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      padding: 1rem;
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
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .animation-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .animation-wrapper {
      background: var(--background-lighter);
      border: 2px solid var(--border);
      border-radius: 12px;
      padding: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .lottie-animation {
      filter: drop-shadow(0 4px 8px var(--shadow));
    }

    .animation-info {
      text-align: center;
      color: var(--text-muted);
    }

    .animation-info p {
      margin: 0.25rem 0;
    }

    .beer-themed-states {
      border-top: 1px solid var(--border);
      padding-top: 2rem;
    }

    .beer-themed-states h4 {
      text-align: center;
      margin-bottom: 1rem;
      color: var(--text);
    }

    .state-examples {
      display: flex;
      justify-content: space-around;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .state-example {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .state-demo {
      width: 80px;
      height: 80px;
      background: var(--background-lighter);
      border: 1px solid var(--border);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    /* Beer Glass Animation */
    .beer-glass {
      width: 30px;
      height: 40px;
      background: transparent;
      border: 2px solid var(--warning);
      border-radius: 0 0 8px 8px;
      position: relative;
      overflow: hidden;
    }

    .beer-fill {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(to top, #d4a643, #f4d03f);
      transition: height 0.3s ease;
    }

    .beer-foam {
      position: absolute;
      top: -5px;
      left: -2px;
      right: -2px;
      height: 8px;
      background: #f8f9fa;
      border-radius: 50%;
      animation: foam-bubble 2s infinite;
    }

    @keyframes foam-bubble {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    /* Beer Bubbles Animation */
    .beer-bubbles {
      position: relative;
      width: 100%;
      height: 100%;
    }

    .bubble {
      position: absolute;
      width: 8px;
      height: 8px;
      background: var(--warning);
      border-radius: 50%;
      animation: bubble-float 2s infinite;
    }

    .bubble:nth-child(1) {
      left: 20%;
      animation-delay: 0s;
    }

    .bubble:nth-child(2) {
      left: 50%;
      animation-delay: 0.7s;
    }

    .bubble:nth-child(3) {
      left: 80%;
      animation-delay: 1.4s;
    }

    @keyframes bubble-float {
      0% {
        bottom: 0;
        opacity: 1;
      }
      100% {
        bottom: 60px;
        opacity: 0;
      }
    }

    /* Beer Tap Animation */
    .beer-tap {
      position: relative;
      width: 100%;
      height: 100%;
    }

    .tap-handle {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      width: 15px;
      height: 20px;
      background: var(--text);
      border-radius: 3px;
      animation: tap-pour 3s infinite;
    }

    .beer-stream {
      position: absolute;
      top: 30px;
      left: 50%;
      transform: translateX(-50%);
      width: 3px;
      height: 30px;
      background: linear-gradient(to bottom, #f4d03f, #d4a643);
      animation: stream-flow 3s infinite;
    }

    @keyframes tap-pour {
      0%, 30% { transform: translateX(-50%) rotate(0deg); }
      35%, 65% { transform: translateX(-50%) rotate(15deg); }
      70%, 100% { transform: translateX(-50%) rotate(0deg); }
    }

    @keyframes stream-flow {
      0%, 30% { opacity: 0; height: 0; }
      35%, 65% { opacity: 1; height: 30px; }
      70%, 100% { opacity: 0; height: 0; }
    }

    .state-example span {
      font-size: 0.8rem;
      color: var(--text-muted);
      text-align: center;
    }
  `]
})
export class BeerLoadingComponent extends BaseComponent implements OnDestroy {
  private animationItem: AnimationItem | null = null;
  private beerFillInterval: any;

  protected readonly currentAnimation = signal<'bubbles' | 'pouring'>('bubbles');
  protected readonly isLoading = signal(false);
  protected readonly beerFillLevel = signal(0);

  // Lottie options for different animations
  protected readonly bubblesOptions = computed(() => ({
    path: 'https://assets-v2.lottiefiles.com/a/c2423dde-1151-11ee-965f-b32c6b16c8b8/9MQeD3Aaxc.json', // Happy Friday beer animation
    autoplay: this.isLoading(),
    loop: true,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice'
    }
  }));

  protected readonly pouringOptions = computed(() => ({
    path: 'https://assets-v2.lottiefiles.com/a/c2423dde-1151-11ee-965f-b32c6b16c8b8/9MQeD3Aaxc.json', // Same animation for now - we can add more later
    autoplay: this.isLoading(),
    loop: true,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice'
    }
  }));

  constructor() {
    super();
    this.startBeerFillAnimation();
  }

  onAnimationCreated(animationItem: AnimationItem): void {
    this.animationItem = animationItem;
    console.log('Lottie animation created:', animationItem);
  }

  startAnimation(): void {
    this.isLoading.set(true);
    this.animationItem?.play();
  }

  stopAnimation(): void {
    this.isLoading.set(false);
    this.animationItem?.pause();
  }

  switchAnimation(): void {
    const newAnimation = this.currentAnimation() === 'bubbles' ? 'pouring' : 'bubbles';
    this.currentAnimation.set(newAnimation);

    // Restart animation if it was playing
    if (this.isLoading()) {
      setTimeout(() => {
        this.animationItem?.play();
      }, 100);
    }
  }

  ngOnDestroy(): void {
    if (this.beerFillInterval) {
      clearInterval(this.beerFillInterval);
    }
  }

  private startBeerFillAnimation(): void {
    let level = 0;
    this.beerFillInterval = setInterval(() => {
      level += 2;
      this.beerFillLevel.set(level);

      if (level >= 100) {
        level = 0;
      }
    }, 100);
  }
}
