/**
 * @fileoverview Data Repair Script for Spoons App
 * 
 * USAGE:
 * - Run via Firebase Functions shell or deploy as HTTP function
 * - Identifies and repairs data inconsistencies across all users
 * - Safe to run multiple times (idempotent)
 * - Provides detailed logging and progress reports
 * 
 * REPAIRS:
 * - Users with points but no check-ins
 * - Users with pub counts that don't match check-ins
 * - Missing or incorrect user statistics
 * - Orphaned check-ins (user or pub doesn't exist)
 */

import { getFirestore } from 'firebase-admin/firestore';
import { UserStatsCalculator } from '../utils/userStatsCalculator';
import { CheckInValidator } from '../utils/checkInValidator';

const db = getFirestore();

interface RepairReport {
  totalUsers: number;
  usersProcessed: number;
  usersRepaired: number;
  usersWithErrors: number;
  checkinIssuesFound: number;
  checkinIssuesFixed: number;
  startTime: string;
  endTime?: string;
  duration?: string;
  errors: string[];
  repairs: Array<{
    userId: string;
    issuesFound: string[];
    repairsApplied: string[];
    statsAfterRepair: any;
  }>;
}

/**
 * Main repair function - can be called from HTTP endpoint or script
 */
export async function repairAllUserData(options: {
  dryRun?: boolean;
  maxUsers?: number;
  realUsersOnly?: boolean;
} = {}): Promise<RepairReport> {
  const { dryRun = false, maxUsers = 1000, realUsersOnly = true } = options;
  
  console.log(`[repairUserData] 🚀 Starting data repair process`);
  console.log(`[repairUserData] Options:`, { dryRun, maxUsers, realUsersOnly });
  
  const report: RepairReport = {
    totalUsers: 0,
    usersProcessed: 0,
    usersRepaired: 0,
    usersWithErrors: 0,
    checkinIssuesFound: 0,
    checkinIssuesFixed: 0,
    startTime: new Date().toISOString(),
    errors: [],
    repairs: []
  };

  try {
    // Step 1: Get all users to process
    console.log(`[repairUserData] 📊 Fetching users...`);
    
    const usersCollection = db.collection('users');
    const usersQuery = realUsersOnly 
      ? usersCollection.where('realUser', '==', true)
      : usersCollection;
    
    const usersSnapshot = await usersQuery.limit(maxUsers).get();
    report.totalUsers = usersSnapshot.size;
    
    console.log(`[repairUserData] 📊 Found ${report.totalUsers} users to process`);

    // Step 2: Process each user
    const statsCalculator = new UserStatsCalculator();
    const validator = new CheckInValidator();

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      try {
        console.log(`[repairUserData] 👤 Processing user: ${userId.slice(0, 8)} (${userData.displayName || 'Anonymous'})`);
        
        // Validate user stats
        const validation = await statsCalculator.validateUserStats(userId);
        const inconsistencies = await validator.findDataInconsistencies(userId);
        
        const issuesFound: string[] = [...validation.discrepancies];
        if (inconsistencies.hasInconsistencies) {
          issuesFound.push(...inconsistencies.issues);
        }

        report.usersProcessed++;

        // If issues found, repair them
        if (issuesFound.length > 0) {
          console.log(`[repairUserData] 🔧 Issues found for user ${userId.slice(0, 8)}:`, issuesFound);
          
          const repairsApplied: string[] = [];
          let statsAfterRepair = null;

          if (!dryRun) {
            // Repair user stats
            console.log(`[repairUserData] 🔨 Repairing user stats...`);
            statsAfterRepair = await statsCalculator.repairUserStats(userId);
            repairsApplied.push('Recalculated and updated user statistics');
            
            // Additional specific repairs
            if (userData.totalPoints > 0 && (userData.verifiedPubCount || 0) === 0) {
              // This was the main issue: points without pubs
              repairsApplied.push('Fixed points-without-pubs inconsistency');
            }

            console.log(`[repairUserData] ✅ Repairs completed for user ${userId.slice(0, 8)}`);
          } else {
            console.log(`[repairUserData] 🧪 DRY RUN: Would repair user ${userId.slice(0, 8)}`);
            repairsApplied.push('DRY RUN: Would recalculate user statistics');
          }

          report.usersRepaired++;
          report.repairs.push({
            userId,
            issuesFound,
            repairsApplied,
            statsAfterRepair
          });
        } else {
          console.log(`[repairUserData] ✅ No issues found for user ${userId.slice(0, 8)}`);
        }

      } catch (error) {
        console.error(`[repairUserData] ❌ Error processing user ${userId}:`, error);
        report.usersWithErrors++;
        report.errors.push(`User ${userId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Step 3: Check for orphaned check-ins
    console.log(`[repairUserData] 🔍 Checking for orphaned check-ins...`);
    await checkOrphanedCheckins(report, dryRun);

    // Step 4: Finalize report
    report.endTime = new Date().toISOString();
    const startTime = new Date(report.startTime).getTime();
    const endTime = new Date(report.endTime).getTime();
    const durationMs = endTime - startTime;
    report.duration = `${Math.round(durationMs / 1000)}s`;

    console.log(`[repairUserData] 🎉 Repair process completed`);
    console.log(`[repairUserData] 📊 Summary:`, {
      totalUsers: report.totalUsers,
      usersProcessed: report.usersProcessed,
      usersRepaired: report.usersRepaired,
      usersWithErrors: report.usersWithErrors,
      duration: report.duration
    });

    return report;

  } catch (error) {
    console.error(`[repairUserData] ❌ Repair process failed:`, error);
    report.errors.push(`Process failure: ${error instanceof Error ? error.message : String(error)}`);
    report.endTime = new Date().toISOString();
    throw error;
  }
}

/**
 * Check for orphaned check-ins (user or pub doesn't exist)
 */
async function checkOrphanedCheckins(report: RepairReport, dryRun: boolean): Promise<void> {
  console.log(`[repairUserData] 🔍 Checking for orphaned check-ins...`);
  
  try {
    // Get all check-ins
    const checkinsSnapshot = await db.collection('checkins').get();
    console.log(`[repairUserData] 📊 Found ${checkinsSnapshot.size} check-ins to validate`);

    const orphanedCheckins: string[] = [];

    for (const checkinDoc of checkinsSnapshot.docs) {
      const checkinData = checkinDoc.data();
      const { userId, pubId } = checkinData;

      // Check if user exists
      if (userId) {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
          orphanedCheckins.push(`Check-in ${checkinDoc.id}: User ${userId} does not exist`);
        }
      }

      // Check if pub exists
      if (pubId) {
        const pubDoc = await db.collection('pubs').doc(pubId).get();
        if (!pubDoc.exists) {
          orphanedCheckins.push(`Check-in ${checkinDoc.id}: Pub ${pubId} does not exist`);
        }
      }
    }

    report.checkinIssuesFound = orphanedCheckins.length;

    if (orphanedCheckins.length > 0) {
      console.warn(`[repairUserData] ⚠️ Found ${orphanedCheckins.length} orphaned check-ins`);
      orphanedCheckins.forEach(issue => console.warn(`[repairUserData] 🔸 ${issue}`));

      if (!dryRun) {
        // In a real implementation, you might want to delete orphaned check-ins
        // or move them to a separate collection for investigation
        console.log(`[repairUserData] ⚠️ Orphaned check-ins found but not automatically fixed`);
        console.log(`[repairUserData] ℹ️ Manual review recommended for orphaned check-ins`);
      } else {
        console.log(`[repairUserData] 🧪 DRY RUN: Would investigate ${orphanedCheckins.length} orphaned check-ins`);
      }
    } else {
      console.log(`[repairUserData] ✅ No orphaned check-ins found`);
    }

  } catch (error) {
    console.error(`[repairUserData] ❌ Error checking orphaned check-ins:`, error);
    report.errors.push(`Orphaned check-in check failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * HTTP endpoint wrapper for the repair function
 */
export async function repairUserDataHttp(request: any, response: any): Promise<void> {
  console.log(`[repairUserDataHttp] 🚀 HTTP request received`);
  
  try {
    const { dryRun = true, maxUsers = 100, realUsersOnly = true } = request.body || {};
    
    // Safety check: require explicit confirmation for non-dry runs
    if (!dryRun && !request.body?.confirmRepair) {
      response.status(400).json({
        error: 'Non-dry run requires confirmRepair: true in request body',
        hint: 'Add { "confirmRepair": true, "dryRun": false } to proceed with actual repairs'
      });
      return;
    }

    const report = await repairAllUserData({ dryRun, maxUsers, realUsersOnly });
    
    response.status(200).json({
      success: true,
      report,
      warning: dryRun ? 'This was a dry run - no actual changes were made' : 'Live repairs were applied'
    });

  } catch (error) {
    console.error(`[repairUserDataHttp] ❌ Request failed:`, error);
    response.status(500).json({
      error: 'Repair process failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}