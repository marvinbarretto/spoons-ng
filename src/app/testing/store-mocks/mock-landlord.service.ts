import { Injectable } from '@angular/core';
import { Timestamp } from 'firebase/firestore';
import { Landlord } from '../../landlord/utils/landlord.model';

@Injectable()
export class MockLandlordService {
  // Test data storage
  private mockLandlords = new Map<string, Landlord>();

  /**
   * Mock implementation of tryAwardLandlord
   * Returns fake landlord data without Firebase calls
   */
  async tryAwardLandlord(
    pubId: string,
    checkinDate: Date
  ): Promise<{ landlord: Landlord | null; wasAwarded: boolean }> {
    const dateKey = checkinDate.toISOString().split('T')[0];
    const landlordKey = `${pubId}_${dateKey}`;

    // Check if landlord already exists in mock data
    const existingLandlord = this.mockLandlords.get(landlordKey);
    if (existingLandlord) {
      return { landlord: existingLandlord, wasAwarded: false };
    }

    // Create new mock landlord
    const newLandlord: Landlord = {
      id: 'test-landlord-id',
      userId: 'test-user-id',
      pubId,
      claimedAt: Timestamp.now(),
      dateKey,
      isActive: true,
    };

    // Store in mock data
    this.mockLandlords.set(landlordKey, newLandlord);

    return { landlord: newLandlord, wasAwarded: true };
  }

  /**
   * Mock implementation of getTodayLandlord
   * Returns fake landlord data for today
   */
  async getTodayLandlord(pubId: string): Promise<Landlord | null> {
    const today = new Date().toISOString().split('T')[0];
    const landlordKey = `${pubId}_${today}`;

    // Return mock landlord if exists, otherwise null
    return this.mockLandlords.get(landlordKey) || null;
  }

  /**
   * Mock implementation of normalizeLandlord
   * Normalizes landlord data (same logic as real service)
   */
  normalizeLandlord(data: any): Landlord | null {
    if (!data) return null;

    try {
      return {
        id: data.id || 'test-landlord-id',
        claimedAt: data.claimedAt || Timestamp.now(),
        isActive: data.isActive ?? true,
        userId: data.userId || 'test-user-id',
        pubId: data.pubId || 'test-pub-id',
        dateKey: data.dateKey || new Date().toISOString().split('T')[0],
        streakDays: data.streakDays,
      } as Landlord;
    } catch (error) {
      console.error('[MockLandlordService] Failed to normalize landlord:', data, error);
      return null;
    }
  }

  // Test helper methods
  setMockLandlord(pubId: string, dateKey: string, landlord: Landlord): void {
    this.mockLandlords.set(`${pubId}_${dateKey}`, landlord);
  }

  clearMockData(): void {
    this.mockLandlords.clear();
  }

  hasMockLandlord(pubId: string, dateKey: string): boolean {
    return this.mockLandlords.has(`${pubId}_${dateKey}`);
  }
}
