import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as serviceAccount from './serviceAccountKey.json';
import { pubs } from './pubs';

initializeApp({
  credential: cert(serviceAccount as any),
});

const db = getFirestore();

// TODO:  Later, add a --safe flag or separate script for "merge mode", log to console output etc

async function seed() {
  for (const pub of pubs) {
    await db.collection('pubs').doc(pub.id).set(pub);
  }

  console.log('Seeding pubs complete');
}

seed();

// npx ts-node --project tsconfig.seed.json tools/seed/seed-pubs.ts
