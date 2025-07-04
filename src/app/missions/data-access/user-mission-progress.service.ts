import { Injectable, inject } from '@angular/core';
import { FirestoreService } from '../../shared/data-access/firestore.service';
import { UserMissionProgress } from '../utils/user-mission-progress.model';
import { where } from 'firebase/firestore';

@Injectable({ providedIn: 'root' })
export class UserMissionProgressService extends FirestoreService {
  private collectionPath = 'userMissionProgress';

  /**
   * Get all mission progress for a specific user.
   */
  getUserProgress(userId: string): Promise<(UserMissionProgress & { id: string })[]> {
    return this.getDocsWhere<UserMissionProgress>(
      this.collectionPath,
      where('userId', '==', userId)
    );
  }

  /**
   * Get progress for a specific user-mission combination.
   */
  async getUserMissionProgress(userId: string, missionId: string): Promise<UserMissionProgress | undefined> {
    const id = `${userId}_${missionId}`;
    return await this.getDocByPath<UserMissionProgress>(`${this.collectionPath}/${id}`);
  }

  /**
   * Enroll a user in a mission.
   */
  async enrollInMission(userId: string, missionId: string): Promise<void> {
    const id = `${userId}_${missionId}`;
    const progress: UserMissionProgress = {
      id,
      userId,
      missionId,
      startedAt: new Date(),
      completedPubIds: [],
      isCompleted: false,
      progressPercentage: 0,
      lastUpdated: new Date()
    };

    await this.setDoc(`${this.collectionPath}/${id}`, progress);
  }

  /**
   * Update progress when user checks into a pub.
   */
  async updateProgress(
    userId: string, 
    missionId: string, 
    pubId: string, 
    totalPubsRequired: number
  ): Promise<void> {
    const id = `${userId}_${missionId}`;
    const existingProgress = await this.getUserMissionProgress(userId, missionId);
    
    if (!existingProgress) {
      throw new Error('Mission progress not found. User must start mission first.');
    }

    // Add pub if not already completed
    const completedPubIds = [...existingProgress.completedPubIds];
    if (!completedPubIds.includes(pubId)) {
      completedPubIds.push(pubId);
    }

    const progressPercentage = Math.round((completedPubIds.length / totalPubsRequired) * 100);
    const isCompleted = completedPubIds.length >= totalPubsRequired;

    const updates: Partial<UserMissionProgress> = {
      completedPubIds,
      progressPercentage,
      isCompleted,
      lastUpdated: new Date(),
      ...(isCompleted && !existingProgress.completedAt && { completedAt: new Date() })
    };

    await this.updateDoc(`${this.collectionPath}/${id}`, updates);
  }

  /**
   * Complete a mission manually.
   */
  async completeMission(userId: string, missionId: string): Promise<void> {
    const id = `${userId}_${missionId}`;
    await this.updateDoc(`${this.collectionPath}/${id}`, {
      isCompleted: true,
      completedAt: new Date(),
      progressPercentage: 100,
      lastUpdated: new Date()
    });
  }

  /**
   * Get all active (started but not completed) missions for a user.
   */
  async getActiveMissions(userId: string): Promise<(UserMissionProgress & { id: string })[]> {
    return this.getDocsWhere<UserMissionProgress>(
      this.collectionPath,
      where('userId', '==', userId),
      where('isCompleted', '==', false)
    );
  }

  /**
   * Leave a mission by deleting the user's progress.
   */
  async leaveMission(userId: string, missionId: string): Promise<void> {
    const id = `${userId}_${missionId}`;
    await this.deleteDoc(`${this.collectionPath}/${id}`);
  }
}