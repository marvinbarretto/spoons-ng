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
  private _lastAnalysisTime = 0;
  private _analysisInterval = 250; // Analysis every 250ms (4fps)
  private _stableFrameCount = 0;
  private _lastDecision = false;
  private _scanStartTime = 0;
  private _minThinkingTime = 3000; // 3 seconds minimum
  private _maxThinkingTime = 10000; // 10 seconds maximum
  private _hasTimedOut = false;


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
    console.log('%c*** CAMERA: [CarpetService] stopRecognition() called', 'color: red; font-weight: bold;');
    console.log('%c*** CAMERA: 🚨 CAMERA SHOULD STOP NOW 🚨', 'color: red; font-weight: bold; font-size: 14px;');
    this.cleanup();
    this._updateData({
      debugInfo: 'Recognition stopped',
      canCheckIn: false
    });
    console.log('%c*** CAMERA: [CarpetService] Recognition stopped and camera cleaned up', 'color: red; font-weight: bold;');
  }

  private cleanup(): void {
    console.log('%c*** CAMERA: [CarpetService] cleanup() starting...', 'color: red; font-weight: bold;');

    if (this._animationFrame) {
      console.log('%c*** CAMERA: Cancelling animation frame', 'color: red; font-weight: bold;');
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }

    if (this._mediaStream) {
      console.log('%c*** CAMERA: Stopping camera stream with ' + this._mediaStream.getTracks().length + ' tracks', 'color: red; font-weight: bold;');
      this._mediaStream.getTracks().forEach(track => {
        console.log(`%c*** CAMERA: Stopping track: ${track.kind} (${track.label})`, 'color: red; font-weight: bold;');
        track.stop();
      });
      this._mediaStream = null;
      console.log('%c*** CAMERA: Camera stream stopped and cleared', 'color: red; font-weight: bold;');
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

    // console.log(`📱 [CarpetService] Orientation: β:${beta.toFixed(1)}° diff:${angleDiff.toFixed(1)}° conf:${orientationConfidence.toFixed(2)} good:${hasGoodOrientation}`);

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

    // ✅ TESTING: Very low threshold and detailed logging
    const hasTexture = confidence > 0.05; // Changed from 0.1 to 0.02
    console.log(`🏠 [CarpetService] Texture: edges:${edgeCount}/${totalSamples} ratio:${textureRatio.toFixed(3)} conf:${confidence.toFixed(2)} hasTexture:${hasTexture}`);

    return {
      hasTexture,
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

    // console.log(`📷 [CarpetService] Blur: score:${blurScore} sharp:${isSharp}`);

    return { isSharp, score: blurScore };
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

  private _canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
    return new Promise((resolve) => {
      canvas.toBlob(resolve, type, quality);
    });
  }

  private _startVideoAnalysis(): void {
    if (!this._videoElement) return;

    // ✅ Record scan start time
    this._scanStartTime = Date.now();
    this._hasTimedOut = false;

    const analyzeFrame = () => {
      if (!this._videoElement) return;

      // ✅ STOP ANALYSIS if photo already taken
      const current = this._data();
      if (current.photoTaken) {
        console.log('🛑 [CarpetService] Photo taken, stopping video analysis loop');
        if (this._animationFrame) {
          cancelAnimationFrame(this._animationFrame);
          this._animationFrame = null;
        }
        return; // Exit the loop completely
      }

      const now = performance.now();

      // ✅ Throttle analysis to 4fps
      if (now - this._lastAnalysisTime < this._analysisInterval) {
        this._animationFrame = requestAnimationFrame(analyzeFrame);
        return;
      }

      this._lastAnalysisTime = now;

      // ✅ Check for timeout (10 seconds)
      const elapsed = Date.now() - this._scanStartTime;
      if (elapsed > this._maxThinkingTime && !this._hasTimedOut) {
        this._hasTimedOut = true;
        console.log('⏰ [CarpetService] Scan timeout after 10 seconds - no clear carpet detected');
        console.log('📋 [CarpetService] Alternative flow: User can manually capture or skip carpet');

        // ✅ Update state to show timeout
        this._updateData({
          debugInfo: 'Scan timeout - manual capture available',
          canCheckIn: false
        });

        // ✅ Continue analyzing but don't auto-capture
        this._animationFrame = requestAnimationFrame(analyzeFrame);
        return;
      }

      console.log('🔍 [CarpetService] Running analysis frame...');

      // ✅ Standard analysis
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        this._animationFrame = requestAnimationFrame(analyzeFrame);
        return;
      }

      canvas.width = 160;
      canvas.height = 120;
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

      const prevDecision = this._lastDecision;
      this._calculateDecision();
      const updatedCurrent = this._data();
      this._lastDecision = updatedCurrent.canCheckIn;

      if (prevDecision !== updatedCurrent.canCheckIn) {
        console.log(`🎯 [CarpetService] Decision CHANGED: orient:${updatedCurrent.isPhoneDown} texture:${updatedCurrent.hasTexture} canCheckIn:${updatedCurrent.canCheckIn}`);
      }

      // ✅ Enhanced capture logic with timing controls
      if (updatedCurrent.canCheckIn && updatedCurrent.isSharp && !updatedCurrent.photoTaken && !this._hasTimedOut) {
        this._stableFrameCount++;
        console.log(`📸 [CarpetService] Capture conditions met! Stable frames: ${this._stableFrameCount} (elapsed: ${elapsed}ms)`);

        // ✅ Check minimum thinking time (2 seconds)
        const hasMinTime = elapsed >= this._minThinkingTime;
        const hasStableFrames = this._stableFrameCount >= 2;

        if (hasMinTime && hasStableFrames) {
          console.log('🚀 [CarpetService] TRIGGERING PHOTO CAPTURE! (Min time + stable frames achieved)');

          const captureCanvas = document.createElement('canvas');
          const captureCtx = captureCanvas.getContext('2d');

          if (captureCtx) {
            captureCanvas.width = this._videoElement.videoWidth || 640;
            captureCanvas.height = this._videoElement.videoHeight || 480;
            captureCtx.drawImage(this._videoElement, 0, 0, captureCanvas.width, captureCanvas.height);

            console.log('📷 [CarpetService] Calling _capturePhoto with full-size canvas:', {
              width: captureCanvas.width,
              height: captureCanvas.height,
              thinkingTime: `${elapsed}ms`
            });

            this._capturePhoto(captureCanvas);
            // ✅ Note: _capturePhoto will set photoTaken=true, causing this loop to exit on next iteration
          } else {
            console.error('❌ [CarpetService] Failed to create capture canvas context');
          }
        } else if (!hasMinTime) {
          console.log(`⏳ [CarpetService] Conditions met but waiting for minimum thinking time (${elapsed}/${this._minThinkingTime}ms)`);
        }
      } else {
        // Reset stable frame count if conditions not met
        if (this._stableFrameCount > 0) {
          console.log(`🔄 [CarpetService] Conditions lost, resetting stable frames (was ${this._stableFrameCount})`);
          this._stableFrameCount = 0;
        }

        // ✅ Reduced debug logging to prevent spam
        if (!updatedCurrent.photoTaken && !this._hasTimedOut) {
          if (!updatedCurrent.canCheckIn) {
            console.log(`❌ [CarpetService] Cannot check in: orient:${updatedCurrent.isPhoneDown} texture:${updatedCurrent.hasTexture}`);
          } else if (!updatedCurrent.isSharp) {
            console.log(`❌ [CarpetService] Image not sharp enough: score:${updatedCurrent.blurScore}`);
          }
        }
      }

      this._animationFrame = requestAnimationFrame(analyzeFrame);
    };

    console.log('🎬 [CarpetService] Starting optimized video analysis (4fps) with 2s min / 10s max timing');
    analyzeFrame();
  }



  // ✅ REPLACE your _capturePhoto method with this:
  private async _capturePhoto(canvas: HTMLCanvasElement): Promise<void> {
    try {
      console.log('[CarpetRecognition] 📸 === PHOTO CAPTURE STARTED ===');
      console.log('[CarpetRecognition] Input canvas size:', {
        width: canvas.width,
        height: canvas.height
      });

      // Create a high-quality capture canvas
      const captureCanvas = document.createElement('canvas');
      const ctx = captureCanvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Set capture size (400x400 for consistency)
      captureCanvas.width = 400;
      captureCanvas.height = 400;

      // Calculate source dimensions to center crop
      const sourceSize = Math.min(canvas.width, canvas.height);
      const sourceX = (canvas.width - sourceSize) / 2;
      const sourceY = (canvas.height - sourceSize) / 2;

      console.log('[CarpetRecognition] Crop calculations:', {
        sourceSize,
        sourceX,
        sourceY,
        targetSize: '400x400'
      });

      // Draw centered crop
      ctx.drawImage(
        canvas,
        sourceX, sourceY, sourceSize, sourceSize,  // source
        0, 0, 400, 400                             // destination
      );

      console.log('[CarpetRecognition] Canvas drawn, starting blob conversion...');

      // ✅ Convert to Blob (WebP with fallback to JPEG)
      const photoBlob = await this._canvasToBlob(captureCanvas, 'image/webp', 0.8) ||
                        await this._canvasToBlob(captureCanvas, 'image/jpeg', 0.8);

      if (!photoBlob) {
        throw new Error('Failed to create photo blob');
      }

      console.log('[CarpetRecognition] Blob created:', {
        size: photoBlob.size,
        type: photoBlob.type
      });

      // ✅ Create display URL for the blob
      const photoDisplayUrl = URL.createObjectURL(photoBlob);
      console.log('[CarpetRecognition] Display URL created:', photoDisplayUrl);

      // ✅ Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const photoFilename = `carpet_${timestamp}.${photoBlob.type.split('/')[1]}`;

      console.log('[CarpetRecognition] ✅ === PHOTO CAPTURE SUCCESS ===', {
        filename: photoFilename,
        size: `${captureCanvas.width}x${captureCanvas.height}`,
        blobSize: `${Math.round(photoBlob.size / 1024)}KB`,
        format: photoBlob.type,
        blurScore: this._data().blurScore,
        edgeCount: this._data().edgeCount
      });

      this._updateData({
        capturedPhoto: photoBlob,
        photoDisplayUrl,
        photoFilename,
        photoFormat: photoBlob.type.includes('webp') ? 'webp' : 'jpeg',
        photoSizeKB: Math.round(photoBlob.size / 1024),
        photoTaken: true,
        debugInfo: 'Photo captured successfully!'
      });

    } catch (error) {
      console.error('[CarpetRecognition] ❌ === PHOTO CAPTURE FAILED ===', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this._updateData({
        debugInfo: `Photo capture failed: ${errorMessage}`
      });
    }
  }


  private _calculateDecision(): void {
    const current = this._data();

    const { edgeThreshold } = CARPET_RECOGNITION_CONFIG.texture;
    const { minConfidence } = CARPET_RECOGNITION_CONFIG.orientation;

    // ✅ MUCH LOWER edge threshold for testing - use the texture analysis result directly
    const hasGoodTexture = current.hasTexture; // Just use what _analyzeTexture already determined
    const hasGoodOrientation = current.isPhoneDown && current.orientationConfidence > minConfidence;

    const canCheckIn = hasGoodOrientation && hasGoodTexture;

    const orientationWeight = 0.4;
    const textureWeight = 0.6;

    const normalizedTextureScore = Math.min(1, (current.edgeCount || 0) / 1500);
    const overallConfidence =
      (current.orientationConfidence * orientationWeight) +
      (normalizedTextureScore * textureWeight);

    // ✅ Enhanced logging
    console.log(`🎯 [CarpetService] Decision: orient:${hasGoodOrientation} texture:${hasGoodTexture} canCheckIn:${canCheckIn} (edges:${current.edgeCount}, analyzeTexture says: ${current.hasTexture})`);

    this._updateData({
      overallConfidence,
      canCheckIn,
      debugInfo: `Orient: ${current.orientationConfidence.toFixed(2)} | HasTexture: ${current.hasTexture} | Can: ${canCheckIn}`
    });
  }

  resetCapture(): void {
    console.log('🔄 [CarpetService] Resetting capture state...');

    // ✅ Clean up old display URL
    const current = this._data();
    if (current.photoDisplayUrl) {
      URL.revokeObjectURL(current.photoDisplayUrl);
    }

    // ✅ Reset counters
    this._stableFrameCount = 0;
    this._lastDecision = false;

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
