import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { NearbyPubStore } from '../../../pubs/data-access/nearby-pub.store';
import { UserStore } from '../../../users/data-access/user.store';
import { Router } from '@angular/router';
import { CheckInService } from '../../data-access/check-in.service';
import { Timestamp } from 'firebase/firestore';
import { CheckIn } from '../../util/check-in.model';
import { ToastService } from '../../../shared/data-access/toast.service';
import { FeatureFlagPipe } from "../../../shared/utils/feature-flag.pipe";
import { environment } from '../../../../environments/environment';
import { SsrPlatformService } from '../../../shared/utils/ssr/ssr-platform.service';
import { CheckinStore } from '../../data-access/check-in.store';

@Component({
  selector: 'app-check-in-container',
  imports: [CommonModule, ButtonComponent, FeatureFlagPipe],
  templateUrl: './check-in-container.component.html',
  styleUrl: './check-in-container.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckInContainerComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly nearbyPubStore = inject(NearbyPubStore);
  private readonly userStore = inject(UserStore);
  private readonly platform = inject(SsrPlatformService);
  private readonly checkinStore = inject(CheckinStore);

  readonly pub = this.nearbyPubStore.closestPub$$();
  readonly user = this.userStore.user$$();
  readonly today = new Date().toISOString().split('T')[0];

  readonly loading$$ = this.checkinStore.loading$$;
  readonly checkin$$ = this.checkinStore.checkinSuccess$$;
  readonly error$$ = this.checkinStore.error$$;

  readonly isLandlord$$ = computed(() => !!this.checkin$$()?.madeUserLandlord);
  readonly badge$$ = computed(() => this.checkin$$()?.badgeName ?? null);
  readonly missionUpdated$$ = computed(() => this.checkin$$()?.missionUpdated ?? false)

  readonly landlordMessage$$ = this.checkinStore.landlordMessage$$;
;

  @ViewChild('video', { static: false }) videoRef?: ElementRef<HTMLVideoElement>;
  private stream: MediaStream | null = null;

  constructor() {
    effect(() => {
      const checkin = this.checkin$$();
      if (checkin) {
        this.userStore.loadUser(checkin.userId);
      }
    });

  }

  async ngOnInit() {
    if (environment.featureFlags.photoUpload) {
      this.initCamera();
    }

    await this.processCheckIn();
  }

  async processCheckIn() {
    const pub = this.pub;
    const user = this.user;

    if (!pub || !user || !navigator.geolocation) {
      this.checkinStore.error$$.set('Missing pub, user, or geolocation support.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = position.coords;

        let photoDataUrl: string | null = null;

        if (environment.featureFlags.photoUpload && this.videoRef?.nativeElement) {
          const canvas = document.createElement('canvas');
          canvas.width = this.videoRef.nativeElement.videoWidth;
          canvas.height = this.videoRef.nativeElement.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(this.videoRef.nativeElement, 0, 0);
            photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          }
        }

        await this.checkinStore.checkin(pub.id, coords);
      },
      (error) => {
        this.checkinStore.error$$.set('Location access denied or unavailable.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );

  }

  private initCamera() {
    this.platform.onlyOnBrowser(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        this.stream = stream;
        if (this.videoRef?.nativeElement) {
          this.videoRef.nativeElement.srcObject = stream;
        }
        console.log('[CheckIn] ✅ Camera stream ready');
      } catch (err) {
        console.error('[CheckIn] ❌ Failed to access camera:', err);
      }
    });
  }

  goHome() {
    this.router.navigateByUrl('/');
  }
}

