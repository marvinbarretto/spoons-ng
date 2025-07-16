import { initializeApp } from "firebase/app";
import { environment } from "./src/environments/environment";
import { provideFirebaseApp } from "@angular/fire/app";
import { provideFirestore } from "@angular/fire/firestore";
import { provideAuth } from "@angular/fire/auth";
import { provideStorage } from "@angular/fire/storage";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

export const firebaseProviders = [
  provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
  provideFirestore(() => {
    try {
      // Initialize Firestore with persistent cache
      const firestore = initializeFirestore(initializeApp(environment.firebaseConfig), {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });

      console.log('🔥 Firebase offline persistence enabled');
      return firestore;
    } catch (error) {
      // Fallback to default Firestore if persistence fails
      console.warn('🔥 Firebase: Falling back to default Firestore configuration');
      return getFirestore();
    }
  }),
  provideAuth(() => getAuth()),
  provideStorage(() => getStorage()),
]
