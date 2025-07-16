/**
 * @fileoverview CheckInValidator - Validates check-in data integrity
 * 
 * RESPONSIBILITIES:
 * - Validate check-in documents for required fields
 * - Check for duplicate check-ins (same user/pub/day)
 * - Validate points calculations
 * - Ensure pub exists and is valid
 */

import { getFirestore } from 'firebase-admin/firestore';
import { CheckIn, CheckInValidationResult } from '../models/checkin.model';
import { User } from '../models/user.model';

export class CheckInValidator {
  private db = getFirestore();

  /**
   * Validate a check-in document for data integrity
   */
  async validateCheckIn(checkIn: CheckIn): Promise<CheckInValidationResult> {
    console.log(`[CheckInValidator] Validating check-in: ${checkIn.id}`);
    
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Check required fields
    if (!checkIn.userId) errors.push('Missing userId');
    if (!checkIn.pubId) errors.push('Missing pubId');
    if (!checkIn.timestamp) errors.push('Missing timestamp');
    if (!checkIn.dateKey) errors.push('Missing dateKey');

    // 2. Validate user exists
    if (checkIn.userId) {
      const userDoc = await this.db.collection('users').doc(checkIn.userId).get();
      if (!userDoc.exists) {
        errors.push(`User does not exist: ${checkIn.userId}`);
      }
    }

    // 3. Validate pub exists
    if (checkIn.pubId) {
      const pubDoc = await this.db.collection('pubs').doc(checkIn.pubId).get();
      if (!pubDoc.exists) {
        errors.push(`Pub does not exist: ${checkIn.pubId}`);
      }
    }

    // 4. Check for duplicate check-ins (same user/pub/day)
    if (checkIn.userId && checkIn.pubId && checkIn.dateKey) {
      const duplicateSnapshot = await this.db
        .collection('checkins')
        .where('userId', '==', checkIn.userId)
        .where('pubId', '==', checkIn.pubId)
        .where('dateKey', '==', checkIn.dateKey)
        .get();

      const duplicates = duplicateSnapshot.docs.filter(doc => doc.id !== checkIn.id);
      if (duplicates.length > 0) {
        errors.push(`Duplicate check-in found for user ${checkIn.userId} at pub ${checkIn.pubId} on ${checkIn.dateKey}`);
      }
    }

    // 5. Validate points (if present)
    if (checkIn.pointsEarned !== undefined) {
      if (checkIn.pointsEarned < 0) {
        errors.push('Points earned cannot be negative');
      }
      if (checkIn.pointsEarned > 1000) {
        warnings.push('Unusually high points earned (>1000)');
      }
    }

    // 6. Validate date consistency
    if (checkIn.timestamp && checkIn.dateKey) {
      const timestampDate = checkIn.timestamp.toDate().toISOString().split('T')[0];
      if (timestampDate !== checkIn.dateKey) {
        errors.push(`Date mismatch: timestamp=${timestampDate}, dateKey=${checkIn.dateKey}`);
      }
    }

    const isValid = errors.length === 0;

    if (!isValid) {
      console.warn(`[CheckInValidator] Validation failed for check-in ${checkIn.id}:`, errors);
    } else if (warnings.length > 0) {
      console.warn(`[CheckInValidator] Validation warnings for check-in ${checkIn.id}:`, warnings);
    } else {
      console.log(`[CheckInValidator] Validation passed for check-in ${checkIn.id}`);
    }

    return {
      isValid,
      errors,
      warnings
    };
  }

  /**
   * Validate all check-ins for a specific user
   */
  async validateUserCheckIns(userId: string): Promise<{
    totalCheckins: number;
    validCheckins: number;
    invalidCheckins: CheckIn[];
    validationResults: Map<string, CheckInValidationResult>;
  }> {
    console.log(`[CheckInValidator] Validating all check-ins for user: ${userId.slice(0, 8)}`);

    const checkinsSnapshot = await this.db
      .collection('checkins')
      .where('userId', '==', userId)
      .get();

    const checkins = checkinsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CheckIn[];

    const validationResults = new Map<string, CheckInValidationResult>();
    const invalidCheckins: CheckIn[] = [];
    let validCount = 0;

    for (const checkin of checkins) {
      const result = await this.validateCheckIn(checkin);
      validationResults.set(checkin.id, result);

      if (result.isValid) {
        validCount++;
      } else {
        invalidCheckins.push(checkin);
      }
    }

    console.log(`[CheckInValidator] User ${userId.slice(0, 8)} check-in validation summary:`, {
      total: checkins.length,
      valid: validCount,
      invalid: invalidCheckins.length
    });

    return {
      totalCheckins: checkins.length,
      validCheckins: validCount,
      invalidCheckins,
      validationResults
    };
  }

  /**
   * Identify impossible data scenarios (e.g., points without check-ins)
   */
  async findDataInconsistencies(userId: string): Promise<{
    hasInconsistencies: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    console.log(`[CheckInValidator] Checking data inconsistencies for user: ${userId.slice(0, 8)}`);

    const issues: string[] = [];
    const suggestions: string[] = [];

    // Get user document
    const userDoc = await this.db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      issues.push('User document does not exist');
      return { hasInconsistencies: true, issues, suggestions };
    }

    const userData = userDoc.data() as User;

    // Get user's check-ins
    const checkinsSnapshot = await this.db
      .collection('checkins')
      .where('userId', '==', userId)
      .get();

    const checkins = checkinsSnapshot.docs.map(doc => doc.data()) as CheckIn[];

    // Check: User has points but no check-ins
    if ((userData.totalPoints || 0) > 0 && checkins.length === 0) {
      issues.push('User has points but no check-ins recorded');
      suggestions.push('Reset user points to 0 or investigate missing check-in data');
    }

    // Check: User has pub count but no check-ins
    if ((userData.verifiedPubCount || 0) > 0 && checkins.length === 0) {
      issues.push('User has verified pub count but no check-ins recorded');
      suggestions.push('Reset verified pub count to 0 or investigate missing check-in data');
    }

    // Check: Verified pub count doesn't match unique pubs in check-ins
    const uniquePubIds = new Set(checkins.map(c => c.pubId));
    const actualVerifiedCount = uniquePubIds.size;
    if ((userData.verifiedPubCount || 0) !== actualVerifiedCount) {
      issues.push(`Verified pub count mismatch: stored=${userData.verifiedPubCount}, actual=${actualVerifiedCount}`);
      suggestions.push('Recalculate verified pub count from check-ins');
    }

    // Check: Total points don't match sum of check-in points
    const actualTotalPoints = checkins.reduce((sum, c) => sum + (c.pointsEarned || 0), 0);
    if ((userData.totalPoints || 0) !== actualTotalPoints) {
      issues.push(`Total points mismatch: stored=${userData.totalPoints}, actual=${actualTotalPoints}`);
      suggestions.push('Recalculate total points from check-ins');
    }

    const hasInconsistencies = issues.length > 0;

    if (hasInconsistencies) {
      console.warn(`[CheckInValidator] Data inconsistencies found for user ${userId.slice(0, 8)}:`, issues);
    } else {
      console.log(`[CheckInValidator] No data inconsistencies found for user ${userId.slice(0, 8)}`);
    }

    return {
      hasInconsistencies,
      issues,
      suggestions
    };
  }
}