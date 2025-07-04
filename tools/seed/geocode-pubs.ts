import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Extract UK postcode from address string
 */
function extractPostcode(address: string): string | null {
  // UK postcode regex pattern
  const postcodePattern = /\b[A-Z]{1,2}[0-9R][0-9A-Z]? ?[0-9][A-Z]{2}\b/g;
  const matches = address.match(postcodePattern);
  
  if (matches && matches.length > 0) {
    // Return the last match (should be the postcode at the end)
    return matches[matches.length - 1].trim();
  }
  
  return null;
}

/**
 * Geocode a UK postcode using postcodes.io API
 */
async function geocodePostcode(postcode: string): Promise<{ lat: number, lng: number } | null> {
  try {
    const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (data.status === 200 && data.result) {
      return {
        lat: data.result.latitude,
        lng: data.result.longitude
      };
    }
    
    return null;
  } catch (error) {
    console.warn(`⚠️  Error geocoding postcode ${postcode}:`, error);
    return null;
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Geocode all pubs with rate limiting
 */
async function geocodePubs(pubs: any[], testMode = false): Promise<any[]> {
  const results = [...pubs];
  const batchSize = testMode ? 5 : pubs.length;
  let successCount = 0;
  let failureCount = 0;
  let skipCount = 0;
  
  console.log(`🌍 Starting geocoding for ${testMode ? 'test batch of 5' : 'all'} pubs...`);
  
  for (let i = 0; i < Math.min(batchSize, pubs.length); i++) {
    const pub = results[i];
    
    // Skip if already has coordinates
    if (pub.location?.lat !== null && pub.location?.lng !== null) {
      skipCount++;
      continue;
    }
    
    // Extract postcode
    const postcode = extractPostcode(pub.address);
    
    if (!postcode) {
      console.warn(`⚠️  No postcode found for ${pub.name}: ${pub.address}`);
      failureCount++;
      continue;
    }
    
    // Geocode the postcode
    console.log(`🔍 Geocoding ${pub.name} (${postcode})...`);
    const coordinates = await geocodePostcode(postcode);
    
    if (coordinates) {
      pub.location = coordinates;
      successCount++;
      console.log(`✅ ${pub.name}: ${coordinates.lat}, ${coordinates.lng}`);
    } else {
      console.warn(`❌ Failed to geocode ${pub.name} (${postcode})`);
      failureCount++;
    }
    
    // Progress update
    if ((i + 1) % 50 === 0) {
      console.log(`📈 Progress: ${i + 1}/${batchSize} processed`);
    }
    
    // Rate limiting: 100ms between requests
    await sleep(100);
  }
  
  console.log('\n🎉 Geocoding complete!');
  console.log(`✅ Successfully geocoded: ${successCount} pubs`);
  console.log(`❌ Failed to geocode: ${failureCount} pubs`);
  console.log(`⏭️  Already had coordinates: ${skipCount} pubs`);
  
  return results;
}

/**
 * Main geocoding function
 */
async function main() {
  try {
    const parsedPubsPath = join(__dirname, 'parsed-pubs.ts');
    const backupPath = join(__dirname, 'parsed-pubs.backup.ts');
    
    // Read the parsed pubs file
    console.log('📖 Reading parsed pubs file...');
    const fileContent = readFileSync(parsedPubsPath, 'utf-8');
    
    // Extract the array from the TypeScript file
    const arrayMatch = fileContent.match(/export const parsedPubs = (\[[\s\S]*?\]);/);
    if (!arrayMatch) {
      throw new Error('Could not find parsedPubs array in file');
    }
    
    const pubs = JSON.parse(arrayMatch[1]);
    console.log(`📊 Found ${pubs.length} pubs to process`);
    
    // Check if this is a test run
    const testMode = process.argv.includes('--test');
    
    if (testMode) {
      console.log('🧪 Running in test mode (first 5 pubs only)');
    }
    
    // Create backup
    writeFileSync(backupPath, fileContent);
    console.log(`💾 Backup created: ${backupPath}`);
    
    // Geocode the pubs
    const geocodedPubs = await geocodePubs(pubs, testMode);
    
    // Generate updated TypeScript file
    const updatedContent = `export const parsedPubs = ${JSON.stringify(geocodedPubs, null, 2)};

// Total pubs: ${geocodedPubs.length}
// Geocoded on: ${new Date().toISOString()}
// API used: postcodes.io
`;
    
    // Write updated file
    writeFileSync(parsedPubsPath, updatedContent);
    console.log(`📁 Updated: ${parsedPubsPath}`);
    
    // Show sample of geocoded pubs
    console.log('\n📍 Sample of geocoded pubs:');
    const geocodedSample = geocodedPubs
      .filter(pub => pub.location?.lat !== null)
      .slice(0, 3);
    
    geocodedSample.forEach((pub, index) => {
      console.log(`  ${index + 1}. ${pub.name}`);
      console.log(`     Coordinates: ${pub.location.lat}, ${pub.location.lng}`);
      console.log(`     Postcode: ${extractPostcode(pub.address)}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { geocodePubs, extractPostcode, geocodePostcode };

// Usage: 
// Test mode: npx ts-node --project tsconfig.seed.json tools/seed/geocode-pubs.ts --test
// Full run: npx ts-node --project tsconfig.seed.json tools/seed/geocode-pubs.ts