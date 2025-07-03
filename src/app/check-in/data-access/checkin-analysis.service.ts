import { Injectable, signal, inject } from '@angular/core';
import { LLMService } from '@shared/data-access/llm.service';
import type { CarpetDetectionResult } from '@shared/utils/llm-types';

/**
 * Manages carpet analysis and LLM interactions
 * 
 * SCOPE:
 * - Analysis message cycling during LLM processing (user feedback)
 * - LLMService integration for carpet detection and validation
 * - Analysis result processing and error handling
 * - Analysis status updates and progress indication for UI
 * - LLM response interpretation and validation
 * 
 * DOES NOT HANDLE:
 * - Photo capture or camera management (handled by CameraService)
 * - Photo quality metrics or gate validation (handled by CheckinPhotoValidationService)
 * - Check-in flow state or phase management (handled by CheckinFlowService)
 * - Business logic like points calculation (handled by CheckInStore)
 */
@Injectable({
  providedIn: 'root'
})
export class CheckinAnalysisService {
  private readonly llmService = inject(LLMService);

  // Analysis state
  private readonly _isAnalyzing = signal(false);
  private readonly _currentAnalysisMessage = signal('Starting analysis...');
  private readonly _lastAnalysisResult = signal<CarpetDetectionResult | null>(null);

  // Readonly signals for external consumption
  readonly isAnalyzing = this._isAnalyzing.asReadonly();
  readonly currentAnalysisMessage = this._currentAnalysisMessage.asReadonly();
  readonly lastAnalysisResult = this._lastAnalysisResult.asReadonly();

  // Message cycling for user feedback
  private readonly analysisMessages = [
    'Analyzing sharpness...',
    'Checking contrast levels...',
    'Evaluating edge density...',
    'Measuring texture complexity...',
    'Examining pattern repetition...',
    'Assessing color variance...',
    'Detecting carpet features...'
  ];

  private analysisMessageInterval: number | null = null;

  /**
   * Analyze captured photo for carpet detection using LLM
   * 
   * @param photoBlob Captured photo as blob
   * @param pubName Name of pub for context
   * @returns Promise resolving to analysis result
   */
  async analyzeCarpetPhoto(photoBlob: Blob, pubName: string): Promise<CarpetDetectionResult> {
    console.log('[AnalysisService] 🤖 === STARTING LLM ANALYSIS ===');
    console.log('[AnalysisService] 🤖 Pub:', pubName);
    console.log('[AnalysisService] 🤖 Photo size:', photoBlob.size, 'bytes');

    if (this._isAnalyzing()) {
      throw new Error('Analysis already in progress');
    }

    this._isAnalyzing.set(true);
    this._startAnalysisMessageCycling();

    try {
      // Call LLM service for carpet detection
      const result = await this.llmService.detectCarpet(photoBlob);
      
      console.log('[AnalysisService] 🤖 === LLM ANALYSIS COMPLETE ===');
      console.log('[AnalysisService] 🤖 Result:', result);

      // Store result for debugging/retry purposes
      this._lastAnalysisResult.set(result);

      // Validate result structure
      if (!this._isValidAnalysisResult(result)) {
        throw new Error('Invalid analysis result structure from LLM');
      }

      console.log('[AnalysisService] 🤖 Analysis result validated successfully');
      
      return result;

    } catch (error: any) {
      console.error('[AnalysisService] ❌ LLM analysis failed:', error);
      
      // Store error result for debugging
      this._lastAnalysisResult.set(null);
      
      throw new Error(`Carpet analysis failed: ${error?.message || 'Unknown error'}`);
      
    } finally {
      this._stopAnalysisMessageCycling();
      this._isAnalyzing.set(false);
    }
  }

  /**
   * Get human-readable identification of what LLM detected
   * Extracts meaningful description from LLM reasoning
   * 
   * @param llmResult LLM analysis result
   * @returns Human-readable description of detected surface
   */
  getLLMIdentification(llmResult: CarpetDetectionResult): string {
    console.log('[AnalysisService] 🔍 Extracting LLM identification');
    
    // Extract what LLM thinks it saw from the reasoning
    if (!llmResult?.reasoning) {
      return 'unknown surface';
    }

    const reasoning = llmResult.reasoning.toLowerCase();
    console.log('[AnalysisService] 🔍 Analyzing reasoning:', reasoning.substring(0, 100) + '...');

    // Common patterns the LLM might identify
    if (reasoning.includes('floor') || reasoning.includes('hardwood') || reasoning.includes('tile')) {
      return 'floor surface';
    }
    if (reasoning.includes('wall') || reasoning.includes('brick') || reasoning.includes('concrete')) {
      return 'wall surface';
    }
    if (reasoning.includes('table') || reasoning.includes('desk') || reasoning.includes('furniture')) {
      return 'furniture';
    }
    if (reasoning.includes('ground') || reasoning.includes('pavement') || reasoning.includes('asphalt')) {
      return 'ground surface';
    }
    if (reasoning.includes('carpet') || reasoning.includes('rug') || reasoning.includes('textile')) {
      return 'carpet/rug';
    }

    // Fallback: use first few words of reasoning
    const firstSentence = llmResult.reasoning.split('.')[0] || llmResult.reasoning;
    const identification = firstSentence.substring(0, 30) + (firstSentence.length > 30 ? '...' : '');
    
    console.log('[AnalysisService] 🔍 Extracted identification:', identification);
    
    return identification;
  }

  /**
   * Check if analysis result indicates a positive carpet detection
   * 
   * @param result LLM analysis result
   * @returns true if carpet was detected
   */
  isCarpetDetected(result: CarpetDetectionResult): boolean {
    // Check confidence threshold and carpet-specific indicators
    const detected = result.confidence >= 0.7 && result.isCarpet === true;
    
    console.log('[AnalysisService] 🎯 Carpet detection check:', {
      confidence: result.confidence,
      isCarpet: result.isCarpet,
      detected
    });

    return detected;
  }

  /**
   * Get analysis progress for UI display
   * 
   * @returns Current analysis state information
   */
  getAnalysisStatus(): {
    isAnalyzing: boolean;
    currentMessage: string;
    hasResult: boolean;
    lastResult: CarpetDetectionResult | null;
  } {
    return {
      isAnalyzing: this._isAnalyzing(),
      currentMessage: this._currentAnalysisMessage(),
      hasResult: this._lastAnalysisResult() !== null,
      lastResult: this._lastAnalysisResult()
    };
  }

  /**
   * Cancel ongoing analysis (if possible)
   * Note: LLM requests may not be cancellable once started
   */
  cancelAnalysis(): void {
    console.log('[AnalysisService] 🛑 Cancelling analysis');
    
    this._stopAnalysisMessageCycling();
    this._isAnalyzing.set(false);
    this._currentAnalysisMessage.set('Analysis cancelled');
    
    // Note: We can't actually cancel the LLM request once it's sent
    // but we can stop the UI feedback
  }

  /**
   * Reset analysis state for new attempt
   */
  reset(): void {
    console.log('[AnalysisService] 🔄 Resetting analysis state');
    
    this.cancelAnalysis();
    this._lastAnalysisResult.set(null);
    this._currentAnalysisMessage.set('Starting analysis...');
  }

  /**
   * Clean up analysis service state and stop any ongoing processes
   */
  cleanup(): void {
    console.log('[AnalysisService] 🧹 Cleaning up analysis service');
    
    this.cancelAnalysis();
    this.reset();
    
    console.log('[AnalysisService] ✅ Analysis service cleanup completed');
  }

  // ==========================================
  // PRIVATE METHODS
  // ==========================================

  /**
   * Start cycling through analysis messages to provide user feedback
   */
  private _startAnalysisMessageCycling(): void {
    console.log('[AnalysisService] 🔄 Starting analysis message cycling');
    
    let messageIndex = 0;
    this._currentAnalysisMessage.set(this.analysisMessages[messageIndex]);

    this.analysisMessageInterval = window.setInterval(() => {
      messageIndex = (messageIndex + 1) % this.analysisMessages.length;
      this._currentAnalysisMessage.set(this.analysisMessages[messageIndex]);
      console.log('[AnalysisService] 💬 Analysis message:', this.analysisMessages[messageIndex]);
    }, 800);
  }

  /**
   * Stop cycling analysis messages
   */
  private _stopAnalysisMessageCycling(): void {
    if (this.analysisMessageInterval) {
      clearInterval(this.analysisMessageInterval);
      this.analysisMessageInterval = null;
      console.log('[AnalysisService] 🔄 Analysis message cycling stopped');
    }
  }

  /**
   * Validate that LLM result has expected structure
   * 
   * @param result Result from LLM service
   * @returns true if result is valid
   */
  private _isValidAnalysisResult(result: any): result is CarpetDetectionResult {
    const isValid = result && 
                   typeof result.confidence === 'number' && 
                   typeof result.isCarpet === 'boolean' &&
                   typeof result.reasoning === 'string' &&
                   result.confidence >= 0 && 
                   result.confidence <= 1;

    if (!isValid) {
      console.error('[AnalysisService] ❌ Invalid result structure:', result);
    }

    return isValid;
  }
}