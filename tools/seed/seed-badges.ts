import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as serviceAccount from './serviceAccountKey.json';

initializeApp({
  credential: cert(serviceAccount as any),
});

const db = getFirestore();

async function seedBadges() {
  const badges = [
    // === FIRST TIMER & BASICS ===
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
      id: 'streak-3',
      name: '3-Day Streak',
      description: 'Checked in 3 days in a row',
      emoji: '🔥',
      criteria: 'streak-3',
      createdAt: new Date(),
    },

    // === REGIONAL EXPLORER BADGES ===
    {
      id: 'northern-soul',
      name: 'Northern Soul',
      description: 'Checked into 5 pubs north of Manchester - proper grit and character',
      emoji: '🏔️',
      criteria: 'northern-pubs-5',
      createdAt: new Date(),
    },
    {
      id: 'southern-comfort',
      name: 'Southern Comfort',
      description: 'Visited 5 pubs south of London - where the beer flows like wine',
      emoji: '🌾',
      criteria: 'southern-pubs-5',
      createdAt: new Date(),
    },
    {
      id: 'midlands-wanderer',
      name: 'Midlands Wanderer',
      description: 'Explored the heart of England\'s pub scene - proper industrial heritage',
      emoji: '⚙️',
      criteria: 'midlands-pubs-5',
      createdAt: new Date(),
    },
    {
      id: 'scottish-adventurer',
      name: 'Scottish Adventurer',
      description: 'Brave enough to venture north of the border for a pint',
      emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
      criteria: 'scotland-pubs-3',
      createdAt: new Date(),
    },
    {
      id: 'welsh-warrior',
      name: 'Welsh Warrior',
      description: 'Conquered the valleys and their finest locals',
      emoji: '🐉',
      criteria: 'wales-pubs-3',
      createdAt: new Date(),
    },
    {
      id: 'cornish-pilgrim',
      name: 'Cornish Pilgrim',
      description: 'Made the sacred journey to the far southwest',
      emoji: '🏖️',
      criteria: 'cornwall-pubs-3',
      createdAt: new Date(),
    },
    {
      id: 'yorkshire-tyke',
      name: 'Yorkshire Tyke',
      description: 'God\'s own county pub crawler - where proper pints are served proper cheap',
      emoji: '🐑',
      criteria: 'yorkshire-pubs-5',
      createdAt: new Date(),
    },
    {
      id: 'london-cabbie',
      name: 'London Cabbie',
      description: 'Knows every pub within the M25 - avoid rush hour drinking',
      emoji: '🚕',
      criteria: 'london-pubs-10',
      createdAt: new Date(),
    },

    // === PUB CHAIN PATTERN BADGES ===
    {
      id: 'spoons-specialist',
      name: 'Spoons Specialist',
      description: 'Visited 10 different Wetherspoons - carpet pattern expert level achieved',
      emoji: '🥄',
      criteria: 'wetherspoons-10',
      createdAt: new Date(),
    },
    {
      id: 'greene-king-groupie',
      name: 'Greene King Groupie',
      description: 'Loyal to the crown of pub chains - IPA connoisseur',
      emoji: '👑',
      criteria: 'greene-king-5',
      createdAt: new Date(),
    },
    {
      id: 'independent-advocate',
      name: 'Independent Advocate',
      description: 'Champion of 20 independent pubs - fighting the good fight',
      emoji: '🍺',
      criteria: 'independent-pubs-20',
      createdAt: new Date(),
    },
    {
      id: 'chain-breaker',
      name: 'Chain Breaker',
      description: 'Avoided chains for 30 consecutive check-ins - rebel with a cause',
      emoji: '⛓️',
      criteria: 'no-chains-30',
      createdAt: new Date(),
    },
    {
      id: 'brand-collector',
      name: 'Brand Collector',
      description: 'Checked into 5 different pub chain brands - diversity is key',
      emoji: '📊',
      criteria: 'different-chains-5',
      createdAt: new Date(),
    },
    {
      id: 'local-hero',
      name: 'Local Hero',
      description: 'Same independent pub visited 15 times - practically family',
      emoji: '🏠',
      criteria: 'independent-repeat-15',
      createdAt: new Date(),
    },

    // === HISTORIC & ARCHITECTURAL ===
    {
      id: 'tudor-detective',
      name: 'Tudor Detective',
      description: 'Found 3 pubs claiming to be from the 1500s - historical accuracy not guaranteed',
      emoji: '🏰',
      criteria: 'historic-pubs-3',
      createdAt: new Date(),
    },
    {
      id: 'coaching-inn-connoisseur',
      name: 'Coaching Inn Connoisseur',
      description: 'Visited 5 historic coaching inns - when horses needed a pint too',
      emoji: '🐎',
      criteria: 'coaching-inns-5',
      createdAt: new Date(),
    },
    {
      id: 'thatched-roof-hunter',
      name: 'Thatched Roof Hunter',
      description: 'Discovered 3 thatched roof pubs - quintessentially English',
      emoji: '🏡',
      criteria: 'thatched-pubs-3',
      createdAt: new Date(),
    },
    {
      id: 'gastro-pub-pioneer',
      name: 'Gastro Pub Pioneer',
      description: 'Elevated your pub dining experience - chips come with fancy garnish',
      emoji: '🍽️',
      criteria: 'gastropubs-5',
      createdAt: new Date(),
    },
    {
      id: 'river-pub-navigator',
      name: 'River Pub Navigator',
      description: 'Found 5 pubs by the water - scenic views and soggy carpets',
      emoji: '🚣',
      criteria: 'riverside-pubs-5',
      createdAt: new Date(),
    },

    // === CARPET PATTERN SPECIALIST ===
    {
      id: 'paisley-pattern-pro',
      name: 'Paisley Pattern Pro',
      description: 'Spotted the classic swirls in 3 different pubs - vintage carpet expertise',
      emoji: '🌀',
      criteria: 'paisley-patterns-3',
      createdAt: new Date(),
    },
    {
      id: 'tartan-tracker',
      name: 'Tartan Tracker',
      description: 'Found authentic Scottish patterns south of the border',
      emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
      criteria: 'tartan-patterns-2',
      createdAt: new Date(),
    },
    {
      id: 'floral-fanatic',
      name: 'Floral Fanatic',
      description: 'Documented 10 different floral carpet designs - nature indoors',
      emoji: '🌺',
      criteria: 'floral-patterns-10',
      createdAt: new Date(),
    },
    {
      id: 'geometric-genius',
      name: 'Geometric Genius',
      description: 'Master of squares, diamonds, and triangles - mathematical carpet appreciation',
      emoji: '📐',
      criteria: 'geometric-patterns-8',
      createdAt: new Date(),
    },
    {
      id: 'burgundy-specialist',
      name: 'Burgundy Specialist',
      description: 'That classic pub carpet color found in 15 different venues',
      emoji: '🍷',
      criteria: 'burgundy-carpets-15',
      createdAt: new Date(),
    },
    {
      id: 'pattern-matcher',
      name: 'Pattern Matcher',
      description: 'Found identical carpet patterns in different counties - detective level skills',
      emoji: '🧩',
      criteria: 'matching-patterns-cross-county',
      createdAt: new Date(),
    },

    // === SEASONAL & WEATHER ===
    {
      id: 'winter-warrior',
      name: 'Winter Warrior',
      description: 'Braved the cold for 10 December check-ins - dedication to the cause',
      emoji: '❄️',
      criteria: 'winter-checkins-10',
      createdAt: new Date(),
    },
    {
      id: 'summer-session-master',
      name: 'Summer Session Master',
      description: 'Beer garden champion - al fresco carpet appreciation',
      emoji: '☀️',
      criteria: 'summer-sessions-15',
      createdAt: new Date(),
    },
    {
      id: 'rainy-day-refugee',
      name: 'Rainy Day Refugee',
      description: 'Sheltered from 5 downpours in welcoming pubs - proper British weather',
      emoji: '🌧️',
      criteria: 'rainy-day-visits-5',
      createdAt: new Date(),
    },

    // === TRANSPORT & ACCESS ===
    {
      id: 'train-station-tracker',
      name: 'Train Station Tracker',
      description: 'Pub within 200m of 5 different railway stations - efficient travel planning',
      emoji: '🚂',
      criteria: 'station-pubs-5',
      createdAt: new Date(),
    },
    {
      id: 'motorway-services-survivor',
      name: 'Motorway Services Survivor',
      description: 'Found decent pubs near major routes - avoiding the service station trap',
      emoji: '🛣️',
      criteria: 'motorway-pubs-3',
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
