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
  const missions = [
    {
      id: 'hertfordshire-pubs',
      title: 'Hertfordshire Crawl',
      description: 'Collect every pub in Hertfordshire',
      pubIds: pubs.filter(p => p.region.includes('Hertfordshire')).map(p => p.id),
    },
    {
      id: 'london-legends',
      title: 'London Legends',
      description: 'Visit iconic pubs across Greater London',
      pubIds: pubs.filter(p => p.city.includes('London')).slice(0, 10).map(p => p.id),
    },
    {
      id: 'coastal-classics',
      title: 'Coastal Classics',
      description: 'Drink your way around the coast',
      pubIds: pubs.filter(p => ['Brighton', 'Whitby', 'Scarborough', 'Cornwall'].some(town => p.city.includes(town))).map(p => p.id),
    },
    {
      id: 'random-five',
      title: 'Random Five',
      description: 'Just five random pubs to get you started',
      pubIds: pubs.slice(0, 5).map(p => p.id),
    },
    {
      id: 'alphabet-tour',
      title: 'Alphabet Tour',
      description: 'A pub for every starting letter (almost)',
      pubIds: pubs.filter((p, i, arr) => arr.findIndex(q => q.name[0] === p.name[0]) === i).map(p => p.id),
    },
  ];

  for (const mission of missions) {
    await db.collection('missions').doc(mission.id).set(mission);
  }

  console.log('Seeding missions complete');
}

seed();

// npx ts-node --project tsconfig.seed.json tools/seed/seed-missions.ts
