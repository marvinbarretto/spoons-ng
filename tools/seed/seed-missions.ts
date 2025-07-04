import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as serviceAccount from './serviceAccountKey.json';
import { pubs } from './pubs';

initializeApp({
  credential: cert(serviceAccount as any),
});

const db = getFirestore();

/**
 * Generate regional missions for every region
 */
function generateRegionalMissions() {
  const regionPubCounts = new Map<string, any[]>();
  
  // List of London boroughs to consolidate
  const londonBoroughs = [
    'London', 'Brent', 'Camden', 'Tower Hamlets', 'Hackney', 'Newham', 
    'Middlesex', 'Haringey', 'Lewisham', 'Redbridge', 'Waltham Forest', 
    'Islington', 'Sutton', 'Hounslow', 'Enfield', 'Richmond upon Thames', 
    'Kensington and Chelsea', 'Westminster', 'Merton', 'Farringdon',
    'Southwark', 'Lambeth'
  ];
  
  // Group pubs by region, consolidating London boroughs
  pubs.forEach(pub => {
    let region = pub.region;
    
    // Consolidate all London boroughs into "London"
    if (londonBoroughs.includes(pub.region)) {
      region = 'London';
    }
    
    if (!regionPubCounts.has(region)) {
      regionPubCounts.set(region, []);
    }
    regionPubCounts.get(region)!.push(pub);
  });

  const regionalMissions: any[] = [];

  regionPubCounts.forEach((pubList, region) => {
    const pubCount = pubList.length;
    const country = pubList[0].country;
    
    // Generate mission based on region size
    let difficulty: string;
    let requirementCount: number;
    let pointsReward: number;
    let missionType: string;
    
    if (pubCount === 1) {
      difficulty = 'easy';
      requirementCount = 1;
      pointsReward = 50;
      missionType = 'Solo Explorer';
    } else if (pubCount === 2) {
      difficulty = 'easy';
      requirementCount = 2;
      pointsReward = 100;
      missionType = 'Twin Explorer';
    } else if (pubCount <= 5) {
      difficulty = 'medium';
      requirementCount = Math.min(3, pubCount);
      pointsReward = 200;
      missionType = 'Regional Champion';
    } else if (pubCount <= 10) {
      difficulty = 'medium';
      requirementCount = Math.min(5, pubCount);
      pointsReward = 350;
      missionType = 'Regional Master';
    } else if (pubCount <= 20) {
      difficulty = 'hard';
      requirementCount = Math.min(8, pubCount);
      pointsReward = 500;
      missionType = 'Regional Conqueror';
    } else {
      difficulty = 'extreme';
      requirementCount = Math.min(12, pubCount);
      pointsReward = 750;
      missionType = 'Regional Legend';
    }

    // Generate country-specific emojis
    const countryEmojis = {
      'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
      'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
      'Northern Ireland': '🇬🇧',
      'Ireland': '🇮🇪',
      'Isle of Man': '🇮🇲'
    };

    const emoji = countryEmojis[country as keyof typeof countryEmojis] || '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
    
    const mission = {
      id: `regional-${region.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}`,
      name: `${region} ${missionType}`,
      description: `${missionType === 'Solo Explorer' ? 'Complete your pilgrimage to' : 
                   missionType === 'Twin Explorer' ? 'Conquer both pubs in' :
                   `Visit ${requirementCount} pubs in`} ${region}${pubCount > requirementCount ? ` (${pubCount} total)` : ''}`,
      difficulty,
      category: 'regional',
      subcategory: 'geographic',
      country,
      region,
      pubIds: pubList.map(p => p.id),
      requiredPubs: requirementCount,
      totalPubs: pubCount,
      pointsReward,
      emoji,
      featured: region === 'London' || pubCount > 20, // Feature London and large regions
      createdAt: new Date(),
    };

    regionalMissions.push(mission);
  });

  return regionalMissions.sort((a, b) => b.totalPubs - a.totalPubs);
}

/**
 * Hand-crafted themed missions with personality
 */
function generateThemedMissions() {
  return [
    // === HISTORICAL ADVENTURES ===
    {
      id: 'admirals-fleet',
      name: 'The Admiral\'s Fleet',
      description: 'Naval heritage collection - When Britain ruled the waves and the bar tabs',
      difficulty: 'easy',
      category: 'themed',
      subcategory: 'historical',
      pubIds: pubs.filter(p => p.name.toLowerCase().includes('admiral') || p.name.toLowerCase().includes('anchor') || p.name.toLowerCase().includes('captain')).map(p => p.id),
      pointsReward: 400,
      emoji: '⚓',
      featured: true,
    },
    {
      id: 'royal-bloodline',
      name: 'Royal Bloodline',
      description: 'Crown collection - Georges, Williams, Roberts, and all manner of royal pretenders',
      difficulty: 'medium',
      category: 'themed',
      subcategory: 'historical',
      pubIds: pubs.filter(p => p.name.toLowerCase().includes('george') || p.name.toLowerCase().includes('william') || p.name.toLowerCase().includes('robert') || p.name.toLowerCase().includes('crown') || p.name.toLowerCase().includes('king')).map(p => p.id),
      pointsReward: 550,
      emoji: '👑',
      featured: true,
    },
    {
      id: 'industrial-decay-tour',
      name: 'Industrial Decay Tour',
      description: 'Mining heritage trail - Commemorating when Britain actually made things',
      difficulty: 'medium',
      category: 'themed',
      subcategory: 'historical',
      pubIds: pubs.filter(p => p.name.toLowerCase().includes('works') || p.name.toLowerCase().includes('mill') || p.name.toLowerCase().includes('mine') || p.name.toLowerCase().includes('forge')).map(p => p.id),
      pointsReward: 500,
      emoji: '⚒️',
      featured: true,
    },
    {
      id: 'railway-pioneers',
      name: 'Railway Pioneers',
      description: 'Transport heritage - Station pubs and railway-themed venues from the age of steam',
      difficulty: 'medium',
      category: 'themed',
      subcategory: 'historical',
      pubIds: pubs.filter(p => p.name.toLowerCase().includes('railway') || p.name.toLowerCase().includes('station') || p.address.toLowerCase().includes('station')).map(p => p.id),
      pointsReward: 450,
      emoji: '🚂',
      featured: true,
    },
    {
      id: 'knights-and-nobles',
      name: 'Knights & Nobles',
      description: 'Feudal tour - All Sir titles and noble connections, because everyone needs a hierarchy',
      difficulty: 'easy',
      category: 'themed',
      pubIds: pubs.filter(p => p.name.toLowerCase().includes('sir ') || p.name.toLowerCase().includes('lord') || p.name.toLowerCase().includes('earl') || p.name.toLowerCase().includes('duke')).map(p => p.id),
      pointsReward: 350,
      emoji: '⚔️',
    },

    // === QUIRKY COLLECTIONS ===
    {
      id: 'moon-chasers',
      name: 'Moon Chasers',
      description: 'Lunar obsession - All Moon-themed pubs because someone at Wetherspoons loves astronomy',
      difficulty: 'hard',
      category: 'themed',
      subcategory: 'quirky',
      pubIds: pubs.filter(p => p.name.toLowerCase().includes('moon')).map(p => p.id),
      pointsReward: 700,
      emoji: '🌙',
      featured: true,
    },
    {
      id: 'red-lion-safari',
      name: 'Red Lion Safari',
      description: 'Hunt down all Red Lions - The most unimaginative pub name in Britain',
      difficulty: 'medium',
      category: 'themed',
      subcategory: 'historical',
      pubIds: pubs.filter(p => p.name.toLowerCase().includes('red lion')).map(p => p.id),
      pointsReward: 400,
      emoji: '🦁',
    },
    {
      id: 'crown-jewels',
      name: 'Crown Jewels',
      description: 'Royal pub collection - Every Crown variation because monarchy sells beer',
      difficulty: 'medium',
      category: 'themed',
      subcategory: 'historical',
      pubIds: pubs.filter(p => p.name.toLowerCase().includes('crown')).map(p => p.id),
      pointsReward: 400,
      emoji: '💎',
    },
    {
      id: 'maritime-heritage',
      name: 'Maritime Heritage',
      description: 'Ports, ferries, and docks - When Britain ruled the waves and the bar tabs',
      difficulty: 'medium',
      category: 'themed',
      subcategory: 'historical',
      pubIds: pubs.filter(p => p.name.toLowerCase().includes('port') || p.name.toLowerCase().includes('ferry') || p.name.toLowerCase().includes('dock') || p.name.toLowerCase().includes('harbour')).map(p => p.id),
      pointsReward: 450,
      emoji: '⛵',
    },

    // === TRANSPORT ADVENTURES ===
    {
      id: 'airport-loungers',
      name: 'Airport Loungers',
      description: 'Terminal drinking circuit - Because delayed flights need proper preparation',
      difficulty: 'easy',
      category: 'themed',
      subcategory: 'transport',
      pubIds: pubs.filter(p => p.address.toLowerCase().includes('airport') || p.address.toLowerCase().includes('terminal')).map(p => p.id),
      pointsReward: 300,
      emoji: '✈️',
    },
    {
      id: 'station-hoppers',
      name: 'Station Hoppers',
      description: 'Platform pint collection - The civilized way to wait for delayed trains',
      difficulty: 'medium',
      category: 'themed',
      subcategory: 'transport',
      pubIds: pubs.filter(p => p.address.toLowerCase().includes('station')).map(p => p.id),
      pointsReward: 400,
      emoji: '🚉',
    },

    // === SOCIAL SCENES ===
    {
      id: 'university-dropout',
      name: 'University Dropout',
      description: 'Student bar circuit - Academic drinking where essays go to die',
      difficulty: 'easy',
      category: 'themed',
      pubIds: pubs.filter(p => p.name.toLowerCase().includes('university') || p.name.toLowerCase().includes('student') || p.name.toLowerCase().includes('luther')).map(p => p.id),
      pointsReward: 250,
      emoji: '🎓',
    },

    // === COMPLETION CHALLENGES ===
    {
      id: 'alphabet-challenge',
      name: 'The Alphabet Challenge',
      description: 'A-Z pub name collection - One for every letter because completionism is a disease',
      difficulty: 'extreme',
      category: 'themed',
      pubIds: (() => {
        const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
        const alphabetPubs: string[] = [];
        letters.forEach(letter => {
          const pub = pubs.find(p => p.name.toLowerCase().startsWith(letter));
          if (pub) alphabetPubs.push(pub.id);
        });
        return alphabetPubs;
      })(),
      pointsReward: 1000,
      emoji: '🔤',
      featured: true,
    },

    // === GEOGRAPHIC ADVENTURES ===
    {
      id: 'four-corners-challenge',
      name: 'Four Corners Challenge',
      description: 'Extreme geographical - Northernmost, southernmost, easternmost, westernmost pubs in Britain',
      difficulty: 'extreme',
      category: 'themed',
      subcategory: 'geographic',
      pubIds: (() => {
        // Find extreme geographical points
        let northernmost = pubs[0], southernmost = pubs[0], easternmost = pubs[0], westernmost = pubs[0];
        pubs.forEach(pub => {
          if (pub.location?.lat && pub.location?.lng) {
            if (pub.location.lat > northernmost.location!.lat!) northernmost = pub;
            if (pub.location.lat < southernmost.location!.lat!) southernmost = pub;
            if (pub.location.lng > easternmost.location!.lng!) easternmost = pub;
            if (pub.location.lng < westernmost.location!.lng!) westernmost = pub;
          }
        });
        return [northernmost.id, southernmost.id, easternmost.id, westernmost.id];
      })(),
      pointsReward: 1000,
      emoji: '🧭',
      featured: true,
    },
    {
      id: 'coastal-carpet-crawl',
      name: 'Coastal Carpet Crawl',
      description: 'Seaside pub adventure - Where salt air meets sticky floors and seagulls steal your chips',
      difficulty: 'hard',
      category: 'themed',
      subcategory: 'geographic',
      pubIds: pubs.filter(p => 
        ['Devon', 'Cornwall', 'Kent', 'Norfolk', 'Essex', 'East Sussex', 'West Sussex', 'Dorset', 'Somerset', 'Isle of Wight', 'Merseyside'].includes(p.region) ||
        p.city.toLowerCase().includes('beach') || p.city.toLowerCase().includes('sea') || 
        p.city.toLowerCase().includes('bay') || p.address.toLowerCase().includes('seafront')
      ).slice(0, 15).map(p => p.id),
      pointsReward: 750,
      emoji: '🌊',
      featured: true,
    },
    {
      id: 'river-runners',
      name: 'River Runners',
      description: 'Follow the waterways - Thames, Severn, Trent, and the liquid highways of Britain',
      difficulty: 'medium',
      category: 'themed',
      subcategory: 'geographic',
      pubIds: pubs.filter(p => 
        p.name.toLowerCase().includes('river') || p.name.toLowerCase().includes('bridge') ||
        p.name.toLowerCase().includes('wharf') || p.name.toLowerCase().includes('waterside') ||
        p.address.toLowerCase().includes('river') || p.address.toLowerCase().includes('bridge')
      ).slice(0, 10).map(p => p.id),
      pointsReward: 500,
      emoji: '🌉',
    },
    {
      id: 'island-hoppers',
      name: 'Island Hoppers',
      description: 'Isolated drinking - Isle of Wight, Isle of Man, and Britain\'s forgotten islands',
      difficulty: 'medium',
      category: 'themed',
      subcategory: 'geographic',
      pubIds: pubs.filter(p => 
        p.region === 'Isle of Wight' || p.region === 'Isle of Man' ||
        p.address.toLowerCase().includes('island') || p.city.toLowerCase().includes('island')
      ).map(p => p.id),
      pointsReward: 400,
      emoji: '🏝️',
    },
    {
      id: 'highland-fling',
      name: 'Highland Fling',
      description: 'Mountain pub conquest - Scotland\'s highlands, Lake District peaks, and Welsh valleys',
      difficulty: 'hard',
      category: 'themed',
      subcategory: 'geographic',
      pubIds: pubs.filter(p => 
        (p.country === 'Scotland' && ['Highland', 'Argyll and Bute', 'Perth and Kinross'].includes(p.region)) ||
        p.region === 'Cumbria' || p.country === 'Wales' ||
        p.name.toLowerCase().includes('hill') || p.name.toLowerCase().includes('mountain') ||
        p.name.toLowerCase().includes('peak') || p.name.toLowerCase().includes('summit')
      ).slice(0, 12).map(p => p.id),
      pointsReward: 650,
      emoji: '🏔️',
    },
    {
      id: 'seaside-specials',
      name: 'Seaside Specials',
      description: 'Classic British coastal resorts - Brighton, Blackpool, Bournemouth, and bucket-and-spade Britain',
      difficulty: 'medium',
      category: 'themed',
      subcategory: 'historical',
      pubIds: pubs.filter(p => 
        ['Brighton', 'Blackpool', 'Bournemouth', 'Southend', 'Margate', 'Hastings', 'Eastbourne', 'Weymouth', 'Torquay', 'Scarborough', 'Whitby'].some(resort => 
          p.city.toLowerCase().includes(resort.toLowerCase()) || p.address.toLowerCase().includes(resort.toLowerCase())
        )
      ).map(p => p.id),
      pointsReward: 450,
      emoji: '🏖️',
    },
    {
      id: 'border-raiders',
      name: 'Border Raiders',
      description: 'Cross-country diplomacy - England/Scotland/Wales border regions where accents get confused',
      difficulty: 'hard',
      category: 'themed',
      pubIds: pubs.filter(p => 
        ['Northumberland', 'Cumbria', 'Shropshire', 'Herefordshire', 'Gloucestershire', 'Monmouthshire', 'Scottish Borders', 'Dumfries and Galloway', 'Powys', 'Cheshire'].includes(p.region)
      ).slice(0, 10).map(p => p.id),
      pointsReward: 600,
      emoji: '🗺️',
    },
    {
      id: 'lands-end-to-john-ogroats',
      name: 'Land\'s End to John O\'Groats',
      description: 'Classic British journey - The ultimate pub crawl from Cornwall\'s tip to Scotland\'s edge',
      difficulty: 'extreme',
      category: 'themed',
      pubIds: pubs.filter(p => 
        (p.region === 'Cornwall' && p.address.toLowerCase().includes('penzance')) ||
        (p.country === 'Scotland' && (p.region === 'Highland' || p.city.toLowerCase().includes('thurso'))) ||
        p.address.toLowerCase().includes('land\'s end') || p.address.toLowerCase().includes('john o\'groats')
      ).map(p => p.id),
      pointsReward: 800,
      emoji: '🛣️',
      featured: true,
    },
    {
      id: 'capital-crawl',
      name: 'Capital Crawl',
      description: 'Power centers - London, Edinburgh, Cardiff, Belfast, and the seats of British power',
      difficulty: 'medium',
      category: 'themed',
      subcategory: 'historical',
      pubIds: pubs.filter(p => 
        (p.city === 'London' || p.region === 'London') ||
        (p.city === 'Edinburgh' || p.region === 'Edinburgh') ||
        (p.city === 'Cardiff' || p.region === 'Cardiff') ||
        (p.city === 'Belfast' || p.address.toLowerCase().includes('belfast'))
      ).slice(0, 12).map(p => p.id),
      pointsReward: 550,
      emoji: '🏛️',
    },
    {
      id: 'national-park-explorer',
      name: 'National Park Explorer',
      description: 'Protected wilderness drinking - Pubs in and around Britain\'s most beautiful landscapes',
      difficulty: 'hard',
      category: 'themed',
      pubIds: pubs.filter(p => 
        p.region === 'Cumbria' || // Lake District
        (p.country === 'Wales' && ['Gwynedd', 'Powys', 'Carmarthenshire', 'Pembrokeshire'].includes(p.region)) || // Snowdonia, Brecon Beacons, Pembrokeshire Coast
        (p.region === 'Devon' || p.region === 'Cornwall') || // Dartmoor, Exmoor
        (p.region === 'Derbyshire' || p.region === 'South Yorkshire') || // Peak District
        p.name.toLowerCase().includes('park') || p.name.toLowerCase().includes('forest')
      ).slice(0, 15).map(p => p.id),
      pointsReward: 700,
      emoji: '🌲',
    },

    // === DARK POLITICAL HUMOR ===
    {
      id: 'brexit-means-brexit',
      name: 'Brexit Means Brexit',
      description: 'Democratic divide tour - Visit pubs in both Leave and Remain strongholds, because democracy',
      difficulty: 'hard',
      category: 'themed',
      subcategory: 'dark-political',
      pubIds: pubs.filter(p => 
        ['Cornwall', 'Essex', 'Kent', 'Lincolnshire', 'Stoke-on-Trent'].includes(p.region) || // Leave areas
        ['London', 'Edinburgh', 'Brighton', 'Cambridge', 'Oxford'].some(remain => p.city.toLowerCase().includes(remain.toLowerCase()))
      ).slice(0, 10).map(p => p.id),
      pointsReward: 650,
      emoji: '🗳️',
      featured: true,
    },
    {
      id: 'austerity-survivors',
      name: 'Austerity Survivors',
      description: 'Economic battlefield tour - Pubs in areas hit hardest by a decade of "necessary measures"',
      difficulty: 'medium',
      category: 'themed',
      subcategory: 'dark-political',
      pubIds: pubs.filter(p => 
        ['Blackpool', 'Middlesbrough', 'Oldham', 'Rochdale', 'Burnley', 'Stoke', 'Grimsby', 'Rhyl'].some(deprived => 
          p.city.toLowerCase().includes(deprived.toLowerCase()) || p.address.toLowerCase().includes(deprived.toLowerCase())
        )
      ).map(p => p.id),
      pointsReward: 500,
      emoji: '💸',
    },
    {
      id: 'tory-heartlands',
      name: 'Tory Heartlands',
      description: 'Blue wall expedition - Conservative strongholds since Thatcher, where tradition meets pints',
      difficulty: 'medium',
      category: 'themed',
      subcategory: 'dark-political',
      pubIds: pubs.filter(p => 
        ['Surrey', 'Buckinghamshire', 'Oxfordshire', 'Wiltshire', 'Hampshire', 'Dorset', 'West Sussex'].includes(p.region) ||
        ['Windsor', 'Henley', 'Maidenhead', 'Beaconsfield'].some(posh => p.city.toLowerCase().includes(posh.toLowerCase()))
      ).slice(0, 8).map(p => p.id),
      pointsReward: 450,
      emoji: '💙',
    },
    {
      id: 'red-wall-ruins',
      name: 'Red Wall Ruins',
      description: 'Former Labour heartlands - Where working men\'s clubs met their Waterloo',
      difficulty: 'medium',
      category: 'themed',
      subcategory: 'dark-political',
      pubIds: pubs.filter(p => 
        ['County Durham', 'Northumberland', 'West Yorkshire', 'South Yorkshire'].includes(p.region) ||
        ['Hartlepool', 'Redcar', 'Bishop Auckland', 'Sedgefield', 'Workington'].some(redWall => 
          p.city.toLowerCase().includes(redWall.toLowerCase())
        )
      ).slice(0, 8).map(p => p.id),
      pointsReward: 450,
      emoji: '🧱',
    },
    {
      id: 'nimby-central',
      name: 'NIMBY Central',
      description: 'Resistance headquarters - Wealthy areas that fight any change, especially housing',
      difficulty: 'medium',
      category: 'themed',
      subcategory: 'dark-political',
      pubIds: pubs.filter(p => 
        ['Richmond upon Thames', 'Kensington and Chelsea', 'Westminster', 'Camden', 'Islington'].includes(p.region) ||
        p.city.toLowerCase().includes('richmond') || p.city.toLowerCase().includes('barnes')
      ).slice(0, 6).map(p => p.id),
      pointsReward: 400,
      emoji: '🚫',
    },
    {
      id: 'council-estate-classics',
      name: 'Council Estate Classics',
      description: 'Social housing specials - Where community spirit meets community drinking',
      difficulty: 'medium',
      category: 'themed',
      subcategory: 'dark-political',
      pubIds: pubs.filter(p => 
        p.name.toLowerCase().includes('community') || p.name.toLowerCase().includes('estate') ||
        ['Tower Hamlets', 'Hackney', 'Newham', 'Southwark', 'Lambeth'].includes(p.region)
      ).slice(0, 8).map(p => p.id),
      pointsReward: 450,
      emoji: '🏢',
    },
    {
      id: 'gentrification-ground-zero',
      name: 'Gentrification Ground Zero',
      description: 'Changing neighborhoods - Where artisanal coffee meets traditional pints',
      difficulty: 'medium',
      category: 'themed',
      subcategory: 'dark-political',
      pubIds: pubs.filter(p => 
        ['Hackney', 'Shoreditch', 'Clapham', 'Brixton', 'Peckham', 'Dalston'].some(gentrified => 
          p.city.toLowerCase().includes(gentrified.toLowerCase()) || 
          p.address.toLowerCase().includes(gentrified.toLowerCase())
        )
      ).map(p => p.id),
      pointsReward: 400,
      emoji: '🎨',
    },
    {
      id: 'tax-haven-tours',
      name: 'Tax Haven Tours',
      description: 'Offshore adventures - Areas with suspiciously high numbers of letterbox companies',
      difficulty: 'hard',
      category: 'themed',
      subcategory: 'dark-political',
      pubIds: pubs.filter(p => 
        p.region === 'City of London' ||
        ['Mayfair', 'Belgravia', 'Canary Wharf'].some(financial => 
          p.address.toLowerCase().includes(financial.toLowerCase())
        )
      ).map(p => p.id),
      pointsReward: 500,
      emoji: '🏦',
    },
    {
      id: 'food-bank-britain',
      name: 'Food Bank Britain',
      description: 'Hunger games - Areas with the highest food bank usage, where dignity meets necessity',
      difficulty: 'medium',
      category: 'themed',
      subcategory: 'dark-political',
      pubIds: pubs.filter(p => 
        ['Bradford', 'Birmingham', 'Liverpool', 'Manchester', 'Newcastle', 'Glasgow'].some(foodBank => 
          p.city.toLowerCase().includes(foodBank.toLowerCase())
        ) ||
        ['West Midlands', 'Merseyside', 'Tyne and Wear', 'South Yorkshire'].includes(p.region)
      ).slice(0, 10).map(p => p.id),
      pointsReward: 500,
      emoji: '🥫',
    },
    {
      id: 'second-home-syndrome',
      name: 'Second Home Syndrome',
      description: 'Displacement tours - Tourist hotspots where locals can\'t afford to live',
      difficulty: 'medium',
      category: 'themed',
      subcategory: 'dark-political',
      pubIds: pubs.filter(p => 
        ['Cornwall', 'Devon', 'Lake District', 'Cotswolds', 'Norfolk', 'Suffolk'].some(touristy => 
          p.region.toLowerCase().includes(touristy.toLowerCase())
        ) ||
        ['St Ives', 'Padstow', 'Salcombe', 'Aldeburgh'].some(expensive => 
          p.city.toLowerCase().includes(expensive.toLowerCase())
        )
      ).slice(0, 8).map(p => p.id),
      pointsReward: 450,
      emoji: '🏠',
    },

    // === WEIRD & WONDERFUL ABSTRACT ===
    {
      id: 'palindrome-pub-crawl',
      name: 'Palindrome Pub Crawl',
      description: 'Linguistic symmetry - Pubs in postcodes that read the same forwards and backwards',
      difficulty: 'hard',
      category: 'themed',
      subcategory: 'weird-wonderful',
      pubIds: (() => {
        // This would need real postcode analysis, simplified for demo
        return pubs.filter(p => {
          const postcode = p.address.match(/[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}/)?.[0];
          if (!postcode) return false;
          const cleaned = postcode.replace(/\s/g, '').toLowerCase();
          return cleaned === cleaned.split('').reverse().join('');
        }).slice(0, 5).map(p => p.id);
      })(),
      pointsReward: 600,
      emoji: '🔄',
    },
    {
      id: 'prime-number-pilgrimage',
      name: 'Prime Number Pilgrimage',
      description: 'Mathematical mysticism - Pubs at addresses with only prime numbers',
      difficulty: 'medium',
      category: 'themed',
      subcategory: 'weird-wonderful',
      pubIds: (() => {
        const isPrime = (n: number) => {
          if (n < 2) return false;
          for (let i = 2; i <= Math.sqrt(n); i++) {
            if (n % i === 0) return false;
          }
          return true;
        };
        return pubs.filter(p => {
          const addressNum = parseInt(p.address.match(/^\d+/)?.[0] || '0');
          return isPrime(addressNum);
        }).slice(0, 10).map(p => p.id);
      })(),
      pointsReward: 500,
      emoji: '🔢',
    },
    {
      id: 'zodiac-zone',
      name: 'Zodiac Zone',
      description: 'Astrological alignment - 12 pubs representing each zodiac sign through names or themes',
      difficulty: 'hard',
      category: 'themed',
      subcategory: 'weird-wonderful',
      pubIds: pubs.filter(p => 
        ['ram', 'bull', 'lion', 'virgin', 'scale', 'scorpion', 'archer', 'goat', 'water', 'fish', 'crab', 'twin'].some(sign => 
          p.name.toLowerCase().includes(sign)
        ) ||
        ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'].some(zodiac => 
          p.name.toLowerCase().includes(zodiac)
        )
      ).slice(0, 12).map(p => p.id),
      pointsReward: 650,
      emoji: '♈',
    },
    {
      id: 'alphabetical-accidents',
      name: 'Alphabetical Accidents',
      description: 'Cosmic coincidences - Pubs where the first letter of name matches street name',
      difficulty: 'medium',
      category: 'themed',
      subcategory: 'weird-wonderful',
      pubIds: (() => {
        return pubs.filter(p => {
          const pubFirstLetter = p.name.charAt(0).toLowerCase();
          const streetFirstLetter = p.address.split(' ').find(word => 
            word.toLowerCase().endsWith('street') || 
            word.toLowerCase().endsWith('road') || 
            word.toLowerCase().endsWith('lane')
          );
          return streetFirstLetter && streetFirstLetter.charAt(0).toLowerCase() === pubFirstLetter;
        }).slice(0, 8).map(p => p.id);
      })(),
      pointsReward: 400,
      emoji: '🔤',
    },
    {
      id: 'literary-landmarks',
      name: 'Literary Landmarks',
      description: 'Bookworm\'s pilgrimage - Pubs named after authors, books, or literary characters',
      difficulty: 'medium',
      category: 'themed',
      subcategory: 'weird-wonderful',
      pubIds: pubs.filter(p => 
        ['shakespeare', 'dickens', 'austen', 'byron', 'keats', 'wordsworth', 'hardy', 'wilde', 'chaucer', 'milton'].some(author => 
          p.name.toLowerCase().includes(author)
        ) ||
        ['hamlet', 'othello', 'macbeth', 'romeo', 'juliet', 'prospero'].some(character => 
          p.name.toLowerCase().includes(character)
        )
      ).map(p => p.id),
      pointsReward: 450,
      emoji: '📚',
    },
    {
      id: 'rhyming-revelry',
      name: 'Rhyming Revelry',
      description: 'Poetic pubs - Names that rhyme with their town or street location',
      difficulty: 'hard',
      category: 'themed',
      subcategory: 'weird-wonderful',
      pubIds: (() => {
        // Simplified rhyme detection - would need proper phonetic analysis
        return pubs.filter(p => {
          const pubName = p.name.toLowerCase().split(' ').pop() || '';
          const city = p.city.toLowerCase();
          const lastSyllable = pubName.slice(-2);
          return city.endsWith(lastSyllable) && pubName !== city;
        }).slice(0, 6).map(p => p.id);
      })(),
      pointsReward: 500,
      emoji: '🎵',
    },
    {
      id: 'color-collector',
      name: 'Color Collector',
      description: 'Rainbow tour - Red, White, Blue, Green, and every color of the pub spectrum',
      difficulty: 'medium',
      category: 'themed',
      subcategory: 'weird-wonderful',
      pubIds: pubs.filter(p => 
        ['red', 'blue', 'green', 'white', 'black', 'golden', 'silver', 'purple', 'yellow', 'pink'].some(color => 
          p.name.toLowerCase().includes(color)
        )
      ).slice(0, 10).map(p => p.id),
      pointsReward: 450,
      emoji: '🌈',
    },
    {
      id: 'time-travelers-tale',
      name: 'Time Traveler\'s Tale',
      description: 'Chronological quest - Pubs claiming historical dates in perfect chronological order',
      difficulty: 'hard',
      category: 'themed',
      subcategory: 'weird-wonderful',
      pubIds: (() => {
        const yearPattern = /\b(1[0-9]{3}|20[0-2][0-9])\b/;
        return pubs.filter(p => yearPattern.test(p.name))
          .sort((a, b) => {
            const yearA = parseInt(a.name.match(yearPattern)?.[0] || '0');
            const yearB = parseInt(b.name.match(yearPattern)?.[0] || '0');
            return yearA - yearB;
          })
          .slice(0, 8)
          .map(p => p.id);
      })(),
      pointsReward: 550,
      emoji: '⏰',
    },
    {
      id: 'shakespearean-spoons',
      name: 'Shakespearean Spoons',
      description: 'Bard\'s greatest hits - All things Shakespeare in Wetherspoons form',
      difficulty: 'easy',
      category: 'themed',
      subcategory: 'weird-wonderful',
      pubIds: pubs.filter(p => 
        p.name.toLowerCase().includes('shakespeare') ||
        ['hamlet', 'macbeth', 'othello', 'lear', 'romeo', 'juliet', 'prospero', 'falstaff'].some(character => 
          p.name.toLowerCase().includes(character)
        ) ||
        ['stratford', 'avon', 'globe', 'theatre'].some(related => 
          p.name.toLowerCase().includes(related) || p.address.toLowerCase().includes(related)
        )
      ).map(p => p.id),
      pointsReward: 350,
      emoji: '🎭',
    },
    {
      id: 'mathematical-madness',
      name: 'Mathematical Madness',
      description: 'Numerical nirvana - Pubs with numbers in names, visited in ascending order',
      difficulty: 'medium',
      category: 'themed',
      subcategory: 'weird-wonderful',
      pubIds: (() => {
        const numberWords = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
        const numberMap = new Map(numberWords.map((word, i) => [word, i + 1]));
        
        return pubs.filter(p => {
          const name = p.name.toLowerCase();
          return numberWords.some(num => name.includes(num)) || /\b\d+\b/.test(name);
        })
        .sort((a, b) => {
          const getNumber = (name: string) => {
            const lowerName = name.toLowerCase();
            for (const [word, num] of numberMap) {
              if (lowerName.includes(word)) return num;
            }
            const digit = name.match(/\b(\d+)\b/)?.[1];
            return digit ? parseInt(digit) : 999;
          };
          return getNumber(a.name) - getNumber(b.name);
        })
        .slice(0, 10)
        .map(p => p.id);
      })(),
      pointsReward: 500,
      emoji: '🔢',
    },

    // === LEGACY DARK HUMOR ===
    {
      id: 'forgotten-admirals',
      name: 'Forgotten Admirals',
      description: 'Military brass nobody remembers - Because every naval defeat deserves a pub',
      difficulty: 'easy',
      category: 'themed',
      subcategory: 'dark-political',
      pubIds: pubs.filter(p => p.name.toLowerCase().includes('admiral') || p.name.toLowerCase().includes('captain')).map(p => p.id),
      pointsReward: 300,
      emoji: '🎖️',
    },
  ];
}

async function seed() {
  console.log(`🎯 Generating comprehensive mission system...`);
  
  const regionalMissions = generateRegionalMissions();
  const themedMissions = generateThemedMissions();
  
  const allMissions = [...regionalMissions, ...themedMissions];
  
  console.log(`📊 Mission breakdown:`);
  console.log(`   🏴󠁧󠁢󠁥󠁮󠁧󠁿 Regional missions: ${regionalMissions.length}`);
  console.log(`   🎪 Themed missions: ${themedMissions.length}`);
  console.log(`   📋 Total missions: ${allMissions.length}`);
  
  // Show regional breakdown
  const countryCounts = regionalMissions.reduce((acc, mission) => {
    acc[mission.country] = (acc[mission.country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log(`\n🌍 Regional missions by country:`);
  Object.entries(countryCounts).forEach(([country, count]) => {
    console.log(`   ${country}: ${count} regions`);
  });
  
  // Show themed mission details
  console.log(`\n🎪 Themed missions:`);
  themedMissions.forEach(mission => {
    console.log(`   ${mission.emoji} ${mission.title}: ${mission.pubIds.length} pubs (${mission.difficulty})`);
  });

  let successCount = 0;
  let errorCount = 0;

  for (const mission of allMissions) {
    try {
      await db.collection('missions').doc(mission.id).set(mission);
      successCount++;
      
      if (successCount % 20 === 0) {
        console.log(`📈 Progress: ${successCount}/${allMissions.length} missions seeded`);
      }
    } catch (error) {
      errorCount++;
      console.error(`❌ Failed to seed mission "${mission.title}":`, error);
    }
  }

  console.log('\n🎉 Mission seeding complete!');
  console.log(`✅ Successfully seeded: ${successCount} missions`);
  console.log(`❌ Failed: ${errorCount} missions`);

  if (errorCount > 0) {
    console.log('\n⚠️  Some missions failed to seed. Check errors above.');
    process.exit(1);
  }
}

seed().catch((error) => {
  console.error('💥 Mission seeding failed:', error);
  process.exit(1);
});

// npx ts-node --project tsconfig.seed.json tools/seed/seed-missions.ts