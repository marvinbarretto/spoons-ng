// src/app/stores/checkin.store.ts
import { computed, inject, Injectable, signal } from '@angular/core';
import { CheckInService } from './check-in.service';
import type { CheckIn } from '../util/check-in.model';
import { serverTimestamp, Timestamp } from 'firebase/firestore';
import { PubService } from '../../pubs/data-access/pub.service';
import { Pub } from '../../pubs/utils/pub.models';
import { firstValueFrom } from 'rxjs';
import { User } from '../../users/utils/user.model';
import { AuthStore } from '../../auth/data-access/auth.store';
import { LandlordStore } from '../../landlord/data-access/landlord.store';

@Injectable({ providedIn: 'root' })
export class CheckinStore {
  private checkinService = inject(CheckInService);
  private pubService = inject(PubService);
  private authStore = inject(AuthStore);
  private landlordStore = inject(LandlordStore);

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
    const extended = { ...newCheckin, madeUserLandlord: newCheckin.madeUserLandlord ?? false };
    this.checkins$$.update(prev => [...prev, extended]);
    this.checkinSuccess$$.set(extended);
  }

  reset(): void {
    this.hasLoaded = false;
    this.checkins$$.set([]);
    this.checkinSuccess$$.set(null);
    this.error$$.set(null);
  }

  async checkin(pubId: string, coords: GeolocationCoordinates, photoDataUrl?: string): Promise<void> {
    this.loading$$.set(true);
    this.error$$.set(null);

    try {
      const userId = this.authStore.uid;
      if (!userId) throw new Error('Missing user ID');

      const timestamp = serverTimestamp();
      const dateKey = new Date().toISOString().split('T')[0];

      let photoUrl: string | undefined;
      if (photoDataUrl) {
        photoUrl = await this.checkinService.uploadPhoto(photoDataUrl);
      }

      const checkin: Omit<CheckIn, 'id'> = {
        userId,
        pubId,
        timestamp: new Date() as any, // local timestamp; serverTimestamp will be used in Firestore
        dateKey,
      };

      const result = await this.checkinService.completeCheckin(checkin);
      this.checkinSuccess$$.set(result);

      // 🔁 Refresh landlord state
      await this.landlordStore.refreshLandlord(pubId);

      // ✅ Show landlord message
      this.landlordMessage$$.set(
        result.madeUserLandlord
          ? `🎉 You are now the landlord of this pub!`
          : `✅ Check-in complete, but someone else is already landlord.`
      );

    } catch (err: any) {
      this.error$$.set(err.message ?? 'Check-in failed');
      console.error('[CheckInStore] ❌ Check-in error:', err);
    } finally {
      this.loading$$.set(false);
    }
  }

  readonly userCheckins$$ = computed(() =>
    this.checkins$$().map(c => c.pubId)
  );

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
