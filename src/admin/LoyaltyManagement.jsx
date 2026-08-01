import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import RedeemedRewardsPage from "./RedeemedRewardsPage";
import LoyaltyMembersPage from "./LoyaltyMembersPage";
import LoyaltyAnalyticsPage from "./LoyaltyAnalyticsPage";
import LoyaltySettingsPage from "./LoyaltySettingsPage";

export default function LoyaltyManagement({ setPage, setActivePage }) {
  const [rewards, setRewards] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState("rewards");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("pointsLow");

  const [editingReward, setEditingReward] = useState(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    pointsRequired: 0,
    rewardType: "",
    menuItemId: "",
    discountValue: 0,
    image: "",
    active: true,
  });

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

  async function loadMenuItems() {
    const snapshot = await getDocs(collection(db, "menuItems"));

    setMenuItems(
      snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }))
    );
  }

  async function toggleReward(reward) {
    const actionText = reward.active ? "disable" : "enable";
    if (!window.confirm(`Are you sure you want to ${actionText} this reward?`)) return;

    try {
      await updateDoc(doc(db, "loyaltyRewards", reward.id), {
        active: !reward.active,
      });

      loadRewards();
    } catch (err) {
      console.error(err);
      alert("Failed to update reward status.");
    }
  }

  async function deleteReward(id) {
    if (!window.confirm("Delete this reward?")) return;

    try {
      await deleteDoc(doc(db, "loyaltyRewards", id));
      loadRewards();
    } catch (err) {
      console.error(err);
      alert("Failed to delete reward.");
    }
  }

  async function duplicateReward(reward) {
    try {
      const { id, ...data } = reward;

      await addDoc(
        collection(db, "loyaltyRewards"),
        {
          ...data,
          title: `Copy of ${reward.title}`,
          redemptionCount: 0,
          createdAt: serverTimestamp(),
        }
      );

      loadRewards();
    } catch (err) {
      console.error(err);
      alert("Failed to duplicate reward.");
    }
  }

  async function saveReward() {
    if (!form.title.trim()) {
      alert("Enter a reward title.");
      return;
    }

    if (!form.rewardType) {
      alert("Select a reward type.");
      return;
    }

    if (form.pointsRequired <= 0) {
      alert("Points required must be greater than 0.");
      return;
    }

    if (form.rewardType === "freeItem" && !form.menuItemId) {
      alert("Select a menu item for the free item reward.");
      return;
    }

    if (
      (form.rewardType === "discount" || form.rewardType === "walletCredit") &&
      form.discountValue <= 0
    ) {
      alert("Value must be greater than 0.");
      return;
    }

    setSaving(true);

    try {
      if (editingReward) {
        await updateDoc(
          doc(db, "loyaltyRewards", editingReward.id),
          form
        );
      } else {
        await addDoc(collection(db, "loyaltyRewards"), {
          ...form,
          redemptionCount: 0,
          createdAt: serverTimestamp(),
        });
      }

      setEditingReward(null);

      setForm({
        title: "",
        description: "",
        pointsRequired: 0,
        rewardType: "",
        menuItemId: "",
        discountValue: 0,
        image: "",
        active: true,
      });

      loadRewards();
    } catch (err) {
      console.error(err);
      alert("Failed to save reward.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadRewards();
    loadMenuItems();
  }, []);

  const totalRewards = rewards.length;

  const activeRewards = rewards.filter(
    (reward) => reward.active
  ).length;

  const disabledRewards = rewards.filter(
    (reward) => !reward.active
  ).length;

  const totalRedemptions = rewards.reduce(
    (total, reward) => total + (reward.redemptionCount || 0),
    0
  );

  const averagePoints =
    rewards.length > 0
      ? Math.round(
          rewards.reduce(
            (sum, reward) => sum + (reward.pointsRequired || 0),
            0
          ) / rewards.length
        )
      : 0;

  const topRewards = [...rewards]
    .sort(
      (a, b) =>
        (b.redemptionCount || 0) -
        (a.redemptionCount || 0)
    )
    .slice(0, 5);

  const freeRewards = rewards.filter(
    (r) => r.rewardType === "freeItem"
  ).length;

  const discounts = rewards.filter(
    (r) => r.rewardType === "discount"
  ).length;

  const walletRewards = rewards.filter(
    (r) => r.rewardType === "walletCredit"
  ).length;

  const lowRewards = rewards.filter(
    (r) => r.pointsRequired <= 100
  );

  const highRewards = rewards.filter(
    (r) => r.pointsRequired >= 1000
  );

  const hiddenRewards = rewards.filter(
    (r) => !r.active
  );

  const filteredRewards = rewards
    .filter((reward) => {
      const matchesSearch =
        reward.title
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        reward.description
          ?.toLowerCase()
          .includes(search.toLowerCase());

      const matchesFilter =
        filter === "all"
          ? true
          : filter === "active"
          ? reward.active
          : filter === "disabled"
          ? !reward.active
          : reward.rewardType === filter;

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "pointsHigh":
          return b.pointsRequired - a.pointsRequired;

        case "pointsLow":
          return a.pointsRequired - b.pointsRequired;

        case "redeemed":
          return (
            (b.redemptionCount || 0) -
            (a.redemptionCount || 0)
          );

        case "newest":
          return (
            (b.createdAt?.seconds || 0) -
            (a.createdAt?.seconds || 0)
          );

        case "oldest":
          return (
            (a.createdAt?.seconds || 0) -
            (b.createdAt?.seconds || 0)
          );

        default:
          return 0;
      }
    });

  return (
    <div className="admin-page">
      <style>{`
        /* =========================
           Loyalty Admin
        ========================= */

        .admin-page {
          background: #FDFAF5;
          min-height: 100vh;
          padding: 35px;
        }

        .loyalty-admin-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 25px;
        }

        .loyalty-admin-header h1 {
          margin-bottom: 0;
        }

        .back-btn {
          background: white;
          color: #6B4F3B;
          border: 1px solid #E6D7C9;
          border-radius: 12px;
          padding: 10px 18px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
        }

        .back-btn:hover {
          background: #C4956A;
          color: white;
          border-color: #C4956A;
          transform: translateY(-2px);
        }

        .back-btn:active {
          transform: translateY(0);
        }

        .admin-page h1 {
          color: #4A3428;
          font-size: 2.2rem;
          font-weight: 700;
          margin-bottom: 25px;
        }

        /* Tabs */

        .loyalty-tabs {
          display: flex;
          gap: 12px;
          margin: 20px 0 30px;
        }

        .loyalty-tabs button {
          padding: 10px 20px;
          border: none;
          border-radius: 12px;
          background: #f3ede7;
          color: #6B4F3B;
          cursor: pointer;
          font-weight: 600;
          transition: 0.25s;
        }

        .loyalty-tabs button.active {
          background: #C4956A;
          color: white;
        }

        /* Analytics */

        .loyalty-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 18px;
          margin: 25px 0;
        }

        .loyalty-stat-card {
          background: white;
          border-radius: 18px;
          padding: 22px;
          box-shadow: 0 8px 24px rgba(0,0,0,.08);
          border-top: 4px solid #C4956A;
          transition: .25s;
        }

        .loyalty-stat-card:hover {
          transform: translateY(-4px);
        }

        .loyalty-stat-card h4 {
          color: #8A6B55;
          margin: 0 0 10px;
          font-size: .9rem;
        }

        .loyalty-stat-card h2 {
          color: #4A3428;
          margin: 0;
          font-size: 2rem;
        }

        /* Reward Analytics Section */

        .analytics-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }

        @media (max-width: 900px) {
          .analytics-grid {
            grid-template-columns: 1fr;
          }
        }

        .analytics-panel {
          background: white;
          border-radius: 18px;
          padding: 24px;
          box-shadow: 0 8px 24px rgba(0,0,0,.08);
        }

        .analytics-panel h2 {
          color: #4A3428;
          font-size: 1.2rem;
          margin-bottom: 18px;
        }

        .top-rewards-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .top-reward-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: #FDFAF5;
          border-radius: 10px;
          font-size: 14px;
          color: #4A3428;
        }

        .breakdown-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .breakdown-card {
          background: #FDFAF5;
          border-radius: 12px;
          padding: 14px;
          text-align: center;
        }

        .breakdown-card h4 {
          color: #8A6B55;
          font-size: 0.8rem;
          margin-bottom: 6px;
        }

        .breakdown-card h2 {
          color: #4A3428;
          font-size: 1.5rem;
          margin: 0;
        }

        .insights-section {
          font-size: 14px;
          color: #666;
        }

        .insights-section p {
          margin: 6px 0;
        }

        /* Create Button */

        .admin-page > button {
          background: #C4956A;
          color: white;
          border: none;
          border-radius: 14px;
          padding: 12px 24px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: .25s;
          box-shadow: 0 8px 20px rgba(196,149,106,.25);
        }

        .admin-page > button:hover {
          background: #B07E55;
          transform: translateY(-2px);
        }

        /* Form */

        .admin-page input,
        .admin-page textarea,
        .admin-page select {
          width: 100%;
          margin-top: 12px;
          margin-bottom: 14px;
          padding: 13px 15px;
          border-radius: 12px;
          border: 1px solid #E4D7CB;
          background: white;
          font-size: 15px;
          transition: .25s;
          box-sizing: border-box;
        }

        .admin-page textarea {
          min-height: 100px;
          resize: vertical;
        }

        .admin-page input:focus,
        .admin-page textarea:focus,
        .admin-page select:focus {
          outline: none;
          border-color: #C4956A;
          box-shadow: 0 0 0 4px rgba(196,149,106,.15);
        }

        /* Buttons */

        .admin-page button {
          transition: .25s;
        }

        .admin-page button:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        /* Preview */

        .admin-page h3 {
          color: #4A3428;
        }

        .admin-page img {
          display: block;
        }

        /* Reward Cards */

        .reward-card {
          background: white;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 12px 35px rgba(0,0,0,.08);
          transition: .25s;
        }

        .reward-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 18px 40px rgba(0,0,0,.12);
        }

        .reward-card img {
          width: 100%;
          height: 190px;
          object-fit: cover;
        }

        .reward-card-body {
          padding: 20px;
        }

        .reward-card h3 {
          color: #4A3428;
          margin-bottom: 10px;
        }

        .reward-card p {
          color: #666;
          line-height: 1.5;
        }

        .reward-card strong {
          color: #4A3428;
        }

        /* Badges & Chips */

        .reward-badges {
          display: flex;
          gap: 10px;
          margin: 12px 0;
          flex-wrap: wrap;
        }

        .type-badge {
          padding: 7px 14px;
          border-radius: 50px;
          font-size: 13px;
          font-weight: 600;
        }

        .type-badge.freeItem {
          background: #F6E6D5;
          color: #7A4B20;
        }

        .type-badge.discount {
          background: #DDF3E5;
          color: #24734D;
        }

        .type-badge.walletCredit {
          background: #E5ECFF;
          color: #365BB6;
        }

        .reward-live {
          margin-top: 12px;
          font-size: 13px;
          font-weight: 600;
          color: #3D8B55;
        }

        .reward-offline {
          margin-top: 12px;
          font-size: 13px;
          font-weight: 600;
          color: #C94A4A;
        }

        .reward-chip {
          margin-top: 12px;
          display: inline-block;
          padding: 8px 16px;
          background: #F7F3EF;
          border-radius: 50px;
          font-weight: 600;
          color: #6A4B3B;
          margin-right: 8px;
        }

        .reward-chip.secondary {
          background: #EFE9FF;
          color: #5E4AA8;
        }

        /* Card Actions Grid */

        .reward-actions {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-top: 18px;
        }

        .reward-actions button {
          border: none;
          border-radius: 10px;
          padding: 10px;
          font-weight: 600;
          cursor: pointer;
        }

        .reward-actions button:hover {
          opacity: .9;
        }

        .btn-edit {
          background: #EFE4D9;
          color: #6B4F3B;
        }

        .btn-toggle {
          background: #C4956A;
          color: white;
        }

        .btn-duplicate {
          background: #E5ECFF;
          color: #365BB6;
        }

        .btn-delete {
          background: #FBE5E5;
          color: #C0392B;
        }

        /* Empty State */

        .empty-state {
          background: white;
          border-radius: 18px;
          padding: 60px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0,0,0,.06);
        }

        .empty-state h3 {
          color: #4A3428;
          margin-bottom: 10px;
        }

        .empty-state p {
          color: #777;
        }

        /* Responsive */

        @media (max-width: 768px) {
          .admin-page {
            padding: 20px;
          }

          .reward-actions {
            grid-template-columns: 1fr;
          }

          .admin-page h1 {
            font-size: 1.8rem;
          }
        }
      `}</style>

      <div className="loyalty-admin-header">
        <button
          className="back-btn"
          onClick={() => {
            setActivePage("dashboard");
          }}
        >
          ← Back
        </button>

        <h1>🎁 Loyalty Rewards Admin</h1>
      </div>

     <div className="loyalty-tabs">
  <button
    className={activeTab === "rewards" ? "active" : ""}
    onClick={() => setActiveTab("rewards")}
  >
    🎁 Rewards
  </button>

  <button
    className={activeTab === "redeemed" ? "active" : ""}
    onClick={() => setActiveTab("redeemed")}
  >
    🎟 Redeemed Rewards
  </button>

  <button
    className={activeTab === "loyaltyMembers" ? "active" : ""}
    onClick={() => setActiveTab("loyaltyMembers")}
  >
    👥 Loyalty Members
  </button>

 <button
  className={activeTab === "loyaltyanalytics" ? "active" : ""}
  onClick={() => setActiveTab("loyaltyanalytics")}
>
  📊 Loyalty Analytics
</button>
       <button
  className={activeTab === "loyaltysettings" ? "active" : ""}
  onClick={() => setActiveTab("loyaltysettings")}
>
  ⚙️Loyalty Settings
</button>
       
</div>

      {activeTab === "rewards" && (
        <>
          <div className="loyalty-stats">
            <div className="loyalty-stat-card">
              <h4>Total Rewards</h4>
              <h2>{totalRewards}</h2>
            </div>

            <div className="loyalty-stat-card">
              <h4>Active</h4>
              <h2>{activeRewards}</h2>
            </div>

            <div className="loyalty-stat-card">
              <h4>Disabled</h4>
              <h2>{disabledRewards}</h2>
            </div>

            <div className="loyalty-stat-card">
              <h4>Total Redemptions</h4>
              <h2>{totalRedemptions}</h2>
            </div>

            <div className="loyalty-stat-card">
              <h4>Avg Points</h4>
              <h2>{averagePoints}</h2>
            </div>
          </div>

          <div className="analytics-grid">
            <div className="analytics-panel">
              <h2>🏆 Most Redeemed Rewards</h2>
              {topRewards.length === 0 ? (
                <p style={{ color: "#777", fontSize: "14px" }}>No redemption data available yet.</p>
              ) : (
                <div className="top-rewards-list">
                  {topRewards.map((reward, index) => (
                    <div
                      key={reward.id}
                      className="top-reward-row"
                    >
                      <span style={{ fontWeight: 600, color: "#8A6B55" }}>#{index + 1}</span>
                      <span style={{ flex: 1, margin: "0 15px" }}>{reward.title}</span>
                      <strong>
                        {reward.redemptionCount || 0}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="analytics-panel">
              <h2>📊 Reward Analytics</h2>

              <div className="breakdown-cards">
                <div className="breakdown-card">
                  <h4>☕ Free Item</h4>
                  <h2>{freeRewards}</h2>
                </div>

                <div className="breakdown-card">
                  <h4>🏷 Discount</h4>
                  <h2>{discounts}</h2>
                </div>

                <div className="breakdown-card">
                  <h4>💰 Wallet</h4>
                  <h2>{walletRewards}</h2>
                </div>
              </div>

              <div className="insights-section">
                <p><strong>⚡ Easy to Earn Rewards:</strong> {lowRewards.length} items (≤ 100 pts)</p>
                <p><strong>👑 Premium Rewards:</strong> {highRewards.length} items (≥ 1000 pts)</p>
                <p><strong>🙈 Hidden Rewards:</strong> {hiddenRewards.length} disabled items</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setEditingReward(null);

              setForm({
                title: "",
                description: "",
                pointsRequired: 0,
                rewardType: "",
                menuItemId: "",
                discountValue: 0,
                image: "",
                active: true,
              });
            }}
          >
            + Create Reward
          </button>

          <div
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 16,
              marginTop: 20,
              marginBottom: 25,
            }}
          >
            <h2>
              {editingReward ? "Edit Reward" : "Create Reward"}
            </h2>

            <input
              placeholder="Reward title"
              value={form.title}
              onChange={(e) =>
                setForm({ ...form, title: e.target.value })
              }
            />

            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
            />

            <input
              type="number"
              placeholder="Points Required"
              value={form.pointsRequired}
              min="0"
              onChange={(e) =>
                setForm({
                  ...form,
                  pointsRequired: Math.max(0, Number(e.target.value)),
                })
              }
            />

            <select
              value={form.rewardType}
              onChange={(e) =>
                setForm({
                  ...form,
                  rewardType: e.target.value,
                })
              }
            >
              <option value="">Reward Type</option>
              <option value="freeItem">Free Item</option>
              <option value="discount">Discount</option>
              <option value="walletCredit">Wallet Credit</option>
            </select>

            {form.rewardType === "freeItem" && (
              <select
                value={form.menuItemId}
                onChange={(e) => {
                  const item = menuItems.find(
                    (m) => m.id === e.target.value
                  );

                  setForm({
                    ...form,
                    menuItemId: item?.id || "",
                    title: `Free ${item?.name || ""}`,
                    image: item?.image || form.image,
                  });
                }}
              >
                <option value="">Select Menu Item</option>

                {menuItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            )}

            {form.rewardType === "discount" && (
              <input
                type="number"
                placeholder="Discount Value"
                value={form.discountValue}
                min="0"
                onChange={(e) =>
                  setForm({
                    ...form,
                    discountValue: Math.max(0, Number(e.target.value)),
                  })
                }
              />
            )}

            {form.rewardType === "walletCredit" && (
              <input
                type="number"
                placeholder="Wallet Credit Amount"
                value={form.discountValue}
                min="0"
                onChange={(e) =>
                  setForm({
                    ...form,
                    discountValue: Math.max(0, Number(e.target.value)),
                  })
                }
              />
            )}

            {form.rewardType !== "freeItem" && (
              <input
                placeholder="Image URL"
                value={form.image}
                onChange={(e) =>
                  setForm({
                    ...form,
                    image: e.target.value,
                  })
                }
              />
            )}

            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 10 }}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm({
                    ...form,
                    active: e.target.checked,
                  })
                }
                style={{ width: "auto", margin: 0 }}
              />
              Active
            </label>

            <div style={{ display: "flex", gap: 10, marginTop: 15 }}>
              <button onClick={saveReward} disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingReward
                  ? "Update Reward"
                  : "Create Reward"}
              </button>

              {editingReward && (
                <button
                  onClick={() => {
                    setEditingReward(null);
                    setForm({
                      title: "",
                      description: "",
                      pointsRequired: 0,
                      rewardType: "",
                      menuItemId: "",
                      discountValue: 0,
                      image: "",
                      active: true,
                    });
                  }}
                >
                  Cancel
                </button>
              )}
            </div>

            <div
              style={{
                marginTop: 20,
                padding: 20,
                border: "1px solid #ddd",
                borderRadius: 12,
              }}
            >
              <h3>Preview</h3>

              {form.image && (
                <img
                  src={form.image}
                  alt=""
                  style={{
                    width: 120,
                    borderRadius: 10,
                  }}
                />
              )}

              <h4>{form.title || "Reward Title"}</h4>

              <p>{form.description || "Description..."}</p>

              <strong>
                {form.pointsRequired} Points
              </strong>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 15,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            <input
              placeholder="🔍 Search rewards..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              style={{ flex: 1, margin: 0 }}
            />

            <select
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value)
              }
              style={{ width: "auto", margin: 0 }}
            >
              <option value="all">All Rewards</option>
              <option value="freeItem">Free Items</option>
              <option value="discount">Discounts</option>
              <option value="walletCredit">Wallet Credit</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value)
              }
              style={{ width: "auto", margin: 0 }}
            >
              <option value="pointsLow">Lowest Points</option>
              <option value="pointsHigh">Highest Points</option>
              <option value="redeemed">Most Redeemed</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : filteredRewards.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>🔍</div>
              <h3>No rewards match your search.</h3>
              <p>Try another keyword or filter.</p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))",
                gap: 20,
                marginTop: 20,
              }}
            >
              {filteredRewards.map((reward) => (
                <div
                  key={reward.id}
                  className="reward-card"
                >
                  {reward.image && (
                    <img
                      src={reward.image}
                      alt={reward.title}
                    />
                  )}

                  <div className="reward-card-body">
                    <h3>{reward.title}</h3>

                    <p>{reward.description}</p>

                    <div className="reward-badges">
                      <span className={`type-badge ${reward.rewardType}`}>
                        {reward.rewardType === "freeItem" && "☕ Free Item"}
                        {reward.rewardType === "discount" && "🏷 Discount"}
                        {reward.rewardType === "walletCredit" && "💰 Wallet Credit"}
                      </span>
                    </div>

                    <div
                      className={
                        reward.active
                          ? "reward-live"
                          : "reward-offline"
                      }
                    >
                      {reward.active
                        ? "🟢 Available to Customers"
                        : "🔴 Hidden from Customers"}
                    </div>

                    <div>
                      <div className="reward-chip">
                        ⭐ {reward.pointsRequired} Points
                      </div>

                      <div className="reward-chip secondary">
                        🎁 {reward.redemptionCount || 0} Redeemed
                      </div>
                    </div>

                    <p style={{ marginTop: "12px", fontSize: "14px" }}>
                      <strong>Last Redeemed:</strong>{" "}
                      {reward.lastRedeemedAt?.toDate
                        ? reward.lastRedeemedAt
                            .toDate()
                            .toLocaleDateString()
                        : "Never"}
                    </p>

                    <small
                      style={{
                        color: "#999",
                        display: "block",
                        marginTop: "6px",
                      }}
                    >
                      ID: {reward.id}
                    </small>

                    <div className="reward-actions">
                      <button
                        className="btn-edit"
                        onClick={() => {
                          setEditingReward(reward);

                          setForm({
                            title: reward.title || "",
                            description: reward.description || "",
                            pointsRequired: reward.pointsRequired || 0,
                            rewardType: reward.rewardType || "",
                            menuItemId: reward.menuItemId || "",
                            discountValue: reward.discountValue || 0,
                            image: reward.image || "",
                            active: reward.active,
                          });
                        }}
                      >
                        Edit
                      </button>

                      <button
                        className="btn-toggle"
                        onClick={() => toggleReward(reward)}
                      >
                        {reward.active ? "Disable" : "Enable"}
                      </button>

                      <button
                        className="btn-duplicate"
                        onClick={() => duplicateReward(reward)}
                      >
                        Duplicate
                      </button>

                      <button
                        className="btn-delete"
                        onClick={() => deleteReward(reward.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "redeemed" && (
        <RedeemedRewardsPage
          setPage={setPage}
          setActivePage={setActivePage}
        />
      )}

      
{activeTab === "loyaltyMembers" && (
  <LoyaltyMembersPage
    setPage={setPage}
    setActivePage={setActivePage}
  />
)}



      {activeTab === "loyaltyanalytics" && (
  <LoyaltyAnalyticsPage
    setPage={setPage}
    setActivePage={setActivePage}
  />
)}
      
      {activeTab === "loyaltysettings" && (
  <LoyaltySettingsPage
    setPage={setPage}
    setActivePage={setActivePage}
  />
)}
    </div>
  );
}
