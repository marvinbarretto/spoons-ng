import { Injectable, signal } from '@angular/core';
import { CarpetRecognitionData } from '../utils/carpet.models';
import { CARPET_RECOGNITION_CONFIG } from './carpet-recognition.config';

@Injectable({ providedIn: 'root' })
export class CarpetRecognitionService {
  private readonly _data = signal<CarpetRecognitionData>({
    isPhoneDown: false,
    orientationAngle: 0,
    orientationConfidence: 0,
    hasTexture: false,
    textureConfidence: 0,
    isSharp: false,
    blurScore: 0,
    capturedPhoto: null,
    photoTaken: false,
    photoFilename: null,
    photoFormat: 'webp',
    photoSizeKB: 0,
    photoDisplayUrl: null,
    overallConfidence: 0,
    canCheckIn: false,
    debugInfo: 'Not started'
  });

  readonly data = this._data.asReadonly();
  private _mediaStream: MediaStream | null = null;
  private _videoElement: HTMLVideoElement | null = null;
  private _animationFrame: number | null = null;

  async startRecognition(): Promise<void> {
    console.log('🎥 [CarpetService] Starting recognition...');

    try {
      this.cleanup();

      console.log('📹 [CarpetService] Requesting camera access...');
      this._mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: CARPET_RECOGNITION_CONFIG.photo.maxWidth },
          height: { ideal: CARPET_RECOGNITION_CONFIG.photo.maxHeight }
        }
      });
      console.log('✅ [CarpetService] Camera access granted');

      this._videoElement = document.createElement('video');
      this._videoElement.srcObject = this._mediaStream;
      this._videoElement.play();

      this._startOrientationMonitoring();

      this._videoElement.addEventListener('loadeddata', () => {
        console.log('📹 [CarpetService] Video loaded, starting analysis');
        this._startVideoAnalysis();
      });

      this._updateData({ debugInfo: 'Recognition started' });

    } catch (error: any) {
      console.error('❌ [CarpetService] Recognition failed:', error);
      this._updateData({
        debugInfo: `Error: ${error.message}`,
        canCheckIn: false
      });
    }
  }

  stopRecognition(): void {
    console.log('🛑 [CarpetService] Stopping recognition...');
    this.cleanup();
    this._updateData({
      debugInfo: 'Recognition stopped',
      canCheckIn: false
    });
  }

  private cleanup(): void {
    console.log('🧹 [CarpetService] Cleaning up resources...');

    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }

    if (this._mediaStream) {
      this._mediaStream.getTracks().forEach(track => {
        console.log(`🔇 [CarpetService] Stopping track: ${track.kind}`);
        track.stop();
      });
      this._mediaStream = null;
    }

    if (this._videoElement) {
      this._videoElement.remove();
      this._videoElement = null;
    }

    // ✅ Clean up photo display URL
    const current = this._data();
    if (current.photoDisplayUrl) {
      URL.revokeObjectURL(current.photoDisplayUrl);
    }

    window.removeEventListener('deviceorientation', this._handleOrientation);
  }

  private _startOrientationMonitoring(): void {
    if ('DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', this._handleOrientation.bind(this));
      console.log('🧭 [CarpetService] Orientation monitoring started');
    } else {
      console.warn('⚠️ [CarpetService] Device orientation not supported');
      this._updateData({ debugInfo: 'Device orientation not supported' });
    }
  }

  private _handleOrientation(event: DeviceOrientationEvent): void {
    const alpha = event.alpha || 0;
    const beta = event.beta || 0;
    const gamma = event.gamma || 0;

    const { targetAngle, tolerance, minConfidence } = CARPET_RECOGNITION_CONFIG.orientation;
    const angleDiff = Math.abs(beta - targetAngle);

    const isPhoneDown = angleDiff < tolerance;
    const orientationConfidence = Math.max(0, 1 - (angleDiff / tolerance));
    const hasGoodOrientation = isPhoneDown && orientationConfidence > minConfidence;

    console.log(`📱 [CarpetService] Orientation: β:${beta.toFixed(1)}° diff:${angleDiff.toFixed(1)}° conf:${orientationConfidence.toFixed(2)} good:${hasGoodOrientation}`);

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

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        this._animationFrame = requestAnimationFrame(analyzeFrame);
        return;
      }

      canvas.width = this._videoElement.videoWidth || 320;
      canvas.height = this._videoElement.videoHeight || 240;

      ctx.drawImage(this._videoElement, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const textureResult = this._analyzeTexture(imageData);
      const blurResult = this._analyzeBlur(imageData);

      this._updateData({
        hasTexture: textureResult.hasTexture,
        textureConfidence: textureResult.confidence,
        edgeCount: textureResult.edgeCount,
        totalSamples: textureResult.totalSamples,
        textureRatio: textureResult.textureRatio,
        isSharp: blurResult.isSharp,
        blurScore: blurResult.score
      });

      this._calculateDecision();

      const current = this._data();
      if (current.canCheckIn && current.isSharp && !current.photoTaken) {
        this._capturePhoto(canvas);
      }

      this._animationFrame = requestAnimationFrame(analyzeFrame);
    };

    analyzeFrame();
  }

  private _analyzeTexture(imageData: ImageData): { hasTexture: boolean; confidence: number; edgeCount: number; totalSamples: number; textureRatio: number } {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    const { sampleStep, edgeDetectionThreshold } = CARPET_RECOGNITION_CONFIG.texture;

    let edgeCount = 0;
    let totalSamples = 0;

    for (let y = 1; y < height - 1; y += sampleStep) {
      for (let x = 1; x < width - 1; x += sampleStep) {
        const idx = (y * width + x) * 4;

        const current = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        const right = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;
        const bottom = (data[((y + 1) * width + x) * 4] +
                       data[((y + 1) * width + x) * 4 + 1] +
                       data[((y + 1) * width + x) * 4 + 2]) / 3;

        const edgeStrength = Math.abs(current - right) + Math.abs(current - bottom);

        if (edgeStrength > edgeDetectionThreshold) {
          edgeCount++;
        }
        totalSamples++;
      }
    }

    const textureRatio = totalSamples > 0 ? edgeCount / totalSamples : 0;
    const confidence = Math.min(1, textureRatio * 3);

    console.log(`🏠 [CarpetService] Texture: edges:${edgeCount}/${totalSamples} ratio:${textureRatio.toFixed(3)} conf:${confidence.toFixed(2)}`);

    return {
      hasTexture: confidence > 0.1,
      confidence: Math.round(confidence * 100) / 100,
      edgeCount,
      totalSamples,
      textureRatio
    };
  }

  private _analyzeBlur(imageData: ImageData): { isSharp: boolean; score: number } {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    let variance = 0;
    let mean = 0;
    let pixelCount = 0;

    // Calculate Laplacian (edge detection)
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;

        const center = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        const top = (data[((y-1) * width + x) * 4] + data[((y-1) * width + x) * 4 + 1] + data[((y-1) * width + x) * 4 + 2]) / 3;
        const bottom = (data[((y+1) * width + x) * 4] + data[((y+1) * width + x) * 4 + 1] + data[((y+1) * width + x) * 4 + 2]) / 3;
        const left = (data[(y * width + (x-1)) * 4] + data[(y * width + (x-1)) * 4 + 1] + data[(y * width + (x-1)) * 4 + 2]) / 3;
        const right = (data[(y * width + (x+1)) * 4] + data[(y * width + (x+1)) * 4 + 1] + data[(y * width + (x+1)) * 4 + 2]) / 3;

        const laplacian = Math.abs(center * 4 - (top + bottom + left + right));

        mean += laplacian;
        pixelCount++;
      }
    }

    mean = mean / pixelCount;

    // Calculate variance
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const center = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        const top = (data[((y-1) * width + x) * 4] + data[((y-1) * width + x) * 4 + 1] + data[((y-1) * width + x) * 4 + 2]) / 3;
        const bottom = (data[((y+1) * width + x) * 4] + data[((y+1) * width + x) * 4 + 1] + data[((y+1) * width + x) * 4 + 2]) / 3;
        const left = (data[(y * width + (x-1)) * 4] + data[(y * width + (x-1)) * 4 + 1] + data[(y * width + (x-1)) * 4 + 2]) / 3;
        const right = (data[(y * width + (x+1)) * 4] + data[(y * width + (x+1)) * 4 + 1] + data[(y * width + (x+1)) * 4 + 2]) / 3;

        const laplacian = Math.abs(center * 4 - (top + bottom + left + right));
        variance += Math.pow(laplacian - mean, 2);
      }
    }

    variance = variance / pixelCount;
    const blurScore = Math.round(variance);
    const isSharp = variance > CARPET_RECOGNITION_CONFIG.blur.sharpnessThreshold;

    console.log(`📷 [CarpetService] Blur: score:${blurScore} sharp:${isSharp}`);

    return { isSharp, score: blurScore };
  }

  // ✅ WebP + Binary photo capture
  private async _capturePhoto(canvas: HTMLCanvasElement): Promise<void> {
    try {
      console.log('📸 [CarpetService] Capturing WebP photo...');

      const timestamp = Date.now();
      const { blob, format, filename } = await this._captureOptimalFormat(canvas, timestamp);

      const sizeKB = Math.round(blob.size / 1024);
      const displayUrl = URL.createObjectURL(blob);

      // Calculate savings vs Base64 JPEG
      const estimatedBase64Size = blob.size * 1.33; // Base64 overhead
      const savingsKB = Math.round((estimatedBase64Size - blob.size) / 1024);

      console.log(`📸 [CarpetService] Photo captured: ${filename} (${sizeKB}KB ${format.toUpperCase()}, ${savingsKB}KB saved vs Base64)`);

      this._updateData({
        capturedPhoto: blob,
        photoTaken: true,
        photoFilename: filename,
        photoFormat: format,
        photoSizeKB: sizeKB,
        photoDisplayUrl: displayUrl,
        debugInfo: `Photo: ${filename} (${sizeKB}KB ${format}, ${savingsKB}KB saved)`
      });

    } catch (error) {
      console.error('❌ [CarpetService] Photo capture failed:', error);
    }
  }

  private async _captureOptimalFormat(
    canvas: HTMLCanvasElement,
    timestamp: number
  ): Promise<{ blob: Blob; format: 'webp' | 'jpeg'; filename: string }> {

    const config = CARPET_RECOGNITION_CONFIG.photo;

    // ✅ Try WebP first (better compression)
    try {
      const webpBlob = await this._canvasToBlob(canvas, 'image/webp', config.webpQuality);
      if (webpBlob && webpBlob.size > 0) {
        console.log(`✅ [CarpetService] WebP capture successful (${Math.round(webpBlob.size / 1024)}KB)`);
        return {
          blob: webpBlob,
          format: 'webp',
          filename: `carpet_${timestamp}.webp`
        };
      }
    } catch (error) {
      console.warn('⚠️ [CarpetService] WebP capture failed, trying JPEG:', error);
    }

    // ✅ Fallback to JPEG
    const jpegBlob = await this._canvasToBlob(canvas, 'image/jpeg', config.jpegQuality);
    if (!jpegBlob) {
      throw new Error('Failed to capture photo in any format');
    }

    console.log(`✅ [CarpetService] JPEG fallback used (${Math.round(jpegBlob.size / 1024)}KB)`);

    return {
      blob: jpegBlob,
      format: 'jpeg',
      filename: `carpet_${timestamp}.jpg`
    };
  }

  private _canvasToBlob(
    canvas: HTMLCanvasElement,
    type: string,
    quality: number
  ): Promise<Blob | null> {
    return new Promise((resolve) => {
      canvas.toBlob(resolve, type, quality);
    });
  }

  private _calculateDecision(): void {
    const current = this._data();

    const { edgeThreshold } = CARPET_RECOGNITION_CONFIG.texture;
    const { minConfidence } = CARPET_RECOGNITION_CONFIG.orientation;

    const hasGoodTexture = (current.edgeCount || 0) > edgeThreshold;
    const hasGoodOrientation = current.isPhoneDown && current.orientationConfidence > minConfidence;

    const canCheckIn = hasGoodOrientation && hasGoodTexture;

    const orientationWeight = 0.4;
    const textureWeight = 0.6;

    const normalizedTextureScore = Math.min(1, (current.edgeCount || 0) / 1500);
    const overallConfidence =
      (current.orientationConfidence * orientationWeight) +
      (normalizedTextureScore * textureWeight);

    console.log(`🎯 [CarpetService] Decision: orient:${hasGoodOrientation} texture:${hasGoodTexture} canCheckIn:${canCheckIn}`);

    this._updateData({
      overallConfidence,
      canCheckIn,
      debugInfo: `Orient: ${current.orientationConfidence.toFixed(2)} | Edges: ${current.edgeCount}/${edgeThreshold} | Can: ${canCheckIn}`
    });
  }

  resetCapture(): void {
    console.log('🔄 [CarpetService] Resetting capture state...');

    // Clean up old display URL
    const current = this._data();
    if (current.photoDisplayUrl) {
      URL.revokeObjectURL(current.photoDisplayUrl);
    }

    this._updateData({
      capturedPhoto: null,
      photoTaken: false,
      photoFilename: null,
      photoFormat: 'webp',
      photoSizeKB: 0,
      photoDisplayUrl: null,
      debugInfo: 'Reset for new scan'
    });
  }

  private _updateData(updates: Partial<CarpetRecognitionData>): void {
    this._data.update(current => ({ ...current, ...updates }));
  }
}
