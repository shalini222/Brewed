import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";

export default function LoyaltyMembersPage({ setPage, setActivePage }) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("All");
  const [selectedMember, setSelectedMember] = useState(null);
  const [pointsChange, setPointsChange] = useState("");
  const [reason, setReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [memberTransactions, setMemberTransactions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");

  const labels = {
    earned: "Earned",
    redeem: "Redeemed",
    manual_add: "Manual Add",
    manual_remove: "Manual Remove",
  };

  async function loadMembers() {
    setLoading(true);

    const snapshot = await getDocs(collection(db, "users"));

    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setMembers(data);

    const txSnapshot = await getDocs(
      query(
        collection(db, "loyaltyTransactions"),
        orderBy("createdAt", "desc")
      )
    );

    setTransactions(
      txSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    );

    setLoading(false);
  }

  async function loadTransactions(userId) {
    const snapshot = await getDocs(
      query(
        collection(db, "loyaltyTransactions"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      )
    );

    setMemberTransactions(
      snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    );
  }

  async function adjustPoints(type) {
    if (!selectedMember) return;

    const amount = Number(pointsChange);

    if (!amount || amount <= 0) {
      alert("Enter a valid number of points.");
      return;
    }

    setAdjusting(true);

    try {
      const current = selectedMember.loyaltyPoints || 0;
      const lifetime = selectedMember.lifetimePoints || 0;

      const newPoints =
        type === "add"
          ? current + amount
          : Math.max(0, current - amount);

      const newLifetime =
        type === "add"
          ? lifetime + amount
          : lifetime;

      await updateDoc(
        doc(db, "users", selectedMember.id),
        {
          loyaltyPoints: newPoints,
          lifetimePoints: newLifetime,
        }
      );

      await addDoc(
        collection(db, "loyaltyTransactions"),
        {
          userId: selectedMember.id,
          userName: selectedMember.name || "Customer",
          userEmail: selectedMember.email || "",
          type: type === "add"
            ? "manual_add"
            : "manual_remove",
          points:
            type === "add"
              ? amount
              : -amount,
          description:
            reason || "Adjusted by admin",
          createdAt: serverTimestamp(),
        }
      );

      alert("Points updated.");

      loadMembers();
      loadTransactions(selectedMember.id);

      setSelectedMember({
        ...selectedMember,
        loyaltyPoints: newPoints,
        lifetimePoints: newLifetime,
      });

      setPointsChange("");
      setReason("");

    } catch (err) {
      console.error(err);
      alert("Failed to update points.");
    }

    setAdjusting(false);
  }

  useEffect(() => {
    loadMembers();
  }, []);

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      (tx.description || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (tx.userName || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (tx.userEmail || "")
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesType =
      filterType === "All" || tx.type === filterType;

    return matchesSearch && matchesType;
  });

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
        .loyalty-filters {
          display: flex;
          gap: 15px;
          margin: 25px 0;
          flex-wrap: wrap;
        }
        .loyalty-filters input {
          flex: 1;
          min-width: 260px;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid #ddd;
        }
        .loyalty-filters select {
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid #ddd;
        }
        .history-toolbar {
          display: flex;
          gap: 15px;
          margin: 20px 0;
          flex-wrap: wrap;
        }
        .history-toolbar input {
          flex: 1;
          min-width: 260px;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid #ddd;
        }
        .history-toolbar select {
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid #ddd;
        }
        .loyalty-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 18px;
          margin: 25px 0;
        }
        .loyalty-stat-card {
          background: #fff;
          border-radius: 18px;
          padding: 22px;
          text-align: center;
          border: 1px solid #eee;
          box-shadow: 0 10px 25px rgba(0, 0, 0, .06);
        }
        .loyalty-stat-card h2 {
          margin: 0;
          color: #3B1A08;
          font-size: 30px;
        }
        .loyalty-stat-card p {
          margin-top: 10px;
          color: #777;
          font-weight: 600;
        }
        .loyalty-drawer {
          position: fixed;
          top: 0;
          right: 0;
          width: 420px;
          max-width: 100%;
          height: 100vh;
          background: #fff;
          box-shadow: -10px 0 40px rgba(0, 0, 0, .15);
          z-index: 1000;
          overflow-y: auto;
        }
        .loyalty-drawer-header {
          background: #3B1A08;
          color: white;
          padding: 22px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .loyalty-drawer-header button {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
        }
        .loyalty-drawer-body {
          padding: 24px;
        }
        .loyalty-drawer-body p {
          margin-bottom: 18px;
        }
        .loyalty-drawer-body h3 {
          margin-top: 24px;
          margin-bottom: 12px;
          color: #3B1A08;
        }
        .loyalty-drawer-body input[type="number"],
        .loyalty-drawer-body textarea {
          width: 100%;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid #ddd;
          margin-bottom: 12px;
          font-family: inherit;
        }
        .loyalty-drawer-body textarea {
          resize: vertical;
          min-height: 80px;
        }
        .transaction-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px;
          margin-top: 12px;
          border-radius: 12px;
          background: #fafafa;
          border: 1px solid #eee;
        }
        .section-title {
          margin-top: 40px;
          margin-bottom: 20px;
          color: #3B1A08;
        }
        .loyalty-history {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .history-card {
          background: #fff;
          border-radius: 14px;
          padding: 16px;
          border: 1px solid #eee;
          box-shadow: 0 4px 12px rgba(0,0,0,.04);
        }
        .history-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .history-date {
          font-size: 12px;
          color: #777;
        }
        .history-card h4 {
          margin: 0 0 10px 0;
          color: #3B1A08;
          font-size: 15px;
        }
        .history-bottom {
          display: flex;
          justify-content: flex-end;
        }
        .badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .badge.earned {
          background: #E8F5E9;
          color: #2E7D32;
        }
        .badge.redeem {
          background: #FFF8E1;
          color: #F57C00;
        }
        .badge.manual_add {
          background: #E3F2FD;
          color: #1565C0;
        }
        .badge.manual_remove {
          background: #FFEBEE;
          color: #C62828;
        }
        .points {
          font-weight: 700;
        }
        .points.positive {
          color: #2E7D32;
        }
        .points.negative {
          color: #C62828;
        }
        .empty-state {
          text-align: center;
          padding: 40px;
          background: #fff;
          border-radius: 12px;
          border: 1px solid #eee;
          margin-top: 20px;
        }
        .empty-state h3 {
          color: #3B1A08;
          margin-bottom: 8px;
        }
        .empty-state p {
          color: #777;
          margin: 0;
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

      <div className="loyalty-stats-grid">
        <div className="loyalty-stat-card">
          <h2>{members.length}</h2>
          <p>👥 Total Members</p>
        </div>

        <div className="loyalty-stat-card">
          <h2>
            {
              members.filter(
                (m) => (m.lifetimePoints || 0) < 500
              ).length
            }
          </h2>
          <p>🥉 Bronze</p>
        </div>

        <div className="loyalty-stat-card">
          <h2>
            {
              members.filter(
                (m) =>
                  (m.lifetimePoints || 0) >= 500 &&
                  (m.lifetimePoints || 0) < 1500
              ).length
            }
          </h2>
          <p>🥈 Silver</p>
        </div>

        <div className="loyalty-stat-card">
          <h2>
            {
              members.filter(
                (m) =>
                  (m.lifetimePoints || 0) >= 1500 &&
                  (m.lifetimePoints || 0) < 3000
              ).length
            }
          </h2>
          <p>🥇 Gold</p>
        </div>

        <div className="loyalty-stat-card">
          <h2>
            {
              members.filter(
                (m) => (m.lifetimePoints || 0) >= 3000
              ).length
            }
          </h2>
          <p>💎 Platinum</p>
        </div>
      </div>

      <div className="loyalty-filters">
        <input
          type="text"
          placeholder="🔍 Search members..."
          value={memberSearch}
          onChange={(e) => setMemberSearch(e.target.value)}
        />

        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
        >
          <option>All</option>
          <option>Bronze</option>
          <option>Silver</option>
          <option>Gold</option>
          <option>Platinum</option>
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : members.length === 0 ? (
        <div className="empty-state">
          <h3>No loyalty members found.</h3>
        </div>
      ) : (
        <>
          <div className="loyalty-members-grid">
            {members
              .filter((member) => {
                const matchesSearch =
                  (member.name || "")
                    .toLowerCase()
                    .includes(memberSearch.toLowerCase()) ||
                  (member.email || "")
                    .toLowerCase()
                    .includes(memberSearch.toLowerCase());

                const tier =
                  member.lifetimePoints >= 3000
                    ? "Platinum"
                    : member.lifetimePoints >= 1500
                    ? "Gold"
                    : member.lifetimePoints >= 500
                    ? "Silver"
                    : "Bronze";

                const matchesTier =
                  tierFilter === "All" || tier === tierFilter;

                return matchesSearch && matchesTier;
              })
              .map((member) => (
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
                  <button
                    className="admin-btn"
                    onClick={() => {
                      setSelectedMember(member);
                      loadTransactions(member.id);
                    }}
                  >
                    Manage Loyalty
                  </button>
                </div>
              ))}
          </div>

          <h2 className="section-title">
            📜 Loyalty Activity
          </h2>

          <div className="history-toolbar">
            <input
              type="text"
              placeholder="Search customer or reward..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="All">All</option>
              <option value="earned">Earned</option>
              <option value="redeem">Redeemed</option>
              <option value="manual_add">Manual Add</option>
              <option value="manual_remove">Manual Remove</option>
            </select>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="empty-state">
              <h3>No transactions found</h3>
              <p>Try changing your search or filter.</p>
            </div>
          ) : (
            <div className="loyalty-history">
              {filteredTransactions.map((tx) => (
                <div key={tx.id} className="history-card">
                  <div className="history-top">
                    <span className={`badge ${tx.type}`}>
                      {labels[tx.type] || tx.type}
                    </span>

                    <span className="history-date">
                      {tx.createdAt?.toDate?.().toLocaleString()}
                    </span>
                  </div>

                  <h4>{tx.description || "Loyalty Event"}</h4>

                  <div className="history-bottom">
                    <span
                      className={
                        tx.points >= 0
                          ? "points positive"
                          : "points negative"
                      }
                    >
                      {tx.points > 0 ? "+" : ""}
                      {tx.points} pts
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {selectedMember && (
        <div className="loyalty-drawer">
          <div className="loyalty-drawer-header">
            <h2>{selectedMember.name || "Customer"}</h2>

            <button onClick={() => setSelectedMember(null)}>
              ✕
            </button>
          </div>

          <div className="loyalty-drawer-body">
            <p>
              ⭐ Current Points:
              <strong> {selectedMember.loyaltyPoints || 0}</strong>
            </p>

            <p>
              🏆 Lifetime Points:
              <strong> {selectedMember.lifetimePoints || 0}</strong>
            </p>

            <p>
              🛒 Orders:
              <strong> {selectedMember.totalOrders || 0}</strong>
            </p>

            <p>📧 {selectedMember.email}</p>

            <hr style={{ margin: "20px 0", border: "0", borderTop: "1px solid #eee" }} />

            <h3>Manual Points Adjustment</h3>

            <input
              type="number"
              placeholder="Points"
              value={pointsChange}
              onChange={(e) =>
                setPointsChange(e.target.value)
              }
            />

            <textarea
              placeholder="Reason"
              value={reason}
              onChange={(e) =>
                setReason(e.target.value)
              }
            />

            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 15,
              }}
            >
              <button
                className="admin-btn"
                style={{ marginTop: 0 }}
                onClick={() => adjustPoints("add")}
                disabled={adjusting}
              >
                ➕ Add Points
              </button>

              <button
                className="admin-btn"
                style={{ marginTop: 0, background: "#8B0000" }}
                onClick={() => adjustPoints("remove")}
                disabled={adjusting}
              >
                ➖ Remove Points
              </button>
            </div>

            <h3 style={{ marginTop: 30 }}>
              📜 Loyalty Transactions
            </h3>

            {memberTransactions.length === 0 ? (
              <p>No transactions yet.</p>
            ) : (
              memberTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="transaction-card"
                >
                  <div>
                    <span className={`badge ${tx.type}`} style={{ marginBottom: 6, display: "inline-block" }}>
                      {labels[tx.type] || tx.type}
                    </span>
                    <strong>
                      {tx.description || "Loyalty Event"}
                    </strong>

                    <div style={{ fontSize: 13, color: "#777" }}>
                      {tx.createdAt?.toDate?.().toLocaleString()}
                    </div>
                  </div>

                  <div
                    className={
                      tx.points >= 0
                        ? "points positive"
                        : "points negative"
                    }
                  >
                    {tx.points > 0 ? "+" : ""}
                    {tx.points} pts
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
