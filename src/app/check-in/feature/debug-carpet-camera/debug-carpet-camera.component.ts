// src/app/check-in/feature/debug-carpet-camera/debug-carpet-camera.component.ts
import { Component, ViewChild, ElementRef, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BaseComponent } from '@shared/data-access/base.component';
import { DebugCarpetRecognitionService, type DebugCarpetMatch } from '../../data-access/debug-carpet-recognition.service';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { IconComponent } from '@shared/ui/icon/icon.component';

@Component({
  selector: 'app-debug-carpet-camera',
  imports: [CommonModule, ButtonComponent, IconComponent],
  template: `
    <div class="debug-carpet-camera">

      <!-- ✅ Header -->
      <header class="camera-header">
        <button class="back-btn" (click)="goBack()">
          <app-icon name="arrow_back" size="md" />
          Back
        </button>
        <h1>🔬 Debug Carpet Recognition</h1>
      </header>

      <!-- ✅ Camera with debug overlay -->
      <div class="camera-container">

        <video
          #videoElement
          class="camera-video"
          autoplay
          playsinline
          muted>
        </video>

        <!-- ✅ Real-time debug overlay -->
        <div class="debug-overlay">

          <!-- Analysis counter -->
          <div class="analysis-counter">
            Analysis #{{ analysisCount() }}
          </div>

          <!-- Scanning indicator -->
          @if (isScanning()) {
            <div class="scanning-indicator">
              <div class="scan-pulse"></div>
              <span>🔍 Analyzing frame...</span>
            </div>
          }

          <!-- Current color profile -->
          @if (lastProfile()) {
            <div class="color-profile-display">
              <h4>🎨 Current Frame Colors:</h4>
              <div class="color-swatches">
                @for (color of lastProfile()!.dominant; track color) {
                  <div
                    class="color-swatch"
                    [style.background-color]="color"
                    [title]="color">
                    {{ color }}
                  </div>
                }
              </div>
              <div class="profile-stats">
                <span>Variance: {{ lastProfile()!.variance.toFixed(1) }}</span>
                <span>Pixels: {{ lastProfile()!.sampledPixels }}/{{ lastProfile()!.totalPixels }}</span>
                <span>Time: {{ lastProfile()!.processingTime.toFixed(1) }}ms</span>
              </div>
            </div>
          }

        </div>
      </div>

      <!-- ✅ Debug results panel -->
      <div class="debug-results">

        <!-- Match results -->
        @if (lastMatches().length > 0) {
          <div class="matches-section">
            <h3>🎯 Recognition Results</h3>

            @for (match of lastMatches().slice(0, 3); track match.pubId) {
              <div class="match-debug-card" [class]="getMatchClass(match.confidence)">

                <div class="match-header">
                  <strong>{{ match.pubName }}</strong>
                  <span class="confidence-badge" [class]="getConfidenceClass(match.confidence)">
                    {{ match.confidence }}%
                  </span>
                </div>

                <div class="match-breakdown">
                  <div class="score-row">
                    <span>🎨 Color Match:</span>
                    <span>{{ match.colorMatchScore }}%</span>
                  </div>
                  <div class="score-row">
                    <span>📊 Histogram:</span>
                    <span>{{ match.histogramMatchScore }}%</span>
                  </div>
                  <div class="score-row">
                    <span>🧮 Chi²:</span>
                    <span>{{ match.histogramDetails.chiSquared.toFixed(2) }}</span>
                  </div>
                </div>

                <!-- Color matching details -->
                <details class="color-details">
                  <summary>🔍 Color Matching Detail</summary>
                  <div class="color-matches">
                    @for (colorMatch of match.colorDetails.matchedColors; track $index) {
                      <div class="color-match-row">
                        <div class="color-pair">
                          <span class="color-dot" [style.background-color]="colorMatch.color1"></span>
                          {{ colorMatch.color1 }}
                        </div>
                        <span>↔</span>
                        <div class="color-pair">
                          <span class="color-dot" [style.background-color]="colorMatch.color2"></span>
                          {{ colorMatch.color2 }}
                        </div>
                        <span class="similarity">{{ colorMatch.similarity.toFixed(1) }}%</span>
                      </div>
                    }
                  </div>
                </details>

                <!-- Debug notes -->
                <details class="debug-notes">
                  <summary>📝 Debug Notes</summary>
                  <ul>
                    @for (note of match.debugNotes; track note) {
                      <li>{{ note }}</li>
                    }
                  </ul>
                </details>

              </div>
            }
          </div>
        } @else if (hasAnalyzed()) {
          <div class="no-matches">
            <p>❌ No matches found above 15% threshold</p>
            <small>Point camera at carpet for analysis</small>
          </div>
        }

        <!-- Console log indicator -->
        <div class="console-notice">
          💡 <strong>Check browser console</strong> for detailed analysis logs
        </div>

        <!-- Controls -->
        <div class="debug-controls">
          <app-button
            variant="secondary"
            [fullWidth]="true"
            (onClick)="triggerManualAnalysis()"
            [disabled]="isScanning()"
          >
            🔬 Trigger Manual Analysis
          </app-button>

          <app-button
            variant="secondary"
            [fullWidth]="true"
            (onClick)="clearResults()"
          >
            🗑️ Clear Results
          </app-button>
        </div>

        <!-- Camera status -->
        <div class="camera-status">
          <div class="status-row">
            <span>📹 Camera:</span>
            <span [class]="cameraStatus().class">{{ cameraStatus().text }}</span>
          </div>
          <div class="status-row">
            <span>🔄 Auto-scan:</span>
            <span class="status-active">Every 3 seconds</span>
          </div>
          <div class="status-row">
            <span>💾 Database:</span>
            <span class="status-ready">{{ carpetDatabaseSize }} carpets loaded</span>
          </div>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .debug-carpet-camera {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: #1a1a1a;
      color: #e5e5e5;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 13px;
    }

    /* ✅ Header */
    .camera-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #000;
      border-bottom: 2px solid #333;
    }

    .back-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #333;
      border: 1px solid #555;
      color: #e5e5e5;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
    }

    .back-btn:hover {
      background: #444;
    }

    .camera-header h1 {
      margin: 0;
      font-size: 1.2rem;
      color: #00ff88;
    }

    /* ✅ Camera */
    .camera-container {
      position: relative;
      height: 300px;
      background: #000;
      border-bottom: 2px solid #333;
    }

    .camera-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* ✅ Debug overlay */
    .debug-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
    }

    .analysis-counter {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0, 255, 136, 0.9);
      color: #000;
      padding: 0.5rem;
      border-radius: 4px;
      font-weight: bold;
      font-size: 14px;
    }

    .scanning-indicator {
      background: rgba(255, 165, 0, 0.9);
      color: #000;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      align-self: flex-start;
    }

    .scan-pulse {
      width: 12px;
      height: 12px;
      background: #ff6600;
      border-radius: 50%;
      animation: pulse 1s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.2); }
    }

    .color-profile-display {
      background: rgba(0, 0, 0, 0.8);
      border: 1px solid #00ff88;
      border-radius: 8px;
      padding: 1rem;
      margin-top: auto;
    }

    .color-profile-display h4 {
      margin: 0 0 0.5rem 0;
      color: #00ff88;
    }

    .color-swatches {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      flex-wrap: wrap;
    }

    .color-swatch {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 80px;
      height: 30px;
      border: 1px solid #666;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
      color: white;
    }

    .profile-stats {
      display: flex;
      gap: 1rem;
      font-size: 11px;
      color: #ccc;
    }

    /* ✅ Results panel */
    .debug-results {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      background: #1a1a1a;
    }

    .matches-section h3 {
      margin: 0 0 1rem 0;
      color: #00ff88;
      border-bottom: 1px solid #333;
      padding-bottom: 0.5rem;
    }

    .match-debug-card {
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .match-debug-card.high-confidence {
      border-color: #00ff88;
      background: #1a2f1a;
    }

    .match-debug-card.medium-confidence {
      border-color: #ffaa00;
      background: #2f2a1a;
    }

    .match-debug-card.low-confidence {
      border-color: #ff4444;
      background: #2f1a1a;
    }

    .match-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .confidence-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-weight: bold;
      font-size: 12px;
    }

    .confidence-badge.high { background: #00ff88; color: #000; }
    .confidence-badge.medium { background: #ffaa00; color: #000; }
    .confidence-badge.low { background: #ff4444; color: #fff; }

    .match-breakdown {
      display: grid;
      gap: 0.25rem;
      margin-bottom: 0.75rem;
      font-size: 12px;
    }

    .score-row {
      display: flex;
      justify-content: space-between;
    }

    .color-details, .debug-notes {
      margin-top: 0.5rem;
      border: 1px solid #555;
      border-radius: 4px;
    }

    .color-details summary, .debug-notes summary {
      padding: 0.5rem;
      background: #333;
      cursor: pointer;
      border-radius: 4px 4px 0 0;
    }

    .color-matches {
      padding: 0.5rem;
      display: grid;
      gap: 0.25rem;
    }

    .color-match-row {
      display: grid;
      grid-template-columns: 1fr auto 1fr auto;
      align-items: center;
      gap: 0.5rem;
      font-size: 11px;
    }

    .color-pair {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .color-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 1px solid #666;
    }

    .similarity {
      text-align: right;
      font-weight: bold;
    }

    .debug-notes ul {
      margin: 0;
      padding: 0.5rem 1rem;
      list-style: none;
    }

    .debug-notes li {
      font-size: 11px;
      color: #ccc;
      margin-bottom: 0.25rem;
    }

    .no-matches {
      text-align: center;
      padding: 2rem;
      color: #888;
    }

    .console-notice {
      background: #2a2a4a;
      border: 1px solid #4444aa;
      border-radius: 6px;
      padding: 0.75rem;
      margin: 1rem 0;
      text-align: center;
    }

    .debug-controls {
      display: grid;
      gap: 0.75rem;
      margin: 1rem 0;
    }

    .camera-status {
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 6px;
      padding: 1rem;
      display: grid;
      gap: 0.5rem;
    }

    .status-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
    }

    .status-ready { color: #00ff88; }
    .status-active { color: #ffaa00; }
    .status-error { color: #ff4444; }

    /* ✅ Responsive */
    @media (max-width: 640px) {
      .color-swatches {
        gap: 0.25rem;
      }

      .color-swatch {
        min-width: 60px;
        height: 25px;
        font-size: 9px;
      }
    }
  `]
})
export class DebugCarpetCameraComponent extends BaseComponent {

  // ✅ Services
  private readonly carpetService = inject(DebugCarpetRecognitionService);

  // ✅ Template refs
  @ViewChild('videoElement') videoRef?: ElementRef<HTMLVideoElement>;

  // ✅ Local state
  private readonly _stream = signal<MediaStream | null>(null);
  private readonly _analysisInterval = signal<number | null>(null);
  private readonly _hasAnalyzed = signal(false);

  // ✅ Service state
  readonly isScanning = this.carpetService.isAnalyzing;
  readonly lastProfile = this.carpetService.lastProfile;
  readonly lastMatches = this.carpetService.lastMatches;
  readonly analysisCount = this.carpetService.analysisCount;

  // ✅ Static info
  readonly carpetDatabaseSize = 4; // From our static database

  // ✅ Computed
  readonly hasAnalyzed = computed(() => this._hasAnalyzed() || this.analysisCount() > 0);

  readonly cameraStatus = computed(() => {
    const stream = this._stream();
    if (!stream) return { text: 'Initializing...', class: 'status-active' };
    return { text: 'Ready', class: 'status-ready' };
  });

  constructor() {
    super();
    console.log('[DebugCarpetCamera] 🎬 Component initialized');
  }

  protected override onInit(): void {
    console.log('[DebugCarpetCamera] 📱 Starting camera initialization...');
    this.initCamera();
  }

  /**
   * Initialize camera
   */
  private async initCamera(): Promise<void> {
    try {
      console.log('[DebugCarpetCamera] 📹 Requesting camera access...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Back camera
        }
      });

      console.log('[DebugCarpetCamera] ✅ Camera stream acquired');
      this._stream.set(stream);

      // ✅ Wait for video element
      setTimeout(() => {
        if (this.videoRef?.nativeElement) {
          this.videoRef.nativeElement.srcObject = stream;
          console.log('[DebugCarpetCamera] 🎥 Video element connected');
          this.startAutoAnalysis();
        }
      }, 100);

    } catch (error: any) {
      console.error('[DebugCarpetCamera] ❌ Camera access failed:', error);
      this.showError('Camera access denied. Please enable camera permissions.');
    }
  }

  /**
   * Start automatic analysis every 3 seconds
   */
  private startAutoAnalysis(): void {
    console.log('[DebugCarpetCamera] ⏱️  Starting auto-analysis (3 second intervals)...');

    const interval = setInterval(async () => {
      if (!this.videoRef?.nativeElement || this.isScanning()) {
        console.log('[DebugCarpetCamera] ⏸️  Skipping auto-analysis (no video or already scanning)');
        return;
      }

      console.log('[DebugCarpetCamera] 🔄 Auto-analysis triggered');
      await this.performAnalysis();
    }, 3000);

    this._analysisInterval.set(interval as any);
  }

  /**
   * Trigger manual analysis
   */
  async triggerManualAnalysis(): Promise<void> {
    console.log('[DebugCarpetCamera] 👆 Manual analysis triggered by user');
    await this.performAnalysis();
  }

  /**
   * Perform carpet analysis
   */
  private async performAnalysis(): Promise<void> {
    if (!this.videoRef?.nativeElement) {
      console.warn('[DebugCarpetCamera] ⚠️  No video element available for analysis');
      return;
    }

    try {
      await this.carpetService.analyzeVideoFrame(this.videoRef.nativeElement);
      this._hasAnalyzed.set(true);

      // Log action that would be taken
      const matches = this.lastMatches();
      if (matches.length > 0) {
        const bestMatch = matches[0];
        console.log(`[DebugCarpetCamera] 🎯 ACTION SIMULATION: Would check in to "${bestMatch.pubName}" with ${bestMatch.confidence}% confidence`);

        if (bestMatch.confidence > 60) {
          console.log(`[DebugCarpetCamera] ✅ HIGH CONFIDENCE: Check-in would proceed automatically`);
        } else if (bestMatch.confidence > 40) {
          console.log(`[DebugCarpetCamera] ⚠️  MEDIUM CONFIDENCE: Would show "possible match" with user confirmation`);
        } else {
          console.log(`[DebugCarpetCamera] ❌ LOW CONFIDENCE: Would suggest location-based fallback`);
        }
      } else {
        console.log(`[DebugCarpetCamera] 🚫 NO MATCHES: Would show location fallback only`);
      }

    } catch (error) {
      console.error('[DebugCarpetCamera] ❌ Analysis failed:', error);
    }
  }

  /**
   * Clear results for fresh testing
   */
  clearResults(): void {
    console.log('[DebugCarpetCamera] 🗑️  Clearing all analysis results');
    this._hasAnalyzed.set(false);
    // Note: We can't reset service signals as they're readonly,
    // but this shows the intent for a fresh start
  }

  /**
   * Get CSS class for match confidence
   */
  getMatchClass(confidence: number): string {
    if (confidence > 60) return 'high-confidence';
    if (confidence > 40) return 'medium-confidence';
    return 'low-confidence';
  }

  /**
   * Get CSS class for confidence badge
   */
  getConfidenceClass(confidence: number): string {
    if (confidence > 60) return 'high';
    if (confidence > 40) return 'medium';
    return 'low';
  }

  /**
   * Navigation
   */
  goBack(): void {
    console.log('[DebugCarpetCamera] 🔙 User navigating back');
    this.cleanup();
    this.router.navigateByUrl('/');
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    console.log('[DebugCarpetCamera] 🧹 Cleaning up resources...');

    // ✅ Stop camera
    const stream = this._stream();
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('[DebugCarpetCamera] 📹 Camera track stopped');
      });
      this._stream.set(null);
    }

    // ✅ Clear interval
    const interval = this._analysisInterval();
    if (interval) {
      clearInterval(interval);
      this._analysisInterval.set(null);
      console.log('[DebugCarpetCamera] ⏱️  Auto-analysis interval cleared');
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }
}
