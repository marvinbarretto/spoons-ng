/**
 * @fileoverview Cloud Function trigger for check-in creation
 * 
 * TRIGGERS: When a new document is created in the 'checkins' collection
 * 
 * RESPONSIBILITIES:
 * - Validate check-in data integrity
 * - Update user statistics (points, pub counts)
 * - Ensure data consistency across collections
 * - Log any validation errors or warnings
 * 
 * CRITICAL: This function ensures the leaderboard data stays accurate
 * by immediately updating user stats when new check-ins are created.
 */

import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { CheckIn } from '../models/checkin.model';
import { UserStatsCalculator } from '../utils/userStatsCalculator';
import { CheckInValidator } from '../utils/checkInValidator';

const db = getFirestore();

export const onCheckInCreate = onDocumentCreated(
  'checkins/{checkInId}',
  async (event) => {
    const checkInId = event.params.checkInId;
    const checkInData = event.data?.data() as CheckIn;

    console.log(`[onCheckInCreate] 🚀 New check-in created: ${checkInId}`);
    console.log(`[onCheckInCreate] User: ${checkInData?.userId?.slice(0, 8)}`);
    console.log(`[onCheckInCreate] Pub: ${checkInData?.pubId}`);
    console.log(`[onCheckInCreate] Points: ${checkInData?.pointsEarned || 0}`);

    if (!checkInData) {
      console.error(`[onCheckInCreate] ❌ No check-in data found for: ${checkInId}`);
      return;
    }

    // Add the document ID to the check-in data
    const checkIn: CheckIn = {
      ...checkInData,
      id: checkInId
    };

    try {
      // 🔍 Step 1: Validate check-in data
      console.log(`[onCheckInCreate] 🔍 Validating check-in data...`);
      const validator = new CheckInValidator();
      const validationResult = await validator.validateCheckIn(checkIn);

      if (!validationResult.isValid) {
        console.error(`[onCheckInCreate] ❌ Check-in validation failed:`, validationResult.errors);
        // Don't throw - log the errors but continue processing
        // The check-in was already created by the client, we need to handle it
      }

      if (validationResult.warnings.length > 0) {
        console.warn(`[onCheckInCreate] ⚠️ Check-in validation warnings:`, validationResult.warnings);
      }

      // 📊 Step 2: Update user statistics
      console.log(`[onCheckInCreate] 📊 Updating user statistics...`);
      const statsCalculator = new UserStatsCalculator();
      const updatedStats = await statsCalculator.repairUserStats(checkIn.userId);

      console.log(`[onCheckInCreate] ✅ User stats updated successfully:`, {
        userId: checkIn.userId.slice(0, 8),
        totalPoints: updatedStats.totalPoints,
        verifiedPubCount: updatedStats.verifiedPubCount,
        totalCheckins: updatedStats.totalCheckins
      });

      // 📈 Step 3: Check for data inconsistencies and log them
      console.log(`[onCheckInCreate] 🔍 Checking for data inconsistencies...`);
      const inconsistencies = await validator.findDataInconsistencies(checkIn.userId);

      if (inconsistencies.hasInconsistencies) {
        console.warn(`[onCheckInCreate] ⚠️ Data inconsistencies detected for user ${checkIn.userId.slice(0, 8)}:`, {
          issues: inconsistencies.issues,
          suggestions: inconsistencies.suggestions
        });
      } else {
        console.log(`[onCheckInCreate] ✅ No data inconsistencies found for user ${checkIn.userId.slice(0, 8)}`);
      }

      // 🎉 Step 4: Log successful completion
      console.log(`[onCheckInCreate] 🎉 Check-in processing completed successfully`);
      console.log(`[onCheckInCreate] ├─ Check-in ID: ${checkInId}`);
      console.log(`[onCheckInCreate] ├─ User ID: ${checkIn.userId.slice(0, 8)}`);
      console.log(`[onCheckInCreate] ├─ Pub ID: ${checkIn.pubId}`);
      console.log(`[onCheckInCreate] ├─ Points earned: ${checkIn.pointsEarned || 0}`);
      console.log(`[onCheckInCreate] ├─ New total points: ${updatedStats.totalPoints}`);
      console.log(`[onCheckInCreate] └─ New verified pub count: ${updatedStats.verifiedPubCount}`);

    } catch (error) {
      console.error(`[onCheckInCreate] ❌ Error processing check-in ${checkInId}:`, error);
      
      // Log the error to a special collection for monitoring
      try {
        await db.collection('function-errors').add({
          functionName: 'onCheckInCreate',
          checkInId,
          userId: checkIn.userId,
          pubId: checkIn.pubId,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
          checkInData: checkIn
        });
        console.log(`[onCheckInCreate] 📝 Error logged to function-errors collection`);
      } catch (logError) {
        console.error(`[onCheckInCreate] ❌ Failed to log error:`, logError);
      }

      // Don't throw the error - we don't want to retry this function
      // The check-in has already been created, we just need to handle the consequences
    }
  }
);