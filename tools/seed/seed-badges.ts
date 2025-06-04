import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as serviceAccount from './serviceAccountKey.json';

initializeApp({
  credential: cert(serviceAccount as any),
});

const db = getFirestore();

async function seedBadges() {
  const badges = [
    {
      id: 'first-checkin',
      name: 'First Check-in',
      description: 'Awarded for your very first pub check-in!',
      emoji: '🌟',
      criteria: 'first-checkin',
      createdAt: new Date(),
    },
    {
      id: 'early-riser',
      name: 'Early Riser',
      description: 'Checked in before noon',
      emoji: '🌞',
      criteria: 'early-riser',
      createdAt: new Date(),
    },
    {
      id: 'night-owl',
      name: 'Night Owl',
      description: 'Checked in after 9pm',
      emoji: '🌙',
      criteria: 'night-owl',
      createdAt: new Date(),
    },
    {
      id: 'loyal-local',
      name: 'Loyal Local',
      description: 'Returned to the same pub 3 times',
      emoji: '🏠',
      criteria: 'repeat-pub',
      createdAt: new Date(),
    },
    {
      id: 'streak-3',
      name: '3-Day Streak',
      description: 'Checked in 3 days in a row',
      emoji: '🔥',
      criteria: 'streak-3',
      createdAt: new Date(),
    },
  ];

  for (const badge of badges) {
    await db.collection('badges').doc(badge.id).set(badge);
  }

  console.log('✅ Seeding badges complete');
}

seedBadges();

// npx ts-node --project tsconfig.seed.json tools/seed/seed-badges.ts
