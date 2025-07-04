// Import parsed pubs from HTML data
import { parsedPubs } from './parsed-pubs';

// Original manually curated pubs (with coordinates)
const manualPubs = [
  {
    id: 'montagu-pyke-london',
    name: 'The Montagu Pyke',
    address: '105-107 Charing Cross Rd, London WC2H 0DT',
    city: 'London',
    region: 'London',
    country: 'England',
    location: {
      "lng": -0.1292581,
      "lat": 51.525447
    },
    carpetUrl: ''
  },
  {
    id: 'captain-flinders-london',
    name: 'The Captain Flinders',
    address: '34-38 Eversholt St, Euston Square, London NW1 1DA',
    city: 'London',
    region: 'London',
    country: 'England',
    location: {
      "lng": -0.1679958,
      "lat": 51.5140454
    },
    carpetUrl: ''
  }
];

// Combine manual pubs with parsed pubs
export const pubs = [
  ...manualPubs,
  ...parsedPubs
];



// export const pubs = [
//   {
//     id: 'moon-under-water-watford',
//     name: 'The Moon Under Water',
//     address: '44 High Street, Watford, Hertfordshire, WD17 2BS',
//     city: 'Watford',
//     region: 'Hertfordshire',
//     country: 'England',
//     location: {
//       lat: 51.65531,
//       lng: -0.39602,
//     },
//     carpetUrl: '/assets/carpets/moon-under-water-watford.jpg',
//   },
//   {
//     id: 'pennsylvanian-rickmansworth',
//     name: 'The Pennsylvanian',
//     city: 'Rickmansworth',
//     address: '115–117 High Street, Rickmansworth, Hertfordshire, WD3 1AN',
//     region: 'Hertfordshire',
//     country: 'England',
//     location: {
//       lat: 51.63883,
//       lng: -0.469971,
//     },
//     carpetUrl: '/assets/carpets/pennsylvanian-rickmansworth.jpg',
//   },
//   {
//     id: 'moon-and-sixpence-hatch-end',
//     name: 'The Moon and Sixpence',
//     city: 'Hatch End',
//     address: '250 Uxbridge Road, Hatch End, Harrow, HA5 4HS',
//     region: 'Harrow',
//     country: 'England',
//     location: {
//       lat: 51.60824,
//       lng: -0.373308,
//     },
//     carpetUrl: '/assets/carpets/moon-and-sixpence-hatch-end.jpg',
//   },
//   {
//     id: 'village-inn-rayners-lane',
//     name: 'The Village Inn',
//     city: 'Rayners Lane',
//     address: '402–408 Rayners Lane, Rayners Lane, Harrow, HA5 5DY',
//     region: 'Harrow',
//     country: 'England',
//     location: {
//       lat: 51.576877,
//       lng: -0.370864,
//     },
//     carpetUrl: '/assets/carpets/village-inn-rayners-lane.jpg',
//   },
//   {
//     id: 'jj-moons-ruislip-manor',
//     name: 'J.J. Moon’s',
//     address: '12 Victoria Road, Ruislip Manor, Hillingdon, HA4 0AA',
//     city: 'Ruislip Manor',
//     region: 'Hillingdon',
//     country: 'England',
//     location: {
//       lat: 51.573461,
//       lng: -0.413585,
//     },
//     carpetUrl: '/assets/carpets/jj-moons-ruislip-manor.jpg',
//   },
//   {
//     id: 'moon-on-the-hill-harrow',
//     name: 'The Moon on the Hill',
//     address: '373–375 Station Road, Harrow, HA1 2AW',
//     city: 'Harrow',
//     region: 'Harrow',
//     country: 'England',
//     location: {
//       lat: 51.579504,
//       lng: -0.334262,
//     },
//     carpetUrl: '/assets/carpets/moon-on-the-hill-harrow.jpg',
//   },
//   {
//     id: 'waterend-barn-st-albans',
//     name: 'Waterend Barn',
//     address: 'St Peters Street, St Albans, Hertfordshire, AL1 3LE',
//     city: 'St Albans',
//     region: 'Hertfordshire',
//     country: 'England',
//     location: {
//       lat: 51.752589,
//       lng: -0.337355,
//     },
//     carpetUrl: '/assets/carpets/waterend-barn-st-albans.jpg',
//   },
//   {
//     id: 'full-house-hemel-hempstead',
//     name: 'The Full House',
//     address: '128 Marlowes, Hemel Hempstead, Hertfordshire, HP1 1EZ',
//     city: 'Hemel Hempstead',
//     region: 'Hertfordshire',
//     country: 'England',
//     location: {
//       lat: 51.753147,
//       lng: -0.472658,
//     },
//     carpetUrl: '/assets/carpets/full-house-hemel-hempstead.jpg',
//   },
//   {
//     id: 'jj-moons-kingsbury',
//     name: 'J.J. Moon’s',
//     address: '553 Kingsbury Road, Kingsbury, Brent, NW9 9EL',
//     city: 'Kingsbury',
//     region: 'Brent',
//     country: 'England',
//     location: {
//       lat: 51.584,
//       lng: -0.278,
//     },
//     carpetUrl: '/assets/carpets/jj-moons-kingsbury.jpg',
//   },
//   {
//     id: 'greenwood-hotel-northolt',
//     name: 'The Greenwood Hotel',
//     address: '674 Whitton Avenue West, Northolt, Ealing, UB5 4LA',
//     city: 'Northolt',
//     region: 'Ealing',
//     country: 'England',
//     location: {
//       lat: 51.553,
//       lng: -0.368,
//     },
//     carpetUrl: '/assets/carpets/greenwood-hotel-northolt.jpg',
//   },
//   {
//     id: 'moon-under-water-colindale',
//     name: 'The Moon Under Water',
//     address: '10 Varley Parade, Colindale, Barnet, NW9 6RR',
//     city: 'Colindale',
//     region: 'Barnet',
//     country: 'England',
//     location: {
//       lat: 51.595,
//       lng: -0.252,
//     },
//     carpetUrl: '/assets/carpets/moon-under-water-colindale.jpg',
//   },
//   {
//     id: 'good-yarn-uxbridge',
//     name: 'The Good Yarn',
//     address: '132 High Street, Uxbridge, Hillingdon, UB8 1JX',
//     city: 'Uxbridge',
//     region: 'Hillingdon',
//     country: 'England',
//     location: {
//       lat: 51.546,
//       lng: -0.478,
//     },
//     carpetUrl: '/assets/carpets/good-yarn-uxbridge.jpg',
//   },
//   {
//     id: 'jj-moons-wembley',
//     name: 'J.J. Moon’s',
//     address: '397 High Road, Wembley, Brent, HA9 6AA',
//     city: 'Wembley',
//     region: 'Brent',
//     country: 'England',
//     location: {
//       lat: 51.552,
//       lng: -0.296,
//     },
//     carpetUrl: '/assets/carpets/jj-moons-wembley.jpg',
//   },
//   {
//     id: 'admiral-byng-potters-bar',
//     name: 'The Admiral Byng',
//     address: '186–192 Darkes Lane, Potters Bar, Hertfordshire, EN6 1AF',
//     city: 'Potters Bar',
//     region: 'Hertfordshire',
//     country: 'England',
//     location: {
//       lat: 51.699,
//       lng: -0.195,
//     },
//     carpetUrl: '/assets/carpets/admiral-byng-potters-bar.jpg',
//   },
//   {
//     id: 'crown-berkhamsted',
//     name: 'The Crown',
//     address: '145 High Street, Berkhamsted, Hertfordshire, HP4 3HH',
//     city: 'Berkhamsted',
//     region: 'Hertfordshire',
//     country: 'England',
//     location: {
//       lat: 51.762,
//       lng: -0.565,
//     },
//     carpetUrl: '/assets/carpets/crown-berkhamsted.jpg',
//   },
//   {
//     id: 'railway-bell-east-barnet',
//     name: 'The Railway Bell',
//     address: '13 East Barnet Road, Barnet, EN4 8RR',
//     city: 'East Barnet',
//     region: 'Barnet',
//     country: 'England',
//     location: {
//       lat: 51.648,
//       lng: -0.172,
//     },
//     carpetUrl: '/assets/carpets/railway-bell-east-barnet.jpg',
//   },
//   {
//     id: 'harpsfield-hall-hatfield',
//     name: 'Harpsfield Hall',
//     address: '13a Parkhouse Court, Hatfield, Hertfordshire, AL10 9RQ',
//     city: 'Hatfield',
//     region: 'Hertfordshire',
//     country: 'England',
//     location: {
//       lat: 51.763,
//       lng: -0.225,
//     },
//     carpetUrl: '/assets/carpets/harpsfield-hall-hatfield.jpg',
//   },
// ];
