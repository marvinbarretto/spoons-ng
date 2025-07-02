import { Component, ElementRef, Input, OnInit, ViewChild, inject } from '@angular/core';
import { SsrPlatformService } from '../../utils/ssr/ssr-platform.service';

@Component({
  selector: 'app-qr-code',
  template: `
    <div class="qr-code-container">
      <canvas #canvas></canvas>
    </div>
  `,
  styles: [`
    .qr-code-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 1rem;
      background: white;
      border-radius: 8px;
      margin-top: 1rem;
    }
    
    canvas {
      max-width: 100%;
      height: auto;
    }
  `]
})
export class QrCodeComponent implements OnInit {
  @Input({ required: true }) url!: string;
  @Input() size: number = 200;
  
  @ViewChild('canvas', { static: false }) canvas!: ElementRef<HTMLCanvasElement>;
  
  private readonly _platform = inject(SsrPlatformService);

  ngOnInit(): void {
    this._platform.onlyOnBrowser(() => {
      this.generateQRCode();
    });
  }

  private async generateQRCode(): Promise<void> {
    if (!this.canvas) {
      setTimeout(() => this.generateQRCode(), 100);
      return;
    }
    
    try {
      const QRCode = await import('qrcode');
      
      QRCode.default.toCanvas(this.canvas.nativeElement, this.url, {
        width: this.size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }, (error) => {
        if (error) {
          console.error('[QrCode] Error generating QR code:', error);
        } else {
          console.log('[QrCode] QR code generated successfully');
        }
      });
    } catch (error) {
      console.error('[QrCode] Error loading QR code library:', error);
    }
  }
}