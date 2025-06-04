// src/app/landlord/data-access/landlord.store.ts
import { Injectable, signal, computed } from '@angular/core';
import { Landlord } from '../utils/landlord.model';

@Injectable({
  providedIn: 'root'
})
export class LandlordStore {
  private readonly _todayLandlord = signal<Record<string, Landlord>>({});
  private readonly _currentLandlord = signal<Record<string, Landlord>>({});

  // Clean signal names
  readonly todayLandlord = this._todayLandlord.asReadonly();
  readonly currentLandlord = this._currentLandlord.asReadonly();

  readonly landlordPubIds = computed(() =>
    Object.keys(this.todayLandlord())
  );

  setTodayLandlord(pubId: string, landlord: Landlord): void {
    this._todayLandlord.update(current => ({
      ...current,
      [pubId]: landlord
    }));
  }

  setCurrentLandlord(pubId: string, landlord: Landlord): void {
    this._currentLandlord.update(current => ({
      ...current,
      [pubId]: landlord
    }));
  }

  getLandlordForPub(pubId: string): Landlord | null {
    return this.todayLandlord()[pubId] || this.currentLandlord()[pubId] || null;
  }

  isUserLandlord(pubId: string, userId: string): boolean {
    const landlord = this.getLandlordForPub(pubId);
    return landlord?.userId === userId;
  }

  reset(): void {
    this._todayLandlord.set({});
    this._currentLandlord.set({});
  }
}
