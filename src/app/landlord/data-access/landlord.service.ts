import { Injectable } from '@angular/core';
import { inject } from '@angular/core';
import { AuthStore } from '../../auth/data-access/auth.store';
import type { Pub } from '../../pubs/utils/pub.models';
import { FirestoreService } from '../../shared/data-access/firestore.service';
import { firstValueFrom } from 'rxjs';
import { Timestamp } from 'firebase/firestore';

@Injectable({ providedIn: 'root' })
export class LandlordService extends FirestoreService {
  private authStore = inject(AuthStore);

  async tryAwardLandlord(pubId: string, checkInDate: Date): Promise<boolean> {
    const user = this.authStore.user();
    if (!user) throw new Error('User not logged in');
    console.log(`[LandlordService] 🧑 User attempting landlord claim: ${user.uid}`);

    const pubPath = `pubs/${pubId}`;
    const pub = await firstValueFrom(this.doc$<Pub>(pubPath));
    if (!pub) throw new Error('Pub not found');
    console.log(`[LandlordService] 🏠 Checking pub: ${pub.name} (${pubId})`);

    const localDate = this.getLocalDate(checkInDate);
    const isAfterNoon = this.isAfterNoon(checkInDate);
    console.log(`[LandlordService] 📅 Local date: ${localDate}, After noon? ${isAfterNoon}`);

    if (!isAfterNoon) {
      console.log(`[LandlordService] ❌ Check-in is before 12:00 – not eligible for landlord`);
      return false;
    }

    if (pub.todayLandlord?.claimedAt.toDate().toISOString().split('T')[0] === localDate) {
      console.log(`[LandlordService] 🚫 Landlord already set for ${localDate}: ${pub.todayLandlord.userId}`);
      return false;
    }

    const updated: Partial<Pub> = {
      todayLandlord: {
        userId: user.uid,
        claimedAt: Timestamp.now(),
      },
    };

    await this.updateDoc<Pub>(pubPath, updated);
    console.log(`[LandlordService] ✅ ${user.uid} is now landlord of ${pub.name} for ${localDate}`);
    return true;
  }


  async getPub(pubId: string): Promise<Pub> {
    const pub = await firstValueFrom(this.doc$<Pub>(`pubs/${pubId}`));
    if (!pub) throw new Error('Pub not found');
    return pub;
  }

  private getLocalDate(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
  }

  private isAfterNoon(date: Date): boolean {
    return date.getHours() >= 12;
  }

}
