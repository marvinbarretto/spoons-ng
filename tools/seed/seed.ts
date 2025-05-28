import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as serviceAccount from './serviceAccountKey.json';

initializeApp({
  credential: cert(serviceAccount as any),
});

const db = getFirestore();

// TODO:  Later, add a --safe flag or separate script for "merge mode", log to console output etc
// TODO: split these out into seeding different bits

async function seed() {
  const pubs = [
    {
      id: 'moon-under-water-watford',
      name: 'The Moon Under Water',
      address: '44 High Street, Watford, Hertfordshire, WD17 2BS',
      region: 'Hertfordshire',
      location: {
        lat: 51.65531,
        lng: -0.39602,
      },
      carpetUrl: '/assets/carpets/random.jpg',
    },
    {
      id: 'pennsylvanian-rickmansworth',
      name: 'The Pennsylvanian',
      address: '115–117 High Street, Rickmansworth, Hertfordshire, WD3 1AN',
      region: 'Hertfordshire',
      location: {
        lat: 51.63883,
        lng: -0.469971,
      },
      carpetUrl: '/assets/carpets/random.jpg',
    },
    {
      id: 'moon-and-sixpence-hatch-end',
      name: 'The Moon and Sixpence',
      address: '250 Uxbridge Road, Hatch End, Harrow, HA5 4HS',
      region: 'Harrow',
      location: {
        lat: 51.60824,
        lng: -0.373308,
      },
      carpetUrl: '/assets/carpets/random.jpg',
    },
    {
      id: 'village-inn-rayners-lane',
      name: 'The Village Inn',
      address: '402–408 Rayners Lane, Rayners Lane, Harrow, HA5 5DY',
      region: 'Harrow',
      location: {
        lat: 51.576877,
        lng: -0.370864,
      },
      carpetUrl: '/assets/carpets/random.jpg',
    },
    {
      id: 'jj-moons-ruislip-manor',
      name: 'J.J. Moon’s',
      address: '12 Victoria Road, Ruislip Manor, Hillingdon, HA4 0AA',
      region: 'Hillingdon',
      location: {
        lat: 51.573461,
        lng: -0.413585,
      },
      carpetUrl: '/assets/carpets/random.jpg',
    },
    {
      id: 'moon-on-the-hill-harrow',
      name: 'The Moon on the Hill',
      address: '373–375 Station Road, Harrow, HA1 2AW',
      region: 'Harrow',
      location: {
        lat: 51.579504,
        lng: -0.334262,
      },
      carpetUrl: '/assets/carpets/random.jpg',
    },
    {
      id: 'waterend-barn-st-albans',
      name: 'Waterend Barn',
      address: 'St Peters Street, St Albans, Hertfordshire, AL1 3LE',
      region: 'Hertfordshire',
      location: {
        lat: 51.752589,
        lng: -0.337355,
      },
      carpetUrl: '/assets/carpets/random.jpg',
    },
    {
      id: 'full-house-hemel-hempstead',
      name: 'The Full House',
      address: '128 Marlowes, Hemel Hempstead, Hertfordshire, HP1 1EZ',
      region: 'Hertfordshire',
      location: {
        lat: 51.753147,
        lng: -0.472658,
      },
      carpetUrl: '/assets/carpets/random.jpg',
    },
    {
      id: 'jj-moons-kingsbury',
      name: 'J.J. Moon’s',
      address: '553 Kingsbury Road, Kingsbury, Brent, NW9 9EL',
      region: 'Brent',
      location: {
        lat: 51.584,
        lng: -0.278,
      },
      carpetUrl: '/assets/carpets/random.jpg',
    },
    {
      id: 'greenwood-hotel-northolt',
      name: 'The Greenwood Hotel',
      address: '674 Whitton Avenue West, Northolt, Ealing, UB5 4LA',
      region: 'Ealing',
      location: {
        lat: 51.553,
        lng: -0.368,
      },
      carpetUrl: '/assets/carpets/random.jpg',
    },
    {
      id: 'moon-under-water-colindale',
      name: 'The Moon Under Water',
      address: '10 Varley Parade, Colindale, Barnet, NW9 6RR',
      region: 'Barnet',
      location: {
        lat: 51.595,
        lng: -0.252,
      },
      carpetUrl: '/assets/carpets/random.jpg',
    },
    {
      id: 'good-yarn-uxbridge',
      name: 'The Good Yarn',
      address: '132 High Street, Uxbridge, Hillingdon, UB8 1JX',
      region: 'Hillingdon',
      location: {
        lat: 51.546,
        lng: -0.478,
      },
      carpetUrl: '/assets/carpets/random.jpg',
    },
    {
      id: 'jj-moons-wembley',
      name: 'J.J. Moon’s',
      address: '397 High Road, Wembley, Brent, HA9 6AA',
      region: 'Brent',
      location: {
        lat: 51.552,
        lng: -0.296,
      },
      carpetUrl: '/assets/carpets/random.jpg',
    },
    {
      id: 'admiral-byng-potters-bar',
      name: 'The Admiral Byng',
      address: '186–192 Darkes Lane, Potters Bar, Hertfordshire, EN6 1AF',
      region: 'Hertfordshire',
      location: {
        lat: 51.699,
        lng: -0.195,
      },
      carpetUrl: '/assets/carpets/random.jpg',
    },
    {
      id: 'crown-berkhamsted',
      name: 'The Crown',
      address: '145 High Street, Berkhamsted, Hertfordshire, HP4 3HH',
      region: 'Hertfordshire',
      location: {
        lat: 51.762,
        lng: -0.565,
      },
      carpetUrl: '/assets/carpets/random.jpg',
    },
    {
      id: 'railway-bell-east-barnet',
      name: 'The Railway Bell',
      address: '13 East Barnet Road, Barnet, EN4 8RR',
      region: 'Barnet',
      location: {
        lat: 51.648,
        lng: -0.172,
      },
      carpetUrl: '/assets/carpets/random.jpg',
    },
    {
      id: 'harpsfield-hall-hatfield',
      name: 'Harpsfield Hall',
      address: '13a Parkhouse Court, Hatfield, Hertfordshire, AL10 9RQ',
      region: 'Hertfordshire',
      location: {
        lat: 51.763,
        lng: -0.225,
      },
      carpetUrl: '/assets/carpets/random.jpg',
    },
  ];


  for (const pub of pubs) {
    await db.collection('pubs').doc(pub.id).set(pub);
  }

  const missions = [
    {
      id: 'hertfordshire-pubs',
      title: 'Hertfordshire Crawl',
      description: 'Collect every pub in Hertfordshire',
      pubIds: pubs.map(p => p.id),
    },
  ];

  for (const mission of missions) {
    await db.collection('missions').doc(mission.id).set(mission);
  }

  console.log('Seeding complete');
}

seed();
