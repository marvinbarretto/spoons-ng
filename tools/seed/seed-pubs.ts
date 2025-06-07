import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as serviceAccount from './serviceAccountKey.json';
import { pubs } from './pubs';

initializeApp({
  credential: cert(serviceAccount as any),
});

const db = getFirestore();

/**
 * Generate a URL-friendly slug from pub name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')         // Spaces to hyphens
    .replace(/-+/g, '-')          // Multiple hyphens to single
    .trim();
}

/**
 * Generate a unique slug by appending city if needed
 */
function generateUniqueSlug(name: string, city?: string): string {
  const baseSlug = generateSlug(name);

  if (city) {
    const citySlug = generateSlug(city);
    return `${baseSlug}-${citySlug}`;
  }

  return baseSlug;
}

/**
 * Validate and fix pub data
 */
function validatePub(pub: any, index: number): any {
  // ✅ CRITICAL: Ensure every pub has an ID
  if (!pub.id) {
    const generatedId = generateUniqueSlug(pub.name, pub.city);
    console.warn(`⚠️  Pub #${index} "${pub.name}" missing ID, generated: ${generatedId}`);
    pub.id = generatedId;
  }

  // ✅ Validate required fields
  if (!pub.name) {
    throw new Error(`Pub #${index} missing required field: name`);
  }

  if (!pub.address) {
    console.warn(`⚠️  Pub "${pub.name}" missing address`);
  }

  // ✅ Validate location coordinates
  if (pub.location) {
    if (pub.location.lat === null || pub.location.lng === null) {
      console.warn(`⚠️  Pub "${pub.name}" has null coordinates - distance calculations will fail`);
    }
  } else {
    console.warn(`⚠️  Pub "${pub.name}" missing location object`);
    pub.location = { lat: null, lng: null };
  }

  // ✅ Set defaults for optional fields
  if (!pub.carpetUrl) {
    pub.carpetUrl = '';
  }

  return pub;
}

async function seed() {
  console.log(`🌱 Starting to seed ${pubs.length} pubs...`);

  const processedPubs: any[] = [];
  const usedIds = new Set<string>();

  // ✅ First pass: Validate and fix all pubs
  for (let i = 0; i < pubs.length; i++) {
    try {
      let pub = validatePub({ ...pubs[i] }, i);

      // ✅ Handle duplicate IDs
      if (usedIds.has(pub.id)) {
        const originalId = pub.id;
        pub.id = `${pub.id}-${Date.now()}`;
        console.warn(`⚠️  Duplicate ID "${originalId}" found, changed to: ${pub.id}`);
      }

      usedIds.add(pub.id);
      processedPubs.push(pub);

    } catch (error) {
      console.error(`❌ Failed to process pub #${i}:`, error);
      throw error;
    }
  }

  console.log(`✅ Validated ${processedPubs.length} pubs`);

  // ✅ Second pass: Upload to Firestore
  let successCount = 0;
  let errorCount = 0;

  for (const pub of processedPubs) {
    try {
      await db.collection('pubs').doc(pub.id).set(pub);
      successCount++;

      if (successCount % 10 === 0) {
        console.log(`📈 Progress: ${successCount}/${processedPubs.length} pubs seeded`);
      }

    } catch (error) {
      errorCount++;
      console.error(`❌ Failed to seed pub "${pub.name}" (${pub.id}):`, error);
    }
  }

  console.log('\n🎉 Seeding complete!');
  console.log(`✅ Successfully seeded: ${successCount} pubs`);
  console.log(`❌ Failed: ${errorCount} pubs`);

  if (errorCount > 0) {
    console.log('\n⚠️  Some pubs failed to seed. Check errors above.');
    process.exit(1);
  }
}

// ✅ Add better error handling
seed().catch((error) => {
  console.error('💥 Seeding failed:', error);
  process.exit(1);
});

// npx ts-node --project tsconfig.seed.json tools/seed/seed-pubs.ts
