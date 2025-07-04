import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

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
 * Extract pub data from HTML content
 */
function parseHtmlData(htmlContent: string) {
  console.log('🔍 Parsing HTML data...');
  
  const pubs: any[] = [];
  
  // Split by pub blocks - each pub starts with an <a> tag containing href
  const pubBlocks = htmlContent.split(/(?=<a href="[^"]*\/">\s*<img)/);
  
  console.log(`📊 Found ${pubBlocks.length} potential pub blocks`);
  
  for (let i = 0; i < pubBlocks.length; i++) {
    const block = pubBlocks[i];
    
    // Skip empty blocks
    if (!block.trim()) continue;
    
    try {
      // Extract pub name from <h3 class="name">
      const nameMatch = block.match(/<h3 class="name">([^<]+)<\/h3>/);
      if (!nameMatch) continue;
      
      const name = nameMatch[1].trim();
      
      // Extract address from <p class="address">
      const addressMatch = block.match(/<p class="address">([^<]+)\./);
      if (!addressMatch) continue;
      
      const fullAddress = addressMatch[1].trim();
      
      // Extract image URL from <img src="...">
      const imageMatch = block.match(/<img src="([^"]+)"/);
      const imageUrl = imageMatch ? imageMatch[1] : '';
      
      // Parse address components
      const addressParts = fullAddress.split(', ');
      const address = addressParts.slice(0, -2).join(', '); // Everything except last 2 parts
      const region = addressParts[addressParts.length - 2] || '';
      const postcodeMatch = addressParts[addressParts.length - 1];
      
      // Extract city (usually the part before region)
      let city = '';
      if (addressParts.length >= 3) {
        city = addressParts[addressParts.length - 3];
      }
      
      // Generate unique ID
      const id = generateUniqueSlug(name, city);
      
      const pub = {
        id,
        name,
        address: fullAddress,
        city,
        region,
        country: 'England', // Default, can be updated based on region
        location: {
          lat: null,
          lng: null
        },
        carpetUrl: imageUrl ? `https://carpets.example.com/${imageUrl}` : '' // Placeholder URL
      };
      
      pubs.push(pub);
      
      if (pubs.length % 100 === 0) {
        console.log(`📈 Processed ${pubs.length} pubs...`);
      }
      
    } catch (error) {
      console.warn(`⚠️  Error parsing pub block ${i}:`, error);
    }
  }
  
  console.log(`✅ Successfully parsed ${pubs.length} pubs`);
  return pubs;
}

/**
 * Main parsing function
 */
function main() {
  try {
    const htmlFilePath = join(__dirname, 'pub-data-source.html');
    const outputFilePath = join(__dirname, 'parsed-pubs.ts');
    
    console.log('📖 Reading HTML file...');
    const htmlContent = readFileSync(htmlFilePath, 'utf-8');
    
    console.log(`📏 HTML file size: ${(htmlContent.length / 1024).toFixed(1)}KB`);
    
    // Parse the HTML data
    const pubs = parseHtmlData(htmlContent);
    
    if (pubs.length === 0) {
      console.error('❌ No pubs found in HTML file');
      process.exit(1);
    }
    
    // Generate TypeScript output
    const tsContent = `export const parsedPubs = ${JSON.stringify(pubs, null, 2)};
    
// Total pubs parsed: ${pubs.length}
// Generated on: ${new Date().toISOString()}
`;
    
    // Write to file
    writeFileSync(outputFilePath, tsContent);
    
    console.log(`🎉 Successfully generated parsed-pubs.ts with ${pubs.length} pubs`);
    console.log(`📁 Output file: ${outputFilePath}`);
    
    // Show sample of first few pubs
    console.log('\n📋 Sample of parsed data:');
    pubs.slice(0, 3).forEach((pub, index) => {
      console.log(`  ${index + 1}. ${pub.name} (${pub.city})`);
      console.log(`     Address: ${pub.address}`);
      console.log(`     ID: ${pub.id}`);
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

export { parseHtmlData, generateUniqueSlug };

// Usage: npx ts-node --project tsconfig.seed.json tools/seed/parse-html-data.ts