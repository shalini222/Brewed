import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  setDoc
} from "firebase/firestore";
import { db } from "../firebase";


export default function LoyaltySettingsPage({ setPage,
  setActivePage
}) {

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

    const ref = doc(
      db,
      "settings",
      "loyalty"
    );


    const snap =
      await getDoc(ref);


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
    return <p>Loading...</p>;



  return (

    <div className="admin-page">


      <div className="loyalty-admin-header">

        <button
          className="back-btn"
          onClick={() => setActivePage("loyalty")}
        >
          ← Back
        </button>


        <div>
          <h1>
            ⚙️ Loyalty Settings
          </h1>

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



        <h3>
          ⭐ Points System
        </h3>


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

        <p>
          Points earned per ₹100 spent
        </p>




        <h3>
          🏆 Tier Thresholds
        </h3>


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



        <h3>
          ⏳ Reward Expiry
        </h3>


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


        <h3>
          🎂 Birthday Reward
        </h3>


        <label>

          <input
            type="checkbox"
            checked={
              settings.birthdayRewardEnabled
            }

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
          value={
            settings.birthdayRewardPoints
          }

          onChange={(e) =>
            setSettings({
              ...settings,
              birthdayRewardPoints: Number(e.target.value)
            })
          }
        />



        <button
          onClick={saveSettings}
        >
          Save Settings
        </button>


      </div>

    </div>

  );
}
