import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getDoc } from "firebase/firestore";
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


const [savedNotifications, setSavedNotifications] = useState(true);
const [savedDarkMode, setSavedDarkMode] = useState(false);
const [savedReduceMotion, setSavedReduceMotion] = useState(false);

const [confirmOpen, setConfirmOpen] = useState(false);

const [confirmData, setConfirmData] = useState({
  title: "",
  message: "",
  onConfirm: null,
});


  const [toast, setToast] = useState({
  show: false,
  message: "",
});
 
  const showToast = (message) => {
  setToast({
    show: true,
    message,
  });

  clearTimeout(window.toastTimer);

  window.toastTimer = setTimeout(() => {
    setToast({
      show: false,
      message: "",
    });
  }, 2000);
};

  useEffect(() => {
  if (!currentUser) return;

  const loadSettings = async () => {
    try {
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));

      if (userDoc.exists()) {
        const settings = userDoc.data().settings;

        if (settings) {
          setNotifications(settings.notifications ?? true);
          setDarkMode(settings.darkMode ?? false);
          setReduceMotion(settings.reduceMotion ?? false);

          setSavedNotifications(settings.notifications ?? true);
          setSavedDarkMode(settings.darkMode ?? false);
          setSavedReduceMotion(settings.reduceMotion ?? false);
        }
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  loadSettings();
}, [currentUser]);
  
  
  const resetSettings = () => {
  const confirmReset = window.confirm(
    "Reset all settings to their default values?"
  );

  if (!confirmReset) return;

  setNotifications(true);
  setDarkMode(false);
  setReduceMotion(false);
};


  const hasChanges =
  notifications !== savedNotifications ||
  darkMode !== savedDarkMode ||
  reduceMotion !== savedReduceMotion;

  const clearCache = () => {
  setConfirmData({
    title: "Clear Cache",
    message:
      "This will remove temporary cached data stored on this device. Your account, orders and rewards won't be affected.",
    onConfirm: () => {
      localStorage.clear();
      sessionStorage.clear();

      showToast("Cache cleared successfully.");

      setConfirmOpen(false);
    },
  });

  setConfirmOpen(true);
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
      setSavedNotifications(notifications);
      setSavedDarkMode(darkMode);
      setSavedReduceMotion(reduceMotion);
      
      showToast("Settings saved successfully.");
    } catch (error) {
      console.error(error);
      showToast("Couldn't save settings.");
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

        .settings-container{
    animation:fadeUp .45s ease;
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
  margin-top:2px;
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

.toast{
  position:fixed;
  bottom:28px;
  left:50%;
  transform:translateX(-50%);
  background:#1A0A00;
  color:#FDFAF5;
  padding:14px 22px;
  border-radius:14px;
  font-family:'Inter',sans-serif;
  font-size:.92rem;
  box-shadow:0 12px 30px rgba(0,0,0,.18);
  animation:toastIn .25s ease;
  z-index:9999;
}

@keyframes toastIn{
  from{
    opacity:0;
    transform:translate(-50%,20px);
  }

  to{
    opacity:1;
    transform:translate(-50%,0);
  }
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

        .danger .setting-icon{
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
.save-btn:disabled{
  background:#D8D2CC;
  color:#8E8278;
  cursor:not-allowed;
  opacity:.8;
}

.save-btn:disabled:hover{
  background:#D8D2CC;
}

.modal-overlay{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,.35);
  display:flex;
  justify-content:center;
  align-items:center;
  padding:20px;
  z-index:9999;
}

.modal{
  width:100%;
  max-width:420px;
  background:#fff;
  border-radius:22px;
  padding:26px;
  animation:fadeUp .25s ease;
}

.modal-title{
  font-family:'Playfair Display',serif;
  color:#1A0A00;
  font-size:1.5rem;
  margin-bottom:10px;
}

.modal-text{
  color:#7A6658;
  line-height:1.7;
  margin-bottom:24px;
}

.modal-buttons{
  display:flex;
  gap:12px;
}

.modal-btn{
  flex:1;
  border:none;
  padding:14px;
  border-radius:14px;
  cursor:pointer;
  font-weight:600;
  font-family:'Inter',sans-serif;
}

.cancel-btn{
  background:#F5EFE8;
  color:#1A0A00;
}

.confirm-btn{
  background:#1A0A00;
  color:#FDFAF5;
}

@media(max-width:600px){

.modal-buttons{
flex-direction:column;
}

}

@keyframes fadeUp{
  from{
    opacity:0;
    transform:translateY(18px);
  }

  to{
    opacity:1;
    transform:translateY(0);
  }
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
            onClick={() => setPage("menu")}
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

  <div className="link-row" onClick={() => setPage("privacy")}
>
    <div className="link-left">
      <Shield size={18} className="setting-icon" />
      <span>Privacy Policy</span>
    </div>

    <ChevronRight size={18} className="link-right" />
  </div>

  <div className="link-row" onClick={() => setPage("terms")}>
    <div className="link-left">
      <FileText size={18} className="setting-icon" />
      <span>Terms & Conditions</span>
    </div>

    <ChevronRight size={18} className="link-right" />
  </div>

  <div className="link-row" onClick={clearCache}>
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

  <div className="link-row" onClick={() => setPage("change-password")}>
    <div className="link-left">
      <KeyRound size={18} className="setting-icon" />
      <span>Change Password</span>
    </div>

    <ChevronRight size={18} className="link-right" />
  </div>

  <div className="link-row danger">
    <div className="link-left">
      <Trash2 size={18} className="setting-icon" />
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
    disabled={!hasChanges}
    onClick={saveSettings}
  >
    Save Changes
  </button>

</div>
          
        </div>
      </div>
       {confirmOpen && (
  <div className="modal-overlay">

    <div className="modal">

      <h2 className="modal-title">
        {confirmData.title}
      </h2>

      <p className="modal-text">
        {confirmData.message}
      </p>

      <div className="modal-buttons">

        <button
          className="modal-btn cancel-btn"
          onClick={() => setConfirmOpen(false)}
        >
          Cancel
        </button>

        <button
          className="modal-btn confirm-btn"
          onClick={confirmData.onConfirm}
        >
          Confirm
        </button>

      </div>

    </div>

  </div>
)}
      {toast.show && (
  <div className="toast">
    {toast.message}
  </div>
)}
    </>
  );
}
