import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { LLMService } from '../../data-access/llm.service';

@Component({
  selector: 'app-llm-test',
  imports: [],
  template: `
    <div class="llm-test">
      <h2>🤖 LLM Service Test</h2>

      <!-- Connection Test -->
      <section class="test-section">
        <h3>Connection Test</h3>
        <button (click)="testConnection()" [disabled]="llmService.isProcessing()">
          @if (llmService.isProcessing()) {
            Testing...
          } @else {
            Test Connection
          }
        </button>

        @if (connectionResult()) {
          <div class="result" [class.success]="connectionResult()!.success">
            @if (connectionResult()!.success) {
              <p>✅ <strong>Success!</strong></p>
              <p>Response: "{{ connectionResult()!.data }}"</p>
            } @else {
              <p>❌ <strong>Failed:</strong> {{ connectionResult()!.error }}</p>
            }
          </div>
        }
      </section>

      <!-- Image Upload Test -->
      <section class="test-section">
        <h3>Carpet Detection Test</h3>

        <input type="file" accept="image/*" (change)="onImageSelected($event)" #fileInput />

        @if (selectedImage()) {
          <div class="image-preview">
            <img [src]="selectedImage()" alt="Selected image" style="max-width: 200px;" />
          </div>

          <button (click)="testCarpetDetection()" [disabled]="llmService.isProcessing()">
            @if (llmService.isProcessing()) {
              Analyzing Image...
            } @else {
              Analyze Carpet
            }
          </button>
        }

        @if (carpetResult()) {
          <div class="result" [class.success]="carpetResult()!.success">
            @if (carpetResult()!.success) {
              <div class="carpet-analysis">
                <h4>Analysis Result:</h4>
                <p>
                  <strong>Is Carpet:</strong> {{ carpetResult()!.data.isCarpet ? 'Yes' : 'No' }}
                </p>
                <p><strong>Confidence:</strong> {{ carpetResult()!.data.confidence }}%</p>
                <p><strong>Reasoning:</strong> {{ carpetResult()!.data.reasoning }}</p>
                @if (carpetResult()!.data.visualElements.length > 0) {
                  <p>
                    <strong>Visual Elements:</strong>
                    {{ carpetResult()!.data.visualElements.join(', ') }}
                  </p>
                }
                <p><strong>Cached:</strong> {{ carpetResult()!.cached ? 'Yes' : 'No' }}</p>
              </div>
            } @else {
              <p>❌ <strong>Failed:</strong> {{ carpetResult()!.error }}</p>
            }
          </div>
        }
      </section>

      <!-- Stats -->
      <section class="test-section">
        <h3>Service Stats</h3>
        <div class="stats">
          <p>Requests Made: {{ llmService.requestCount() }}</p>
          <p>Currently Processing: {{ llmService.isProcessing() ? 'Yes' : 'No' }}</p>
          <button (click)="clearCache()">Clear Cache</button>
        </div>
      </section>
    </div>
  `,
  styles: `
    .llm-test {
      padding: 1rem;
      max-width: 600px;
      margin: 0 auto;
    }

    .test-section {
      margin: 2rem 0;
      padding: 1rem;
      border: 1px solid #ddd;
      border-radius: 0.5rem;
    }

    .test-section h3 {
      margin-top: 0;
      color: #333;
    }

    button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.25rem;
      cursor: pointer;
      margin: 0.5rem 0;
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .result {
      margin: 1rem 0;
      padding: 1rem;
      border-radius: 0.25rem;
      border: 1px solid #ddd;
    }

    .result.success {
      background: #f0f9ff;
      border-color: #0ea5e9;
    }

    .image-preview {
      margin: 1rem 0;
    }

    .carpet-analysis {
      background: #f8fafc;
      padding: 1rem;
      border-radius: 0.25rem;
      margin: 0.5rem 0;
    }

    .carpet-analysis h4 {
      margin-top: 0;
      color: #1e40af;
    }

    .carpet-analysis p {
      margin: 0.5rem 0;
    }

    .stats {
      background: #f1f5f9;
      padding: 1rem;
      border-radius: 0.25rem;
    }

    .stats p {
      margin: 0.5rem 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LLMTestComponent {
  protected readonly llmService = inject(LLMService);

  protected readonly connectionResult = signal<any>(null);
  protected readonly carpetResult = signal<any>(null);
  protected readonly selectedImage = signal<string | null>(null);

  protected async testConnection(): Promise<void> {
    const result = await this.llmService.testConnection(
      "Hello! Can you respond with a simple confirmation that you're working?"
    );
    this.connectionResult.set(result);
  }

  protected onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        this.selectedImage.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  protected async testCarpetDetection(): Promise<void> {
    const image = this.selectedImage();
    if (!image) return;

    const result = await this.llmService.detectCarpet(image);
    this.carpetResult.set(result);
  }

  protected clearCache(): void {
    this.llmService.clearCache();
    this.carpetResult.set(null);
  }
}
