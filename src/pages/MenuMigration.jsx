import { useEffect } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "./firebase";

export default function MigrateMenu() {
  useEffect(() => {
    const migrate = async () => {
      try {
        const snapshot = await getDocs(collection(db, "menu"));

        for (const menuDoc of snapshot.docs) {
          const data = menuDoc.data();
          const updates = {};

          if (data.isBestSeller === undefined)
            updates.isBestSeller = false;

          if (data.isFeatured === undefined)
            updates.isFeatured = false;

          if (data.prepTime === undefined)
            updates.prepTime = "5–8 mins";

          if (data.servedAs === undefined)
            updates.servedAs = "Hot";

          if (data.dietType === undefined)
            updates.dietType = "Vegetarian";

          if (data.salesCount === undefined)
            updates.salesCount = 0;

          if (data.available === undefined)
            updates.available = true;

          // Only update if there's something to add
          if (Object.keys(updates).length > 0) {
            await updateDoc(doc(db, "menu", menuDoc.id), updates);
            console.log(`✅ Updated ${menuDoc.id}`, updates);
          } else {
            console.log(`⏩ Skipped ${menuDoc.id} (already up to date)`);
          }
        }

        console.log("🎉 Menu migration completed!");
      } catch (error) {
        console.error("Migration failed:", error);
      }
    };

    migrate();
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h2>Migrating Menu...</h2>
      <p>Check the console for progress.</p>
    </div>
  );
}
