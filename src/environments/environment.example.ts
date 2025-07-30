import { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  ssr: false,
  debugLevel: 'STANDARD' as 'OFF' | 'ESSENTIAL' | 'STANDARD' | 'EXTREME',

  ACTIVE_DEVELOPMENT_MODE: true,
  ALLOW_ONBOARDING_ACCESS: true,

  // Development timeouts (in milliseconds)
  MODAL_NAVIGATION_TIMEOUT: 10000,
  DESKTOP_TESTING_DELAY: 2000,
  LLM_TO_PHOTO_DELAY: 3000,
  checkInDistanceThresholdMeters: 200,
  nearbyPubsRadiusMeters: 50000,
  firebaseConfig: {
    apiKey: 'API_KEY',
    authDomain: 'AUTH_DOMAIN',
    projectId: 'PROJECT_ID',
    storageBucket: 'STORAGE_BUCKET',
    messagingSenderId: 'MESSAGING_SENDER_ID',
    appId: 'APP_ID',
    measurementId: 'MEASUREMENT_ID',
  },
  llm: {
    gemini: 'GEMINI_API_KEY',
  },
  telegram: {
    botToken: 'YOUR_TELEGRAM_BOT_TOKEN',
    chatId: 'YOUR_TELEGRAM_CHAT_ID',
  },
  database: {
    name: 'Spoonscount',
    version: 1,
    stores: {
      carpets: 'carpets',
      // Add other stores as needed
    },
  },
  featureFlags: {
    landlord: false,
    theme: true,
    search: false,
    badges: false,
    missions: false,
    photoUpload: false,
  },
};
