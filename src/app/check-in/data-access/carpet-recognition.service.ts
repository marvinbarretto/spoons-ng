import { Injectable, signal, inject } from '@angular/core';
import { CarpetRecognitionData } from '../utils/carpet.models';
import { CARPET_RECOGNITION_CONFIG } from './carpet-recognition.config';
import { CameraService } from '../../shared/data-access/camera.service';
import { LLMService } from '../../shared/data-access/llm.service';

@Injectable({ providedIn: 'root' })
export class CarpetRecognitionService {
  private readonly cameraService = inject(CameraService);
  private readonly llmService = inject(LLMService);

  // Event signals for key milestones
  private readonly _carpetDetectedSignal = signal<CarpetRecognitionData | null>(null);
  private readonly _qualityReadySignal = signal<CarpetRecognitionData | null>(null);
  private readonly _captureReadySignal = signal<CarpetRecognitionData | null>(null);

  readonly carpetDetectedSignal = this._carpetDetectedSignal.asReadonly();
  readonly qualityReadySignal = this._qualityReadySignal.asReadonly();
  readonly captureReadySignal = this._captureReadySignal.asReadonly();

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
    debugInfo: 'Not started',
    deviceStable: false,
    llmCarpetDetected: false,
    llmProcessing: false,
    llmLastResult: null,
    llmStreamingText: '',
    llmResultPersistent: null
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

  // Event emission tracking
  private _qualityReadyEmitted = false;
  private _captureReadyEmitted = false;

  // Simple device stability tracking
  private _lastStableTimestamp = 0;
  private _isCurrentlyStable = false;
  private _lastBeta = 0;
  private _lastGamma = 0;
  private _stabilityThreshold = 5; // degrees
  private _stabilityDuration = 3000; // 3 seconds

  async startRecognition(): Promise<void> {
    console.log('%c*** CAMERA: [CarpetService] Starting recognition via CameraService...', 'color: blue; font-weight: bold;');

    try {
      // Use centralized camera service
      this._mediaStream = await this.cameraService.requestCamera({
        video: {
          facingMode: 'environment',
          width: { ideal: CARPET_RECOGNITION_CONFIG.photo.maxWidth },
          height: { ideal: CARPET_RECOGNITION_CONFIG.photo.maxHeight }
        }
      });

      console.log('%c*** CAMERA: [CarpetService] Camera stream received from service', 'color: blue; font-weight: bold;');

      this._videoElement = document.createElement('video');

      // Use camera service to manage video element attachment
      this.cameraService.attachToVideoElement(this._videoElement, this._mediaStream);
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
    console.log('%c*** CAMERA: 🚨 CAMERA SHOULD STOP NOW VIA SERVICE 🚨', 'color: red; font-weight: bold; font-size: 14px;');

    // Use centralized camera service for cleanup
    this.cameraService.releaseCamera();

    // Local cleanup
    this.cleanup();

    this._updateData({
      debugInfo: 'Recognition stopped',
      canCheckIn: false
    });
    console.log('%c*** CAMERA: [CarpetService] Recognition stopped via CameraService', 'color: red; font-weight: bold;');
  }

  private cleanup(): void {
    console.log('%c*** CAMERA: [CarpetService] Local cleanup starting...', 'color: red; font-weight: bold;');

    if (this._animationFrame) {
      console.log('%c*** CAMERA: Cancelling animation frame', 'color: red; font-weight: bold;');
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }

    // Camera stream cleanup is now handled by CameraService
    // Just clear our local reference
    if (this._mediaStream) {
      console.log('%c*** CAMERA: Clearing local stream reference (CameraService handles actual cleanup)', 'color: red; font-weight: bold;');
      this._mediaStream = null;
    }

    if (this._videoElement) {
      this._videoElement.remove();
      this._videoElement = null;
    }

    // Clean up photo display URL
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
    const orientationConfidence = Math.max(0, 1 - angleDiff / tolerance);

    // Enhanced device stability tracking
    const now = Date.now();
    const betaDiff = Math.abs(beta - this._lastBeta);
    const gammaDiff = Math.abs(gamma - this._lastGamma);
    const totalMovement = betaDiff + gammaDiff;

    if (totalMovement < this._stabilityThreshold) {
      if (!this._isCurrentlyStable) {
        this._lastStableTimestamp = now;
        this._isCurrentlyStable = true;
      }

      const stableDuration = now - this._lastStableTimestamp;
      const deviceStable = stableDuration >= this._stabilityDuration;

      // Trigger LLM detection when device becomes stable for the first time
      if (deviceStable && !this._data().deviceStable && !this._data().llmProcessing && !this._data().llmCarpetDetected) {
        console.log('🤖 [CarpetService] Device became stable - considering LLM detection');
      }

      this._updateData({
        deviceStable,
        isPhoneDown,
        orientationAngle: beta,
        orientationConfidence,
        alpha,
        beta,
        gamma,
        angleDifference: angleDiff
      });
    } else {
      this._isCurrentlyStable = false;
      this._updateData({
        deviceStable: false,
        isPhoneDown,
        orientationAngle: beta,
        orientationConfidence,
        alpha,
        beta,
        gamma,
        angleDifference: angleDiff
      });
    }

    this._lastBeta = beta;
    this._lastGamma = gamma;
  }

  private _startVideoAnalysis(): void {
    this._scanStartTime = Date.now();
    this._hasTimedOut = false;

    const analyzeFrame = () => {
      const now = Date.now();
      const elapsed = now - this._scanStartTime;

      if (elapsed > this._maxThinkingTime && !this._hasTimedOut) {
        console.log('⏰ [CarpetService] Analysis timeout reached - enabling manual capture');
        this._hasTimedOut = true;
        this._updateData({
          debugInfo: 'Scan timeout - manual capture available',
          canCheckIn: false
        });

        this._animationFrame = requestAnimationFrame(analyzeFrame);
        return;
      }

      console.log('🔍 [CarpetService] Running analysis frame...');

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        this._animationFrame = requestAnimationFrame(analyzeFrame);
        return;
      }

      canvas.width = 160;
      canvas.height = 120;
      ctx.drawImage(this._videoElement!, 0, 0, canvas.width, canvas.height);

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

      // Enhanced capture logic with timing controls
      if (updatedCurrent.canCheckIn && updatedCurrent.isSharp && !updatedCurrent.photoTaken && !this._hasTimedOut) {
        this._stableFrameCount++;
        console.log(`📸 [CarpetService] Capture conditions met! Stable frames: ${this._stableFrameCount} (elapsed: ${elapsed}ms)`);

        // Check minimum thinking time (3 seconds)
        const hasMinTime = elapsed >= this._minThinkingTime;
        const hasStableFrames = this._stableFrameCount >= 2;

        if (hasMinTime && hasStableFrames) {
          console.log('🚀 [CarpetService] TRIGGERING PHOTO CAPTURE!');
          this._capturePhoto();
          return;
        }
      } else {
        this._stableFrameCount = 0;
      }

      if (this._lastAnalysisTime + this._analysisInterval <= now) {
        this._lastAnalysisTime = now;
      }

      this._animationFrame = requestAnimationFrame(analyzeFrame);
    };

    this._animationFrame = requestAnimationFrame(analyzeFrame);
  }

  async triggerLLMDetection(): Promise<void> {
    if (!this._videoElement || this._data().llmProcessing) {
      return;
    }

    console.log('🤖 [CarpetService] Triggering LLM streaming carpet detection...');
    this._updateData({
      llmProcessing: true,
      llmLastResult: null,
      llmStreamingText: 'Starting analysis...'
    });

    try {
      // Capture current frame
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      canvas.width = this._videoElement.videoWidth || 640;
      canvas.height = this._videoElement.videoHeight || 480;
      ctx.drawImage(this._videoElement, 0, 0, canvas.width, canvas.height);

      // Convert to data URL
      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      console.log('🤖 [CarpetService] Captured frame for LLM streaming analysis:', {
        width: canvas.width,
        height: canvas.height,
        dataSize: imageData.length
      });

      // Use the new streaming method
      const streamResponse = await this.llmService.detectCarpetStream(imageData);

      if (!streamResponse.success) {
        throw new Error(streamResponse.error || 'Streaming failed');
      }

      // Process streaming chunks
      let fullText = '';
      let carpetDetected = false;

      for await (const chunk of streamResponse.stream) {
        fullText += chunk.text;

        // Update streaming text in real-time
        this._updateData({
          llmStreamingText: fullText || 'Analyzing...'
        });

        console.log('🤖 [CarpetService] Stream chunk:', chunk.text);

        if (chunk.isComplete) {
          // Parse final result
          carpetDetected = /is carpet:\s*yes/i.test(fullText) ||
                          (/carpet/i.test(fullText) && !/no carpet|not.*carpet/i.test(fullText));
          break;
        }
      }

      console.log(`🤖 [CarpetService] LLM streaming result: ${carpetDetected ? 'CARPET DETECTED' : 'NO CARPET'}`);
      console.log(`🤖 [CarpetService] === FULL LLM RESPONSE ===`);
      console.log(fullText);
      console.log(`🤖 [CarpetService] === END LLM RESPONSE ===`);

      // Try to parse the response as JSON
      let parsedResult = null;
      try {
        const jsonMatch = fullText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
          console.log('🤖 [CarpetService] === PARSED JSON RESULT ===');
          console.log(parsedResult);

          if (parsedResult.story && Array.isArray(parsedResult.story)) {
            console.log('📖 [CarpetService] === STORY ARRAY FOR UI ===');
            parsedResult.story.forEach((story: string, index: number) => {
              console.log(`📖 [CarpetService] Story ${index + 1}: ${story}`);
            });
            console.log('📖 [CarpetService] === END STORY ARRAY ===');
          }
        }
      } catch (e) {
        console.warn('🤖 [CarpetService] Failed to parse LLM response as JSON:', e);
      }

      const resultText = carpetDetected ? 'Carpet detected!' : 'No carpet detected';

      this._updateData({
        llmCarpetDetected: carpetDetected,
        llmProcessing: false,
        llmLastResult: parsedResult || resultText,
        llmStreamingText: fullText || 'Analysis complete'
      });

      // Emit carpet detected event
      if (carpetDetected) {
        console.log('🎯 [CarpetService] Emitting carpet detected signal');
        this._carpetDetectedSignal.set(this._data());
      }

    } catch (error) {
      console.error('🤖 [CarpetService] LLM streaming detection failed:', error);
      const errorText = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;

      this._updateData({
        llmCarpetDetected: false,
        llmProcessing: false,
        llmLastResult: errorText,
        llmStreamingText: 'Analysis failed'
      });
    }
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
    const hasTexture = edgeCount > CARPET_RECOGNITION_CONFIG.texture.edgeThreshold;
    const confidence = Math.min(1, edgeCount / 1000);

    return { hasTexture, confidence, edgeCount, totalSamples, textureRatio };
  }

  private _analyzeBlur(imageData: ImageData): { isSharp: boolean; score: number } {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    let variance = 0;
    const mean = 0;
    let pixelCount = 0;

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
        pixelCount++;
      }
    }

    variance = variance / pixelCount;
    const blurScore = Math.round(variance);
    const isSharp = variance > CARPET_RECOGNITION_CONFIG.blur.sharpnessThreshold;

    return { isSharp, score: blurScore };
  }

  private async _capturePhoto(): Promise<void> {
    if (!this._videoElement) {
      console.error('[CarpetRecognition] ❌ No video element available for capture');
      return;
    }

    try {
      console.log('[CarpetRecognition] 📸 === STARTING PHOTO CAPTURE ===');

      const captureCanvas = document.createElement('canvas');
      const ctx = captureCanvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context for photo capture');
      }

      captureCanvas.width = this._videoElement.videoWidth || CARPET_RECOGNITION_CONFIG.photo.maxWidth;
      captureCanvas.height = this._videoElement.videoHeight || CARPET_RECOGNITION_CONFIG.photo.maxHeight;

      ctx.drawImage(this._videoElement, 0, 0, captureCanvas.width, captureCanvas.height);

      const timestamp = Date.now();
      const { blob: photoBlob, format, filename: photoFilename } = await this._captureOptimalFormat(captureCanvas, timestamp);

      const photoDisplayUrl = URL.createObjectURL(photoBlob);

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

      // Stop analysis frames to prevent memory leak
      if (this._animationFrame) {
        console.log('🛑 [CarpetService] Stopping analysis frames after photo capture');
        cancelAnimationFrame(this._animationFrame);
        this._animationFrame = null;
      }

    } catch (error) {
      console.error('[CarpetRecognition] ❌ === PHOTO CAPTURE FAILED ===', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this._updateData({
        debugInfo: `Photo capture failed: ${errorMessage}`
      });
    }
  }

  private async _captureOptimalFormat(
    canvas: HTMLCanvasElement,
    timestamp: number
  ): Promise<{ blob: Blob; format: 'webp' | 'jpeg'; filename: string }> {

    const config = CARPET_RECOGNITION_CONFIG.photo;

    // Try WebP first (better compression)
    try {
      const webpBlob = await this._canvasToBlob(canvas, 'image/webp', config.webpQuality);
      if (webpBlob && webpBlob.size > 0) {
        console.log(`✅ [CarpetService] WebP capture successful (${Math.round(webpBlob.size / 1024)}KB)`);
        return {
          blob: webpBlob,
          format: 'webp',
          filename: `carpet_${timestamp.toString()}.webp`
        };
      }
    } catch (error) {
      console.warn('⚠️ [CarpetService] WebP capture failed, trying JPEG:', error);
    }

    // Fallback to JPEG
    const jpegBlob = await this._canvasToBlob(canvas, 'image/jpeg', config.jpegQuality);

    if (!jpegBlob || jpegBlob.size === 0) {
      throw new Error('Both WebP and JPEG capture failed');
    }

    console.log(`✅ [CarpetService] JPEG fallback successful (${Math.round(jpegBlob.size / 1024)}KB)`);
    return {
      blob: jpegBlob,
      format: 'jpeg',
      filename: `carpet_${timestamp.toString()}.jpeg`
    };
  }

  private _canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error(`Failed to create blob with ${mimeType}`));
          }
        },
        mimeType,
        quality
      );
    });
  }

  private _calculateDecision(): void {
    const current = this._data();
    const { minConfidence } = CARPET_RECOGNITION_CONFIG.orientation;

    const hasGoodOrientation = current.isPhoneDown && current.orientationConfidence > minConfidence;
    const isDeviceStable = current.deviceStable;

    // Smart LLM triggering - only when ALL conditions pass and we haven't already detected carpet
    const hasGoodEdgeCount = (current.edgeCount || 0) > CARPET_RECOGNITION_CONFIG.texture.edgeThreshold;
    const shouldTriggerLLM = hasGoodOrientation &&
                            isDeviceStable &&
                            hasGoodEdgeCount &&
                            !current.llmCarpetDetected &&
                            !current.llmProcessing;

    if (shouldTriggerLLM) {
      console.log('🤖 [CarpetService] Triggering LLM - all shallow conditions met');
      this.triggerLLMDetection();
    }

    // Use LLM detection if available, fallback to local analysis
    const hasGoodTexture = current.llmCarpetDetected || current.hasTexture;

    // Require device stability, orientation, and carpet detection
    const canCheckIn = hasGoodOrientation && hasGoodTexture && isDeviceStable;

    const orientationWeight = 0.3;
    const textureWeight = 0.4;
    const stabilityWeight = 0.3;

    const normalizedTextureScore = current.llmCarpetDetected ? 1.0 : Math.min(1, (current.edgeCount || 0) / 1500);
    const stabilityScore = isDeviceStable ? 1.0 : 0.0;

    const overallConfidence =
      (current.orientationConfidence * orientationWeight) +
      (normalizedTextureScore * textureWeight) +
      (stabilityScore * stabilityWeight);

    // Enhanced logging with LLM status
    const detectionMethod = current.llmCarpetDetected ? 'LLM' : (current.hasTexture ? 'LOCAL' : 'NONE');
    // console.log(`🎯 [CarpetService] Decision: orient:${hasGoodOrientation} carpet:${hasGoodTexture}(${detectionMethod}) stable:${isDeviceStable} canCheckIn:${canCheckIn}`);

    this._updateData({
      overallConfidence,
      canCheckIn,
      debugInfo: `Orient:${current.orientationConfidence.toFixed(2)} | Carpet:${hasGoodTexture}(${detectionMethod}) | Stable:${isDeviceStable} | Can:${canCheckIn}`
    });

    // Emit events for key milestones
    const updatedData = this._data();

    // Quality ready: good orientation + device stable (regardless of carpet)
    if (hasGoodOrientation && isDeviceStable && !this._qualityReadyEmitted) {
      console.log('✨ [CarpetService] Emitting quality ready signal');
      this._qualityReadySignal.set(updatedData);
      this._qualityReadyEmitted = true;
    }

    // Capture ready: all conditions met including carpet
    if (canCheckIn && updatedData.isSharp && !this._captureReadyEmitted) {
      console.log('📸 [CarpetService] Emitting capture ready signal');
      this._captureReadySignal.set(updatedData);
      this._captureReadyEmitted = true;
    }
  }

  resetCapture(): void {
    console.log('🔄 [CarpetService] Resetting capture state...');

    // Clean up old display URL
    const current = this._data();
    if (current.photoDisplayUrl) {
      URL.revokeObjectURL(current.photoDisplayUrl);
    }

    // Reset counters and stability tracking
    this._stableFrameCount = 0;
    this._lastDecision = false;
    this._lastStableTimestamp = 0;
    this._isCurrentlyStable = false;
    this._lastBeta = 0;
    this._lastGamma = 0;

    // Reset event tracking
    this._qualityReadyEmitted = false;
    this._captureReadyEmitted = false;

    // Reset event signals
    this._carpetDetectedSignal.set(null);
    this._qualityReadySignal.set(null);
    this._captureReadySignal.set(null);

    this._updateData({
      capturedPhoto: null,
      photoTaken: false,
      photoFilename: null,
      photoFormat: 'webp',
      photoSizeKB: 0,
      photoDisplayUrl: null,
      deviceStable: false,
      llmCarpetDetected: false,
      llmProcessing: false,
      llmLastResult: null,
      debugInfo: 'Reset for new scan'
    });
  }

  async manualCapture(): Promise<void> {
    console.log('📸 [CarpetService] Manual capture requested');

    if (this._data().photoTaken) {
      console.log('⚠️ [CarpetService] Photo already taken');
      return;
    }

    await this._capturePhoto();
  }

  private _updateData(updates: Partial<CarpetRecognitionData>): void {
    this._data.update(current => ({ ...current, ...updates }));
  }
}
