import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs
} from "firebase/firestore";
import { db } from "../firebase";

export default function LoyaltySettingsPage({ setPage, setActivePage }) {
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState([]);

  const [settings, setSettings] = useState({
    enabled: true,
    pointsPer100: 10,
    bronzeThreshold: 0,
    silverThreshold: 500,
    goldThreshold: 1500,
    platinumThreshold: 3000,
    rewardExpiryDays: 365,
    birthdayRewardEnabled: true,
    birthdayRewardPoints: 100,
    birthdayRewardMenuItemId: "",
    birthdayRewardExpiryDays: 30,
    seasonalCampaignEnabled: false,
    seasonalCampaignName: "",
    seasonalCampaignDescription: "",
    seasonalMultiplier: 2,
    seasonalStartDate: "",
    seasonalEndDate: "",
  });

  async function loadSettings() {
    const ref = doc(db, "settings", "loyalty");
    const snap = await getDoc(ref);

    if (snap.exists()) {
      setSettings((prev) => ({
        ...prev,
        ...snap.data()
      }));
    }
  }

  async function loadMenuItems() {
    const snapshot = await getDocs(collection(db, "menu"));
    setMenuItems(
      snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    );
  }

  useEffect(() => {
    async function init() {
      await Promise.all([loadSettings(), loadMenuItems()]);
      setLoading(false);
    }
    init();
  }, []);

  async function saveSettings() {
    await setDoc(
      doc(db, "settings", "loyalty"),
      settings
    );
    alert("Loyalty settings saved!");
  }

  if (loading)
    return <p className="loading-text">Loading...</p>;

  return (
    <div className="admin-page">
      <style>{`
        /* ============================= */
        /* Loyalty Settings Admin */
        /* ============================= */
        .admin-page {
          padding: 30px;
          background: #FAF6F0;
          min-height: 100vh;
        }

        .loading-text {
          padding: 40px;
          text-align: center;
          font-size: 16px;
          color: #70645C;
        }

        .loyalty-admin-header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 30px;
        }

        .back-btn {
          padding: 8px 16px;
          border-radius: 10px;
          border: 1px solid #E6DFD5;
          background: #ffffff;
          color: #1A0B05;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
        }

        .back-btn:hover {
          background: #E6DFD5;
        }

        .loyalty-admin-header h1 {
          margin: 0;
          font-family: "Playfair Display", serif;
          color: #1A0B05;
        }

        .loyalty-status {
          display: inline-block;
          margin-top: 8px;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
        }

        .loyalty-status.active {
          background: #e8f5ec;
          color: #4A7A5B;
        }

        .loyalty-status.paused {
          background: #fde9e2;
          color: #DE6B48;
        }

        /* Card */
        .settings-card {
          background: #ffffff;
          border: 1px solid #E6DFD5;
          border-radius: 18px;
          padding: 30px;
          max-width: 650px;
          box-shadow: 0 10px 30px rgba(26,11,5,0.08);
        }

        .settings-card h3 {
          margin-top: 28px;
          margin-bottom: 12px;
          color: #1A0B05;
          font-family: "Playfair Display", serif;
        }

        /* Inputs, Selects & Textareas */
        .settings-card input[type="number"],
        .settings-card input[type="text"],
        .settings-card input[type="date"],
        .settings-card textarea,
        .settings-card select {
          width: 100%;
          padding: 12px 14px;
          margin: 8px 0;
          border-radius: 12px;
          border: 1px solid #E6DFD5;
          font-size: 15px;
          background: #FAF6F0;
          color: #1A0B05;
          box-sizing: border-box;
          font-family: inherit;
        }

        .settings-card input[type="number"]:focus,
        .settings-card input[type="text"]:focus,
        .settings-card input[type="date"]:focus,
        .settings-card textarea:focus,
        .settings-card select:focus {
          outline: none;
          border-color: #C4956A;
        }

        /* Setting Labels */
        .setting-label {
          font-size: 13px;
          font-weight: normal;
          color: #70645C;
          margin-bottom: 4px;
          margin-top: 10px;
          display: block;
        }

        /* Checkbox rows */
        .settings-card label.checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          color: #1A0B05;
          margin-bottom: 15px;
          cursor: pointer;
        }

        .settings-card input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: #C4956A;
          cursor: pointer;
        }

        /* Helper text */
        .settings-card p {
          color: #70645C;
          font-size: 14px;
          margin-top: 5px;
          margin-bottom: 0;
        }

        /* Save button */
        .settings-card button {
          width: 100%;
          margin-top: 30px;
          padding: 14px;
          border: none;
          border-radius: 14px;
          background: #C4956A;
          color: white;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.25s;
        }

        .settings-card button:hover {
          transform: translateY(-2px);
          opacity: 0.9;
        }

        /* Mobile */
        @media (max-width: 768px) {
          .loyalty-admin-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .settings-card {
            padding: 20px;
          }
        }
      `}</style>

      <div className="loyalty-admin-header">
        <button
          className="back-btn"
          onClick={() => setActivePage("loyalty")}
        >
          ← Back
        </button>

        <div>
          <h1>⚙️ Loyalty Settings</h1>
          {settings.enabled ? (
            <span className="loyalty-status active">
              🟢 Loyalty Active
            </span>
          ) : (
            <span className="loyalty-status paused">
              🔴 Loyalty Paused
            </span>
          )}
        </div>
      </div>

      <div className="settings-card">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) =>
              setSettings({
                ...settings,
                enabled: e.target.checked
              })
            }
          />
          Enable Loyalty Program
        </label>

        <h3>⭐ Points System</h3>
        <input
          type="number"
          value={settings.pointsPer100}
          onChange={(e) =>
            setSettings({
              ...settings,
              pointsPer100: Number(e.target.value)
            })
          }
        />
        <p>Points earned per ₹100 spent</p>

        <h3>🏆 Tier Thresholds</h3>
        <label className="setting-label">Silver Tier Threshold</label>
        <input
          type="number"
          value={settings.silverThreshold}
          onChange={(e) =>
            setSettings({
              ...settings,
              silverThreshold: Number(e.target.value)
            })
          }
        />

        <label className="setting-label">Gold Tier Threshold</label>
        <input
          type="number"
          value={settings.goldThreshold}
          onChange={(e) =>
            setSettings({
              ...settings,
              goldThreshold: Number(e.target.value)
            })
          }
        />

        <label className="setting-label">Platinum Tier Threshold</label>
        <input
          type="number"
          value={settings.platinumThreshold}
          onChange={(e) =>
            setSettings({
              ...settings,
              platinumThreshold: Number(e.target.value)
            })
          }
        />

        <h3>⏳ Reward Expiry</h3>
        <input
          type="number"
          value={settings.rewardExpiryDays}
          onChange={(e) =>
            setSettings({
              ...settings,
              rewardExpiryDays: Number(e.target.value)
            })
          }
        />
        <p>Days before unredeemed rewards expire</p>

        <h3>🎂 Birthday Reward</h3>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.birthdayRewardEnabled}
            onChange={(e) =>
              setSettings({
                ...settings,
                birthdayRewardEnabled: e.target.checked
              })
            }
          />
          Enable Birthday Reward
        </label>

        <input
          type="number"
          value={settings.birthdayRewardPoints}
          onChange={(e) =>
            setSettings({
              ...settings,
              birthdayRewardPoints: Number(e.target.value)
            })
          }
        />
        <p>Bonus points credited on customer birthday</p>

        <label className="setting-label">Birthday Gift Item</label>
        <select
          value={settings.birthdayRewardMenuItemId}
          onChange={(e) =>
            setSettings({
              ...settings,
              birthdayRewardMenuItemId: e.target.value,
            })
          }
        >
          <option value="">Select Menu Item</option>
          {menuItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <label className="setting-label">Birthday Gift Expiry (Days)</label>
        <input
          type="number"
          value={settings.birthdayRewardExpiryDays}
          onChange={(e) =>
            setSettings({
              ...settings,
              birthdayRewardExpiryDays: Number(e.target.value),
            })
          }
        />

        <h3>🎉 Seasonal Campaign</h3>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.seasonalCampaignEnabled}
            onChange={(e) =>
              setSettings({
                ...settings,
                seasonalCampaignEnabled: e.target.checked,
              })
            }
          />
          Enable Seasonal Campaign
        </label>

        <label className="setting-label">
          Campaign Name
        </label>

        <input
          type="text"
          placeholder="Double Points Week"
          value={settings.seasonalCampaignName}
          onChange={(e) =>
            setSettings({
              ...settings,
              seasonalCampaignName: e.target.value,
            })
          }
        />

        <label className="setting-label">
          Description
        </label>

        <textarea
          rows={3}
          placeholder="Earn double loyalty points on every purchase."
          value={settings.seasonalCampaignDescription}
          onChange={(e) =>
            setSettings({
              ...settings,
              seasonalCampaignDescription: e.target.value,
            })
          }
        />

        <label className="setting-label">
          Points Multiplier
        </label>

        <input
          type="number"
          min="1"
          value={settings.seasonalMultiplier}
          onChange={(e) =>
            setSettings({
              ...settings,
              seasonalMultiplier: Number(e.target.value),
            })
          }
        />

        <label className="setting-label">
          Campaign Start Date
        </label>

        <input
          type="date"
          value={settings.seasonalStartDate}
          onChange={(e) =>
            setSettings({
              ...settings,
              seasonalStartDate: e.target.value,
            })
          }
        />

        <label className="setting-label">
          Campaign End Date
        </label>

        <input
          type="date"
          value={settings.seasonalEndDate}
          onChange={(e) =>
            setSettings({
              ...settings,
              seasonalEndDate: e.target.value,
            })
          }
        />

        <button onClick={saveSettings}>
          Save Settings
        </button>
      </div>
    </div>
  );
}
