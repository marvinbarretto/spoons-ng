// src/app/admin/feature/admin-checkins/admin-checkin.service.ts
import { Injectable } from '@angular/core';
import { Timestamp } from 'firebase/firestore';
import { FirestoreCrudService } from '../../../shared/data-access/firestore-crud.service';
import type { CheckIn } from '../../../check-in/utils/check-in.models';

type ManualCheckInData = {
  userId: string;
  pubId: string;
  timestamp: Date;
  pointsEarned?: number | null;
};

@Injectable({ providedIn: 'root' })
export class AdminCheckinService extends FirestoreCrudService<CheckIn> {
  protected path = 'checkins';

  /**
   * Get all check-ins from all users for admin management
   */
  async getAllCheckIns(): Promise<CheckIn[]> {
    console.log('[AdminCheckinService] Loading all check-ins for admin...');
    try {
      const checkIns = await this.getAll();
      console.log(`[AdminCheckinService] Loaded ${checkIns.length} check-ins`);
      return checkIns;
    } catch (error) {
      console.error('[AdminCheckinService] Failed to load all check-ins:', error);
      throw error;
    }
  }

  /**
   * Delete a check-in by ID
   */
  async deleteCheckIn(checkInId: string): Promise<void> {
    console.log('[AdminCheckinService] Deleting check-in:', checkInId);
    try {
      await this.delete(checkInId);
      console.log('[AdminCheckinService] Check-in deleted successfully');
    } catch (error) {
      console.error('[AdminCheckinService] Failed to delete check-in:', error);
      throw error;
    }
  }

  /**
   * Update a check-in
   */
  async updateCheckIn(checkInId: string, updates: Partial<CheckIn>): Promise<void> {
    console.log('[AdminCheckinService] Updating check-in:', checkInId, updates);
    try {
      await this.update(checkInId, updates);
      console.log('[AdminCheckinService] Check-in updated successfully');
    } catch (error) {
      console.error('[AdminCheckinService] Failed to update check-in:', error);
      throw error;
    }
  }

  /**
   * Get check-ins with additional stats for admin dashboard
   */
  async getCheckInStats(): Promise<{
    totalCheckIns: number;
    todayCheckIns: number;
    weeklyCheckIns: number;
    uniqueUsers: number;
  }> {
    try {
      const allCheckIns = await this.getAllCheckIns();
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const todayCheckIns = allCheckIns.filter(c => c.dateKey === today);
      const weeklyCheckIns = allCheckIns.filter(c => {
        const checkInDate = new Date(c.timestamp.toDate());
        return checkInDate >= weekAgo;
      });
      const uniqueUsers = new Set(allCheckIns.map(c => c.userId)).size;

      return {
        totalCheckIns: allCheckIns.length,
        todayCheckIns: todayCheckIns.length,
        weeklyCheckIns: weeklyCheckIns.length,
        uniqueUsers
      };
    } catch (error) {
      console.error('[AdminCheckinService] Failed to get check-in stats:', error);
      throw error;
    }
  }

  /**
   * Create a manual check-in for admin purposes
   */
  async createManualCheckIn(data: ManualCheckInData): Promise<string> {
    console.log('[AdminCheckinService] Creating manual check-in:', data);
    
    try {
      // Calculate default points if not provided
      const pointsEarned = data.pointsEarned ?? this.calculateDefaultPoints();
      
      // Create the check-in data
      const checkInData: Omit<CheckIn, 'id'> = {
        userId: data.userId,
        pubId: data.pubId,
        timestamp: Timestamp.fromDate(data.timestamp),
        dateKey: data.timestamp.toISOString().split('T')[0],
        pointsEarned: pointsEarned,
        // Add basic points breakdown for manual checkins
        pointsBreakdown: {
          base: pointsEarned,
          distance: 0,
          bonus: 0,
          multiplier: 1,
          total: pointsEarned,
          reason: 'Manual check-in by admin'
        }
      };

      // Create the document
      const docRef = await this.addDocToCollection('checkins', checkInData);
      const docId = docRef.id;

      console.log('[AdminCheckinService] Manual check-in created successfully:', {
        id: docId,
        userId: data.userId,
        pubId: data.pubId,
        pointsEarned: pointsEarned
      });

      return docId;

    } catch (error) {
      console.error('[AdminCheckinService] Failed to create manual check-in:', error);
      throw error;
    }
  }

  /**
   * Calculate default points for a manual check-in
   * This is a simplified version - in a real app you might want more complex logic
   */
  private calculateDefaultPoints(): number {
    // Default points for manual check-ins
    return 10;
  }
}