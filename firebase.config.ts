import { initializeApp, getApp } from "firebase/app";
import { environment } from "./src/environments/environment";
import { provideFirebaseApp } from "@angular/fire/app";
import { provideFirestore } from "@angular/fire/firestore";
import { provideAuth } from "@angular/fire/auth";
import { provideStorage } from "@angular/fire/storage";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth, initializeAuth, indexedDBLocalPersistence } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { Capacitor } from "@capacitor/core";

export const firebaseProviders = [
  provideFirebaseApp(() => {
    const app = initializeApp(environment.firebaseConfig);
    console.log('🔥 Firebase app initialized:', app.name);
    return app;
  }),
  provideFirestore(() => {
    try {
      // Use the existing app instance
      const app = getApp();
      const firestore = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });

      console.log('🔥 Firebase offline persistence enabled');
      return firestore;
    } catch (error) {
      // Fallback to default Firestore if persistence fails
      console.warn('🔥 Firebase: Falling back to default Firestore configuration', error);
      return getFirestore();
    }
  }),
  provideAuth(() => {
    const app = getApp();
    
    console.log('🔥 [VERBOSE] Firebase Auth Provider called');
    console.log('🔥 [VERBOSE] App info:', {
      name: app.name,
      options: app.options,
      automaticDataCollectionEnabled: app.automaticDataCollectionEnabled
    });
    console.log('🔥 [VERBOSE] Capacitor platform check:', {
      isNativePlatform: Capacitor.isNativePlatform(),
      getPlatform: Capacitor.getPlatform(),
      isPluginAvailable: Capacitor.isPluginAvailable('FirebaseAuthentication')
    });
    
    if (Capacitor.isNativePlatform()) {
      console.log('🔥 [VERBOSE] Initializing Firebase Auth for NATIVE platform with indexedDB persistence');
      try {
        const auth = initializeAuth(app, {
          persistence: indexedDBLocalPersistence
        });
        console.log('🔥 [VERBOSE] Native Firebase Auth initialized successfully:', {
          config: auth.config,
          name: auth.name,
          currentUser: auth.currentUser
        });
        return auth;
      } catch (error) {
        console.error('🔥 [ERROR] Failed to initialize native Firebase Auth:', error);
        console.log('🔥 [VERBOSE] Falling back to getAuth()');
        return getAuth(app);
      }
    } else {
      console.log('🔥 [VERBOSE] Initializing Firebase Auth for WEB platform');
      const auth = getAuth(app);
      console.log('🔥 [VERBOSE] Web Firebase Auth initialized:', {
        config: auth.config,
        name: auth.name,
        currentUser: auth.currentUser
      });
      return auth;
    }
  }),
  provideStorage(() => getStorage()),
]
