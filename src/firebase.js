import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyAZXXMZOvmUviZqgDoljAhSllaQLxelvfY",
  authDomain: "brewed-238a8.firebaseapp.com",
  projectId: "brewed-238a8",
  storageBucket: "brewed-238a8.firebasestorage.app",
  messagingSenderId: "488530129853",
  appId: "1:488530129853:web:c737eae789215cabc318d4"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch((error) => {
  alert("Firebase Auth persistence error:", error);
});
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);

export const functions = getFunctions(app, "us-central1");
