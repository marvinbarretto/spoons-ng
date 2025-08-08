import { Environment } from './environment.model';

export const environment: Environment = {
  production: true,
  ssr: false,
  ENABLE_ALL_FEATURES_FOR_DEV: false,
  debugLevel: 'OFF' as 'OFF' | 'ESSENTIAL' | 'STANDARD' | 'EXTREME',

  // Production Mode Configuration
  ACTIVE_DEVELOPMENT_MODE: false,
  ALLOW_ONBOARDING_ACCESS: false,

  // Production timeouts (in milliseconds)
  MODAL_NAVIGATION_TIMEOUT: 5000, // 5 seconds
  DESKTOP_TESTING_DELAY: 0, // No delay
  LLM_TO_PHOTO_DELAY: 1000, // 1 second
  LLM_CHECK: false,

  // Check-in configuration
  checkInDistanceThresholdMeters: 1000, // 1000m while in dev
  nearbyPubsRadiusMeters: 50000, // 50km for nearby pub discovery

  firebaseConfig: {
    apiKey: 'AIzaSyBdKYAgR7eg7AsDWvZZTzKcq0xn5Su465E',
    authDomain: 'spoons-15e03.firebaseapp.com',
    projectId: 'spoons-15e03',
    storageBucket: 'spoons-15e03.firebasestorage.app',
    messagingSenderId: '650443293688',
    appId: '1:650443293688:web:3b017d299ffe7efe458c0d',
    measurementId: 'G-XTM7RJ233M',
  },
  llm: {
    gemini: 'AIzaSyA6rrPGUYoM-70DXJrGVcBbqSdwNZAduRE',
  },
  telegram: {
    botToken: '7999180647:AAG6t-vz560uu-Kv3iCJ94YsOYhiAM_7LI4',
    chatId: '7483956469',
  },
  database: {
    name: 'Spoonscount',
    version: 1,
    stores: {
      carpets: 'carpets',
      // Add other stores as needed
      // photos: 'photos',
      // settings: 'settings'
    },
  },
  featureFlags: {
    homepageHero: false,
    homepageNewsWidget: false,
    homepageEventsWidget: false,
    theme: true,
    search: false,
    login: true,
    register: true,
    news: false,
    events: true,
    research: false,
    siteMap: false,
    accessibility: false,
    checkinGates: {
      pointDown: true,
      holdSteady: false,
      sharpness: false,
      contrast: false,
      texture: false,
      pattern: false,
    },
  },
};
