export const environment = {
  production: false,
  enableAllFeaturesForDev: true,
  strapiUrl: 'http://127.0.0.1:1337',
  strapiToken: 'STRAPI_TOKEN',
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
  },
};
