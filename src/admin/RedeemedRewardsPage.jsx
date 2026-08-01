import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export default function RedeemedRewardsPage({ setPage, setActivePage }) {
  const [loading, setLoading] = useState(true);
  const [redemptions, setRedemptions] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  async function markAsUsed(redemption) {
    try {
      await updateDoc(
        doc(db, "rewardRedemptions", redemption.id),
        {
          status: "used",
          usedAt: serverTimestamp(),
        }
      );

      loadRedemptions();
    } catch (err) {
      console.error(err);
      alert("Failed to update reward.");
    }
  }

  useEffect(() => {
    loadRedemptions();
  }, []);

  const totalRedemptions = redemptions.length;

  const unusedRewards = redemptions.filter(
    (r) => r.status === "unused"
  ).length;

  const usedRewards = redemptions.filter(
    (r) => r.status === "used"
  ).length;

  const expiredRewards = redemptions.filter(
    (r) => r.status === "expired"
  ).length;

  const filteredRedemptions = redemptions.filter((redemption) => {
    const matchesSearch =
      redemption.customerName
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      redemption.rewardTitle
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      redemption.customerEmail
        ?.toLowerCase()
        .includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      redemption.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="admin-page">
      <style>{`
        .redemption-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 18px;
          margin: 25px 0;
        }

        .redemption-stat-card {
          background: #fff;
          padding: 22px;
          border-radius: 18px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, .08);
          border-top: 4px solid #C4956A;
          transition: .25s;
        }

        .redemption-stat-card:hover {
          transform: translateY(-4px);
        }

        .redemption-stat-card h4 {
          margin: 0;
          color: #8A6B55;
          font-size: .9rem;
        }

        .redemption-stat-card h2 {
          margin-top: 12px;
          color: #4A3428;
          font-size: 2rem;
        }

        .redemption-toolbar {
          display: flex;
          gap: 15px;
          margin: 25px 0;
          flex-wrap: wrap;
        }

        .redemption-toolbar input {
          flex: 1;
          min-width: 250px;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid #ddd;
          font-size: 15px;
        }

        .redemption-toolbar select {
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid #ddd;
          min-width: 170px;
          background: #fff;
        }

        .redemption-card {
          background: #fff;
          border-radius: 18px;
          padding: 22px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
          transition: 0.25s;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .redemption-card:hover {
          transform: translateY(-4px);
        }

        .redemption-card h3 {
          margin-bottom: 16px;
          color: #4A3428;
        }

        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 600;
          text-transform: capitalize;
        }

        .status-badge.unused {
          background: #FFF5D6;
          color: #A86B00;
        }

        .status-badge.used {
          background: #DFF7E8;
          color: #0B7A3B;
        }

        .status-badge.expired {
          background: #FFE3E3;
          color: #B42318;
        }

        .use-btn {
          margin-top: 18px;
          padding: 10px 18px;
          border: none;
          border-radius: 12px;
          background: #C4956A;
          color: #fff;
          cursor: pointer;
          font-weight: 600;
          transition: .25s;
          width: 100%;
        }

        .use-btn:hover {
          transform: translateY(-2px);
        }
      `}</style>

      <div className="loyalty-admin-header">
        <button className="back-btn" onClick={() => setActivePage("loyalty")}>
          ← Back
        </button>
        <h1>🎟 Redeemed Rewards</h1>
      </div>

      <div className="redemption-stats">
        <div className="redemption-stat-card">
          <h4>Total Redeemed</h4>
          <h2>{totalRedemptions}</h2>
        </div>

        <div className="redemption-stat-card">
          <h4>Unused</h4>
          <h2>{unusedRewards}</h2>
        </div>

        <div className="redemption-stat-card">
          <h4>Used</h4>
          <h2>{usedRewards}</h2>
        </div>

        <div className="redemption-stat-card">
          <h4>Expired</h4>
          <h2>{expiredRewards}</h2>
        </div>
      </div>

      <div className="redemption-toolbar">
        <input
          type="text"
          placeholder="Search customer, email or reward..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="unused">Unused</option>
          <option value="used">Used</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : filteredRedemptions.length === 0 ? (
        <div className="empty-state">
          <h3>No matching rewards found.</h3>
          <p>Try changing your search or filter.</p>
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
          {filteredRedemptions.map((redemption) => (
            <div key={redemption.id} className="redemption-card">
              <div>
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
                  <strong>Status:</strong>{" "}
                  <span className={`status-badge ${redemption.status}`}>
                    {redemption.status}
                  </span>
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

              {redemption.status === "unused" && (
                <button
                  className="use-btn"
                  onClick={() => markAsUsed(redemption)}
                >
                  ✅ Mark as Used
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
