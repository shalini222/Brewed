import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // 1. Add this import
import { getStorage } from "firebase/storage";

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
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app); // 2. Add this line to export the database
export const storage = getStorage(app);
