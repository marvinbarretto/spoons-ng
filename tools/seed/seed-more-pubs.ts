import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as serviceAccount from './serviceAccountKey.json';
import { pubs } from './pubs';

initializeApp({
  credential: cert(serviceAccount as any),
});

const db = getFirestore();

async function seed() {
  for (const pub of pubs) {
    const docRef = db.collection('pubs').doc(pub.id);
    const snapshot = await docRef.get();

    if (snapshot.exists) {
      console.log(`🔹 Skipping “${pub.name}” (${pub.id}) — already exists.`);
      continue;
    }

    await docRef.set(pub);
    console.log(`✅ Added new pub “${pub.name}” (${pub.id}).`);
  }

  console.log('Seeding pubs complete (skipped existing docs)');
}
seed().catch(console.error);


// npx ts-node --project tsconfig.seed.json tools/seed/seed-more-pubs.ts
