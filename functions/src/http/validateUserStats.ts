/**
 * @fileoverview HTTP Cloud Function for validating and repairing user statistics
 * 
 * ENDPOINT: POST /validateUserStats
 * 
 * RESPONSIBILITIES:
 * - Validate user stats against actual check-in data
 * - Repair inconsistent data if requested
 * - Return detailed validation report
 * - Support batch validation for multiple users
 * 
 * USAGE:
 * - POST /validateUserStats { userId: "abc123", repair: true }
 * - POST /validateUserStats { userIds: ["abc123", "def456"], repair: false }
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { UserStatsCalculator } from '../utils/userStatsCalculator';
import { CheckInValidator } from '../utils/checkInValidator';

const db = getFirestore();

interface ValidateUserStatsRequest {
  userId?: string;
  userIds?: string[];
  repair?: boolean;
  includeInconsistencies?: boolean;
}

interface ValidationReport {
  userId: string;
  isValid: boolean;
  discrepancies: string[];
  inconsistencies?: {
    hasInconsistencies: boolean;
    issues: string[];
    suggestions: string[];
  };
  statsBeforeRepair?: any;
  statsAfterRepair?: any;
  repaired?: boolean;
  error?: string;
}

export const validateUserStats = onRequest(
  { cors: true },
  async (request, response) => {
    console.log(`[validateUserStats] 🚀 HTTP request received`);
    console.log(`[validateUserStats] Method: ${request.method}`);
    console.log(`[validateUserStats] Body:`, request.body);

    // Only allow POST requests
    if (request.method !== 'POST') {
      console.log(`[validateUserStats] ❌ Method not allowed: ${request.method}`);
      response.status(405).json({ 
        error: 'Method not allowed. Use POST.' 
      });
      return;
    }

    try {
      const { userId, userIds, repair = false, includeInconsistencies = true } = request.body as ValidateUserStatsRequest;

      // Validate request parameters
      if (!userId && !userIds) {
        console.log(`[validateUserStats] ❌ Missing required parameters`);
        response.status(400).json({ 
          error: 'Either userId or userIds is required' 
        });
        return;
      }

      if (userId && userIds) {
        console.log(`[validateUserStats] ❌ Conflicting parameters`);
        response.status(400).json({ 
          error: 'Provide either userId or userIds, not both' 
        });
        return;
      }

      // Determine which users to validate
      const usersToValidate = userId ? [userId] : (userIds || []);
      
      if (usersToValidate.length === 0) {
        console.log(`[validateUserStats] ❌ No users to validate`);
        response.status(400).json({ 
          error: 'No users specified for validation' 
        });
        return;
      }

      if (usersToValidate.length > 50) {
        console.log(`[validateUserStats] ❌ Too many users requested: ${usersToValidate.length}`);
        response.status(400).json({ 
          error: 'Maximum 50 users can be validated in a single request' 
        });
        return;
      }

      console.log(`[validateUserStats] 📊 Validating ${usersToValidate.length} user(s), repair: ${repair}`);

      const statsCalculator = new UserStatsCalculator();
      const validator = new CheckInValidator();
      const reports: ValidationReport[] = [];

      // Process each user
      for (const targetUserId of usersToValidate) {
        console.log(`[validateUserStats] 🔍 Processing user: ${targetUserId.slice(0, 8)}`);
        
        try {
          // Check if user exists
          const userDoc = await db.collection('users').doc(targetUserId).get();
          if (!userDoc.exists) {
            reports.push({
              userId: targetUserId,
              isValid: false,
              discrepancies: ['User document does not exist'],
              error: 'User not found'
            });
            continue;
          }

          // Validate user stats
          const validation = await statsCalculator.validateUserStats(targetUserId);
          
          const report: ValidationReport = {
            userId: targetUserId,
            isValid: validation.isValid,
            discrepancies: validation.discrepancies,
            statsBeforeRepair: validation.currentStats
          };

          // Include inconsistency check if requested
          if (includeInconsistencies) {
            report.inconsistencies = await validator.findDataInconsistencies(targetUserId);
          }

          // Repair stats if requested and validation failed
          if (repair && !validation.isValid) {
            console.log(`[validateUserStats] 🔧 Repairing stats for user: ${targetUserId.slice(0, 8)}`);
            const repairedStats = await statsCalculator.repairUserStats(targetUserId);
            report.statsAfterRepair = repairedStats;
            report.repaired = true;
            report.isValid = true; // After repair, it should be valid
            console.log(`[validateUserStats] ✅ Stats repaired for user: ${targetUserId.slice(0, 8)}`);
          }

          reports.push(report);

        } catch (error) {
          console.error(`[validateUserStats] ❌ Error processing user ${targetUserId}:`, error);
          reports.push({
            userId: targetUserId,
            isValid: false,
            discrepancies: [],
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Generate summary
      const summary = {
        totalUsers: reports.length,
        validUsers: reports.filter(r => r.isValid && !r.error).length,
        invalidUsers: reports.filter(r => !r.isValid && !r.error).length,
        errorUsers: reports.filter(r => r.error).length,
        repairedUsers: reports.filter(r => r.repaired).length
      };

      console.log(`[validateUserStats] 📊 Validation summary:`, summary);

      const responseData = {
        success: true,
        summary,
        reports,
        requestInfo: {
          repair,
          includeInconsistencies,
          timestamp: new Date().toISOString()
        }
      };

      console.log(`[validateUserStats] ✅ Request completed successfully`);
      response.status(200).json(responseData);

    } catch (error) {
      console.error(`[validateUserStats] ❌ Request failed:`, error);
      response.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
);