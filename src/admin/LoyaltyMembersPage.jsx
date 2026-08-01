import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export default function LoyaltyMembersPage({ setPage, setActivePage }) {
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
      <style>{`
        .loyalty-members-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
          margin-top: 30px;
        }
        .loyalty-member-card {
          background: #fff;
          border-radius: 18px;
          padding: 22px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, .08);
          border: 1px solid #eee;
        }
        .loyalty-member-card h3 {
          margin-bottom: 10px;
          color: #3B1A08;
        }
        .loyalty-member-card p {
          margin: 8px 0;
          color: #666;
        }
        .admin-btn {
          width: 100%;
          margin-top: 18px;
          background: #3B1A08;
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 12px;
          cursor: pointer;
          font-weight: 600;
        }
      `}</style>

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
        <div className="loyalty-members-grid">
          {members.map((member) => (
            <div key={member.id} className="loyalty-member-card">
              <h3>{member.name || "Customer"}</h3>
              <p>📧 {member.email}</p>
              <p>
                ⭐ <strong>Current Points:</strong>{" "}
                {member.loyaltyPoints || 0}
              </p>
              <p>
                🏆 <strong>Lifetime Points:</strong>{" "}
                {member.lifetimePoints || 0}
              </p>
              <p>
                🥉 <strong>Tier:</strong>{" "}
                {member.tier || "Bronze"}
              </p>
              <p>
                🛒 <strong>Total Orders:</strong>{" "}
                {member.totalOrders || 0}
              </p>
              <button className="admin-btn">Manage Loyalty</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

