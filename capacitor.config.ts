import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.spoons.app',
  appName: 'Spoons',
  webDir: 'dist/spoons/browser',
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"]
    },
    Camera: {
      permissions: ["camera"]
    },
    Geolocation: {
      permissions: ["location"]
    }
  }
};

export default config;
