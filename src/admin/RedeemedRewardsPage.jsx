import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";

export default function RedeemedRewardsPage({ setPage, setActivePage }) {
  const [loading, setLoading] = useState(true);
  const [redemptions, setRedemptions] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  async function loadRedemptions() {
    setLoading(true);

    const snapshot = await getDocs(collection(db, "rewardRedemptions"));
    const batch = writeBatch(db);

    const rewards = snapshot.docs.map((d) => {
      const data = d.data();

      let status = data.status;

      if (
        status === "unused" &&
        data.expiresAt &&
        data.expiresAt.toDate() < new Date()
      ) {
        status = "expired";

        // Update admin document
        batch.update(doc(db, "rewardRedemptions", d.id), {
          status: "expired",
        });

        // Update customer's reward document
        if (data.userId && data.customerRewardId) {
          batch.update(
            doc(
              db,
              "users",
              data.userId,
              "redeemedRewards",
              data.customerRewardId
            ),
            {
              status: "expired",
            }
          );
        }
      }

      return {
        id: d.id,
        ...data,
        status,
      };
    });

    await batch.commit();

    setRedemptions(rewards);
    setLoading(false);
  }

  async function loadMenuItems() {
    const snapshot = await getDocs(collection(db, "menuItems"));

    setMenuItems(
      snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }))
    );
  }

  async function markAsUsed(redemption) {
    try {
      // Update admin record
      await updateDoc(
        doc(db, "rewardRedemptions", redemption.id),
        {
          status: "used",
          usedAt: serverTimestamp(),
        }
      );

      // Update customer record
      if (redemption.userId && redemption.customerRewardId) {
        await updateDoc(
          doc(
            db,
            "users",
            redemption.userId,
            "redeemedRewards",
            redemption.customerRewardId
          ),
          {
            status: "used",
            usedAt: serverTimestamp(),
          }
        );
      }

      loadRedemptions();
    } catch (err) {
      console.error(err);
      alert("Failed to update reward.");
    }
  }

  useEffect(() => {
    loadRedemptions();
    loadMenuItems();
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

  // Step 1: Added birthday rewards stat count
  const birthdayRewards = redemptions.filter(
    (r) => r.rewardType === "birthday"
  ).length;

  const filteredRedemptions = redemptions
    .filter((redemption) => {
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

      // Step 1: Updated filter logic for birthday rewards
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "birthday"
          ? redemption.rewardType === "birthday"
          : redemption.status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const aTime = a.redeemedAt?.toMillis?.() || 0;
      const bTime = b.redeemedAt?.toMillis?.() || 0;

      switch (sortBy) {
        case "oldest":
          return aTime - bTime;

        case "pointsHigh":
          return (b.points || 0) - (a.points || 0);

        case "pointsLow":
          return (a.points || 0) - (b.points || 0);

        default: // newest
          return bTime - aTime;
      }
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
         .birthday-badge{
  display:inline-flex;
  align-items:center;
  gap:6px;
  margin-left:8px;
  padding:4px 10px;
  border-radius:999px;
  background:#FFF4D6;
  color:#B7791F;
  font-size:12px;
  font-weight:600;
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

  <select
    value={sortBy}
    onChange={(e) => setSortBy(e.target.value)}
  >
    <option value="newest">Newest First</option>
    <option value="oldest">Oldest First</option>
    <option value="pointsHigh">Highest Points</option>
    <option value="pointsLow">Lowest Points</option>
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
    {filteredRedemptions.map((redemption) => {
      const menuItem = menuItems.find(
        (item) => item.id === redemption.menuItemId
      );

      return (
        <div key={redemption.id} className="redemption-card">
          <div>
            <h3>{redemption.rewardTitle}</h3>

            {/* 🎂 Birthday Gift Badge */}
            {redemption.rewardType === "birthday" && (
              <span className="birthday-badge">
                🎂 Birthday Gift
              </span>
            )}

            <p>
              <strong>Customer:</strong> {redemption.customerName}
            </p>

            <p>
              <strong>Email:</strong> {redemption.customerEmail}
            </p>

            <p>
              <strong>🎁 Type:</strong> {redemption.rewardType || "-"}
            </p>

            <p>
              <strong>☕ Menu Item:</strong> {menuItem?.name || "-"}
            </p>

            <p>
              <strong>💰 Points:</strong> {redemption.points}
            </p>

            <p>
              <strong>Status:</strong>{" "}
              <span className={`status-badge ${redemption.status}`}>
                {redemption.status}
              </span>
            </p>

            <p>
              <strong>📅 Redeemed:</strong>{" "}
              {redemption.redeemedAt?.toDate?.().toLocaleDateString() || "-"}
            </p>

            <p>
              <strong>⏳ Expires:</strong>{" "}
              {redemption.expiresAt?.toDate?.().toLocaleDateString() || "-"}
            </p>
          </div>

          {redemption.status === "unused" && (
            <button
              className="use-btn"
              onClick={() => {
                const confirmed = window.confirm(
                  "Mark this reward as used?\n\nThis action cannot be undone."
                );

                if (confirmed) {
                  markAsUsed(redemption);
                }
              }}
            >
              ✅ Mark as Used
            </button>
          )}
        </div>
      );
    })}
  </div>
)}

   
    </div>
  );
}
