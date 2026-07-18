import { useEffect } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";

export default function MenuMigration() {
  useEffect(() => {
    const migrate = async () => {
      try {
        const snapshot = await getDocs(collection(db, "menu"));

        for (const item of snapshot.docs) {
          const data = item.data();

          const updates = {};

          if (data.available === undefined)
            updates.available = true;

          if (data.isFeatured === undefined)
            updates.isFeatured = false;

          if (data.salesCount === undefined)
            updates.salesCount = 0;

          if (data.rating === undefined)
            updates.rating = 0;

          if (data.reviews === undefined)
            updates.reviews = 0;

          if (Object.keys(updates).length > 0) {
            await updateDoc(doc(db, "menu", item.id), updates);
            console.log(`Updated ${data.name}`);
          }
        }

        console.log("✅ Migration complete!");
        alert("✅ Menu migration complete!");
      } catch (err) {
        console.error(err);
      }
    };

    migrate();
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>Running Menu Migration...</h1>
      <p>Check the console when finished.</p>
    </div>
  );
}
