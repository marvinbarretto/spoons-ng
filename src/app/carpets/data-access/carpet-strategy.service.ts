// src/app/carpets/data-access/carpet-strategy.service.ts
import { Injectable, inject } from '@angular/core';
import { CarpetStorageService } from './carpet-storage.service';
import { PubService } from '@pubs/data-access/pub.service';
import { LLMService } from '@shared/data-access/llm.service';

type CarpetProcessResult = {
  localStored: boolean;
  llmConfirmed: boolean;
  firestoreUploaded: boolean;
  localKey?: string;
  firestoreUrl?: string;
  error?: string;
};

type CarpetVersions = {
  local: Blob;      // 600x600 AVIF for UI backgrounds
  llm: Blob;        // 300x300 JPEG for analysis
  firestore: Blob;  // 600x600 AVIF for ML training
};

@Injectable({ providedIn: 'root' })
export class CarpetStrategyService {
  private readonly _carpetStorage = inject(CarpetStorageService);
  private readonly _pubService = inject(PubService);
  private readonly _llmService = inject(LLMService);

  /**
   * 🎯 Main carpet processing workflow
   * Implements comprehensive carpet saving strategy with offline-first approach
   */
  async processCarpetCapture(
    fullResCanvas: HTMLCanvasElement,
    pubId: string,
    pubName: string
  ): Promise<CarpetProcessResult> {
    console.log('[CarpetStrategy] 🎨 Starting carpet workflow for:', pubName);
    console.log('[CarpetStrategy] 📐 Full resolution canvas:', fullResCanvas.width, 'x', fullResCanvas.height);

    try {
      // 1. Create optimized versions from full res
      const versions = await this.createOptimizedVersions(fullResCanvas, pubId, pubName);
      console.log('[CarpetStrategy] ✅ Created 3 optimized versions');

      // 2. Store local version immediately (offline-first priority)
      const localKey = await this._carpetStorage.storeLocalVersion(versions.local, pubId, pubName);
      console.log('[CarpetStrategy] 💾 Local version stored:', localKey);

      // 3. Send to LLM for analysis
      const llmResult = await this.analyzeCarpetWithLLM(versions.llm);
      console.log('[CarpetStrategy] 🤖 LLM analysis result:', llmResult);

      if (!llmResult.isCarpet) {
        console.log('[CarpetStrategy] ❌ LLM rejected - not a carpet');
        return {
          localStored: true,
          llmConfirmed: false,
          firestoreUploaded: false,
          localKey,
          error: 'LLM analysis: Not a carpet detected'
        };
      }

      // 4. Check if pub already has carpet (avoid duplicate uploads)
      const pub = await this._pubService.getPubById(pubId).pipe().toPromise();
      const needsFirestoreUpload = !pub?.hasCarpet;

      if (!needsFirestoreUpload) {
        console.log('[CarpetStrategy] ✅ Pub already has carpet - local storage only');
        return {
          localStored: true,
          llmConfirmed: true,
          firestoreUploaded: false,
          localKey
        };
      }

      // 5. Upload to Firestore (async - don't block check-in)
      try {
        const firestoreUrl = await this.uploadToFirestore(versions.firestore, pubId);
        console.log('[CarpetStrategy] ☁️ Firestore upload complete:', firestoreUrl);

        // 6. Update pub document
        await this._pubService.updatePubHasCarpet(pubId, true);
        console.log('[CarpetStrategy] ✅ Pub marked as having carpet');

        return {
          localStored: true,
          llmConfirmed: true,
          firestoreUploaded: true,
          localKey,
          firestoreUrl
        };
      } catch (firestoreError) {
        console.error('[CarpetStrategy] ⚠️ Firestore upload failed (continuing with local-only):', firestoreError);
        
        // Check-in continues with local-only storage
        return {
          localStored: true,
          llmConfirmed: true,
          firestoreUploaded: false,
          localKey,
          error: `Firestore upload failed: ${firestoreError}`
        };
      }

    } catch (error) {
      console.error('[CarpetStrategy] ❌ Error in carpet workflow:', error);
      return {
        localStored: false,
        llmConfirmed: false,
        firestoreUploaded: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      // 7. Clean up full resolution canvas
      this.cleanupCanvas(fullResCanvas);
    }
  }

  /**
   * 🎨 Create 3 optimized versions from full resolution
   * Following the strategy: Local UI (600x600), LLM analysis (300x300), Firestore ML (600x600)
   */
  private async createOptimizedVersions(
    fullResCanvas: HTMLCanvasElement,
    pubId: string,
    pubName: string
  ): Promise<CarpetVersions> {
    console.log('[CarpetStrategy] 🎨 Creating optimized versions...');

    // Local version: 600x600 AVIF/WebP for UI backgrounds
    const localCanvas = this.resizeCanvas(fullResCanvas, 600, 600);
    const localBlob = await this.canvasToBlob(localCanvas, 'avif', 0.8);
    
    // LLM version: 300x300 JPEG for analysis (cost efficiency)
    const llmCanvas = this.resizeCanvas(fullResCanvas, 300, 300);
    const llmBlob = await this.canvasToBlob(llmCanvas, 'jpeg', 0.6);
    
    // Firestore version: 600x600 AVIF/WebP for ML training
    const firestoreCanvas = this.resizeCanvas(fullResCanvas, 600, 600);
    const firestoreBlob = await this.canvasToBlob(firestoreCanvas, 'avif', 0.8);

    console.log('[CarpetStrategy] 📊 Version sizes:');
    console.log('  Local:', (localBlob.size / 1024).toFixed(1) + 'KB');
    console.log('  LLM:', (llmBlob.size / 1024).toFixed(1) + 'KB');
    console.log('  Firestore:', (firestoreBlob.size / 1024).toFixed(1) + 'KB');

    // Cleanup intermediate canvases
    localCanvas.remove();
    llmCanvas.remove();
    firestoreCanvas.remove();

    return {
      local: localBlob,
      llm: llmBlob,
      firestore: firestoreBlob
    };
  }

  /**
   * 🔄 Resize canvas to target dimensions (square crop from center)
   */
  private resizeCanvas(sourceCanvas: HTMLCanvasElement, width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d')!;
    
    // Calculate center crop from source
    const sourceSize = Math.min(sourceCanvas.width, sourceCanvas.height);
    const sourceX = (sourceCanvas.width - sourceSize) / 2;
    const sourceY = (sourceCanvas.height - sourceSize) / 2;
    
    // Draw with smooth scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      sourceCanvas,
      sourceX, sourceY, sourceSize, sourceSize,  // Source crop
      0, 0, width, height                        // Destination
    );
    
    return canvas;
  }

  /**
   * 🗜️ Convert canvas to optimized blob with format fallback
   */
  private async canvasToBlob(
    canvas: HTMLCanvasElement,
    format: 'avif' | 'webp' | 'jpeg',
    quality: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const mimeType = `image/${format}`;
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // Fallback to JPEG if format unsupported
            console.log(`[CarpetStrategy] ${format} unsupported, falling back to JPEG`);
            canvas.toBlob(
              (fallbackBlob) => fallbackBlob ? resolve(fallbackBlob) : reject(new Error('Failed to create blob')),
              'image/jpeg',
              quality
            );
          }
        },
        mimeType,
        quality
      );
    });
  }

  /**
   * 🤖 Analyze carpet with LLM using strategy-optimized method
   */
  private async analyzeCarpetWithLLM(llmBlob: Blob): Promise<{ isCarpet: boolean; confidence: number }> {
    console.log('[CarpetStrategy] 🤖 Starting LLM analysis...');
    
    try {
      // Convert blob to data URL for LLM service
      const dataUrl = await this.blobToDataUrl(llmBlob);
      
      // Use strategy-optimized LLM method
      const result = await this._llmService.analyzeCarpet(dataUrl);
      
      console.log('[CarpetStrategy] 🤖 LLM analysis result:', result);
      return result;
      
    } catch (error) {
      console.error('[CarpetStrategy] LLM analysis error:', error);
      return { isCarpet: false, confidence: 0 };
    }
  }

  /**
   * 🔄 Convert blob to data URL for LLM analysis
   */
  private async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to convert blob to data URL'));
      reader.readAsDataURL(blob);
    });
  }

  /**
   * ☁️ Upload to Firebase Storage (stub implementation)
   * TODO: Implement actual Firebase Storage integration
   */
  private async uploadToFirestore(blob: Blob, pubId: string): Promise<string> {
    console.log('[CarpetStrategy] ☁️ Uploading to Firebase Storage...');
    
    try {
      // Check for existing carpet and log if overwriting
      const existingCheck = await this.checkForExistingCarpet(pubId);
      if (existingCheck.exists) {
        console.log('[CarpetStrategy] ⚠️ OVERWRITING existing carpet for pub:', pubId);
        console.log('[CarpetStrategy] ⚠️ Previous carpet URL:', existingCheck.url);
      }

      // Generate filename with timestamp
      const timestamp = Date.now();
      const extension = this.getBlobExtension(blob);
      const filename = `carpets/${pubId}_${timestamp}.${extension}`;
      
      // TODO: Implement Firebase Storage upload
      const uploadUrl = await this.uploadBlobToStorage(blob, filename);
      
      console.log('[CarpetStrategy] ✅ Upload complete:', uploadUrl);
      return uploadUrl;
      
    } catch (error) {
      console.error('[CarpetStrategy] ❌ Firestore upload failed:', error);
      throw error;
    }
  }

  /**
   * 🔍 Check for existing carpet in Firestore (stub)
   * TODO: Query Firebase Storage or Firestore carpets collection
   */
  private async checkForExistingCarpet(pubId: string): Promise<{ exists: boolean; url?: string }> {
    console.log('[CarpetStrategy] 🔍 Checking for existing carpet:', pubId);
    
    // TODO: Implement actual check
    // - Query Firebase Storage for existing carpet files
    // - Or query Firestore carpets collection
    
    return { exists: false };
  }

  /**
   * ☁️ Upload blob to Firebase Storage (stub implementation)
   * TODO: Replace with actual Firebase Storage upload
   */
  private async uploadBlobToStorage(blob: Blob, filename: string): Promise<string> {
    console.log('[CarpetStrategy] 📤 [STUB] Uploading blob:', filename, (blob.size / 1024).toFixed(1) + 'KB');
    
    // TODO: Implement actual Firebase Storage upload
    // import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
    // const storage = getStorage();
    // const storageRef = ref(storage, filename);
    // const snapshot = await uploadBytes(storageRef, blob);
    // return await getDownloadURL(snapshot.ref);
    
    // Return mock URL for now
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate upload delay
    return `https://firebasestorage.googleapis.com/v0/b/spoons-development/o/${encodeURIComponent(filename)}?alt=media&token=mock-token`;
  }

  /**
   * 🗂️ Get file extension from blob type
   */
  private getBlobExtension(blob: Blob): string {
    switch (blob.type) {
      case 'image/avif': return 'avif';
      case 'image/webp': return 'webp';
      case 'image/jpeg': return 'jpg';
      default: return 'jpg';
    }
  }

  /**
   * 🧹 Clean up canvas from memory
   */
  private cleanupCanvas(canvas: HTMLCanvasElement): void {
    console.log('[CarpetStrategy] 🧹 Cleaning up full resolution canvas');
    
    // Clear canvas content
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Remove from DOM if attached
    if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
    
    // Force garbage collection hint
    canvas.width = 0;
    canvas.height = 0;
  }

  /**
   * 📊 Get strategy statistics (debug/monitoring)
   */
  getStrategyStats(): {
    version: string;
    supportedFormats: string[];
    defaultQuality: Record<string, number>;
  } {
    return {
      version: '1.0.0',
      supportedFormats: ['avif', 'webp', 'jpeg'],
      defaultQuality: {
        local: 0.8,
        llm: 0.6,
        firestore: 0.8
      }
    };
  }
}