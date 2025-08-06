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
    apiKey: process.env['FIREBASE_API_KEY'] || '',
    authDomain: process.env['FIREBASE_AUTH_DOMAIN'] || '',
    projectId: process.env['FIREBASE_PROJECT_ID'] || '',
    storageBucket: process.env['FIREBASE_STORAGE_BUCKET'] || '',
    messagingSenderId: process.env['FIREBASE_MESSAGING_SENDER_ID'] || '',
    appId: process.env['FIREBASE_APP_ID'] || '',
    measurementId: process.env['FIREBASE_MEASUREMENT_ID'] || '',
  },
  llm: {
    gemini: process.env['GEMINI_API_KEY'] || '',
  },
  telegram: {
    botToken: process.env['TELEGRAM_BOT_TOKEN'] || '',
    chatId: process.env['TELEGRAM_CHAT_ID'] || '',
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
