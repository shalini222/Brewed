import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  setDoc
} from "firebase/firestore";
import { db } from "../firebase";

export default function LoyaltySettingsPage({ setPage, setActivePage }) {
  const [loading, setLoading] = useState(true);

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
  });

  async function loadSettings() {
    const ref = doc(db, "settings", "loyalty");
    const snap = await getDoc(ref);

    if (snap.exists()) {
      setSettings({
        ...settings,
        ...snap.data()
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    loadSettings();
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

        /* Inputs */
        .settings-card input[type="number"] {
          width: 100%;
          padding: 12px 14px;
          margin: 8px 0;
          border-radius: 12px;
          border: 1px solid #E6DFD5;
          font-size: 15px;
          background: #FAF6F0;
          color: #1A0B05;
          box-sizing: border-box;
        }

        .settings-card input[type="number"]:focus {
          outline: none;
          border-color: #C4956A;
        }

        /* Checkbox rows */
        .settings-card label {
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
        <label>
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
        <label style={{ fontSize: '13px', fontWeight: 'normal', color: '#70645C', marginBottom: '4px' }}>Silver Tier Threshold</label>
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

        <label style={{ fontSize: '13px', fontWeight: 'normal', color: '#70645C', marginBottom: '4px', marginTop: '10px' }}>Gold Tier Threshold</label>
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

        <label style={{ fontSize: '13px', fontWeight: 'normal', color: '#70645C', marginBottom: '4px', marginTop: '10px' }}>Platinum Tier Threshold</label>
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
        <label>
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

        <button onClick={saveSettings}>
          Save Settings
        </button>
      </div>
    </div>
  );
}
