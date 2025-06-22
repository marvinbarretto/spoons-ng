import { Injectable, signal } from '@angular/core';
import { CarpetRecognitionData } from '../utils/carpet.models';

@Injectable({ providedIn: 'root' })
export class CarpetRecognitionService {
  private readonly _data = signal<CarpetRecognitionData>({
    isPhoneDown: false,
    orientationAngle: 0,
    orientationConfidence: 0,
    hasTexture: false,
    textureConfidence: 0,
    overallConfidence: 0,
    canCheckIn: false,
    debugInfo: 'not started'
  });

  readonly data = this._data.asReadonly();
  private _mediaStream: MediaStream | null = null;
  private _videoElement: HTMLVideoElement | null = null;
  private _animationFrame: number | null = null;

  async startRecognition(): Promise<void> {
    try {
      // Start camera
      this._mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      // Create video element for analysis
      this._videoElement = document.createElement('video');
      this._videoElement.srcObject = this._mediaStream;
      this._videoElement.play();

      // Start orientation monitoring
      this._startOrientationMonitoring();

      // Start video analysis when video loads
      this._videoElement.addEventListener('loadeddata', () => {
        this._startVideoAnalysis();
      });

      this._updateData({ debugInfo: 'Recognition started' });

    } catch (error: any) {
      this._updateData({
        debugInfo: `Error: ${error.message}`,
        canCheckIn: false
      });
    }
  }

  stopRecognition(): void {
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
    }

    if (this._mediaStream) {
      this._mediaStream.getTracks().forEach(track => track.stop());
      this._mediaStream = null;
    }

    if (this._videoElement) {
      this._videoElement.remove();
      this._videoElement = null;
    }

    window.removeEventListener('deviceorientation', this._handleOrientation);

    this._updateData({
      debugInfo: 'Recognition stopped',
      canCheckIn: false
    });
  }

  private _startOrientationMonitoring(): void {
    if ('DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', this._handleOrientation.bind(this));
    } else {
      this._updateData({ debugInfo: 'Device orientation not supported' });
    }
  }

  private _calculateDecision(): void {
    const current = this._data();

    // For now, ONLY use orientation - ignore texture completely
    const canCheckIn = current.isPhoneDown && current.orientationConfidence > 0.6;

    // Keep overall confidence simple for now
    const overallConfidence = current.orientationConfidence;

    this._updateData({
      overallConfidence,
      canCheckIn,
      debugInfo: `Orient: ${current.orientationConfidence.toFixed(2)} | Edges: ${current.edgeCount}/${current.totalSamples} | Ratio: ${current.textureRatio?.toFixed(3)}`
    });
  }

  private _handleOrientation(event: DeviceOrientationEvent): void {
    const alpha = event.alpha || 0; // Compass heading (0-360)
    const beta = event.beta || 0;   // Front-to-back tilt (-180 to 180)
    const gamma = event.gamma || 0; // Left-to-right tilt (-90 to 90)

    // Phone pointing down: beta should be around 90 degrees
    const targetAngle = 90;
    const tolerance = 30;
    const angleDiff = Math.abs(beta - targetAngle);

    const isPhoneDown = angleDiff < tolerance;
    const orientationConfidence = Math.max(0, 1 - (angleDiff / tolerance));

    this._updateData({
      isPhoneDown,
      orientationAngle: beta,
      alpha,
      beta,
      gamma,
      angleDifference: angleDiff,
      orientationConfidence: Math.round(orientationConfidence * 100) / 100,
      debugInfo: `β:${beta.toFixed(1)}° γ:${gamma.toFixed(1)}° α:${alpha.toFixed(1)}°`
    });
  }

  private _startVideoAnalysis(): void {
    if (!this._videoElement) return;

    const analyzeFrame = () => {
      if (!this._videoElement) return;

      // Simple texture analysis using canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        this._animationFrame = requestAnimationFrame(analyzeFrame);
        return;
      }

      canvas.width = this._videoElement.videoWidth || 320;
      canvas.height = this._videoElement.videoHeight || 240;

      ctx.drawImage(this._videoElement, 0, 0, canvas.width, canvas.height);

      // Get image data for analysis
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const textureResult = this._analyzeTexture(imageData);

      this._updateData({
        hasTexture: textureResult.hasTexture,
        textureConfidence: textureResult.confidence,
        edgeCount: textureResult.edgeCount,        // ✅ Store raw values
        totalSamples: textureResult.totalSamples,  // ✅ Store raw values
        textureRatio: textureResult.textureRatio   // ✅ Store raw values
      });

      // Simple decision: only require phone pointing down for now
      this._calculateDecision();

      this._animationFrame = requestAnimationFrame(analyzeFrame);
    };

    analyzeFrame();
  }

  private _analyzeTexture(imageData: ImageData): { hasTexture: boolean; confidence: number; edgeCount: number; totalSamples: number; textureRatio: number } {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Sample points for edge detection
    let edgeCount = 0;
    let totalSamples = 0;
    const sampleStep = 10; // Sample every 10th pixel for performance

    for (let y = 1; y < height - 1; y += sampleStep) {
      for (let x = 1; x < width - 1; x += sampleStep) {
        const idx = (y * width + x) * 4;

        // Get grayscale value
        const current = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

        // Check surrounding pixels for edges
        const right = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;
        const bottom = (data[((y + 1) * width + x) * 4] +
                       data[((y + 1) * width + x) * 4 + 1] +
                       data[((y + 1) * width + x) * 4 + 2]) / 3;

        const edgeStrength = Math.abs(current - right) + Math.abs(current - bottom);

        if (edgeStrength > 30) { // Threshold for detecting texture
          edgeCount++;
        }
        totalSamples++;
      }
    }

    const textureRatio = totalSamples > 0 ? edgeCount / totalSamples : 0;
    const confidence = Math.min(1, textureRatio * 3); // Scale up the ratio

    return {
      hasTexture: confidence > 0.1,
      confidence: Math.round(confidence * 100) / 100,
      edgeCount,
      totalSamples,
      textureRatio
    };
  }

  private _calculateOverallConfidence(): void {
    const current = this._data();

    // Weight orientation more heavily since it's more reliable
    const orientationWeight = 0.7;
    const textureWeight = 0.3;

    const overallConfidence =
      (current.orientationConfidence * orientationWeight) +
      (current.textureConfidence * textureWeight);

    // Can check in if phone is pointing down (main requirement)
    const canCheckIn = current.isPhoneDown && current.orientationConfidence > 0.6;

    this._updateData({
      overallConfidence: Math.round(overallConfidence * 100) / 100,
      canCheckIn,
      debugInfo: `Orientation: ${current.orientationConfidence.toFixed(2)}, Texture: ${current.textureConfidence.toFixed(2)}`
    });
  }

  private _updateData(updates: Partial<CarpetRecognitionData>): void {
    this._data.update(current => ({ ...current, ...updates }));
  }

}
