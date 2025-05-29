import { ChangeDetectionStrategy, Component, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { NearbyPubStore } from '../../../pubs/data-access/nearby-pub.store';
import { UserStore } from '../../../users/data-access/user.store';
import { Router } from '@angular/router';
import { CheckInService } from '../../data-access/check-in.service';
import { Timestamp } from 'firebase/firestore';
import { Checkin } from '../../util/check-in.model';
import { ToastService } from '../../../shared/data-access/toast.service';

@Component({
  selector: 'app-check-in-container',
  imports: [CommonModule, ButtonComponent],
  templateUrl: './check-in-container.component.html',
  styleUrl: './check-in-container.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckInContainerComponent implements OnInit {
  private readonly checkinService = inject(CheckInService);
  private readonly router = inject(Router);
  private readonly nearbyPubStore = inject(NearbyPubStore);
  private readonly userStore = inject(UserStore);
  private readonly toastService = inject(ToastService);

  loading$$ = signal(false);
  @ViewChild('video', { static: true }) videoRef!: ElementRef<HTMLVideoElement>;

  private stream: MediaStream | null = null;

  async ngOnInit() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.videoRef.nativeElement.srcObject = this.stream;
      console.log('[CheckIn] ✅ Camera stream ready');
    } catch (err) {
      console.error('[CheckIn] ❌ Failed to access camera:', err);
    }
  }

  async confirmCheckin(imageDataUrl: string, pubId: string, userId: string) {
    try {
      const imageUrl = await this.checkinService.uploadPhoto(imageDataUrl);

      const checkin: Omit<Checkin, 'id'> = {
        userId,
        pubId,
        photoUrl: imageUrl,
        dateKey: new Date().toISOString().split('T')[0],
        timestamp: Timestamp.now(),
      };

      await this.checkinService.completeCheckin(checkin);

      console.log('[CheckIn] ✅ Check-in complete. Redirecting...');

      // Show toast and redirect
      this.toastService.success('🎉 Check-in complete!');
      this.router.navigateByUrl('/');

    } catch (err) {
      console.error('[CheckIn] ❌ Failed to complete check-in', err);
      this.toastService.error('❌ Check-in failed. Try again.');
    }
  }

  async capturePhoto() {
    this.loading$$.set(true);

    const video = this.videoRef.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photoDataUrl = canvas.toDataURL('image/jpeg');

    const pub = this.nearbyPubStore.closestPub$$();
    const user = this.userStore.user$$();

    if (!pub) {
      console.error('[CheckIn] ❌ Missing pub');
      return;
    }

    if (!user) {
      console.error('[CheckIn] ❌ Missing user');
      return;
    }

    try {
      const photoUrl = await this.checkinService.uploadPhoto(photoDataUrl);

      await this.checkinService.completeCheckin({
        userId: user.uid,
        pubId: pub.id,
        photoUrl,
        timestamp: Timestamp.now(),
      });

      console.log('[CheckIn] ✅ Check-in complete');
      await this.router.navigateByUrl('/');

    } catch (err) {
      console.error('[CheckIn] ❌ Failed during check-in process:', err);
    } finally {
      this.loading$$.set(false);
    }
  }
}


