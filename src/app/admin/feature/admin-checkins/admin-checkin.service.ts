// src/app/admin/feature/admin-checkins/admin-checkin.service.ts
import { Injectable, inject } from '@angular/core';
import { CheckInService } from '@check-in/data-access/check-in.service';
import {
  calculateCheckInContext,
  type CheckInContextInput,
} from '@check-in/utils/check-in-context.utils';
import type { CheckIn } from '@check-in/utils/check-in.models';
import {
  calculateCheckInPoints,
  type CheckInPointsInput,
} from '@check-in/utils/points-calculation.utils';
import { FirestoreCrudService } from '@fourfold/angular-foundation';
import { PubService } from '@pubs/data-access/pub.service';
import { UserService } from '@users/data-access/user.service';
import { Timestamp } from 'firebase/firestore';
import { firstValueFrom } from 'rxjs';

type ManualCheckInData = {
  userId: string;
  pubId: string;
  timestamp: Date;
  pointsEarned?: number | null;
  /** Whether carpet was confirmed */
  carpetConfirmed?: boolean;
  /** Whether social sharing bonus applies */
  sharedSocial?: boolean;
  /** Current streak days */
  currentStreak?: number;
};

@Injectable({ providedIn: 'root' })
export class AdminCheckinService extends FirestoreCrudService<CheckIn> {
  protected path = 'checkins';

  // Injected services for context gathering
  private readonly checkInService = inject(CheckInService);
  private readonly userService = inject(UserService);
  private readonly pubService = inject(PubService);

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
        uniqueUsers,
      };
    } catch (error) {
      console.error('[AdminCheckinService] Failed to get check-in stats:', error);
      throw error;
    }
  }

  /**
   * Create a manual check-in for admin purposes with proper points calculation
   */
  async createManualCheckIn(data: ManualCheckInData): Promise<string> {
    const callId = Date.now();
    console.log(`⚡ [AdminCheckinService] === MANUAL CHECK-IN CREATION STARTED (${callId}) ===`);
    console.log(`⚡ [AdminCheckinService] Input data (${callId}):`, {
      userId: data.userId,
      pubId: data.pubId,
      timestamp: data.timestamp.toISOString(),
      pointsOverride: data.pointsEarned,
      carpetConfirmed: data.carpetConfirmed,
      sharedSocial: data.sharedSocial,
      currentStreak: data.currentStreak,
    });

    try {
      console.log(`⚡ [AdminCheckinService] Step 1: Gathering context data (${callId})`);
      console.group(`⚡ Data Fetching (${callId})`);

      console.log('⚡ Fetching user data...');
      console.log('⚡ Fetching pub data...');
      console.log('⚡ Fetching user check-in history...');

      // Gather context data for points calculation
      const [user, checkInPub, userTotalCheckins, pubSpecificCheckins] = await Promise.all([
        firstValueFrom(this.userService.getUser(data.userId)),
        this.pubService.getPub(data.pubId),
        this.checkInService.getUserTotalCheckinCount(data.userId),
        this.checkInService.getUserCheckinCount(data.userId, data.pubId),
      ]);

      console.log(`⚡ [AdminCheckinService] Data fetching results (${callId}):`);
      console.log(`⚡   User: ${user ? user.displayName + ' (' + user.uid + ')' : 'NOT FOUND'}`);
      console.log(
        `⚡   Check-in pub: ${checkInPub ? checkInPub.name + ' (' + checkInPub.id + ')' : 'NOT FOUND'}`
      );
      console.log(`⚡   User total check-ins: ${userTotalCheckins}`);
      console.log(`⚡   User check-ins to this pub: ${pubSpecificCheckins}`);

      console.groupEnd();

      if (!checkInPub) {
        console.log(`⚡ [AdminCheckinService] ERROR: Pub not found (${callId})`);
        throw new Error(`Pub not found: ${data.pubId}`);
      }

      console.log(`⚡ [AdminCheckinService] Step 2: Getting home pub data (${callId})`);
      // Get user's home pub for distance calculation
      const homePub = user?.homePubId ? await this.pubService.getPub(user.homePubId) : null;
      console.log(
        `⚡   User home pub: ${homePub ? homePub.name + ' (' + homePub.id + ')' : 'None set'}`
      );

      console.log(`⚡ [AdminCheckinService] Step 3: Using shared context utilities (${callId})`);
      // Calculate check-in context using shared utilities
      const contextInput: CheckInContextInput = {
        userId: data.userId,
        pubId: data.pubId,
        user: user || null,
        checkInPub,
        homePub: homePub || null,
        userTotalCheckins,
        pubSpecificCheckins: pubSpecificCheckins + 1, // +1 because we're creating this check-in
        carpetConfirmed: data.carpetConfirmed,
        sharedSocial: data.sharedSocial,
        currentStreak: data.currentStreak,
      };

      console.log(`⚡ [AdminCheckinService] Calling shared context calculation...`);
      const context = calculateCheckInContext(contextInput);

      console.log(`⚡ [AdminCheckinService] Step 4: Using shared points calculation (${callId})`);
      console.log(`⚡ [AdminCheckinService] KEY MOMENT: Distance bonus will be calculated!`);

      // Calculate points using shared utilities
      const pointsInput: CheckInPointsInput = {
        checkInPub,
        homePub: homePub || null,
        isFirstEver: context.isFirstEver,
        isFirstVisit: context.isFirstVisit,
        isHomePub: context.isHomePub,
        carpetConfirmed: context.carpetConfirmed,
        sharedSocial: context.sharedSocial,
        currentStreak: context.currentStreak,
        customReason: 'Manual check-in by admin',
      };

      console.log(`⚡ [AdminCheckinService] Calling SINGLE SOURCE OF TRUTH for points...`);
      const pointsBreakdown = calculateCheckInPoints(pointsInput);

      console.log(`⚡ [AdminCheckinService] Step 5: Points calculation complete (${callId})`);
      console.log(`⚡ [AdminCheckinService] Calculated points breakdown:`, pointsBreakdown);

      // Use calculated points or override if provided
      const finalPointsEarned = data.pointsEarned ?? pointsBreakdown.total;
      const finalPointsBreakdown = data.pointsEarned
        ? {
            ...pointsBreakdown,
            total: data.pointsEarned,
            reason: `Manual override: ${data.pointsEarned} points (originally ${pointsBreakdown.total})`,
          }
        : pointsBreakdown;

      if (data.pointsEarned) {
        console.log(`⚡ [AdminCheckinService] POINTS OVERRIDE APPLIED (${callId}):`);
        console.log(`⚡   Original calculated: ${pointsBreakdown.total} points`);
        console.log(`⚡   Admin override: ${data.pointsEarned} points`);
      } else {
        console.log(
          `⚡ [AdminCheckinService] USING CALCULATED POINTS (${callId}): ${pointsBreakdown.total}`
        );
        if (pointsBreakdown.distance > 0) {
          console.log(
            `⚡ 🎉 SUCCESS: Distance bonus of ${pointsBreakdown.distance} points applied to manual check-in!`
          );
        }
      }

      console.log(`⚡ [AdminCheckinService] Step 6: Creating check-in document (${callId})`);
      // Create the check-in data
      const checkInData: Omit<CheckIn, 'id'> = {
        userId: data.userId,
        pubId: data.pubId,
        timestamp: Timestamp.fromDate(data.timestamp),
        dateKey: data.timestamp.toISOString().split('T')[0],
        pointsEarned: finalPointsEarned,
        pointsBreakdown: finalPointsBreakdown,
      };

      // Create the document
      const docRef = await this.addDocToCollection('checkins', checkInData);
      const docId = docRef.id;

      console.log(`⚡ [AdminCheckinService] === MANUAL CHECK-IN CREATION COMPLETE (${callId}) ===`);
      console.log(`⚡ [AdminCheckinService] SUCCESS SUMMARY:`);
      console.log(`⚡   Check-in ID: ${docId}`);
      console.log(`⚡   User: ${user?.displayName || 'Unknown'}`);
      console.log(`⚡   Pub: ${checkInPub.name}`);
      console.log(`⚡   Points earned: ${finalPointsEarned}`);
      console.log(`⚡   Distance bonus: ${finalPointsBreakdown.distance} points`);
      console.log(`⚡   Final breakdown:`, finalPointsBreakdown);

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
