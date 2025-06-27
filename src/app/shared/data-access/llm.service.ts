import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMResponse, CarpetDetectionResult, LLMRequest, LLMStreamResponse, LLMStreamChunk } from '../utils/llm-types';

@Injectable({
  providedIn: 'root'
})
export class LLMService {
  private readonly _genAI = new GoogleGenerativeAI(environment.llm.gemini);
  private readonly _model = this._genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  // Simple cache for testing
  private readonly _cache = new Map<string, any>();

  // Basic state tracking
  private readonly _isProcessing = signal(false);
  private readonly _requestCount = signal(0);

  readonly isProcessing = this._isProcessing.asReadonly();
  readonly requestCount = this._requestCount.asReadonly();

  /**
   * Test method - simple text prompt
   */
  async testConnection(prompt: string = "Hello, are you working?"): Promise<LLMResponse<string>> {
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
        cached: false
      };

    } catch (error: any) {
      console.error('[LLMService] ❌ Connection test failed:', error);

      return {
        success: false,
        data: '',
        error: error?.message || 'Connection failed',
        cached: false
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

    if (this._cache.has(cacheKey)) {
      console.log('[LLMService] ✅ Cache hit for carpet detection');
      return {
        success: true,
        data: this._cache.get(cacheKey),
        cached: true
      };
    }

    this._isProcessing.set(true);

    try {
      const prompt = this.buildCarpetPrompt();
      const imagePart = this.prepareImagePart(optimizedImage);

      const result = await this._model.generateContent([prompt, imagePart]);
      const responseText = result.response.text();

      console.log('[LLMService] Raw response:', responseText);

      // Parse response
      const carpetResult = this.parseCarpetResponse(responseText);

      // Cache result
      this._cache.set(cacheKey, carpetResult);
      this._requestCount.update(count => count + 1);

      console.log('[LLMService] ✅ Carpet detection complete:', carpetResult);

      return {
        success: true,
        data: carpetResult,
        cached: false
      };

    } catch (error: any) {
      console.error('[LLMService] ❌ Carpet detection failed:', error);

      return {
        success: false,
        data: {
          isCarpet: false,
          confidence: 0,
          reasoning: `Analysis failed: ${error?.message}`,
          visualElements: []
        },
        error: error?.message || 'Detection failed',
        cached: false
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
      
      console.log(`[LLMService] Carpet detection result: ${isCarpet} (confidence: ${result.data.confidence}%)`);
      
      return isCarpet;
    } catch (error) {
      console.error('[LLMService] Error in isCarpet:', error);
      return false;
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
        cached: true
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
        cached: false
      };

    } catch (error: any) {
      console.error('[LLMService] ❌ Streaming carpet detection failed:', error);
      this._isProcessing.set(false);

      return {
        success: false,
        stream: this.createErrorStream(error?.message || 'Streaming detection failed'),
        error: error?.message || 'Streaming detection failed',
        cached: false
      };
    }
  }

  /**
   * Process streaming response for carpet detection
   */
  private async* processInternalStream(streamResult: any, cacheKey: string): AsyncGenerator<LLMStreamChunk> {
    let chunkIndex = 0;
    let fullText = '';

    try {
      for await (const chunk of streamResult.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        
        yield {
          text: chunkText,
          isComplete: false,
          chunkIndex: chunkIndex++
        };
      }

      // Final chunk with complete response
      yield {
        text: '',
        isComplete: true,
        chunkIndex: chunkIndex
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
        chunkIndex: chunkIndex
      };
    } finally {
      this._isProcessing.set(false);
    }
  }

  private async processInternalStreamWrapper(streamResult: any, cacheKey: string): Promise<AsyncIterable<LLMStreamChunk>> {
    return this.processInternalStream(streamResult, cacheKey);
  }

  private async processCarpetStream(streamResult: any, cacheKey: string): Promise<AsyncIterable<LLMStreamChunk>> {
    return this.processInternalStreamWrapper(streamResult, cacheKey);
  }

  /**
   * Create a stream from cached result
   */
  private async* createCachedStream(cachedResult: CarpetDetectionResult): AsyncGenerator<LLMStreamChunk> {
    const reasoningText = `Is Carpet: ${cachedResult.isCarpet ? 'Yes' : 'No'}\nConfidence: ${cachedResult.confidence}%\nReasoning: ${cachedResult.reasoning}`;
    
    yield {
      text: reasoningText,
      isComplete: true,
      chunkIndex: 0
    };
  }

  /**
   * Create an error stream
   */
  private async* createErrorStream(errorMessage: string): AsyncGenerator<LLMStreamChunk> {
    yield {
      text: `Error: ${errorMessage}`,
      isComplete: true,
      chunkIndex: 0
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
        cached: false
      };

    } catch (error: any) {
      console.error('[LLMService] ❌ Request failed:', error);

      return {
        success: false,
        data: null,
        error: error?.message || 'Request failed',
        cached: false
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
        console.log(`[LLMService] Size reduction: ~${Math.round((1 - optimizedDataUrl.length / imageData.length) * 100)}%`);

        resolve(optimizedDataUrl);
      };

      img.onerror = () => {
        console.error('[LLMService] Failed to load image for optimization');
        reject(new Error('Image optimization failed'));
      };

      img.src = imageData;
    });
  }

  private buildCarpetPrompt(): string {
    return `
      Analyze this image and determine if it shows a carpet or floor covering that might be found in a pub or restaurant.

      Look for:
      - Carpet patterns, textures, and colors
      - Commercial-grade flooring
      - Context clues that suggest a pub environment

      Be specific about what you see and provide your confidence level.

      Respond in this format:
      Is Carpet: [Yes/No]
      Confidence: [0-100]%
      Reasoning: [Brief explanation of what you see]
      Visual Elements: [List key visual features you notice]
    `;
  }

  private prepareImagePart(imageData: string): any {
    // Remove data URL prefix if present
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');

    return {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Data
      }
    };
  }

  private parseCarpetResponse(text: string): CarpetDetectionResult {
    console.log('[LLMService] Parsing response:', text);

    try {
      // Try to extract structured data from the response
      const isCarpetMatch = text.match(/Is Carpet:\s*(Yes|No)/i);
      const confidenceMatch = text.match(/Confidence:\s*(\d+)/i);
      const reasoningMatch = text.match(/Reasoning:\s*(.+?)(?=Visual Elements:|$)/i);
      const elementsMatch = text.match(/Visual Elements:\s*(.+?)$/i);

      const isCarpet = isCarpetMatch ? isCarpetMatch[1].toLowerCase() === 'yes' :
                      /carpet|rug|floor/i.test(text) && !/no carpet|not.*carpet/i.test(text);

      const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) :
                        (isCarpet ? 75 : 25);

      const reasoning = reasoningMatch ? reasoningMatch[1].trim() :
                       text.slice(0, 200) + '...';

      const visualElements = elementsMatch ?
                            elementsMatch[1].split(',').map(s => s.trim()) :
                            [];

      return {
        isCarpet,
        confidence,
        reasoning,
        visualElements
      };

    } catch (error) {
      console.warn('[LLMService] Failed to parse structured response, using fallback');

      return {
        isCarpet: /carpet|rug|floor/i.test(text),
        confidence: 50,
        reasoning: text.slice(0, 200),
        visualElements: []
      };
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // ===== DEBUG/TESTING METHODS =====

  getStats() {
    return {
      requestCount: this._requestCount(),
      cacheSize: this._cache.size,
      isProcessing: this._isProcessing()
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
        estimatedCostSaving: `~${estimatedCostSaving}%`
      }
    };
  }
}
