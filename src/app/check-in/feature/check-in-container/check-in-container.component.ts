import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
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

@Component({
  selector: 'app-check-in-container',
  imports: [CommonModule, ButtonComponent, FeatureFlagPipe],
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
  private readonly platform = inject(SsrPlatformService);

  readonly pub = this.nearbyPubStore.closestPub$$();
  readonly user = this.userStore.user$$();
  readonly today = new Date().toISOString().split('T')[0];

  readonly loading$$ = signal(true);
  readonly checkin$$ = signal<CheckIn | null>(null);
  readonly error$$ = signal<string | null>(null);

  readonly isLandlord$$ = computed(() => !!this.checkin$$()?.madeUserLandlord);
  readonly badge$$ = computed(() => this.checkin$$()?.badgeName ?? null);
  readonly missionUpdated$$ = computed(() => this.checkin$$()?.missionUpdated ?? false);

  @ViewChild('video', { static: false }) videoRef?: ElementRef<HTMLVideoElement>;
  private stream: MediaStream | null = null;

  async ngOnInit() {
    await this.processCheckIn();

    if (environment.featureFlags.photoUpload) {
      this.initCamera();
    }
  }

  async processCheckIn() {
    const pub = this.pub;
    const user = this.user;

    if (!pub || !user) {
      this.error$$.set('Missing pub or user');
      this.loading$$.set(false);
      return;
    }

    const checkin: Omit<CheckIn, 'id'> = {
      userId: user.uid,
      pubId: pub.id,
      timestamp: Timestamp.now(),
      dateKey: this.today,
      photoUrl: '', // future: set after camera
      madeUserLandlord: this.getMadeUserLandlord(),
      badgeName: this.getBadgeName(),
      missionUpdated: this.getMissionUpdated(),
    };

    try {
      await this.checkinService.completeCheckin(checkin);
      console.log('[CheckIn] ✅ Firestore write complete', checkin);
      this.checkin$$.set({ ...checkin, id: 'generated-locally' });
      this.toastService.success('Check-in successful!');
    } catch (err) {
      console.error('[CheckIn] ❌ Failed to write check-in', err);
      this.error$$.set('Check-in failed');
    } finally {
      this.loading$$.set(false);
    }
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

  // Stubs (can be replaced with real logic later)
  private getMadeUserLandlord(): boolean {
    return false;
  }

  private getBadgeName(): string | undefined {
    return undefined;
  }

  private getMissionUpdated(): boolean {
    return false;
  }
}
