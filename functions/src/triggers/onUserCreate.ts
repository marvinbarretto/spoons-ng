/**
 * @fileoverview Cloud Function trigger for user creation
 * 
 * TRIGGERS: When a new document is created in the 'users' collection
 * 
 * RESPONSIBILITIES:
 * - Initialize user stats to consistent zero values
 * - Validate user document structure
 * - Set up default user preferences
 * - Log user creation for monitoring
 */

import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { User } from '../models/user.model';

const db = getFirestore();

export const onUserCreate = onDocumentCreated(
  'users/{userId}',
  async (event) => {
    const userId = event.params.userId;
    const userData = event.data?.data() as User;

    console.log(`[onUserCreate] 🚀 New user created: ${userId.slice(0, 8)}`);
    console.log(`[onUserCreate] Display name: ${userData?.displayName || 'None'}`);
    console.log(`[onUserCreate] Email: ${userData?.email || 'None'}`);
    console.log(`[onUserCreate] Is anonymous: ${userData?.isAnonymous || false}`);

    if (!userData) {
      console.error(`[onUserCreate] ❌ No user data found for: ${userId}`);
      return;
    }

    try {
      // 🔧 Step 1: Ensure consistent initial stats
      console.log(`[onUserCreate] 🔧 Ensuring consistent initial user stats...`);
      
      const statsUpdates: Partial<User> = {
        totalPoints: 0,
        verifiedPubCount: 0,
        unverifiedPubCount: 0,
        totalPubCount: 0,
        badgeCount: 0,
        badgeIds: [],
        landlordCount: 0,
        landlordPubIds: [],
        joinedMissionIds: [],
        manuallyAddedPubIds: [],
        lastStatsUpdate: new Date().toISOString(),
        realUser: !userData.isAnonymous // Mark real users based on auth type
      };

      // Only update if any of these fields are missing or incorrect
      const needsUpdate = Object.keys(statsUpdates).some(key => {
        const currentValue = userData[key as keyof User];
        const expectedValue = statsUpdates[key as keyof User];
        return currentValue !== expectedValue;
      });

      if (needsUpdate) {
        console.log(`[onUserCreate] 📝 Updating user document with consistent initial stats...`);
        await db.collection('users').doc(userId).update(statsUpdates);
        console.log(`[onUserCreate] ✅ User stats initialized:`, statsUpdates);
      } else {
        console.log(`[onUserCreate] ✅ User stats already properly initialized`);
      }

      // 📊 Step 2: Log user creation for analytics
      console.log(`[onUserCreate] 📊 Logging user creation event...`);
      await db.collection('user-events').add({
        eventType: 'user_created',
        userId,
        userData: {
          displayName: userData.displayName,
          email: userData.email,
          isAnonymous: userData.isAnonymous,
          emailVerified: userData.emailVerified,
          realUser: !userData.isAnonymous
        },
        timestamp: new Date(),
        source: 'cloud_function'
      });

      // 🎉 Step 3: Log successful completion
      console.log(`[onUserCreate] 🎉 User creation processing completed successfully`);
      console.log(`[onUserCreate] ├─ User ID: ${userId.slice(0, 8)}`);
      console.log(`[onUserCreate] ├─ Display name: ${userData.displayName || 'None'}`);
      console.log(`[onUserCreate] ├─ User type: ${userData.isAnonymous ? 'Anonymous' : 'Real User'}`);
      console.log(`[onUserCreate] └─ Stats initialized: ${needsUpdate ? 'Yes' : 'Already correct'}`);

    } catch (error) {
      console.error(`[onUserCreate] ❌ Error processing user creation ${userId}:`, error);
      
      // Log the error to a special collection for monitoring
      try {
        await db.collection('function-errors').add({
          functionName: 'onUserCreate',
          userId,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
          userData
        });
        console.log(`[onUserCreate] 📝 Error logged to function-errors collection`);
      } catch (logError) {
        console.error(`[onUserCreate] ❌ Failed to log error:`, logError);
      }

      // Don't throw the error - we don't want to retry this function
      // The user has already been created, we just need to handle the consequences
    }
  }
);