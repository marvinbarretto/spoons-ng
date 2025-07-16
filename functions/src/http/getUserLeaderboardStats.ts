/**
 * @fileoverview HTTP Cloud Function for getting real-time leaderboard statistics
 * 
 * ENDPOINT: GET /getUserLeaderboardStats
 * 
 * RESPONSIBILITIES:
 * - Return real-time user statistics for leaderboard
 * - Support filtering by real users only
 * - Calculate monthly vs all-time stats
 * - Provide verified vs total pub counts
 * - Ensure data consistency with check-ins
 * 
 * USAGE:
 * - GET /getUserLeaderboardStats?realUsersOnly=true&period=monthly&limit=50
 * - GET /getUserLeaderboardStats?userId=abc123
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { UserStatsCalculator } from '../utils/userStatsCalculator';

const db = getFirestore();

interface LeaderboardUser {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  realUser: boolean;
  
  // All-time stats
  totalPoints: number;
  totalCheckins: number;
  verifiedPubCount: number;
  unverifiedPubCount: number;
  totalPubCount: number;
  
  // Monthly stats (current month)
  monthlyPoints: number;
  monthlyCheckins: number;
  monthlyPubs: number;
  
  // Metadata
  joinedAt: string;
  lastStatsUpdate?: string;
}

interface LeaderboardResponse {
  users: LeaderboardUser[];
  metadata: {
    totalUsers: number;
    realUsersOnly: boolean;
    period: 'monthly' | 'all-time' | 'both';
    currentMonth: string;
    generatedAt: string;
    limit: number;
  };
}

export const getUserLeaderboardStats = onRequest(
  { cors: true },
  async (request, response) => {
    console.log(`[getUserLeaderboardStats] 🚀 HTTP request received`);
    console.log(`[getUserLeaderboardStats] Method: ${request.method}`);
    console.log(`[getUserLeaderboardStats] Query:`, request.query);

    // Only allow GET requests
    if (request.method !== 'GET') {
      console.log(`[getUserLeaderboardStats] ❌ Method not allowed: ${request.method}`);
      response.status(405).json({ 
        error: 'Method not allowed. Use GET.' 
      });
      return;
    }

    try {
      // Parse query parameters
      const {
        userId,
        realUsersOnly = 'true',
        period = 'both',
        limit = '100',
        sortBy = 'totalPoints'
      } = request.query as Record<string, string>;

      const limitNum = Math.min(parseInt(limit) || 100, 500); // Max 500 users
      const realUsersFilter = realUsersOnly === 'true';
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

      console.log(`[getUserLeaderboardStats] 📊 Parameters:`, {
        userId,
        realUsersOnly: realUsersFilter,
        period,
        limit: limitNum,
        sortBy,
        currentMonth
      });

      // Handle single user request
      if (userId) {
        console.log(`[getUserLeaderboardStats] 👤 Single user request: ${userId.slice(0, 8)}`);
        const userStats = await getSingleUserStats(userId, currentMonth);
        
        if (!userStats) {
          response.status(404).json({ error: 'User not found' });
          return;
        }

        response.status(200).json({
          user: userStats,
          metadata: {
            totalUsers: 1,
            realUsersOnly: false,
            period,
            currentMonth,
            generatedAt: new Date().toISOString(),
            limit: 1
          }
        });
        return;
      }

      // Build query for multiple users
      const usersCollection = db.collection('users');

      // Filter by real users if requested
      const usersQuery = realUsersFilter 
        ? usersCollection.where('realUser', '==', true)
        : usersCollection;

      // Execute query
      console.log(`[getUserLeaderboardStats] 📡 Fetching users from Firestore...`);
      const usersSnapshot = await usersQuery.get();
      
      console.log(`[getUserLeaderboardStats] 📊 Found ${usersSnapshot.size} users`);

      // Process users and calculate monthly stats
      const users: LeaderboardUser[] = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        
        try {
          // Calculate monthly stats
          const monthlyStats = await calculateMonthlyStats(userDoc.id, currentMonth);
          
          const leaderboardUser: LeaderboardUser = {
            uid: userDoc.id,
            displayName: userData.displayName || null,
            photoURL: userData.photoURL || null,
            isAnonymous: userData.isAnonymous || false,
            realUser: userData.realUser || false,
            
            // All-time stats
            totalPoints: userData.totalPoints || 0,
            totalCheckins: 0, // Will be calculated if needed
            verifiedPubCount: userData.verifiedPubCount || 0,
            unverifiedPubCount: userData.unverifiedPubCount || 0,
            totalPubCount: userData.totalPubCount || 0,
            
            // Monthly stats
            monthlyPoints: monthlyStats.monthlyPoints,
            monthlyCheckins: monthlyStats.monthlyCheckins,
            monthlyPubs: monthlyStats.monthlyPubs,
            
            // Metadata
            joinedAt: userData.joinedAt || new Date().toISOString(),
            lastStatsUpdate: userData.lastStatsUpdate
          };

          users.push(leaderboardUser);
        } catch (error) {
          console.warn(`[getUserLeaderboardStats] ⚠️ Error processing user ${userDoc.id}:`, error);
          // Skip this user and continue
        }
      }

      // Sort users based on sortBy parameter
      users.sort((a, b) => {
        switch (sortBy) {
          case 'monthlyPoints':
            return b.monthlyPoints - a.monthlyPoints;
          case 'verifiedPubCount':
            return b.verifiedPubCount - a.verifiedPubCount;
          case 'totalPubCount':
            return b.totalPubCount - a.totalPubCount;
          case 'monthlyPubs':
            return b.monthlyPubs - a.monthlyPubs;
          case 'totalPoints':
          default:
            return b.totalPoints - a.totalPoints;
        }
      });

      // Apply limit
      const limitedUsers = users.slice(0, limitNum);

      console.log(`[getUserLeaderboardStats] ✅ Returning ${limitedUsers.length} users`);

      const responseData: LeaderboardResponse = {
        users: limitedUsers,
        metadata: {
          totalUsers: users.length,
          realUsersOnly: realUsersFilter,
          period: period as 'monthly' | 'all-time' | 'both',
          currentMonth,
          generatedAt: new Date().toISOString(),
          limit: limitNum
        }
      };

      response.status(200).json(responseData);

    } catch (error) {
      console.error(`[getUserLeaderboardStats] ❌ Request failed:`, error);
      response.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

/**
 * Get stats for a single user
 */
async function getSingleUserStats(userId: string, currentMonth: string): Promise<LeaderboardUser | null> {
  const userDoc = await db.collection('users').doc(userId).get();
  
  if (!userDoc.exists) {
    return null;
  }

  const userData = userDoc.data()!;
  const monthlyStats = await calculateMonthlyStats(userId, currentMonth);

  return {
    uid: userId,
    displayName: userData.displayName || null,
    photoURL: userData.photoURL || null,
    isAnonymous: userData.isAnonymous || false,
    realUser: userData.realUser || false,
    
    totalPoints: userData.totalPoints || 0,
    totalCheckins: 0, // Not calculated for single user to save time
    verifiedPubCount: userData.verifiedPubCount || 0,
    unverifiedPubCount: userData.unverifiedPubCount || 0,
    totalPubCount: userData.totalPubCount || 0,
    
    monthlyPoints: monthlyStats.monthlyPoints,
    monthlyCheckins: monthlyStats.monthlyCheckins,
    monthlyPubs: monthlyStats.monthlyPubs,
    
    joinedAt: userData.joinedAt || new Date().toISOString(),
    lastStatsUpdate: userData.lastStatsUpdate
  };
}

/**
 * Calculate monthly stats for a user
 */
async function calculateMonthlyStats(userId: string, currentMonth: string): Promise<{
  monthlyPoints: number;
  monthlyCheckins: number;
  monthlyPubs: number;
}> {
  // Get check-ins for current month
  const startOfMonth = `${currentMonth}-01`;
  const endOfMonth = `${currentMonth}-31`; // Approximate end, Firestore will handle correctly
  
  const monthlyCheckinsSnapshot = await db
    .collection('checkins')
    .where('userId', '==', userId)
    .where('dateKey', '>=', startOfMonth)
    .where('dateKey', '<=', endOfMonth)
    .get();

  const monthlyCheckins = monthlyCheckinsSnapshot.docs.map(doc => doc.data());
  
  const monthlyPoints = monthlyCheckins.reduce((sum, checkin) => {
    return sum + (checkin.pointsEarned || 0);
  }, 0);

  const monthlyPubIds = new Set(monthlyCheckins.map(checkin => checkin.pubId));
  const monthlyPubs = monthlyPubIds.size;

  return {
    monthlyPoints,
    monthlyCheckins: monthlyCheckins.length,
    monthlyPubs
  };
}