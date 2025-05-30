export const environment = {
  production: false,
  ssr: false,
  ENABLE_ALL_FEATURES_FOR_DEV: true,
  firebaseConfig: {
    apiKey: 'API_KEY',
    authDomain: 'AUTH_DOMAIN',
    projectId: 'PROJECT_ID',
    storageBucket: 'STORAGE_BUCKET',
    messagingSenderId: 'MESSAGING_SENDER_ID',
    appId: 'APP_ID',
    measurementId: 'MEASUREMENT_ID',
  },
  featureFlags: {
    patchwork: false,
    landlord: false,
    theme: true,
    search: false,
    badges: false,
    missions: false,
    photoUpload: false
  },
};
