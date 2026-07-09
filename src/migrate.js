import { db } from "./firebase.js";
import { collection, addDoc } from "firebase/firestore";
import { menuItems } from "./menu.jsx";

async function migrateData() {
  const menuCollection = collection(db, "menu");
  for (const item of menuItems) {
    try {
      await addDoc(menuCollection, item);
      console.log(`Added: ${item.name}`);
    } catch (e) {
      console.error("Error adding item: ", e);
    }
  }
}

migrateData();

