import { initializeApp } from "firebase/app";
import { environment } from "./src/environments/environment";
import { provideFirebaseApp } from "@angular/fire/app";
import { provideFirestore } from "@angular/fire/firestore";
import { provideAuth } from "@angular/fire/auth";
import { provideStorage } from "@angular/fire/storage";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

export const firebaseProviders = [
  provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
  provideFirestore(() => {
    const firestore = getFirestore();
    
    // Enable offline persistence with development-friendly settings
    enableIndexedDbPersistence(firestore).catch((err) => {
      if (err.code == 'failed-precondition') {
        console.warn('🔥 Firebase: Multiple tabs open, persistence enabled in first tab only');
      } else if (err.code == 'unimplemented') {
        console.warn('🔥 Firebase: Browser doesn\'t support persistence');
      }
    });
    
    console.log('🔥 Firebase offline persistence enabled');
    return firestore;
  }),
  provideAuth(() => getAuth()),
  provideStorage(() => getStorage()),
]
