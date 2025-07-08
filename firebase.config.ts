import { initializeApp } from "firebase/app";
import { environment } from "./src/environments/environment";
import { provideFirebaseApp } from "@angular/fire/app";
import { provideFirestore } from "@angular/fire/firestore";
import { provideAuth } from "@angular/fire/auth";
import { provideStorage } from "@angular/fire/storage";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

export const firebaseProviders = [
  provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
  provideFirestore(() => getFirestore()),
  provideAuth(() => getAuth()),
  provideStorage(() => getStorage()),
]
