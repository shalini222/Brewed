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

export default function LoyaltyManagement({ setPage, setActivePage }) {
  const [rewards, setRewards] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    try {
      await updateDoc(doc(db, "loyaltyRewards", reward.id), {
        active: !reward.active,
      });

      loadRewards();
    } catch (err) {
      console.error(err);
      alert("Failed to update reward.");
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

        /* Status */

        .status-active {
          color: #3D8B55;
          font-weight: 600;
        }

        .status-disabled {
          color: #C94A4A;
          font-weight: 600;
        }

        /* Card Buttons */

        .reward-actions {
          display: flex;
          gap: 10px;
          margin-top: 18px;
        }

        .reward-actions button {
          flex: 1;
          border: none;
          border-radius: 10px;
          padding: 10px;
          font-weight: 600;
          cursor: pointer;
        }

        .reward-actions button:first-child {
          background: #EFE4D9;
          color: #6B4F3B;
        }

        .reward-actions button:nth-child(2) {
          background: #C4956A;
          color: white;
        }

        .reward-actions button:last-child {
          background: #E95A5A;
          color: white;
        }

        .reward-actions button:hover {
          opacity: .9;
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
            flex-direction: column;
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

      {loading ? (
        <p>Loading...</p>
      ) : rewards.length === 0 ? (
        <div className="empty-state">
          <h3>🎁 No rewards yet.</h3>
          <p>Create your first loyalty reward.</p>
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
          {rewards.map((reward) => (
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

                <p>
                  <strong>Points:</strong> {reward.pointsRequired}
                </p>

                <p>
                  <strong>Type:</strong> {reward.rewardType}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  <span className={reward.active ? "status-active" : "status-disabled"}>
                    {reward.active ? "🟢 Active" : "🔴 Disabled"}
                  </span>
                </p>

                <p>
                  <strong>Redeemed:</strong>{" "}
                  {reward.redemptionCount || 0} times
                </p>

                <div className="reward-actions">
                  <button
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
                    onClick={() => toggleReward(reward)}
                  >
                    {reward.active ? "Disable" : "Enable"}
                  </button>

                  <button
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
    </div>
  );
}
