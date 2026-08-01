import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export default function LoyaltyMembersPage({ setActivePage }) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);

  async function loadMembers() {
    setLoading(true);

    const snapshot = await getDocs(collection(db, "users"));

    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setMembers(data);
    setLoading(false);
  }

  useEffect(() => {
    loadMembers();
  }, []);

  return (
    <div className="admin-page">
      <div className="loyalty-admin-header">
        <button
          className="back-btn"
          onClick={() => setActivePage("loyalty")}
        >
          ← Back
        </button>

        <h1>👥 Loyalty Members</h1>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : members.length === 0 ? (
        <div className="empty-state">
          <h3>No loyalty members found.</h3>
        </div>
      ) : (
        <p>{members.length} members</p>
      )}
    </div>
  );
}
