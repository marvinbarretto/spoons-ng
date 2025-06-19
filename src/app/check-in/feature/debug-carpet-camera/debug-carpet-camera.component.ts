// src/app/check-in/feature/debug-carpet-camera/enhanced-debug-carpet-camera.component.ts
import { Component, ViewChild, ElementRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BaseComponent } from '@shared/data-access/base.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { CarpetService } from '../../data-access/carpet.service';

@Component({
  selector: 'app-enhanced-debug-carpet-camera',
  imports: [CommonModule, ButtonComponent, IconComponent],
  template: `
    <div class="enhanced-debug-carpet-camera">

      <!-- ✅ Header -->
      <header class="camera-header">
        <button class="back-btn" (click)="goBack()">
          <app-icon name="arrow_back" size="md" />
          Back
        </button>
        <h1>🔬 Enhanced Carpet Recognition</h1>
        <div class="version-badge">v2.0</div>
      </header>

      <!-- ✅ Camera with enhanced overlay -->
      <div class="camera-container">

        <video
          #videoElement
          class="camera-video"
          autoplay
          playsinline
          muted>
        </video>

        <!-- ✅ Enhanced debug overlay -->
        <div class="debug-overlay">

          <!-- Analysis counter & confidence -->
          <div class="analysis-header">
            <span class="analysis-counter">Analysis #{{ analysisCount() }}</span>
            @if (bestMatch()) {
              <span class="confidence-indicator" [class]="getConfidenceClass(bestMatch()!.confidence)">
                {{ bestMatch()!.confidence.toFixed(1) }}%
              </span>
            }
          </div>

          <!-- Scanning indicator -->
          @if (isScanning()) {
            <div class="scanning-indicator">
              <div class="scan-pulse"></div>
              <span>🔍 Analyzing frame...</span>
            </div>
          }

          <!-- ✅ Enhanced feature display -->
          @if (lastFeatures()) {
            <div class="features-display">

              <!-- Geometric Features -->
              <div class="feature-section geometry">
                <h4>📐 Pattern Analysis</h4>
                <div class="pattern-info">
                  <span class="pattern-type">{{ lastFeatures()!.geometricFeatures.dominantShape | titlecase }}</span>
                  @if (lastFeatures()!.geometricFeatures.hasSquares) {
                    <span class="pattern-indicator squares">⬜ Squares</span>
                  }
                  @if (lastFeatures()!.geometricFeatures.hasOrnamental) {
                    <span class="pattern-indicator ornamental">🌿 Ornamental</span>
                  }
                </div>
                <div class="metrics-row">
                  <span>Repetition: {{ (lastFeatures()!.geometricFeatures.repetitionScore * 100).toFixed(0) }}%</span>
                  <span>Scale: {{ lastFeatures()!.geometricFeatures.patternScale }}</span>
                </div>
              </div>

              <!-- Texture Features -->
              <div class="feature-section texture">
                <h4>🏗️ Texture Metrics</h4>
                <div class="texture-bars">
                  <div class="texture-bar">
                    <label>Contrast</label>
                    <div class="bar">
                      <div class="bar-fill" [style.width.%]="lastFeatures()!.textureFeatures.contrast * 100"></div>
                    </div>
                    <span>{{ (lastFeatures()!.textureFeatures.contrast * 100).toFixed(0) }}%</span>
                  </div>
                  <div class="texture-bar">
                    <label>Edge Density</label>
                    <div class="bar">
                      <div class="bar-fill" [style.width.%]="lastFeatures()!.textureFeatures.edgeDensity"></div>
                    </div>
                    <span>{{ lastFeatures()!.textureFeatures.edgeDensity.toFixed(0) }}/100px</span>
                  </div>
                </div>
              </div>

              <!-- Color Profile -->
              <div class="feature-section colors">
                <h4>🎨 Colors ({{ lastFeatures()!.colorProfile.dominant.length }})</h4>
                <div class="color-swatches">
                  @for (color of lastFeatures()!.colorProfile.dominant.slice(0, 4); track color) {
                    <div
                      class="color-swatch"
                      [style.background-color]="color"
                      [title]="color">
                    </div>
                  }
                </div>
                <div class="color-variance">
                  Variance: {{ lastFeatures()!.colorProfile.variance.toFixed(1) }}
                </div>
              </div>

            </div>
          }

        </div>

      </div>

      <!-- ✅ Enhanced Results Panel -->
      @if (hasAnalyzed()) {
        <div class="results-panel">

          @if (lastMatches().length > 0) {
            <div class="matches-section">
              <h3>🎯 Pattern Matches ({{ lastMatches().length }})</h3>

              @for (match of lastMatches(); track match.pubId) {
                <div class="enhanced-match-card" [class]="getMatchClass(match.confidence)">

                  <!-- Match Header -->
                  <div class="match-header">
                    <div class="match-info">
                      <h4>{{ match.pubName }}</h4>
                      <div class="confidence-badge" [class]="getConfidenceClass(match.confidence)">
                        {{ match.confidence.toFixed(1) }}%
                      </div>
                    </div>
                  </div>

                  <!-- Detailed Similarity Breakdown -->
                  <div class="similarity-breakdown">
                    <div class="similarity-row">
                      <span class="label">🎨 Color</span>
                      <div class="similarity-bar">
                        <div class="bar-fill color" [style.width.%]="match.colorSimilarity"></div>
                      </div>
                      <span class="value">{{ match.colorSimilarity.toFixed(0) }}%</span>
                    </div>
                    <div class="similarity-row">
                      <span class="label">🏗️ Texture</span>
                      <div class="similarity-bar">
                        <div class="bar-fill texture" [style.width.%]="match.textureSimilarity"></div>
                      </div>
                      <span class="value">{{ match.textureSimilarity.toFixed(0) }}%</span>
                    </div>
                    <div class="similarity-row">
                      <span class="label">📐 Geometry</span>
                      <div class="similarity-bar">
                        <div class="bar-fill geometry" [style.width.%]="match.geometrySimilarity"></div>
                      </div>
                      <span class="value">{{ match.geometrySimilarity.toFixed(0) }}%</span>
                    </div>
                  </div>

                  <!-- AI Reasoning -->
                  <details class="reasoning-details">
                    <summary>🧠 Analysis Reasoning</summary>
                    <ul class="reasoning-list">
                      @for (reason of match.reasoning; track reason) {
                        <li>{{ reason }}</li>
                      }
                    </ul>
                  </details>

                </div>
              }
            </div>
          } @else {
            <div class="no-matches">
              <h3>🚫 No Pattern Matches</h3>
              <p>The detected features don't match any known carpet patterns.</p>
            </div>
          }

        </div>
      }

      <!-- ✅ Controls -->
      <div class="debug-controls">
        <app-button
          variant="primary"
          (click)="triggerManualAnalysis()"
          [disabled]="isScanning()">
          @if (isScanning()) {
            <app-icon name="hourglass_empty" size="sm" />
            Analyzing...
          } @else {
            <app-icon name="center_focus_strong" size="sm" />
            Analyze Frame
          }
        </app-button>

        <app-button
          variant="secondary"
          (click)="clearResults()"
          [disabled]="isScanning()">
          <app-icon name="clear_all" size="sm" />
          Clear Results
        </app-button>
      </div>

      <!-- ✅ Performance Stats -->
      @if (lastFeatures()) {
        <div class="performance-stats">
          <div class="stat">
            <label>Color Processing</label>
            <span>{{ lastFeatures()!.colorProfile.processingTime.toFixed(1) }}ms</span>
          </div>
          <div class="stat">
            <label>Pixels Sampled</label>
            <span>{{ lastFeatures()!.colorProfile.sampledPixels.toLocaleString() }}</span>
          </div>
          <div class="stat">
            <label>Features Detected</label>
            <span>{{ featureCount() }}</span>
          </div>
        </div>
      }

      <!-- ✅ Console Notice -->
      <div class="console-notice">
        <app-icon name="terminal" size="sm" />
        <span>Detailed analysis logs available in browser console</span>
      </div>

    </div>
  `,
  styles: [`
    .enhanced-debug-carpet-camera {
      display: grid;
      gap: 1rem;
      padding: 1rem;
      background: #1a1a1a;
      color: #fff;
      min-height: 100vh;
    }

    .camera-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid #333;
    }

    .back-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: none;
      border: 1px solid #555;
      color: #fff;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }

    .back-btn:hover {
      background: #333;
      border-color: #777;
    }

    .camera-header h1 {
      flex: 1;
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .version-badge {
      background: #00ff88;
      color: #000;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
    }

    .camera-container {
      position: relative;
      border-radius: 8px;
      overflow: hidden;
      aspect-ratio: 4 / 3;
      max-height: 50vh;
    }

    .camera-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      background: #000;
    }

    .debug-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      background: linear-gradient(
        to bottom,
        rgba(0,0,0,0.8) 0%,
        rgba(0,0,0,0.2) 30%,
        rgba(0,0,0,0.2) 70%,
        rgba(0,0,0,0.8) 100%
      );
      display: flex;
      flex-direction: column;
      padding: 1rem;
    }

    .analysis-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .analysis-counter {
      background: rgba(0,0,0,0.8);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
      color: #ffaa00;
    }

    .confidence-indicator {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-weight: bold;
      font-size: 11px;
    }

    .confidence-indicator.high {
      background: #00ff88;
      color: #000;
    }

    .confidence-indicator.medium {
      background: #ffaa00;
      color: #000;
    }

    .confidence-indicator.low {
      background: #ff4444;
      color: #fff;
    }

    .scanning-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255,170,0,0.9);
      color: #000;
      padding: 0.5rem;
      border-radius: 6px;
      font-weight: bold;
      margin-bottom: 1rem;
    }

    .scan-pulse {
      width: 12px;
      height: 12px;
      background: #000;
      border-radius: 50%;
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    .features-display {
      display: grid;
      gap: 0.75rem;
      margin-top: auto;
    }

    .feature-section {
      background: rgba(0,0,0,0.8);
      border-radius: 6px;
      padding: 0.75rem;
      border-left: 3px solid #555;
    }

    .feature-section.geometry {
      border-left-color: #00ff88;
    }

    .feature-section.texture {
      border-left-color: #ffaa00;
    }

    .feature-section.colors {
      border-left-color: #ff44aa;
    }

    .feature-section h4 {
      margin: 0 0 0.5rem 0;
      font-size: 12px;
      font-weight: bold;
      opacity: 0.9;
    }

    .pattern-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .pattern-type {
      font-weight: bold;
      color: #00ff88;
      font-size: 13px;
    }

    .pattern-indicator {
      font-size: 10px;
      padding: 0.125rem 0.25rem;
      border-radius: 3px;
      background: rgba(255,255,255,0.1);
    }

    .pattern-indicator.squares {
      background: rgba(0,255,136,0.2);
      color: #00ff88;
    }

    .pattern-indicator.ornamental {
      background: rgba(255,170,0,0.2);
      color: #ffaa00;
    }

    .metrics-row {
      display: flex;
      gap: 1rem;
      font-size: 11px;
      opacity: 0.8;
    }

    .texture-bars {
      display: grid;
      gap: 0.375rem;
    }

    .texture-bar {
      display: grid;
      grid-template-columns: 60px 1fr 40px;
      align-items: center;
      gap: 0.5rem;
      font-size: 10px;
    }

    .texture-bar label {
      font-weight: bold;
      opacity: 0.8;
    }

    .bar {
      height: 8px;
      background: rgba(255,255,255,0.1);
      border-radius: 4px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      background: #ffaa00;
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .color-swatches {
      display: flex;
      gap: 0.25rem;
      margin-bottom: 0.25rem;
    }

    .color-swatch {
      width: 20px;
      height: 20px;
      border-radius: 3px;
      border: 1px solid rgba(255,255,255,0.3);
    }

    .color-variance {
      font-size: 10px;
      opacity: 0.7;
    }

    .results-panel {
      background: #2a2a2a;
      border-radius: 8px;
      padding: 1rem;
      border: 1px solid #444;
    }

    .matches-section h3 {
      margin: 0 0 1rem 0;
      color: #00ff88;
      font-size: 1.1rem;
    }

    .enhanced-match-card {
      background: #333;
      border-radius: 6px;
      padding: 1rem;
      margin-bottom: 1rem;
      border-left: 4px solid #555;
    }

    .enhanced-match-card.high-confidence {
      border-left-color: #00ff88;
      background: rgba(0,255,136,0.05);
    }

    .enhanced-match-card.medium-confidence {
      border-left-color: #ffaa00;
      background: rgba(255,170,0,0.05);
    }

    .enhanced-match-card.low-confidence {
      border-left-color: #ff4444;
      background: rgba(255,68,68,0.05);
    }

    .match-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .match-info h4 {
      margin: 0;
      font-size: 1rem;
      color: #fff;
    }

    .confidence-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-weight: bold;
      font-size: 12px;
    }

    .confidence-badge.high {
      background: #00ff88;
      color: #000;
    }

    .confidence-badge.medium {
      background: #ffaa00;
      color: #000;
    }

    .confidence-badge.low {
      background: #ff4444;
      color: #fff;
    }

    .similarity-breakdown {
      display: grid;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .similarity-row {
      display: grid;
      grid-template-columns: 60px 1fr 40px;
      align-items: center;
      gap: 0.75rem;
      font-size: 12px;
    }

    .similarity-row .label {
      font-weight: bold;
      opacity: 0.9;
    }

    .similarity-bar {
      height: 12px;
      background: rgba(255,255,255,0.1);
      border-radius: 6px;
      overflow: hidden;
    }

    .similarity-bar .bar-fill {
      height: 100%;
      border-radius: 6px;
      transition: width 0.5s ease;
    }

    .similarity-bar .bar-fill.color {
      background: #ff44aa;
    }

    .similarity-bar .bar-fill.texture {
      background: #ffaa00;
    }

    .similarity-bar .bar-fill.geometry {
      background: #00ff88;
    }

    .similarity-row .value {
      text-align: right;
      font-weight: bold;
    }

    .reasoning-details {
      margin-top: 0.75rem;
    }

    .reasoning-details summary {
      cursor: pointer;
      font-size: 12px;
      color: #aaa;
      margin-bottom: 0.5rem;
    }

    .reasoning-details summary:hover {
      color: #fff;
    }

    .reasoning-list {
      margin: 0.5rem 0 0 1rem;
      padding: 0;
      list-style: none;
    }

    .reasoning-list li {
      font-size: 11px;
      color: #ccc;
      margin-bottom: 0.25rem;
      position: relative;
    }

    .reasoning-list li::before {
      content: "→";
      color: #00ff88;
      margin-right: 0.5rem;
    }

    .no-matches {
      text-align: center;
      padding: 2rem;
      color: #888;
    }

    .debug-controls {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    .performance-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 6px;
      padding: 1rem;
    }

    .stat {
      text-align: center;
    }

    .stat label {
      display: block;
      font-size: 11px;
      color: #aaa;
      margin-bottom: 0.25rem;
    }

    .stat span {
      font-weight: bold;
      color: #00ff88;
      font-size: 13px;
    }

    .console-notice {
      background: #2a2a4a;
      border: 1px solid #4444aa;
      border-radius: 6px;
      padding: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 12px;
      color: #bbb;
    }

    /* ✅ Responsive */
    @media (max-width: 640px) {
      .enhanced-debug-carpet-camera {
        padding: 0.5rem;
        gap: 0.75rem;
      }

      .camera-header h1 {
        font-size: 1rem;
      }

      .features-display {
        gap: 0.5rem;
      }

      .feature-section {
        padding: 0.5rem;
      }

      .performance-stats {
        grid-template-columns: 1fr;
        gap: 0.5rem;
      }

      .debug-controls {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class EnhancedDebugCarpetCameraComponent extends BaseComponent {

  // ✅ Services
  private readonly carpetService = inject(CarpetService);

  // ✅ Template refs
  @ViewChild('videoElement') videoRef?: ElementRef<HTMLVideoElement>;

  // ✅ Local state
  private readonly _stream = signal<MediaStream | null>(null);
  private readonly _analysisInterval = signal<number | null>(null);
  private readonly _hasAnalyzed = signal(false);

  // ✅ Service state
  readonly isScanning = this.carpetService.isAnalyzing;
  readonly lastFeatures = this.carpetService.lastTexture;
  readonly lastMatches = this.carpetService.lastMatches;
  readonly analysisCount = this.carpetService.analysisCount;

  // ✅ Computed
  readonly hasAnalyzed = computed(() => this._hasAnalyzed() || this.analysisCount() > 0);

  readonly bestMatch = computed(() => {
    const matches = this.lastMatches();
    return matches.length > 0 ? matches[0] : null;
  });

  readonly featureCount = computed(() => {
    const features = this.lastFeatures();
    if (!features) return 0;

    let count = 0;
    count += features.colorProfile.dominant.length;
    if (features.geometricFeatures.hasSquares) count++;
    if (features.geometricFeatures.hasOrnamental) count++;
    if (features.textureFeatures.contrast > 0.3) count++;
    if (features.textureFeatures.edgeDensity > 15) count++;

    return count;
  });

  constructor() {
    super();
    console.log('[EnhancedDebugCarpetCamera] 🎬 Enhanced component initialized');
  }

  protected override onInit(): void {
    console.log('[EnhancedDebugCarpetCamera] 📱 Starting enhanced camera...');
    this.initCamera();
  }

  /**
   * Initialize camera
   */
  private async initCamera(): Promise<void> {
    try {
      console.log('[EnhancedDebugCarpetCamera] 📹 Requesting camera access...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment'
        }
      });

      console.log('[EnhancedDebugCarpetCamera] ✅ Camera stream acquired');
      this._stream.set(stream);

      setTimeout(() => {
        if (this.videoRef?.nativeElement) {
          this.videoRef.nativeElement.srcObject = stream;
          console.log('[EnhancedDebugCarpetCamera] 🎥 Video element connected');
          this.startAutoAnalysis();
        }
      }, 100);

    } catch (error: any) {
      console.error('[EnhancedDebugCarpetCamera] ❌ Camera access failed:', error);
      this.showError('Camera access denied. Please enable camera permissions.');
    }
  }

  /**
   * Start auto-analysis every 4 seconds (slightly slower for enhanced processing)
   */
  private startAutoAnalysis(): void {
    console.log('[EnhancedDebugCarpetCamera] ⏱️  Starting enhanced auto-analysis...');

    const interval = setInterval(async () => {
      if (!this.videoRef?.nativeElement || this.isScanning()) {
        return;
      }

      console.log('[EnhancedDebugCarpetCamera] 🔄 Enhanced auto-analysis triggered');
      await this.performAnalysis();
    }, 4000); // 4 seconds for enhanced processing

    this._analysisInterval.set(interval as any);
  }

  /**
   * Trigger manual analysis
   */
  async triggerManualAnalysis(): Promise<void> {
    console.log('[EnhancedDebugCarpetCamera] 👆 Manual enhanced analysis triggered');
    await this.performAnalysis();
  }

  /**
   * Perform enhanced carpet analysis
   */
  private async performAnalysis(): Promise<void> {
    if (!this.videoRef?.nativeElement) {
      console.warn('[EnhancedDebugCarpetCamera] ⚠️  No video element available');
      return;
    }

    try {
      const matches = await this.carpetService.analyzeVideoFrame(this.videoRef.nativeElement);
      this._hasAnalyzed.set(true);

      // ✅ Enhanced action simulation
      if (matches.length > 0) {
        const bestMatch = matches[0];
        console.log(`[EnhancedDebugCarpetCamera] 🎯 ENHANCED ACTION: Would check in to "${bestMatch.pubName}"`);
        console.log(`   📊 Overall: ${bestMatch.confidence.toFixed(1)}% | Color: ${bestMatch.colorSimilarity.toFixed(1)}% | Texture: ${bestMatch.textureSimilarity.toFixed(1)}% | Geometry: ${bestMatch.geometrySimilarity.toFixed(1)}%`);
        console.log(`   🧠 Reasoning: ${bestMatch.reasoning.join(', ')}`);

        if (bestMatch.confidence > 75) {
          console.log(`[EnhancedDebugCarpetCamera] ✅ VERY HIGH CONFIDENCE: Auto check-in would proceed`);
        } else if (bestMatch.confidence > 60) {
          console.log(`[EnhancedDebugCarpetCamera] ✅ HIGH CONFIDENCE: Check-in would proceed with user confirmation`);
        } else if (bestMatch.confidence > 40) {
          console.log(`[EnhancedDebugCarpetCamera] ⚠️  MEDIUM CONFIDENCE: Would show as "possible match"`);
        } else {
          console.log(`[EnhancedDebugCarpetCamera] ❌ LOW CONFIDENCE: Would fallback to location-based search`);
        }
      } else {
        console.log(`[EnhancedDebugCarpetCamera] 🚫 NO MATCHES: Enhanced analysis found no carpet matches`);
      }

    } catch (error) {
      console.error('[EnhancedDebugCarpetCamera] ❌ Enhanced analysis failed:', error);
    }
  }

  /**
   * Clear results
   */
  clearResults(): void {
    console.log('[EnhancedDebugCarpetCamera] 🗑️  Clearing enhanced analysis results');
    this._hasAnalyzed.set(false);
  }

  /**
   * CSS classes for confidence levels
   */
  getConfidenceClass(confidence: number): string {
    if (confidence > 60) return 'high';
    if (confidence > 40) return 'medium';
    return 'low';
  }

  getMatchClass(confidence: number): string {
    if (confidence > 60) return 'high-confidence';
    if (confidence > 40) return 'medium-confidence';
    return 'low-confidence';
  }

  /**
   * Navigation
   */
  goBack(): void {
    console.log('[EnhancedDebugCarpetCamera] 🔙 Navigating back...');
    this.cleanup();
    this.router.navigateByUrl('/');
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    console.log('[EnhancedDebugCarpetCamera] 🧹 Cleaning up enhanced resources...');

    const stream = this._stream();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      this._stream.set(null);
    }

    const interval = this._analysisInterval();
    if (interval) {
      clearInterval(interval);
      this._analysisInterval.set(null);
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }
}
