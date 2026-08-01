
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";

export default function LoyaltyManagement ({ setPage, setActivePage}) {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadRewards() {
    setLoading(true);

    const snapshot = await getDocs(collection(db, "loyaltyRewards"));

    setRewards(
      snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }))
    );

    setLoading(false);
  }

  useEffect(() => {
    loadRewards();
  }, []);

  return (
    <div className="admin-page">
      <h1>🎁 Loyalty Rewards Admin</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <p>{rewards.length} rewards found</p>
      )}
    </div>
  );
}
