import { collection, getDocs, updateDoc, deleteField } from "firebase/firestore";
import { db } from "../firebase";

async function removeBestSellerField() {
  const snapshot = await getDocs(collection(db, "menu"));

  for (const document of snapshot.docs) {
    await updateDoc(document.ref, {
      isBestSeller: deleteField(),
    });
    console.log(`Updated ${document.id}`);
  }

  console.log("Finished!");
}

removeBestSellerField();
