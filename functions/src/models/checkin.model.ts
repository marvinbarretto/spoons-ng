/**
 * @fileoverview Check-in model definitions for Cloud Functions
 * Mirrors the client-side check-in models in src/app/check-in/utils/check-in.models.ts
 */

import { Timestamp } from 'firebase-admin/firestore';

export type PointsBreakdown = {
  base: number;
  distance: number;
  bonus: number;
  multiplier: number;
  total: number;
  reason: string;
  photoQuality?: number;
};

export interface CheckIn {
  id: string;
  userId: string;
  pubId: string;
  timestamp: Timestamp;
  dateKey: string; // YYYY-MM-DD format
  pointsEarned?: number;
  pointsBreakdown?: PointsBreakdown;
  carpetImageKey?: string;
  madeUserLandlord?: boolean;
  
  // Metadata
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CheckInValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  requiredUpdates?: {
    userUpdates?: Partial<User>;
    pubUpdates?: any;
  };
}

// Import User type from user.model.ts
import { User } from './user.model';