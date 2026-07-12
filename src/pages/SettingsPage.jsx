import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import {
  ArrowLeft,
  Bell,
  Moon,
  Shield,
  FileText,
  Trash2,
  KeyRound,
  Info,
  ChevronRight
} from "lucide-react";

export default function SettingsPage({ setPage }) {
  const { currentUser } = useAuth();

  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const resetSettings = () => {
  const confirmReset = window.confirm(
    "Reset all settings to their default values?"
  );

  if (!confirmReset) return;

  setNotifications(true);
  setDarkMode(false);
  setReduceMotion(false);
};

  const saveSettings = async () => {
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        settings: {
          notifications,
          darkMode,
          reduceMotion,
        },
      });

      alert("Settings saved successfully.");
    } catch (error) {
      console.error(error);
      alert("Couldn't save settings.");
    }
  };

  return (
    <>
      <style>{`
        .settings-page{
          background:#FDFAF5;
          min-height:100vh;
          padding:32px 18px 120px;
          font-family:'Inter',sans-serif;
        }

        .settings-container{
          max-width:720px;
          margin:auto;
        }

        .back-btn{
          display:flex;
          align-items:center;
          gap:8px;
          border:none;
          background:none;
          color:#3B1A08;
          font-weight:600;
          cursor:pointer;
          margin-bottom:22px;
        }

        .title{
          font-family:'Playfair Display',serif;
          color:#1A0A00;
          font-size:2.3rem;
          margin-bottom:8px;
        }

        .subtitle{
          color:#7A6658;
          margin-bottom:32px;
          line-height:1.6;
        }

        .card{
  background:#fff;
  border:1px solid rgba(196,149,106,.15);
  border-radius:22px;
  padding:22px;
  margin-bottom:22px;
  transition:transform .25s ease, box-shadow .25s ease;
}

.card:hover{
  transform:translateY(-2px);
  box-shadow:0 10px 30px rgba(26,10,0,.06);
}

        .section-title{
          font-family:'Playfair Display',serif;
          color:#1A0A00;
          margin-bottom:18px;
          font-size:1.2rem;
        }

        .setting-row{
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:16px 0;
          border-bottom:1px solid rgba(196,149,106,.12);
        }

        .setting-row:last-child{
          border-bottom:none;
        }
.setting-left{
  display:flex;
  align-items:center;   /* changed from flex-start */
  gap:16px;
  flex:1;
}
        

        .setting-icon{
  color:#C4956A;
  flex-shrink:0;
  transform:translateY(2px);
}

        .setting-title{
          color:#1A0A00;
          font-weight:600;
          margin-bottom:4px;
        }

        .setting-sub{
          color:#7A6658;
          font-size:.88rem;
        }

        .switch{
          width:50px;
          height:28px;
          border-radius:999px;
          background:#ddd;
          position:relative;
          cursor:pointer;
          transition:.25s;
        }

        .switch.active{
          background:#C4956A;
        }

        .switch::after{
          content:"";
          width:22px;
          height:22px;
          background:white;
          border-radius:50%;
          position:absolute;
          top:3px;
          left:3px;
          transition:.25s;
        }

        .switch.active::after{
          left:25px;
        }
  .link-left{
  display:flex;
  align-items:center;
  gap:14px;
  flex:1;
  min-width:0;
}

.link-right{
  color:#A39081;
  transition:all .25s ease;
}

.link-row:hover{
  background:#FCF8F2;
  border-radius:12px;
}

.link-row:hover .link-right{
  color:#C4956A;
  transform:translateX(4px);
}

.link-row:hover .setting-icon{
  color:#B9835A;
}
        .link-row{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  padding:16px 0;
  cursor:pointer;
  border-bottom:1px solid rgba(196,149,106,.12);
  color:#1A0A00;
  font-weight:500;
}

        .link-row:last-child{
          border-bottom:none;
        }

        .danger{
          color:#B42318;
        }

        .button-row{
  display:flex;
  gap:14px;
  margin-top:24px;
}

.save-btn,
.reset-btn{
  flex:1;
  min-width:0;
  white-space:nowrap;
  padding:15px;
  border-radius:14px;
  font-family:'Inter',sans-serif;
  font-size:.95rem;
  font-weight:600;
  cursor:pointer;
  transition:all .25s ease;
}

.save-btn{
  background:#1A0A00;
  color:#FDFAF5;
  border:none;
}

.save-btn:hover{
  background:#3B1A08;
}

.reset-btn{
  background:#fff;
  color:#7A6658;
  border:1px solid rgba(196,149,106,.25);
}

.reset-btn:hover{
  background:#FCF8F2;
  color:#1A0A00;
  border-color:#C4956A;
}


@media (max-width:600px){

  .button-row{
    flex-direction:column;
  }

  .save-btn,
  .reset-btn{
    width:100%;
  }

  .settings-page{
    padding:24px 14px 100px;
  }

  .card{
    padding:18px;
    border-radius:18px;
  }

  .title{
    font-size:2rem;
  }

  .setting-row,
  .link-row{
    padding:14px 0;
  }

  .setting-title{
    font-size:.95rem;
  }

  .setting-sub{
    font-size:.82rem;
  }

  .section-title{
    font-size:1.1rem;
  }
}

      `}</style>

      <div className="settings-page">
        <div className="settings-container">

          <button
            className="back-btn"
            onClick={() => setPage("profile")}
          >
            <ArrowLeft size={18}/>
            Back
          </button>

          <h1 className="title">Settings</h1>

          <p className="subtitle">
            Personalize your Brewed experience.
          </p>

          {/* Preferences */}

          <div className="card">

            <h2 className="section-title">Preferences</h2>

            <div className="setting-row">

              <div className="setting-left">
                <Bell className="setting-icon"/>
                <div>
                  <div className="setting-title">Push Notifications</div>
                  <div className="setting-sub">
                    Receive updates about orders and rewards.
                  </div>
                </div>
              </div>

              <div
                className={`switch ${notifications ? "active" : ""}`}
                onClick={() => setNotifications(!notifications)}
              />
            </div>

            <div className="setting-row">

              <div className="setting-left">
                <Moon className="setting-icon"/>
                <div>
                  <div className="setting-title">Dark Theme</div>
                  <div className="setting-sub">
                    Reduce eye strain at night.
                  </div>
                </div>
              </div>

              <div
                className={`switch ${darkMode ? "active" : ""}`}
                onClick={() => setDarkMode(!darkMode)}
              />

            </div>

            <div className="setting-row">

              <div className="setting-left">
                <Info className="setting-icon"/>
                <div>
                  <div className="setting-title">Reduce Motion</div>
                  <div className="setting-sub">
                    Minimize interface animations.
                  </div>
                </div>
              </div>

              <div
                className={`switch ${reduceMotion ? "active" : ""}`}
                onClick={() => setReduceMotion(!reduceMotion)}
              />

            </div>

          </div>

          {/* Privacy */}

<div className="card">

  <h2 className="section-title">Privacy</h2>

  <div className="link-row">
    <div className="link-left">
      <Shield size={18} className="setting-icon" />
      <span>Privacy Policy</span>
    </div>

    <ChevronRight size={18} className="link-right" />
  </div>

  <div className="link-row">
    <div className="link-left">
      <FileText size={18} className="setting-icon" />
      <span>Terms & Conditions</span>
    </div>

    <ChevronRight size={18} className="link-right" />
  </div>

  <div className="link-row">
    <div className="link-left">
      <Trash2 size={18} className="setting-icon" />
      <span>Clear Cache</span>
    </div>

    <ChevronRight size={18} className="link-right" />
  </div>

</div>
          {/* Account */}

          <div className="card">

  <h2 className="section-title">Account</h2>

  <div className="link-row">
    <div className="link-left">
      <KeyRound size={18} className="setting-icon" />
      <span>Change Password</span>
    </div>

    <ChevronRight size={18} className="link-right" />
  </div>

  <div className="link-row danger">
    <div className="link-left">
      <Trash2 size={18} />
      <span>Delete Account</span>
    </div>

    <ChevronRight size={18} className="link-right" />
  </div>

</div>
          {/* About */}

          <div className="card">

            <h2 className="section-title">About</h2>

            <div className="setting-row">
              <div>
                <div className="setting-title">Version</div>
                <div className="setting-sub">
                  Brewed v1.0.0
                </div>
              </div>
            </div>

            <div style={{
              marginTop:"12px",
              color:"#7A6658",
              fontSize:".9rem"
            }}>
              ☕ Made with love in Kolkata.
            </div>

          </div>
  <div className="button-row">

  <button
    className="reset-btn"
    onClick={resetSettings}
  >
    Reset to Defaults
  </button>

  <button
    className="save-btn"
    onClick={saveSettings}
  >
    Save Changes
  </button>

</div>
          
        </div>
      </div>
    </>
  );
}
