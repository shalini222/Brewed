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

export default function LoyaltyManagement ({ setPage, setActivePage}) {
  const [rewards, setRewards] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

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
      snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
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
    try {
      if (!form.title.trim()) {
        alert("Enter a reward title.");
        return;
      }

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
    }
  }

  useEffect(() => {
    loadRewards();
    loadMenuItems();
  }, []);

  return (
    <div className="admin-page">
      <h1>🎁 Loyalty Rewards Admin</h1>

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
          onChange={(e) =>
            setForm({
              ...form,
              pointsRequired: Number(e.target.value),
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
                title:
                  form.rewardType === "freeItem"
                    ? `Free ${item?.name || ""}`
                    : form.title,
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
            onChange={(e) =>
              setForm({
                ...form,
                discountValue: Number(e.target.value),
              })
            }
          />
        )}

        {form.rewardType === "walletCredit" && (
          <input
            type="number"
            placeholder="Wallet Credit Amount"
            value={form.discountValue}
            onChange={(e) =>
              setForm({
                ...form,
                discountValue: Number(e.target.value),
              })
            }
          />
        )}

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

        <label>
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) =>
              setForm({
                ...form,
                active: e.target.checked,
              })
            }
          />

          Active
        </label>

        <button onClick={saveReward}>
          {editingReward ? "Update Reward" : "Create Reward"}
        </button>

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
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: 20,
                boxShadow: "0 4px 12px rgba(0,0,0,.08)",
              }}
            >
              {reward.image && (
                <img
                  src={reward.image}
                  alt={reward.title}
                  style={{
                    width: "100%",
                    height: 180,
                    objectFit: "cover",
                    borderRadius: 12,
                    marginBottom: 15,
                  }}
                />
              )}

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
                {reward.active ? "🟢 Active" : "🔴 Disabled"}
              </p>

              <p>
                <strong>Redeemed:</strong>{" "}
                {reward.redemptionCount || 0} times
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 15,
                }}
              >
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
          ))}
        </div>
      )}
    </div>
  );
}
