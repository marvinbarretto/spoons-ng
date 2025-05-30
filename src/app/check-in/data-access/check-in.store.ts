// src/app/stores/checkin.store.ts
import { inject, Injectable, signal } from '@angular/core';
import { CheckInService } from './check-in.service';
import { CheckIn } from '../util/check-in.model';
import { Timestamp } from 'firebase/firestore';
import { PubService } from '../../pubs/data-access/pub.service';
import { Pub } from '../../pubs/utils/pub.models';
import { firstValueFrom } from 'rxjs';
import { User } from '../../users/utils/user.model';

@Injectable({ providedIn: 'root' })
export class CheckinStore {
  private checkinService = inject(CheckInService);
  private pubService = inject(PubService);

  private hasLoaded = false;

  user$$ = signal<User | null>(null);
  checkins$$ = signal<CheckIn[]>([]);
  loading$$ = signal(false);
  error$$ = signal<string | null>(null);
  checkinSuccess$$ = signal<CheckIn | null>(null);


  async checkin(pubId: string, userId: string, location: GeolocationCoordinates, photoDataUrl: string | null) {
    this.loading$$.set(true);
    this.error$$.set(null);

    try {
      const existing = await this.checkinService.getTodayCheckin(userId, pubId);
      if (existing) throw new Error('Already checked in today.');

      const distance = this.getDistanceMeters(location, await this.getPubLocation(pubId));
      if (distance > 100) throw new Error('You are too far from this pub.');

      let photoUrl: string | undefined = undefined;
      if (photoDataUrl) {
        photoUrl = await this.checkinService.uploadPhoto(photoDataUrl);
      }

      const newCheckin: Omit<CheckIn, 'id'> = {
        userId,
        pubId,
        timestamp: Timestamp.now(),
        photoUrl,
        dateKey: new Date().toISOString().split('T')[0],
      };

      await this.checkinService.completeCheckin(newCheckin);
      this.checkins$$.update((prev) => [...prev, { ...newCheckin, id: crypto.randomUUID() }]);
      this.checkinSuccess$$.set({ ...newCheckin, id: crypto.randomUUID() });

      this.updateStreak(pubId);
      this.addLandlord(pubId);

    } catch (err: any) {
      this.error$$.set(err.message || 'Check-in failed');
    } finally {
      this.loading$$.set(false);
    }
  }

  private async getPubLocation(pubId: string): Promise<{ lat: number; lng: number }> {
    const pub: Pub | undefined = await firstValueFrom(this.pubService.getPubById(pubId));

    if (!pub) throw new Error('Pub not found');
    if (!pub.location?.lat || !pub.location?.lng) throw new Error('Pub is missing coordinates');

    return {
      lat: pub.location.lat,
      lng: pub.location.lng
    };
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

  updateStreak(pubId: string) {
    const user = this.user$$();
    if (!user) return;

    const prevStreak = user.streaks?.[pubId] || 0;
    const updatedStreaks = { ...user.streaks, [pubId]: prevStreak + 1 };

    this.user$$.set({ ...user, streaks: updatedStreaks });
  }

  addLandlord(pubId: string) {
    const user = this.user$$();
    if (!user) return;

    const landlordOf = Array.from(new Set([...(user.landlordOf || []), pubId]));
    this.user$$.set({ ...user, landlordOf });
  }


  async loadOnce(userId: string) {
    if (this.hasLoaded) return;
    this.hasLoaded = true;

    this.loading$$.set(true);
    try {
      const checkins = await this.checkinService.loadUserCheckins(userId);
      this.checkins$$.set(checkins);
      console.log(`[CheckInStore] ✅ Loaded ${checkins.length} check-ins`);
    } catch (err) {
      this.error$$.set('Failed to load check-ins');
      console.error('[CheckInStore] ❌', err);
    } finally {
      this.loading$$.set(false);
    }
  }




}
