export interface Environment {
  production: boolean;
  ssr?: boolean;
  ENABLE_ALL_FEATURES_FOR_DEV?: boolean;
  enableAllFeaturesForDev?: boolean;
  debugLevel?: 'OFF' | 'ESSENTIAL' | 'STANDARD' | 'EXTREME';

  // Development Mode Configuration
  ACTIVE_DEVELOPMENT_MODE?: boolean;
  ALLOW_ONBOARDING_ACCESS?: boolean;

  // Development timeouts
  MODAL_NAVIGATION_TIMEOUT?: number;
  DESKTOP_TESTING_DELAY?: number;
  LLM_TO_PHOTO_DELAY?: number;
  LLM_CHECK: boolean;

  // Check-in configuration
  checkInDistanceThresholdMeters?: number;
  nearbyPubsRadiusMeters?: number;

  // External services
  mapTilerKey?: string;

  firebaseConfig: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
  };

  llm?: {
    gemini: string;
  };

  telegram?: {
    botToken: string;
    chatId: string;
    checkinNotificationsEnabled?: boolean;
    realUsersOnly?: boolean;
  };

  database?: {
    name: string;
    version: number;
    stores: {
      carpets: string;
      [key: string]: string;
    };
  };

  featureFlags: {
    patchwork?: boolean;
    landlord?: boolean;
    theme?: boolean;
    search?: boolean;
    badges?: boolean;
    missions?: boolean;
    photoUpload?: boolean;
    homepageHero?: boolean;
    homepageNewsWidget?: boolean;
    homepageEventsWidget?: boolean;
    login?: boolean;
    register?: boolean;
    news?: boolean;
    events?: boolean;
    research?: boolean;
    siteMap?: boolean;
    accessibility?: boolean;
    checkinGates?: {
      pointDown?: boolean;
      holdSteady?: boolean;
      sharpness?: boolean;
      contrast?: boolean;
      texture?: boolean;
      pattern?: boolean;
      colorVariance?: boolean;
      patternRecognition?: boolean;
    };
  };
}
