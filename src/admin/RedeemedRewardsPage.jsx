import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export default function RedeemedRewardsPage({ setPage, setActivePage }) {
  const [loading, setLoading] = useState(true);
  const [redemptions, setRedemptions] = useState([]);

  async function loadRedemptions() {
    setLoading(true);

    const snapshot = await getDocs(collection(db, "rewardRedemptions"));

    setRedemptions(
      snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }))
    );

    setLoading(false);
  }

  useEffect(() => {
    loadRedemptions();
  }, []);

  return (
    <div className="admin-page">
      <style>{`
        .redemption-card {
          background: #fff;
          border-radius: 18px;
          padding: 22px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
          transition: 0.25s;
        }

        .redemption-card:hover {
          transform: translateY(-4px);
        }

        .redemption-card h3 {
          margin-bottom: 16px;
          color: #4A3428;
        }
      `}</style>

      <div className="loyalty-admin-header">
        <button className="back-btn" onClick={() => setActivePage("loyalty")}>
          ← Back
        </button>
        <h1>🎟 Redeemed Rewards</h1>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : redemptions.length === 0 ? (
        <div className="empty-state">
          <h3>No redeemed rewards yet.</h3>
          <p>Customer redemptions will appear here.</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 20,
            marginTop: 20,
          }}
        >
          {redemptions.map((redemption) => (
            <div key={redemption.id} className="redemption-card">
              <h3>{redemption.rewardTitle}</h3>

              <p>
                <strong>Customer:</strong> {redemption.customerName}
              </p>

              <p>
                <strong>Email:</strong> {redemption.customerEmail}
              </p>

              <p>
                <strong>Points:</strong> {redemption.points}
              </p>

              <p>
                <strong>Status:</strong> {redemption.status}
              </p>

              <p>
                <strong>Redeemed:</strong>{" "}
                {redemption.redeemedAt?.toDate?.().toLocaleString() || "-"}
              </p>

              <p>
                <strong>Expires:</strong>{" "}
                {redemption.expiresAt?.toDate?.().toLocaleDateString() || "-"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
