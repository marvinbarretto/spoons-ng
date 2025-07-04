import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as serviceAccount from './serviceAccountKey.json';

initializeApp({
  credential: cert(serviceAccount as any),
});

const db = getFirestore();

async function seedBadges() {
  console.log('🏆 Creating 40+ badges (26 themed mission + 14 achievements + 1 legendary)...');

  const badges = [
    // === THEMED MISSION BADGES (16) ===
    {
      id: 'fleet-admiral',
      name: 'Fleet Admiral',
      description: 'Naval heritage collector - When Britain ruled the waves and the bar tabs',
      emoji: '⚓',
      criteria: 'mission-admirals-fleet',
      missionId: 'admirals-fleet',
      type: 'mission',
      createdAt: new Date(),
    },
    {
      id: 'royal-collector',
      name: 'Royal Collector',
      description: 'Crown jewel hunter - Every George, William, and royal pretender conquered',
      emoji: '👑',
      criteria: 'mission-royal-bloodline',
      missionId: 'royal-bloodline',
      type: 'mission',
      createdAt: new Date(),
    },
    {
      id: 'industrial-archaeologist',
      name: 'Industrial Archaeologist',
      description: 'Mining heritage expert - Commemorating when Britain actually made things',
      emoji: '⚒️',
      criteria: 'mission-industrial-decay-tour',
      missionId: 'industrial-decay-tour',
      type: 'mission',
      createdAt: new Date(),
    },
    {
      id: 'railway-baron',
      name: 'Railway Baron',
      description: 'Transport heritage master - From the golden age of steam and platform pints',
      emoji: '🚂',
      criteria: 'mission-railway-pioneers',
      missionId: 'railway-pioneers',
      type: 'mission',
      createdAt: new Date(),
    },
    {
      id: 'knight-errant',
      name: 'Knight Errant',
      description: 'Feudal pub crusader - Every Sir and noble connection because hierarchy matters',
      emoji: '⚔️',
      criteria: 'mission-knights-and-nobles',
      missionId: 'knights-and-nobles',
      type: 'mission',
      createdAt: new Date(),
    },
    {
      id: 'moon-walker',
      name: 'Moon Walker',
      description: 'Lunar obsession champion - Someone at Wetherspoons really loves astronomy',
      emoji: '🌙',
      criteria: 'mission-moon-chasers',
      missionId: 'moon-chasers',
      type: 'mission',
      createdAt: new Date(),
    },
    {
      id: 'lion-tamer',
      name: 'Lion Tamer',
      description: 'Red Lion safari master - Conquered the most unimaginative pub name in Britain',
      emoji: '🦁',
      criteria: 'mission-red-lion-safari',
      missionId: 'red-lion-safari',
      type: 'mission',
      createdAt: new Date(),
    },
    {
      id: 'crown-collector',
      name: 'Crown Collector',
      description: 'Royal pub specialist - Every Crown variation because monarchy sells beer',
      emoji: '💎',
      criteria: 'mission-crown-jewels',
      missionId: 'crown-jewels',
      type: 'mission',
      createdAt: new Date(),
    },
    {
      id: 'sea-captain',
      name: 'Sea Captain',
      description: 'Maritime heritage master - Ports, ferries, and docks of the former empire',
      emoji: '⛵',
      criteria: 'mission-maritime-heritage',
      missionId: 'maritime-heritage',
      type: 'mission',
      createdAt: new Date(),
    },
    {
      id: 'frequent-flyer',
      name: 'Frequent Flyer',
      description: 'Airport lounge legend - Because delayed flights need proper preparation',
      emoji: '✈️',
      criteria: 'mission-airport-loungers',
      missionId: 'airport-loungers',
      type: 'mission',
      createdAt: new Date(),
    },
    {
      id: 'platform-porter',
      name: 'Platform Porter',
      description: 'Station hopping specialist - The civilized way to wait for delayed trains',
      emoji: '🚉',
      criteria: 'mission-station-hoppers',
      missionId: 'station-hoppers',
      type: 'mission',
      createdAt: new Date(),
    },
    {
      id: 'scholar-rebel',
      name: 'Scholar Rebel',
      description: 'University dropout champion - Where academic dreams go to die in style',
      emoji: '🎓',
      criteria: 'mission-university-dropout',
      missionId: 'university-dropout',
      type: 'mission',
      createdAt: new Date(),
    },
    {
      id: 'alphabet-master',
      name: 'Alphabet Master',
      description: 'A-Z completionist - One for every letter because perfectionism is a disease',
      emoji: '🔤',
      criteria: 'mission-alphabet-challenge',
      missionId: 'alphabet-challenge',
      type: 'mission',
      createdAt: new Date(),
    },
    {
      id: 'forgotten-hero',
      name: 'Forgotten Hero',
      description: 'Military brass historian - Every naval defeat deserves a pub memorial',
      emoji: '🎖️',
      criteria: 'mission-forgotten-admirals',
      missionId: 'forgotten-admirals',
      type: 'mission',
      createdAt: new Date(),
    },
    {
      id: 'four-corners-master',
      name: 'Four Corners Master',
      description: 'Extreme geographical explorer - Conquered Britain\'s most remote pub outposts',
      emoji: '🧭',
      criteria: 'mission-four-corners-challenge',
      missionId: 'four-corners-challenge',
      type: 'mission',
      createdAt: new Date(),
    },
    {
      id: 'coastal-crusader',
      name: 'Coastal Crusader',
      description: 'Seaside specialist - Where salt air meets sticky carpets and seagull warfare',
      emoji: '🌊',
      criteria: 'mission-coastal-carpet-crawl',
      missionId: 'coastal-carpet-crawl',
      type: 'mission',
      createdAt: new Date(),
    },
    {
      id: 'river-navigator',
      name: 'River Navigator',
      description: 'Waterway wanderer - Followed Britain\'s liquid highways to alcoholic enlightenment',
      emoji: '🌉',
      criteria: 'mission-river-runners',
      missionId: 'river-runners',
      type: 'mission',
      createdAt: new Date(),
    },
    {
      id: 'island-explorer',
      name: 'Island Explorer',
      description: 'Isolated drinking champion - Conquered Britain\'s forgotten island outposts',
      emoji: '🏝️',
      criteria: 'mission-island-hoppers',
      missionId: 'island-hoppers',
      type: 'mission',
      createdAt: new Date(),
    },
    {
      id: 'highland-warrior',
      name: 'Highland Warrior',
      description: 'Mountain pub conqueror - Scaled peaks for the perfect pint with a view',
      emoji: '🏔️',
      criteria: 'mission-highland-fling',
      missionId: 'highland-fling',
      type: 'mission',
      createdAt: new Date(),
    },
    {
      id: 'seaside-specialist',
      name: 'Seaside Specialist',
      description: 'Coastal resort master - Brighton to Blackpool, bucket-and-spade Britain conquered',
      emoji: '🏖️',
      criteria: 'mission-seaside-specials',
      missionId: 'seaside-specials',
      type: 'mission',
      createdAt: new Date(),
    },
    {
      id: 'border-raider',
      name: 'Border Raider',
      description: 'Cross-country diplomat - Where accents get confused and borders blur over beer',
      emoji: '🗺️',
      criteria: 'mission-border-raiders',
      missionId: 'border-raiders',
      type: 'mission',
      createdAt: new Date(),
    },
    {
      id: 'lands-end-legend',
      name: 'Land\'s End Legend',
      description: 'Ultimate journey master - Cornwall to Scotland, the epic British pub crawl',
      emoji: '🛣️',
      criteria: 'mission-lands-end-to-john-ogroats',
      missionId: 'lands-end-to-john-ogroats',
      type: 'mission',
      createdAt: new Date(),
    },
    {
      id: 'capital-crawler',
      name: 'Capital Crawler',
      description: 'Power center specialist - London, Edinburgh, Cardiff, Belfast political pub tour',
      emoji: '🏛️',
      criteria: 'mission-capital-crawl',
      missionId: 'capital-crawl',
      type: 'mission',
      createdAt: new Date(),
    },
    {
      id: 'national-park-pioneer',
      name: 'National Park Pioneer',
      description: 'Wilderness drinking expert - Found civilization in Britain\'s most beautiful landscapes',
      emoji: '🌲',
      criteria: 'mission-national-park-explorer',
      missionId: 'national-park-explorer',
      type: 'mission',
      createdAt: new Date(),
    },
    {
      id: 'border-guard',
      name: 'Border Guard',
      description: 'International pub diplomat - Master of cross-border drinking relations',
      emoji: '🗺️',
      criteria: 'mission-border-crossing',
      missionId: 'border-crossing',
      type: 'mission',
      createdAt: new Date(),
    },

    // === ACHIEVEMENT BADGES (14) ===
    {
      id: 'first-timer',
      name: 'First Timer',
      description: 'Popped your Spoons cherry - Welcome to the most ridiculous competition you\'ll care about',
      emoji: '🌟',
      criteria: 'first-checkin',
      type: 'achievement',
      createdAt: new Date(),
    },
    {
      id: 'early-bird',
      name: 'Early Bird',
      description: 'Pre-noon pioneer - Drinking before the sun reaches its peak, absolute legend',
      emoji: '🌅',
      criteria: 'checkin-before-noon',
      type: 'achievement',
      createdAt: new Date(),
    },
    {
      id: 'night-owl',
      name: 'Night Owl',
      description: 'After-hours enthusiast - When sensible people go home, you\'re just getting started',
      emoji: '🦉',
      criteria: 'checkin-after-21',
      type: 'achievement',
      createdAt: new Date(),
    },
    {
      id: 'streak-master',
      name: 'Streak Master',
      description: 'Seven-day warrior - A full week of Spoons dedication, your liver salutes you',
      emoji: '🔥',
      criteria: 'checkin-streak-7',
      type: 'achievement',
      createdAt: new Date(),
    },
    {
      id: 'carpet-photographer',
      name: 'Carpet Photographer',
      description: 'Pattern documentation expert - 50 carpet photos because someone has to preserve this art',
      emoji: '📸',
      criteria: 'carpet-photos-50',
      type: 'achievement',
      createdAt: new Date(),
    },
    {
      id: 'local-legend',
      name: 'Local Legend',
      description: 'Neighborhood regular - Same pub 25 times, you\'re practically part of the furniture',
      emoji: '🏠',
      criteria: 'same-pub-25',
      type: 'achievement',
      createdAt: new Date(),
    },
    {
      id: 'chain-avoider',
      name: 'Chain Avoider',
      description: 'Independent pub warrior - 15 consecutive non-chain visits, fighting the good fight',
      emoji: '⛓️‍💥',
      criteria: 'no-chains-consecutive-15',
      type: 'achievement',
      createdAt: new Date(),
    },
    {
      id: 'weather-warrior',
      name: 'Weather Warrior',
      description: 'Storm chaser - Checked in during proper British weather, dedication to the cause',
      emoji: '⛈️',
      criteria: 'bad-weather-checkin',
      type: 'achievement',
      createdAt: new Date(),
    },
    {
      id: 'speed-demon',
      name: 'Speed Demon',
      description: 'Rapid-fire regular - 5 different pubs in one day, efficiency or madness?',
      emoji: '💨',
      criteria: 'five-pubs-one-day',
      type: 'achievement',
      createdAt: new Date(),
    },
    {
      id: 'regional-champion',
      name: 'Regional Champion',
      description: 'County conqueror - Completed your first regional mission, one of many to come',
      emoji: '🏆',
      criteria: 'first-regional-mission',
      type: 'achievement',
      createdAt: new Date(),
    },
    {
      id: 'multi-regional-master',
      name: 'Multi-Regional Master',
      description: 'Territory collector - Conquered 5 different regions, the map is your oyster',
      emoji: '🗺️',
      criteria: 'complete-5-regional-missions',
      type: 'achievement',
      createdAt: new Date(),
    },
    {
      id: 'country-hopper',
      name: 'Country Hopper',
      description: 'International traveler - Checked in across England, Scotland, Wales, or Ireland',
      emoji: '🌍',
      criteria: 'visit-multiple-countries',
      type: 'achievement',
      createdAt: new Date(),
    },
    {
      id: 'mission-obsessed',
      name: 'Mission Obsessed',
      description: 'Collection completionist - Finished 10 themed missions, you might have a problem',
      emoji: '🎯',
      criteria: 'complete-10-themed-missions',
      type: 'achievement',
      createdAt: new Date(),
    },
    {
      id: 'ultimate-collector',
      name: 'Ultimate Collector',
      description: 'The final frontier - 100 different pubs visited, carpet connoisseur status achieved',
      emoji: '🎖️',
      criteria: 'visit-100-pubs',
      type: 'achievement',
      createdAt: new Date(),
    }
  ];

  // Add one special "tier" badge
  badges.push({
    id: 'carpet-connoisseur',
    name: 'Carpet Connoisseur',
    description: 'Supreme pattern recognition expert - You\'ve transcended mere pub visiting to become one with the floor',
    emoji: '🧙‍♂️',
    criteria: 'master-level-achievement',
    type: 'legendary',
    createdAt: new Date(),
  });

  console.log(`📊 Badge breakdown:`);
  console.log(`   🎪 Themed mission badges: ${badges.filter(b => b.type === 'mission').length}`);
  console.log(`   🎖️ Achievement badges: ${badges.filter(b => b.type === 'achievement').length}`);
  console.log(`   ✨ Legendary badges: ${badges.filter(b => b.type === 'legendary').length}`);
  console.log(`   📋 Total badges: ${badges.length}`);

  let successCount = 0;
  let errorCount = 0;

  for (const badge of badges) {
    try {
      await db.collection('badges').doc(badge.id).set(badge);
      successCount++;
    } catch (error) {
      errorCount++;
      console.error(`❌ Failed to seed badge "${badge.name}":`, error);
    }
  }

  console.log('\n🎉 Badge seeding complete!');
  console.log(`✅ Successfully seeded: ${successCount} badges`);
  console.log(`❌ Failed: ${errorCount} badges`);

  if (errorCount > 0) {
    console.log('\n⚠️  Some badges failed to seed. Check errors above.');
    process.exit(1);
  }
}

seedBadges().catch((error) => {
  console.error('💥 Badge seeding failed:', error);
  process.exit(1);
});

// npx ts-node --project tsconfig.seed.json tools/seed/seed-badges.ts