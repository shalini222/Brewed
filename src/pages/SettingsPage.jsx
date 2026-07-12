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
  Info
} from "lucide-react";

export default function SettingsPage({ setPage }) {
  const { currentUser } = useAuth();

  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

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
          gap:14px;
          align-items:flex-start;
        }

        .setting-icon{
          color:#C4956A;
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

        .link-row{
          display:flex;
          justify-content:space-between;
          align-items:center;
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

        .save-btn{
          width:100%;
          background:#1A0A00;
          color:#FDFAF5;
          border:none;
          padding:16px;
          border-radius:14px;
          font-size:1rem;
          font-weight:600;
          cursor:pointer;
          margin-top:18px;
          transition:.25s;
        }

        .save-btn:hover{
          background:#3B1A08;
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
              <span><Shield size={18}/> Privacy Policy</span>
              →
            </div>

            <div className="link-row">
              <span><FileText size={18}/> Terms & Conditions</span>
              →
            </div>

            <div className="link-row">
              <span><Trash2 size={18}/> Clear Cache</span>
              →
            </div>

          </div>

          {/* Account */}

          <div className="card">

            <h2 className="section-title">Account</h2>

            <div className="link-row">
              <span><KeyRound size={18}/> Change Password</span>
              →
            </div>

            <div className="link-row danger">
              <span><Trash2 size={18}/> Delete Account</span>
              →
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

          <button
            className="save-btn"
            onClick={saveSettings}
          >
            Save Changes
          </button>

        </div>
      </div>
    </>
  );
}
