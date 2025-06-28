// src/app/carpets/feature/carpet-detector/carpet-detector.component.ts
import { Component, ViewChild, ElementRef, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BaseComponent } from '@shared/base/base.component';
import { DynamicCarpetMatcherService } from '../../data-access/dynamic-carpet-matcher.service';
import { ReferenceImageAnalyzerService } from '../../data-access/reference-image-analyzer.service';

@Component({
  selector: 'app-carpet-detector',
  imports: [CommonModule],
  template: `
    <div class="carpet-detector">

      <!-- Header -->
      <header class="header">
        <button class="back-btn" (click)="goBack()">
          ← Back
        </button>
        <h1>🎯 Carpet Detector</h1>
        <button class="setup-btn" (click)="goToCapture()">
          ⚙️ Setup
        </button>
      </header>

      <!-- Camera View -->
      <div class="camera-container">
        <video
          #videoElement
          class="camera-video"
          autoplay
          playsinline
          muted>
        </video>

        <!-- Detection Overlay -->
        <div class="detection-overlay">

          @if (matcher.isAnalyzing()) {
            <div class="analyzing">
              <div class="pulse"></div>
              <span>Analyzing...</span>
            </div>
          }

          @if (matcher.currentMatch(); as match) {
            <div class="result" [class.match]="match.isMatch" [class.no-match]="!match.isMatch">

              @if (match.isMatch) {
                <div class="match-indicator">
                  <span class="icon">✅</span>
                  <div class="match-info">
                    <div class="carpet-name">{{ match.referenceName }}</div>
                    <div class="confidence">{{ match.confidence }}% confident</div>
                  </div>
                </div>
              } @else {
                <div class="no-match-indicator">
                  <span class="icon">❌</span>
                  <div class="no-match-info">
                    <div class="text">No Carpet Match</div>
                    <div class="confidence">{{ match.confidence }}% confidence</div>
                  </div>
                </div>
              }

              @if (showDebug()) {
                <div class="debug-info">
                  <h4>Analysis:</h4>
                  <div class="debug-stats">
                    <span>Color: {{ match.colorSimilarity }}%</span>
                    <span>Texture: {{ match.textureSimilarity }}%</span>
                    <span>Pattern: {{ match.geometricSimilarity }}%</span>
                  </div>
                  <ul>
                    @for (reason of match.reasoning; track reason) {
                      <li>{{ reason }}</li>
                    }
                  </ul>
                </div>
              }
            </div>
          }

          @if (matcher.loadedReferences().length === 0) {
            <div class="no-references">
              <span class="icon">⚠️</span>
              <div class="message">
                <div>No carpet references loaded</div>
                <button (click)="goToCapture()" class="setup-link">
                  Set up references →
                </button>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Controls -->
      <div class="controls">
        <button
          class="analyze-btn"
          [disabled]="isAnalyzing() || matcher.loadedReferences().length === 0"
          (click)="toggleAnalysis()">
          @if (isAnalyzing()) {
            Stop Detection
          } @else {
            Start Detection
          }
        </button>

        <button
          class="debug-btn"
          [class.active]="showDebug()"
          (click)="toggleDebug()">
          Debug
        </button>

        <button
          class="single-btn"
          [disabled]="isAnalyzing() || matcher.loadedReferences().length === 0"
          (click)="analyzeSingle()">
          Single Check
        </button>
      </div>

      <!-- Status -->
      <div class="status-info">
        <div>References: {{ matcher.loadedReferences().length }}</div>
        <div>Analyses: {{ analysisCount() }}</div>
        <div>Rate: {{ analysisRate() }}/sec</div>
      </div>
    </div>
  `,
  styles: [`
    .carpet-detector {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: #000;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 20px;
      background: #222;
      color: white;
    }

    .header h1 {
      margin: 0;
      font-size: 18px;
    }

    .back-btn, .setup-btn {
      padding: 8px 16px;
      background: #444;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }

    .setup-btn {
      background: #007bff;
    }

    .camera-container {
      position: relative;
      flex: 1;
      overflow: hidden;
    }

    .camera-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .detection-overlay {
      position: absolute;
      top: 20px;
      left: 20px;
      right: 20px;
      z-index: 10;
    }

    .analyzing {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
    }

    .pulse {
      width: 12px;
      height: 12px;
      background: #00ff00;
      border-radius: 50%;
      animation: pulse 1s infinite;
    }

    .result {
      background: rgba(0,0,0,0.85);
      color: white;
      padding: 16px;
      border-radius: 12px;
      border: 2px solid transparent;
    }

    .result.match {
      border-color: #00ff00;
      background: rgba(0,255,0,0.15);
    }

    .result.no-match {
      border-color: #ff4444;
      background: rgba(255,68,68,0.15);
    }

    .match-indicator, .no-match-indicator {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .match-indicator .icon, .no-match-indicator .icon {
      font-size: 24px;
    }

    .carpet-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .confidence, .no-match-info .confidence {
      font-size: 14px;
      opacity: 0.8;
    }

    .no-match-info .text {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .no-references {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(255,165,0,0.9);
      color: #000;
      padding: 16px;
      border-radius: 12px;
    }

    .no-references .icon {
      font-size: 24px;
    }

    .setup-link {
      background: #007bff;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 8px;
    }

    .debug-info {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #444;
      font-size: 14px;
    }

    .debug-info h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
    }

    .debug-stats {
      display: flex;
      gap: 15px;
      margin-bottom: 10px;
      font-family: monospace;
    }

    .debug-info ul {
      margin: 0;
      padding-left: 20px;
    }

    .debug-info li {
      margin-bottom: 4px;
    }

    .controls {
      display: flex;
      gap: 10px;
      padding: 16px 20px;
      background: #222;
    }

    .controls button {
      flex: 1;
      padding: 12px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .analyze-btn {
      background: #28a745;
      color: white;
    }

    .analyze-btn:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }

    .debug-btn {
      background: #6c757d;
      color: white;
    }

    .debug-btn.active {
      background: #ffc107;
      color: #000;
    }

    .single-btn {
      background: #17a2b8;
      color: white;
    }

    .single-btn:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }

    .status-info {
      display: flex;
      justify-content: space-between;
      padding: 8px 20px;
      background: #333;
      color: white;
      font-size: 12px;
      font-family: monospace;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  `]
})
export class CarpetDetectorComponent extends BaseComponent {
  @ViewChild('videoElement') videoRef!: ElementRef<HTMLVideoElement>;

  protected readonly matcher = inject(DynamicCarpetMatcherService);
  protected readonly analyzer = inject(ReferenceImageAnalyzerService);


  // Local state
  private readonly _stream = signal<MediaStream | null>(null);
  private readonly _isAnalyzing = signal(false);
  private readonly _showDebug = signal(false);
  private readonly _analysisCount = signal(0);
  private readonly _analysisRate = signal(0);
  private readonly _analysisInterval = signal<ReturnType<typeof setInterval> | null>(null);

  // Exposed state
  readonly isAnalyzing = this._isAnalyzing.asReadonly();
  readonly showDebug = this._showDebug.asReadonly();
  readonly analysisCount = this._analysisCount.asReadonly();
  readonly analysisRate = this._analysisRate.asReadonly();

  private rateCounter = 0;
  private rateStartTime = Date.now();

  constructor() {
    super();
    console.log('[CarpetDetector] 🎯 Carpet detector initialized');

    // Load references from analyzer service
    this.loadReferences();

    // Update rate calculation
    effect(() => {
      if (this.analysisCount() > 0) {
        this.updateRate();
      }
    });

    // Listen for new references
    effect(() => {
      const references = this.analyzer.analyzedReferences();
      if (references.length > 0) {
        this.matcher.loadReferences(references);
        console.log(`🔄 Loaded ${references.length} references into matcher`);
      }
    });
  }

  protected override onInit(): void {
    this.initCamera();
  }

   onDestroy(): void {
    this.stopAnalysis();
    this.stopCamera();
  }

  private async initCamera(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment'
        }
      });

      this._stream.set(stream);

      setTimeout(() => {
        if (this.videoRef?.nativeElement) {
          this.videoRef.nativeElement.srcObject = stream;
          console.log('[CarpetDetector] ✅ Camera connected');
        }
      }, 100);

    } catch (error) {
      console.error('[CarpetDetector] ❌ Camera access failed:', error);
    }
  }

  private stopCamera(): void {
    const stream = this._stream();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      this._stream.set(null);
    }
  }

  toggleAnalysis(): void {
    if (this._isAnalyzing()) {
      this.stopAnalysis();
    } else {
      this.startAnalysis();
    }
  }

  private startAnalysis(): void {
    if (this.matcher.loadedReferences().length === 0) {
      alert('No carpet references loaded. Please set up references first.');
      return;
    }

    this._isAnalyzing.set(true);
    this.rateCounter = 0;
    this.rateStartTime = Date.now();

    // Analyze every 600ms for good performance
    const interval = setInterval(() => {
      this.performAnalysis();
    }, 600);

    this._analysisInterval.set(interval);
  }

  private stopAnalysis(): void {
    this._isAnalyzing.set(false);
    const interval = this._analysisInterval();
    if (interval) {
      clearInterval(interval);
      this._analysisInterval.set(null);
    }
  }

  analyzeSingle(): void {
    this.performAnalysis();
  }

  private performAnalysis(): void {
    if (!this.videoRef?.nativeElement) return;

    const video = this.videoRef.nativeElement;
    if (video.readyState < 2) return;

    try {
      // Use 65% for better sensitivity since you're getting 70% on target
      this.matcher.matchFrame(video, 65);
      this._analysisCount.set(this._analysisCount() + 1);
      this.rateCounter++;
    } catch (error) {
      console.error('[CarpetDetector] Analysis failed:', error);
    }
  }

  toggleDebug(): void {
    this._showDebug.set(!this._showDebug());
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  goToCapture(): void {
    this.router.navigate(['/carpets/capture']);
  }

  private updateRate(): void {
    const elapsed = (Date.now() - this.rateStartTime) / 1000;
    if (elapsed > 0) {
      const rate = Math.round((this.rateCounter / elapsed) * 10) / 10;
      this._analysisRate.set(rate);
    }
  }

  private loadReferences(): void {
    // Load references through the analyzer service
    const references = this.analyzer.analyzedReferences();
    if (references.length > 0) {
      this.matcher.loadReferences(references);
      console.log(`✅ Loaded ${references.length} references from analyzer`);
    }
  }
}
