// src/app/stores/checkin.store.ts
import { inject, Injectable, signal } from '@angular/core';
import { CheckInService } from './check-in.service';
import { CheckIn } from '../util/check-in.model';
import { Timestamp } from 'firebase/firestore';
import { PubService } from '../../pubs/data-access/pub.service';
import { Pub } from '../../pubs/utils/pub.models';
import { firstValueFrom } from 'rxjs';
import { User } from '../../users/utils/user.model';
import { AuthStore } from '../../auth/data-access/auth.store';

@Injectable({ providedIn: 'root' })
export class CheckinStore {
  private checkinService = inject(CheckInService);
  private pubService = inject(PubService);
  private authStore = inject(AuthStore);

  private hasLoaded = false;

  readonly user$$ = signal<User | null>(null);
  readonly checkins$$ = signal<CheckIn[]>([]);
  readonly loading$$ = signal(false);
  readonly error$$ = signal<string | null>(null);
  readonly checkinSuccess$$ = signal<CheckIn | null>(null);
  readonly landlordMessage$$ = signal<string | null>(null);

  async loadOnce(userId: string): Promise<void> {
    if (this.hasLoaded) return;
    this.hasLoaded = true;
    await this.load(userId);
  }

  async load(userId: string): Promise<void> {
    this.loading$$.set(true);
    this.error$$.set(null);

    try {
      const checkins = await this.checkinService.loadUserCheckins(userId);
      this.checkins$$.set(checkins);
      console.log(`[CheckinStore] ✅ Loaded ${checkins.length} check-ins for user ${userId}`);
    } catch (err) {
      this.error$$.set('Failed to load check-ins');
      console.error('[CheckinStore] ❌ Error loading check-ins', err);
    } finally {
      this.loading$$.set(false);
    }
  }

  recordCheckinSuccess(newCheckin: CheckIn) {
    this.checkins$$.update(prev => [...prev, newCheckin]);
    this.checkinSuccess$$.set(newCheckin);
  }

  reset(): void {
    this.hasLoaded = false;
    this.checkins$$.set([]);
    this.checkinSuccess$$.set(null);
    this.error$$.set(null);
  }

  async checkin(pubId: string, location: GeolocationCoordinates, photoDataUrl: string | null) {
    this.loading$$.set(true);
    this.error$$.set(null);

    try {
      const existing = await this.checkinService.getTodayCheckin(pubId);
      if (existing) throw new Error('Already checked in today.');

      const distance = this.getDistanceMeters(location, await this.getPubLocation(pubId));
      // TODO: pull threshold from env
      // if (distance > 100) throw new Error('You are too far from this pub.');

      let photoUrl: string | undefined;
      if (photoDataUrl) {
        photoUrl = await this.checkinService.uploadPhoto(photoDataUrl);
      }

      const userId = this.authStore.uid;
      if (!userId) throw new Error('Not logged in.');

      const newCheckin: Omit<CheckIn, 'id'> = {
        userId,
        pubId,
        timestamp: Timestamp.now(),
        photoUrl,
        dateKey: new Date().toISOString().split('T')[0],
      };

      const completed = await this.checkinService.completeCheckin(newCheckin);

      this.landlordMessage$$.set(
        completed.madeUserLandlord
          ? '👑 You’re the landlord today!'
          : '✅ Check-in complete, but someone else is already landlord.'
      );

      this.recordCheckinSuccess(completed);

    } catch (err: any) {
      this.error$$.set(err.message || 'Check-in failed');
    } finally {
      this.loading$$.set(false);
    }
  }


  private async getPubLocation(pubId: string): Promise<{ lat: number; lng: number }> {
    const pub: Pub | undefined = await firstValueFrom(this.pubService.getPubById(pubId));
    if (!pub || !pub.location) throw new Error('Pub not found or missing coordinates');
    return pub.location;
  }

  private getDistanceMeters(a: GeolocationCoordinates, b: { lat: number; lng: number }): number {
    const R = 6371000;
    const φ1 = a.latitude * Math.PI / 180;
    const φ2 = b.lat * Math.PI / 180;
    const Δφ = (b.lat - a.latitude) * Math.PI / 180;
    const Δλ = (b.lng - a.longitude) * Math.PI / 180;
    const x = Δλ * Math.cos((φ1 + φ2) / 2);
    const y = Δφ;
    return Math.sqrt(x * x + y * y) * R;
  }
}
