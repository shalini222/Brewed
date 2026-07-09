import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  // PASTE YOUR FIREBASE CONFIG OBJECT HERE
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

