// src/app/carpets/feature/reference-capture/reference-capture.component.ts
import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '@shared/data-access/base.component';
import { ReferenceImageAnalyzer } from '../../data-access/reference-image-analyzer.service';

@Component({
  selector: 'app-reference-capture',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="reference-capture">

      <header class="header">
        <h1>📸 Carpet Reference Capture</h1>
        <p>Analyze carpet images to create recognition references</p>
      </header>

      <!-- Upload Section -->
      <div class="upload-section">
        <h2>Add Reference Image</h2>

        <div class="upload-methods">

          <!-- File Upload -->
          <div class="upload-method">
            <label class="file-upload">
              <input
                type="file"
                accept="image/*"
                (change)="onFileSelected($event)"
                #fileInput>
              <span class="upload-button">
                📁 Choose Image File
              </span>
            </label>
          </div>

          <!-- URL Input -->
          <div class="upload-method">
            <input
              type="url"
              placeholder="Or paste image URL..."
              [ngModel]="imageUrl()"
              (ngModelChange)="setImageUrl($event)"
              class="url-input">
            <button
              (click)="analyzeFromUrl()"
              [disabled]="!imageUrl() || analyzer.isAnalyzing()"
              class="analyze-btn">
              🔗 Analyze URL
            </button>
          </div>
        </div>

        <!-- Name Input -->
        @if (pendingImage()) {
          <div class="name-input">
            <input
              type="text"
              placeholder="Reference name (e.g., 'Red Lion Carpet')"
              [ngModel]="referenceName()"
              (ngModelChange)="setReferenceName($event)"
              class="name-field">
            <button
              (click)="processImage()"
              [disabled]="!referenceName() || analyzer.isAnalyzing()"
              class="process-btn">
              ✅ Create Reference
            </button>
          </div>
        }

        @if (analyzer.isAnalyzing()) {
          <div class="analyzing">
            <div class="spinner"></div>
            <span>Analyzing image...</span>
          </div>
        }
      </div>

      <!-- Preview -->
      @if (pendingImage()) {
        <div class="preview-section">
          <h3>Preview</h3>
          <img [src]="pendingImage()" class="preview-image" alt="Preview">
        </div>
      }

      <!-- Results -->
      @if (analyzer.analyzedReferences().length > 0) {
        <div class="results-section">
          <h2>Generated References ({{ analyzer.analyzedReferences().length }})</h2>

          @for (reference of analyzer.analyzedReferences(); track reference.id) {
            <div class="reference-card">

              <div class="reference-header">
                <h3>{{ reference.name }}</h3>
                <div class="reference-id">ID: {{ reference.id }}</div>
              </div>

              <div class="reference-data">

                <!-- Color Profile -->
                <div class="data-section">
                  <h4>🎨 Colors</h4>
                  <div class="color-swatches">
                    @for (color of reference.colorProfile.dominant; track color) {
                      <div
                        class="color-swatch"
                        [style.background-color]="color"
                        [title]="color">
                      </div>
                    }
                  </div>
                  <div class="color-stats">
                    <span>Variance: {{ reference.colorProfile.variance }}</span>
                    <span>Brightness: {{ reference.colorProfile.brightness }}</span>
                    <span>Pattern: {{ reference.colorProfile.pattern }}</span>
                  </div>
                </div>

                <!-- Texture -->
                <div class="data-section">
                  <h4>🏗️ Texture</h4>
                  <div class="texture-stats">
                    <div>Contrast: {{ (reference.textureProfile.contrast * 100).toFixed(1) }}%</div>
                    <div>Edge Density: {{ reference.textureProfile.edgeDensity.toFixed(1) }}</div>
                    <div>Repetition: {{ (reference.textureProfile.repetitionScore * 100).toFixed(1) }}%</div>
                    <div>Type: {{ reference.textureProfile.patternType }}</div>
                  </div>
                </div>

                <!-- Geometry -->
                <div class="data-section">
                  <h4>📐 Geometry</h4>
                  <div class="geometry-features">
                    <span class="feature" [class.active]="reference.geometricFeatures.hasSquares">
                      ⬜ Squares
                    </span>
                    <span class="feature" [class.active]="reference.geometricFeatures.hasCircles">
                      ⭕ Circles
                    </span>
                    <span class="feature" [class.active]="reference.geometricFeatures.hasOrnamental">
                      🌿 Ornamental
                    </span>
                  </div>
                  <div>Shape: {{ reference.geometricFeatures.dominantShape }}</div>
                </div>
              </div>

              <!-- Actions -->
              <div class="reference-actions">
                <button (click)="copyTypeScript(reference)" class="copy-btn">
                  📋 Copy TypeScript Code
                </button>
                <button (click)="viewRawImage(reference)" class="view-btn">
                  🖼️ View Image
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Export Section -->
      @if (analyzer.analyzedReferences().length > 0) {
        <div class="export-section">
          <h2>Export</h2>
          <div class="export-buttons">
            <button (click)="exportJson()" class="export-btn">
              📄 Export JSON
            </button>
            <button (click)="exportTypeScript()" class="export-btn">
              📜 Export TypeScript
            </button>
            <button (click)="clearAll()" class="clear-btn">
              🗑️ Clear All
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .reference-capture {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
    }

    .header h1 {
      margin: 0 0 10px 0;
      color: #333;
    }

    .upload-section {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 20px;
    }

    .upload-methods {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
    }

    .upload-method {
      flex: 1;
    }

    .file-upload {
      display: block;
      cursor: pointer;
    }

    .file-upload input {
      display: none;
    }

    .upload-button {
      display: block;
      padding: 12px 20px;
      background: #007bff;
      color: white;
      border-radius: 8px;
      text-align: center;
      border: 2px dashed transparent;
      transition: all 0.2s;
    }

    .upload-button:hover {
      background: #0056b3;
      border-color: #007bff;
    }

    .url-input {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      margin-bottom: 10px;
    }

    .analyze-btn, .process-btn {
      width: 100%;
      padding: 12px;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }

    .analyze-btn:disabled, .process-btn:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }

    .name-input {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }

    .name-field {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      margin-bottom: 10px;
      font-size: 16px;
    }

    .analyzing {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 20px;
      padding: 15px;
      background: #e3f2fd;
      border-radius: 8px;
    }

    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #ddd;
      border-top: 2px solid #007bff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .preview-section {
      margin-bottom: 20px;
    }

    .preview-image {
      max-width: 300px;
      max-height: 300px;
      border-radius: 8px;
      border: 1px solid #ddd;
    }

    .results-section {
      margin-bottom: 20px;
    }

    .reference-card {
      background: white;
      border: 1px solid #ddd;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .reference-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #eee;
    }

    .reference-header h3 {
      margin: 0;
      color: #333;
    }

    .reference-id {
      font-family: monospace;
      color: #666;
      font-size: 12px;
    }

    .reference-data {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }

    .data-section h4 {
      margin: 0 0 10px 0;
      color: #555;
    }

    .color-swatches {
      display: flex;
      gap: 5px;
      margin-bottom: 10px;
    }

    .color-swatch {
      width: 30px;
      height: 30px;
      border-radius: 4px;
      border: 1px solid #ddd;
    }

    .color-stats, .texture-stats {
      font-size: 14px;
      color: #666;
    }

    .color-stats span, .texture-stats div {
      display: block;
      margin-bottom: 2px;
    }

    .geometry-features {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
    }

    .feature {
      padding: 4px 8px;
      border-radius: 4px;
      background: #f8f9fa;
      font-size: 12px;
      opacity: 0.5;
    }

    .feature.active {
      background: #d4edda;
      color: #155724;
      opacity: 1;
    }

    .reference-actions {
      display: flex;
      gap: 10px;
    }

    .copy-btn, .view-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }

    .copy-btn {
      background: #6f42c1;
      color: white;
    }

    .view-btn {
      background: #17a2b8;
      color: white;
    }

    .export-section {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 12px;
    }

    .export-buttons {
      display: flex;
      gap: 10px;
    }

    .export-btn {
      padding: 12px 20px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }

    .clear-btn {
      padding: 12px 20px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class ReferenceCaptureComponent extends BaseComponent {

  protected readonly analyzer = inject(ReferenceImageAnalyzer);

  // Local state
  private readonly _imageUrl = signal('');
  private readonly _referenceName = signal('');
  private readonly _pendingImage = signal<string | null>(null);
  private readonly _pendingFile = signal<File | null>(null);

  readonly imageUrl = this._imageUrl.asReadonly();
  readonly referenceName = this._referenceName.asReadonly();
  readonly pendingImage = this._pendingImage.asReadonly();

  // Signal setters for ngModel
  setImageUrl(value: string): void {
    this._imageUrl.set(value);
  }

  setReferenceName(value: string): void {
    this._referenceName.set(value);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      this._pendingFile.set(file);

      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this._pendingImage.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Auto-fill name from filename
      const nameFromFile = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      this._referenceName.set(nameFromFile);
    }
  }

  analyzeFromUrl(): void {
    const url = this._imageUrl();
    if (!url) return;

    this._pendingImage.set(url);

    // Auto-fill name from URL
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];
    const nameFromUrl = filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    this._referenceName.set(nameFromUrl || 'Carpet Reference');
  }

  async processImage(): Promise<void> {
    const name = this._referenceName();
    const file = this._pendingFile();
    const url = this._imageUrl();

    if (!name) return;

    try {
      if (file) {
        await this.analyzer.analyzeImageFile(file, name);
      } else if (url) {
        await this.analyzer.analyzeImageFromUrl(url, name);
      }

      // Clear form
      this.clearForm();

    } catch (error) {
      console.error('Failed to analyze image:', error);
      alert('Failed to analyze image. Please try again.');
    }
  }

  copyTypeScript(reference: any): void {
    const code = this.analyzer.generateTypeScriptCode(reference);
    navigator.clipboard.writeText(code);

    // Show feedback
    alert('TypeScript code copied to clipboard!');
  }

  viewRawImage(reference: any): void {
    if (reference.rawImageData) {
      const newWindow = window.open();
      newWindow?.document.write(`<img src="${reference.rawImageData}" style="max-width: 100%; height: auto;">`);
    }
  }

  exportJson(): void {
    const json = this.analyzer.exportReferencesAsJson();
    this.downloadFile(json, 'carpet-references.json', 'application/json');
  }

  exportTypeScript(): void {
    const references = this.analyzer.analyzedReferences();
    let code = '// Auto-generated carpet reference data\n\n';

    references.forEach(ref => {
      code += this.analyzer.generateTypeScriptCode(ref) + '\n\n';
    });

    code += `// Combined export\nexport const ALL_CARPET_REFERENCES = [\n`;
    references.forEach(ref => {
      const varName = this.toCamelCase(ref.name) + '_REFERENCE';
      code += `  ${varName},\n`;
    });
    code += `];\n`;

    this.downloadFile(code, 'carpet-references.ts', 'text/typescript');
  }

  clearAll(): void {
    if (confirm('Clear all analyzed references?')) {
      this.analyzer.clearReferences();
      this.clearForm();
    }
  }

  private clearForm(): void {
    this._imageUrl.set('');
    this._referenceName.set('');
    this._pendingImage.set(null);
    this._pendingFile.set(null);
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private toCamelCase(str: string): string {
    return str.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
  }
}
