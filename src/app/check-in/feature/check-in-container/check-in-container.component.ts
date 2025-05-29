import { AfterViewInit, Component, inject, signal } from '@angular/core';
import { SsrPlatformService } from '../../../shared/utils/ssr/ssr-platform.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-check-in-container',
  imports: [CommonModule],
  templateUrl: './check-in-container.component.html',
  styleUrl: './check-in-container.component.scss'
})
export class CheckInContainerComponent implements AfterViewInit {
  private platform = inject(SsrPlatformService);

  videoRef = signal<HTMLVideoElement | null>(null);
  photoDataUrl = signal<string | null>(null);

    ngAfterViewInit(): void {
      this.startCamera();
    }

    async startCamera() {
      const constraints = { video: { facingMode: 'environment' }, audio: false };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const video = this.videoRef();
        if (video) {
          video.srcObject = stream;
          video.play();
        }
      } catch (err) {
        console.error('Camera access denied or failed', err);
        // TODO: Handle gracefully
      }
    }

    capturePhoto() {
      const video = this.videoRef();
      if (!video) return;

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        this.photoDataUrl.set(canvas.toDataURL('image/jpeg'));
      }
    }

    confirmPhoto() {
      console.log('Photo confirmed!');
      // Proceed with geolocation + Firestore upload
    }

    retakePhoto() {
      this.photoDataUrl.set(null);
    }
  }


