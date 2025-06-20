// src/app/check-in/feature/debug-carpet-camera/debug-carpet-camera.component.ts
import { Component, ViewChild, ElementRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BaseComponent } from '@shared/data-access/base.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { CarpetService } from '../../data-access/carpet.service';

@Component({
  selector: 'app-debug-carpet-camera',
  imports: [CommonModule, ButtonComponent, IconComponent],
  template: `
    <div class="carpet-recognition">

      <!-- ✅ Header -->
      <header class="header">
        <button class="back-btn" (click)="goBack()">
          <app-icon name="arrow_back" size="md" />
          Back
        </button>
        <h1>🎯 Carpet Recognition</h1>
        <div class="analysis-count">#{{ analysisCount() }}</div>
      </header>

      <!-- ✅ Live Camera Feed -->
      <div class="camera-container">
        <video
          #videoElement
          class="camera-video"
          autoplay
          playsinline
          muted>
        </video>

        <!-- ✅ Camera Overlay -->
        <div class="camera-overlay">

          @if (isAnalyzing()) {
            <div class="analyzing-indicator">
              <div class="pulse-dot"></div>
              <span>🎯 Analyzing...</span>
            </div>
          }

          @if (lastAnalysis() && !isAnalyzing()) {
            <div class="analysis-status">
              @if (lastAnalysis()!.looksLikeCarpet) {
                <div class="status-good">
                  <app-icon name="check_circle" size="sm" />
                  Carpet detected
                </div>
              } @else {
                <div class="status-warn">
                  <app-icon name="search" size="sm" />
                  Looking for carpet...
                </div>
              }
            </div>
          }

        </div>
      </div>

      <!-- ✅ Match Results -->
      @if (lastMatches().length > 0) {
        <div class="match-results">
          <h3>📊 Match Results</h3>

          @for (match of lastMatches(); track match.pubId) {
            <div class="match-card" [class]="getMatchClass(match.confidence)">

              <div class="match-header">
                <div class="match-info">
                  <h4>{{ match.pubName }}</h4>
                  <p class="reasoning">{{ match.reasoning }}</p>
                </div>
                <div class="confidence-score">
                  <span class="percentage">{{ match.confidence }}%</span>
                  <div class="confidence-icon">
                    @if (match.confidence >= 70) {
                      ✅
                    } @else if (match.confidence >= 40) {
                      ⚠️
                    } @else {
                      ❌
                    }
                  </div>
                </div>
              </div>

              <!-- ✅ Visual Features -->
              <div class="visual-features">
                <div class="feature-group">
                  <label>Colors:</label>
                  <div class="color-palette">
                    @for (color of match.colors.slice(0, 4); track color) {
                      <div
                        class="color-swatch"
                        [style.background-color]="color"
                        [title]="color">
                      </div>
                    }
                  </div>
                </div>
                <div class="feature-group">
                  <label>Pattern:</label>
                  <span class="pattern-badge" [class]="'pattern-' + match.pattern">
                    {{ match.pattern }}
                  </span>
                </div>
              </div>

              <!-- ✅ Action Buttons for High Confidence Matches -->
              @if (match.confidence >= 70) {
                <div class="match-actions">
                  <app-button
                    variant="primary"
                    (click)="checkInToPub(match.pubId)"
                    class="check-in-btn">
                    <app-icon name="location_on" size="sm" />
                    Check In to {{ match.pubName }}
                  </app-button>
                </div>
              }

            </div>
          }
        </div>
      }

      <!-- ✅ No Results State -->
      @if (lastAnalysis() && !lastAnalysis()!.looksLikeCarpet && !isAnalyzing()) {
        <div class="no-results">
          <div class="no-results-icon">🔍</div>
          <h3>Point camera at carpet</h3>
          <p>Make sure the carpet pattern is clearly visible in the frame</p>
        </div>
      }

      <!-- ✅ Controls -->
      <div class="controls">
        <app-button
          variant="primary"
          (click)="triggerAnalysis()"
          [disabled]="isAnalyzing()"
          class="analyze-btn">
          @if (isAnalyzing()) {
            <app-icon name="hourglass_empty" size="sm" />
            Analyzing...
          } @else {
            <app-icon name="center_focus_strong" size="sm" />
            Analyze Carpet
          }
        </app-button>

        <app-button
          variant="secondary"
          (click)="toggleAutoMode()"
          [disabled]="isAnalyzing()"
          class="auto-btn">
          <app-icon [name]="autoMode() ? 'pause' : 'play_arrow'" size="sm" />
          {{ autoMode() ? 'Stop Auto' : 'Auto Mode' }}
        </app-button>
      </div>

      <!-- ✅ Debug Info (Collapsible) -->
      @if (lastAnalysis()) {
        <details class="debug-section">
          <summary>🔧 Debug Info</summary>
          <div class="debug-content">
            <div class="debug-row">
              <label>Looks like carpet:</label>
              <span>{{ lastAnalysis()!.looksLikeCarpet ? 'Yes' : 'No' }}</span>
            </div>
            <div class="debug-row">
              <label>Pattern type:</label>
              <span>{{ lastAnalysis()!.pattern }}</span>
            </div>
            <div class="debug-row">
              <label>Colors detected:</label>
              <span>{{ lastAnalysis()!.colors.length }}</span>
            </div>
            <div class="debug-row">
              <label>Analysis confidence:</label>
              <span>{{ (lastAnalysis()!.confidence * 100).toFixed(0) }}%</span>
            </div>
          </div>
        </details>
      }

    </div>
  `,
  styles: `
    .carpet-recognition {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
      background: #f8f9fa;
      min-height: 100vh;
    }

    /* ✅ Header */
    .header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.5rem 0;
      border-bottom: 2px solid #e9ecef;
    }

    .back-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: none;
      border: 1px solid #dee2e6;
      color: #495057;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .back-btn:hover {
      background: #e9ecef;
      border-color: #adb5bd;
    }

    .header h1 {
      flex: 1;
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: #212529;
    }

    .analysis-count {
      background: #007bff;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: bold;
    }

    /* ✅ Camera */
    .camera-container {
      position: relative;
      border-radius: 12px;
      overflow: hidden;
      aspect-ratio: 4 / 3;
      max-height: 50vh;
      border: 2px solid #dee2e6;
      background: #000;
    }

    .camera-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .camera-overlay {
      position: absolute;
      top: 1rem;
      left: 1rem;
      right: 1rem;
      pointer-events: none;
    }

    .analyzing-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(0, 123, 255, 0.9);
      color: white;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      backdrop-filter: blur(10px);
      font-weight: 500;
    }

    .pulse-dot {
      width: 12px;
      height: 12px;
      background: #fff;
      border-radius: 50%;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.1); }
    }

    .analysis-status {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      backdrop-filter: blur(10px);
    }

    .status-good {
      background: rgba(40, 167, 69, 0.9);
      color: white;
    }

    .status-warn {
      background: rgba(255, 193, 7, 0.9);
      color: #212529;
    }

    /* ✅ Match Results */
    .match-results h3 {
      margin: 0 0 1rem 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #212529;
    }

    .match-card {
      background: white;
      border: 2px solid #e9ecef;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      transition: all 0.2s ease;
    }

    .match-card.high-confidence {
      border-color: #28a745;
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.15);
    }

    .match-card.medium-confidence {
      border-color: #ffc107;
      box-shadow: 0 4px 12px rgba(255, 193, 7, 0.15);
    }

    .match-card.low-confidence {
      border-color: #dc3545;
      box-shadow: 0 4px 12px rgba(220, 53, 69, 0.15);
    }

    .match-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .match-info h4 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #212529;
    }

    .reasoning {
      margin: 0;
      font-size: 0.875rem;
      color: #6c757d;
    }

    .confidence-score {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-align: right;
    }

    .percentage {
      font-size: 1.5rem;
      font-weight: bold;
      color: #212529;
    }

    .confidence-icon {
      font-size: 1.25rem;
    }

    /* ✅ Visual Features */
    .visual-features {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .feature-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .feature-group label {
      font-size: 0.875rem;
      color: #6c757d;
      font-weight: 500;
    }

    .color-palette {
      display: flex;
      gap: 0.25rem;
    }

    .color-swatch {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      border: 1px solid #dee2e6;
      cursor: pointer;
    }

    .pattern-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .pattern-badge.pattern-geometric {
      background: #e3f2fd;
      color: #1976d2;
    }

    .pattern-badge.pattern-ornamental {
      background: #fff3e0;
      color: #f57c00;
    }

    .pattern-badge.pattern-mixed {
      background: #f3e5f5;
      color: #7b1fa2;
    }

    .pattern-badge.pattern-plain {
      background: #f5f5f5;
      color: #616161;
    }

    /* ✅ Actions */
    .match-actions {
      border-top: 1px solid #e9ecef;
      padding-top: 1rem;
    }

    .check-in-btn {
      width: 100%;
    }

    /* ✅ No Results */
    .no-results {
      text-align: center;
      padding: 3rem 1rem;
      color: #6c757d;
    }

    .no-results-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .no-results h3 {
      margin: 0 0 0.5rem 0;
      color: #495057;
    }

    .no-results p {
      margin: 0;
      font-size: 0.875rem;
    }

    /* ✅ Controls */
    .controls {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    /* ✅ Debug */
    .debug-section {
      background: white;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 1rem;
    }

    .debug-section summary {
      cursor: pointer;
      font-weight: 600;
      color: #495057;
      list-style: none;
    }

    .debug-section summary::-webkit-details-marker {
      display: none;
    }

    .debug-content {
      margin-top: 1rem;
    }

    .debug-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #f8f9fa;
    }

    .debug-row:last-child {
      border-bottom: none;
    }

    .debug-row label {
      font-weight: 500;
      color: #6c757d;
    }

    .debug-row span {
      color: #212529;
    }

    /* ✅ Responsive */
    @media (max-width: 640px) {
      .carpet-recognition {
        padding: 0.5rem;
        gap: 0.75rem;
      }

      .visual-features {
        grid-template-columns: 1fr;
        gap: 0.5rem;
      }

      .controls {
        grid-template-columns: 1fr;
      }
    }
  `
})
export class EnhancedDebugCarpetCameraComponent extends BaseComponent {

  // ✅ Services
  private readonly carpetService = inject(CarpetService);

  // ✅ Template refs
  @ViewChild('videoElement') videoRef?: ElementRef<HTMLVideoElement>;

  // ✅ Local state
  private readonly _stream = signal<MediaStream | null>(null);
  private readonly _autoMode = signal(false);
  private readonly _autoInterval = signal<number | null>(null);

  // ✅ Service state
  readonly isAnalyzing = this.carpetService.isAnalyzing;
  readonly lastAnalysis = this.carpetService.lastAnalysis;
  readonly lastMatches = this.carpetService.lastMatches;
  readonly analysisCount = this.carpetService.analysisCount;
  readonly autoMode = this._autoMode.asReadonly();

  constructor() {
    super();
    console.log('[CarpetCamera] 🎬 Simple carpet recognition initialized');
  }

  protected override onInit(): void {
    console.log('[CarpetCamera] 📱 Starting camera...');
    this.initCamera();
  }

  /**
   * Initialize camera
   */
  private async initCamera(): Promise<void> {
    try {
      console.log('[CarpetCamera] 📹 Requesting camera access...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment'
        }
      });

      console.log('[CarpetCamera] ✅ Camera stream acquired');
      this._stream.set(stream);

      setTimeout(() => {
        if (this.videoRef?.nativeElement) {
          this.videoRef.nativeElement.srcObject = stream;
          console.log('[CarpetCamera] 🎥 Video element connected');
        }
      }, 100);

    } catch (error: any) {
      console.error('[CarpetCamera] ❌ Camera access failed:', error);
      this.showError('Camera access denied. Please enable camera permissions.');
    }
  }

  /**
   * Trigger manual analysis
   */
  async triggerAnalysis(): Promise<void> {
    if (!this.videoRef?.nativeElement || this.isAnalyzing()) {
      return;
    }

    console.log('[CarpetCamera] 👆 Manual analysis triggered');

    // ✅ For testing, use mock location (Watford)
    const mockLocation = { lat: 51.6581, lng: -0.3960 };

    await this.carpetService.analyzeVideoFrame(this.videoRef.nativeElement, mockLocation);
  }

  /**
   * Toggle auto mode
   */
  toggleAutoMode(): void {
    if (this._autoMode()) {
      this.stopAutoMode();
    } else {
      this.startAutoMode();
    }
  }

  /**
   * Start auto analysis mode
   */
  private startAutoMode(): void {
    this._autoMode.set(true);
    console.log('[CarpetCamera] ⏱️ Starting auto mode...');

    const interval = setInterval(async () => {
      if (!this.videoRef?.nativeElement || this.isAnalyzing()) {
        return;
      }

      console.log('[CarpetCamera] 🔄 Auto analysis triggered');
      const mockLocation = { lat: 51.6581, lng: -0.3960 };
      await this.carpetService.analyzeVideoFrame(this.videoRef.nativeElement, mockLocation);
    }, 3000); // Every 3 seconds

    this._autoInterval.set(interval as any);
  }

  /**
   * Stop auto analysis mode
   */
  private stopAutoMode(): void {
    this._autoMode.set(false);
    console.log('[CarpetCamera] ⏸️ Stopping auto mode...');

    const interval = this._autoInterval();
    if (interval) {
      clearInterval(interval);
      this._autoInterval.set(null);
    }
  }

  /**
   * Check in to pub
   */
  checkInToPub(pubId: string): void {
    console.log('[CarpetCamera] 🎯 Check-in triggered for:', pubId);
    // ✅ Navigate to check-in flow or trigger check-in service
    // this.router.navigate(['/check-in'], { queryParams: { pubId } });
    alert(`Would check in to pub: ${pubId}`); // For demo
  }

  /**
   * CSS classes for confidence levels
   */
  getMatchClass(confidence: number): string {
    if (confidence >= 70) return 'high-confidence';
    if (confidence >= 40) return 'medium-confidence';
    return 'low-confidence';
  }

  /**
   * Navigation
   */
  goBack(): void {
    console.log('[CarpetCamera] 🔙 Navigating back...');
    this.cleanup();
    this.router.navigateByUrl('/');
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    console.log('[CarpetCamera] 🧹 Cleaning up resources...');

    this.stopAutoMode();

    const stream = this._stream();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      this._stream.set(null);
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }
}
