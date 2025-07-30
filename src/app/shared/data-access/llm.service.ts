import { Injectable, signal } from '@angular/core';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { environment } from '../../../environments/environment';
import { LLMPromptFactory } from '../utils/llm-prompt-factory';
import {
  ANALYSIS_THEMES,
  AnalysisTheme,
  CarpetDetectionResult,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  LLMStreamResponse,
  PhotoAnalysisResult,
  PhotoQualityMetrics,
} from '../utils/llm-types';

@Injectable({
  providedIn: 'root',
})
export class LLMService {
  private readonly _genAI = new GoogleGenerativeAI(environment.llm?.gemini || '');
  private readonly _model = this._genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  // Simple cache for testing - TEMPORARILY DISABLED
  // Cache was causing permanent blocking after rejections due to weak cache key
  // and caching of negative results. Re-enable once improved.
  private readonly _cache = new Map<string, any>();

  // Basic state tracking
  private readonly _isProcessing = signal(false);
  private readonly _requestCount = signal(0);

  readonly isProcessing = this._isProcessing.asReadonly();
  readonly requestCount = this._requestCount.asReadonly();

  /**
   * Test method - simple text prompt
   */
  async testConnection(prompt: string = 'Hello, are you working?'): Promise<LLMResponse<string>> {
    console.log('[LLMService] Testing connection with prompt:', prompt);

    this._isProcessing.set(true);

    try {
      const result = await this._model.generateContent(prompt);
      const response = result.response.text();

      this._requestCount.update(count => count + 1);

      console.log('[LLMService] ✅ Connection test successful:', response);

      return {
        success: true,
        data: response,
        cached: false,
      };
    } catch (error: any) {
      console.error('[LLMService] ❌ Connection test failed:', error);

      return {
        success: false,
        data: '',
        error: error?.message || 'Connection failed',
        cached: false,
      };
    } finally {
      this._isProcessing.set(false);
    }
  }

  /**
   * Carpet detection - optimized with image resizing
   */
  async detectCarpet(imageData: string): Promise<LLMResponse<CarpetDetectionResult>> {
    console.log('[LLMService] Detecting carpet in image...');

    // ✅ OPTIMIZE IMAGE FIRST - Major cost savings!
    const optimizedImage = await this.optimizeImageForAnalysis(imageData);
    console.log('[LLMService] Image optimized for analysis');

    // Cache key based on optimized image
    const cacheKey = this.hashString(optimizedImage.slice(0, 100));

    // TODO: Cache temporarily disabled - was causing permanent blocking after rejections
    // Weak cache key meant similar photos got same cached rejection, preventing retries
    // Re-enable once cache key is improved and only successful results are cached
    // if (this._cache.has(cacheKey)) {
    //   console.log('[LLMService] ✅ Cache hit for carpet detection');
    //   return {
    //     success: true,
    //     data: this._cache.get(cacheKey),
    //     cached: true
    //   };
    // }

    this._isProcessing.set(true);

    try {
      const prompt = this.buildCarpetPrompt();
      const imagePart = this.prepareImagePart(optimizedImage);

      const result = await this._model.generateContent([prompt, imagePart]);
      const responseText = result.response.text();

      console.log('[LLMService] Raw response:', responseText);

      // Parse response
      const carpetResult = this.parseCarpetResponse(responseText);

      // TODO: Cache storage temporarily disabled - prevent caching rejections
      // this._cache.set(cacheKey, carpetResult);
      this._requestCount.update(count => count + 1);

      console.log('[LLMService] ✅ Carpet detection complete:', carpetResult);

      return {
        success: true,
        data: carpetResult,
        cached: false,
      };
    } catch (error: any) {
      console.error('[LLMService] ❌ Carpet detection failed:', error);

      return {
        success: false,
        data: {
          isCarpet: false,
          confidence: 0,
          reasoning: `Analysis failed: ${error?.message}`,
          visualElements: [],
        },
        error: error?.message || 'Detection failed',
        cached: false,
      };
    } finally {
      this._isProcessing.set(false);
    }
  }

  /**
   * Simple boolean method for carpet detection
   */
  async isCarpet(imageData: string): Promise<boolean> {
    console.log('[LLMService] Checking if image contains carpet...');

    try {
      const result = await this.detectCarpet(imageData);
      const isCarpet = result.success && result.data.isCarpet;

      console.log(
        `[LLMService] Carpet detection result: ${isCarpet} (confidence: ${result.data.confidence}%)`
      );

      return isCarpet;
    } catch (error) {
      console.error('[LLMService] Error in isCarpet:', error);
      return false;
    }
  }

  /**
   * 🎯 New themed analysis system - supports any analysis theme with quality assessment
   */
  async analyzePhotoWithTheme(
    imageData: string,
    theme: AnalysisTheme
  ): Promise<LLMResponse<PhotoAnalysisResult>> {
    console.log(`[LLMService] 🎯 Analyzing photo with theme: ${theme.name}`);

    // Validate theme first
    const validation = LLMPromptFactory.validateTheme(theme);
    if (!validation.valid) {
      console.error('[LLMService] ❌ Invalid theme configuration:', validation.errors);
      return {
        success: false,
        data: this.createFailedAnalysisResult(theme, validation.errors.join(', ')),
        error: `Invalid theme: ${validation.errors.join(', ')}`,
        cached: false,
      };
    }

    // Optimize image first
    const optimizedImage = await this.optimizeImageForAnalysis(imageData);
    console.log('[LLMService] Image optimized for themed analysis');

    this._isProcessing.set(true);

    try {
      const prompt = LLMPromptFactory.buildAnalysisPrompt(theme);
      const imagePart = this.prepareImagePart(optimizedImage);

      const result = await this._model.generateContent([prompt, imagePart]);
      const responseText = result.response.text();

      console.log('[LLMService] Raw themed analysis response:', responseText);

      // Parse the enhanced response
      const analysisResult = this.parseThemedAnalysisResponse(responseText, theme);

      this._requestCount.update(count => count + 1);

      console.log('[LLMService] ✅ Themed analysis complete:', analysisResult);

      return {
        success: true,
        data: analysisResult,
        cached: false,
      };
    } catch (error: any) {
      console.error('[LLMService] ❌ Themed analysis failed:', error);

      return {
        success: false,
        data: this.createFailedAnalysisResult(theme, error?.message || 'Analysis failed'),
        error: error?.message || 'Themed analysis failed',
        cached: false,
      };
    } finally {
      this._isProcessing.set(false);
    }
  }

  /**
   * 🎯 Carpet analysis for CarpetStrategyService - now uses themed system
   * Returns simplified result format optimized for the carpet workflow
   */
  async analyzeCarpet(imageData: string): Promise<{ isCarpet: boolean; confidence: number }> {
    console.log('[LLMService] 🎯 Analyzing carpet using themed system...');

    try {
      const result = await this.analyzePhotoWithTheme(imageData, ANALYSIS_THEMES.CARPET);

      if (result.success) {
        console.log(
          `[LLMService] ✅ Carpet analysis complete - detected: ${result.data.detected}, confidence: ${result.data.confidence}%`
        );
        return {
          isCarpet: result.data.detected,
          confidence: result.data.confidence,
        };
      } else {
        console.error('[LLMService] ❌ Carpet analysis failed:', result.error);
        return { isCarpet: false, confidence: 0 };
      }
    } catch (error) {
      console.error('[LLMService] ❌ Carpet analysis error:', error);
      return { isCarpet: false, confidence: 0 };
    }
  }

  /**
   * 📸 Assess photo quality only (no theme detection)
   */
  async assessPhotoQuality(imageData: string): Promise<LLMResponse<PhotoQualityMetrics>> {
    console.log('[LLMService] 📸 Assessing photo quality...');

    const optimizedImage = await this.optimizeImageForAnalysis(imageData);
    this._isProcessing.set(true);

    try {
      const prompt = LLMPromptFactory.buildQualityAssessmentPrompt();
      const imagePart = this.prepareImagePart(optimizedImage);

      const result = await this._model.generateContent([prompt, imagePart]);
      const responseText = result.response.text();

      console.log('[LLMService] Raw quality assessment response:', responseText);

      const qualityMetrics = this.parseQualityResponse(responseText);
      this._requestCount.update(count => count + 1);

      console.log('[LLMService] ✅ Photo quality assessment complete:', qualityMetrics);

      return {
        success: true,
        data: qualityMetrics,
        cached: false,
      };
    } catch (error: any) {
      console.error('[LLMService] ❌ Quality assessment failed:', error);

      return {
        success: false,
        data: {
          overall: 50,
          focus: 50,
          lighting: 50,
          composition: 50,
          factors: ['Assessment failed'],
        },
        error: error?.message || 'Quality assessment failed',
        cached: false,
      };
    } finally {
      this._isProcessing.set(false);
    }
  }

  /**
   * Streaming carpet detection with real-time feedback
   */
  async detectCarpetStream(imageData: string): Promise<LLMStreamResponse<CarpetDetectionResult>> {
    console.log('[LLMService] Starting streaming carpet detection...');

    // Optimize image first
    const optimizedImage = await this.optimizeImageForAnalysis(imageData);
    console.log('[LLMService] Image optimized for streaming analysis');

    // Check cache
    const cacheKey = this.hashString(optimizedImage.slice(0, 100));
    if (this._cache.has(cacheKey)) {
      console.log('[LLMService] ✅ Cache hit for streaming carpet detection');
      const cachedResult = this._cache.get(cacheKey);

      // Return cached result as a single chunk stream
      return {
        success: true,
        stream: this.createCachedStream(cachedResult),
        cached: true,
      };
    }

    this._isProcessing.set(true);

    try {
      const prompt = this.buildCarpetPrompt();
      const imagePart = this.prepareImagePart(optimizedImage);

      // Use generateContentStream for real-time responses
      const streamResult = await this._model.generateContentStream([prompt, imagePart]);

      return {
        success: true,
        stream: await this.processCarpetStream(streamResult, cacheKey),
        cached: false,
      };
    } catch (error: any) {
      console.error('[LLMService] ❌ Streaming carpet detection failed:', error);
      this._isProcessing.set(false);

      return {
        success: false,
        stream: this.createErrorStream(error?.message || 'Streaming detection failed'),
        error: error?.message || 'Streaming detection failed',
        cached: false,
      };
    }
  }

  /**
   * Process streaming response for carpet detection
   */
  private async *processInternalStream(
    streamResult: any,
    cacheKey: string
  ): AsyncGenerator<LLMStreamChunk> {
    let chunkIndex = 0;
    let fullText = '';

    try {
      for await (const chunk of streamResult.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;

        yield {
          text: chunkText,
          isComplete: false,
          chunkIndex: chunkIndex++,
        };
      }

      // Final chunk with complete response
      yield {
        text: '',
        isComplete: true,
        chunkIndex: chunkIndex,
      };

      // Parse and cache the complete result
      const carpetResult = this.parseCarpetResponse(fullText);
      this._cache.set(cacheKey, carpetResult);
      this._requestCount.update(count => count + 1);

      console.log('[LLMService] ✅ Streaming carpet detection complete:', carpetResult);
    } catch (error) {
      console.error('[LLMService] Error in stream processing:', error);
      yield {
        text: `Error: ${error}`,
        isComplete: true,
        chunkIndex: chunkIndex,
      };
    } finally {
      this._isProcessing.set(false);
    }
  }

  private async processInternalStreamWrapper(
    streamResult: any,
    cacheKey: string
  ): Promise<AsyncIterable<LLMStreamChunk>> {
    return this.processInternalStream(streamResult, cacheKey);
  }

  private async processCarpetStream(
    streamResult: any,
    cacheKey: string
  ): Promise<AsyncIterable<LLMStreamChunk>> {
    return this.processInternalStreamWrapper(streamResult, cacheKey);
  }

  /**
   * Create a stream from cached result
   */
  private async *createCachedStream(
    cachedResult: CarpetDetectionResult
  ): AsyncGenerator<LLMStreamChunk> {
    const reasoningText = `Is Carpet: ${cachedResult.isCarpet ? 'Yes' : 'No'}\nConfidence: ${cachedResult.confidence}%\nReasoning: ${cachedResult.reasoning}`;

    yield {
      text: reasoningText,
      isComplete: true,
      chunkIndex: 0,
    };
  }

  /**
   * Create an error stream
   */
  private async *createErrorStream(errorMessage: string): AsyncGenerator<LLMStreamChunk> {
    yield {
      text: `Error: ${errorMessage}`,
      isComplete: true,
      chunkIndex: 0,
    };
  }

  /**
   * General purpose method for any LLM request
   */
  async processRequest(request: LLMRequest): Promise<LLMResponse> {
    console.log('[LLMService] Processing request:', request.type || 'general');

    this._isProcessing.set(true);

    try {
      const parts: any[] = [{ text: request.prompt }];

      if (request.image) {
        // ✅ Optimize images for all requests
        const optimizedImage = await this.optimizeImageForAnalysis(request.image);
        parts.push(this.prepareImagePart(optimizedImage));
      }

      const result = await this._model.generateContent(parts);
      const response = result.response.text();

      this._requestCount.update(count => count + 1);

      return {
        success: true,
        data: response,
        cached: false,
      };
    } catch (error: any) {
      console.error('[LLMService] ❌ Request failed:', error);

      return {
        success: false,
        data: null,
        error: error?.message || 'Request failed',
        cached: false,
      };
    } finally {
      this._isProcessing.set(false);
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * ✅ IMAGE OPTIMIZATION - Major cost savings!
   * Resizes images to optimal size for LLM analysis
   */
  private async optimizeImageForAnalysis(imageData: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      // ✅ Optimal dimensions for carpet pattern recognition
      const targetWidth = 512;
      const targetHeight = 384;

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      img.onload = () => {
        console.log(`[LLMService] Original image: ${img.width}x${img.height}`);

        // Draw resized image
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // ✅ Compress with good quality (0.8 = good balance)
        const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);

        console.log(`[LLMService] Optimized to: ${targetWidth}x${targetHeight}`);
        console.log(
          `[LLMService] Size reduction: ~${Math.round((1 - optimizedDataUrl.length / imageData.length) * 100)}%`
        );

        resolve(optimizedDataUrl);
      };

      img.onerror = () => {
        console.log('[LLMService] Failed to load image for optimization');
        reject(new Error('Image optimization failed'));
      };

      img.src = imageData;
    });
  }

  private buildCarpetPrompt(): string {
    // Legacy method - now uses prompt factory
    return LLMPromptFactory.buildCarpetPrompt();
  }

  private prepareImagePart(imageData: string): any {
    // Remove data URL prefix if present
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');

    return {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Data,
      },
    };
  }

  /**
   * Parse themed analysis response with photo quality and theme data
   */
  private parseThemedAnalysisResponse(text: string, theme: AnalysisTheme): PhotoAnalysisResult {
    console.log('[LLMService] Parsing themed analysis response:', text);

    try {
      // Try to parse as JSON first
      const jsonMatch = text.match(/\{[\s\S]*\}/s);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        const photoQuality: PhotoQualityMetrics = parsed.photoQuality || {
          overall: 75,
          focus: 75,
          lighting: 75,
          composition: 75,
          factors: ['Standard quality'],
        };

        const qualityBonus = LLMPromptFactory.calculateQualityBonus(photoQuality, theme);

        return {
          detected: parsed.detected || false,
          confidence: parsed.confidence || 50,
          reasoning: parsed.reasoning || 'Analysis complete',
          photoQuality,
          qualityBonus,
          themeId: theme.id,
          themeElements: parsed.themeElements || {
            found: [],
            missing: theme.targetElements,
            bonus: [],
          },
          visualElements: parsed.visualElements || [],
          story: parsed.story || [],
          // Legacy compatibility
          isCarpet: theme.id === 'carpet' ? parsed.detected : undefined,
        };
      }

      // Fallback parsing for non-JSON responses
      return this.createFallbackAnalysisResult(text, theme);
    } catch (error) {
      console.warn('[LLMService] Failed to parse themed response, using fallback');
      return this.createFallbackAnalysisResult(text, theme);
    }
  }

  /**
   * Parse photo quality assessment response
   */
  private parseQualityResponse(text: string): PhotoQualityMetrics {
    console.log('[LLMService] Parsing quality response:', text);

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/s);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          overall: parsed.overall || 75,
          focus: parsed.focus || 75,
          lighting: parsed.lighting || 75,
          composition: parsed.composition || 75,
          factors: parsed.factors || ['Standard quality'],
        };
      }
    } catch (error) {
      console.warn('[LLMService] Failed to parse quality response');
    }

    // Fallback
    return {
      overall: 75,
      focus: 75,
      lighting: 75,
      composition: 75,
      factors: ['Analysis complete'],
    };
  }

  /**
   * Create fallback analysis result when parsing fails
   */
  private createFallbackAnalysisResult(text: string, theme: AnalysisTheme): PhotoAnalysisResult {
    const detected = theme.targetElements.some(element => new RegExp(element, 'i').test(text));

    const photoQuality: PhotoQualityMetrics = {
      overall: 75,
      focus: 75,
      lighting: 75,
      composition: 75,
      factors: ['Standard quality (fallback)'],
    };

    return {
      detected,
      confidence: detected ? 60 : 40,
      reasoning: 'Fallback analysis',
      photoQuality,
      qualityBonus: LLMPromptFactory.calculateQualityBonus(photoQuality, theme),
      themeId: theme.id,
      themeElements: {
        found: detected ? [theme.targetElements[0]] : [],
        missing: detected ? [] : theme.targetElements,
        bonus: [],
      },
      visualElements: [],
      story: [],
      isCarpet: theme.id === 'carpet' ? detected : undefined,
    };
  }

  /**
   * Create failed analysis result for errors
   */
  private createFailedAnalysisResult(
    theme: AnalysisTheme,
    errorMessage: string
  ): PhotoAnalysisResult {
    return {
      detected: false,
      confidence: 0,
      reasoning: `Analysis failed: ${errorMessage}`,
      photoQuality: {
        overall: 0,
        focus: 0,
        lighting: 0,
        composition: 0,
        factors: ['Analysis failed'],
      },
      qualityBonus: 0,
      themeId: theme.id,
      themeElements: {
        found: [],
        missing: theme.targetElements,
        bonus: [],
      },
      visualElements: [],
      story: [],
      isCarpet: theme.id === 'carpet' ? false : undefined,
    };
  }

  private parseCarpetResponse(text: string): CarpetDetectionResult {
    console.log('[LLMService] Parsing response:', text);

    try {
      // Try to parse as JSON first
      const jsonMatch = text.match(/\{[^}]*\}/s);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          isCarpet: parsed.isCarpet,
          confidence: parsed.confidence || 75,
          reasoning: parsed.isCarpet ? 'Carpet detected' : 'No carpet found',
          visualElements: [],
          photoQuality: parsed.photoQuality || 75, // Default to 75 if not provided
        };
      }

      // Simple fallback parsing
      const isCarpet = /carpet|rug|floor/i.test(text) && !/no carpet|not.*carpet/i.test(text);
      const confidence = isCarpet ? 75 : 25;

      return {
        isCarpet,
        confidence,
        reasoning: isCarpet ? 'Carpet detected' : 'No carpet found',
        visualElements: [],
        photoQuality: 75, // Default fallback value
      };
    } catch (error) {
      console.warn('[LLMService] Failed to parse response, using fallback');

      return {
        isCarpet: /carpet|rug|floor/i.test(text),
        confidence: 50,
        reasoning: 'Analysis complete',
        visualElements: [],
        photoQuality: 50, // Lower default for failed parsing
      };
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // ===== DEBUG/TESTING METHODS =====

  getStats() {
    return {
      requestCount: this._requestCount(),
      cacheSize: this._cache.size,
      isProcessing: this._isProcessing(),
    };
  }

  clearCache() {
    this._cache.clear();
    console.log('[LLMService] Cache cleared');
  }

  /**
   * ✅ New method to test optimization without LLM call
   */
  async testImageOptimization(imageData: string): Promise<{
    original: { width: number; height: number; size: number };
    optimized: { width: number; height: number; size: number };
    savings: { sizeReduction: string; estimatedCostSaving: string };
  }> {
    const optimized = await this.optimizeImageForAnalysis(imageData);

    // Calculate approximate sizes
    const originalSize = imageData.length;
    const optimizedSize = optimized.length;
    const sizeReduction = Math.round((1 - optimizedSize / originalSize) * 100);

    // Estimate token/cost savings (rough approximation)
    const estimatedCostSaving = Math.round(sizeReduction * 0.85); // Images scale roughly linearly with size

    return {
      original: { width: 0, height: 0, size: originalSize }, // Can't get dimensions from data URL easily
      optimized: { width: 512, height: 384, size: optimizedSize },
      savings: {
        sizeReduction: `${sizeReduction}%`,
        estimatedCostSaving: `~${estimatedCostSaving}%`,
      },
    };
  }
}
