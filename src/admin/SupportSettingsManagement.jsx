import { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";

export default function SupportSettingsManagement() {
  const [settings, setSettings] = useState({
    phone: "",
    email: "",
    whatsapp: "",
    instagram: "",
    callDescription: "",
    emailDescription: "",
    whatsappDescription: "",
    instagramDescription: "",
    businessHoursTitle: "",
    businessHoursDescription: "",
    mondayFriday: "",
    saturday: "",
    sunday: ""
  });
  const [originalSettings, setOriginalSettings] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "supportSettings", "general"),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setSettings(data);
          setOriginalSettings(data);
        }
        setLoading(false);
      },
      (err) => {
        console.log(err);
        setError("Failed to load settings.");
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError("");
      await updateDoc(
        doc(db, "supportSettings", "general"),
        settings
      );
      setOriginalSettings(settings);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.log(err);
      setError("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const resetChanges = () => {
    setSettings(originalSettings);
    setError("");
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  if (loading) {
    return (
      <div className="support-settings-page">
        <div className="loading-card">
          Loading support settings...
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* ===========================
           SUPPORT SETTINGS
        =========================== */

        .support-settings-page{
            max-width:1150px;
            margin:auto;
            padding:28px;
            background:#FDFBF8;
        }

        /* ===========================
           HEADER
        =========================== */

        .page-header{
            display:flex;
            justify-content:space-between;
            align-items:center;
            margin-bottom:28px;
            padding:24px 28px;
            background:white;
            border-radius:22px;
            box-shadow:0 8px 30px rgba(44,34,30,.05);
        }

        .page-header h2{
            margin:0;
            font-size:30px;
            color:#2C221E;
            font-weight:700;
        }

        .page-header p{
            margin-top:8px;
            color:#8B7B70;
            font-size:15px;
        }

        /* ===========================
           CARDS
        =========================== */

        .settings-card{
            background:white;
            border-radius:22px;
            padding:28px;
            margin-bottom:24px;
            box-shadow:
                0 4px 12px rgba(0,0,0,.03),
                0 12px 40px rgba(44,34,30,.04);
            transition:.25s;
        }

        .settings-card:hover{
            transform:translateY(-2px);
            box-shadow:
                0 8px 22px rgba(0,0,0,.05),
                0 20px 50px rgba(44,34,30,.08);
        }

        .settings-card h3{
            margin:0;
            color:#2C221E;
            font-size:22px;
            font-weight:700;
        }

        .settings-card p{
            margin:10px 0 24px;
            color:#8B7B70;
            line-height:1.6;
        }

        /* ===========================
           GRID
        =========================== */

        .settings-grid{
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(320px,1fr));
            gap:22px;
        }

        /* ===========================
           INPUTS
        =========================== */

        .input-group{
            display:flex;
            flex-direction:column;
            gap:10px;
            margin-bottom:16px;
        }

        .input-group:last-child{
            margin-bottom:0;
        }

        .input-group label{
            font-size:13px;
            font-weight:700;
            color:#6E5E53;
            letter-spacing:.4px;
            text-transform:uppercase;
        }

        .input-group input,
        .input-group textarea{
            background:#FCF8F3;
            border:2px solid transparent;
            border-radius:16px;
            padding:16px;
            font-size:15px;
            transition:.25s;
            outline:none;
            color:#2C221E;
            font-family:inherit;
        }

        .input-group textarea{
            min-height:110px;
            resize:vertical;
        }

        .input-group input:hover,
        .input-group textarea:hover{
            background:white;
            border-color:#E8DED2;
        }

        .input-group input:focus,
        .input-group textarea:focus{
            background:white;
            border-color:#C4956A;
            box-shadow:0 0 0 5px rgba(196,149,106,.15);
        }

        /* ===========================
           ACTION BAR
        =========================== */

        .action-bar{
            position:sticky;
            bottom:20px;
            background:white;
            border-radius:22px;
            padding:20px 24px;
            display:flex;
            justify-content:space-between;
            align-items:center;
            margin-top:30px;
            box-shadow:0 10px 35px rgba(44,34,30,.08);
            z-index: 10;
        }

        .actions{
            display:flex;
            gap:14px;
        }

        /* ===========================
           BUTTONS
        =========================== */

        .save-btn{
            background:#C4956A;
            color:white;
            border:none;
            padding:14px 24px;
            border-radius:14px;
            cursor:pointer;
            font-size:15px;
            font-weight:700;
            transition:.25s;
        }

        .save-btn:hover:not(:disabled){
            background:#B7865E;
            transform:translateY(-2px);
        }

        .save-btn:disabled{
            background:#D9C6B4;
            cursor:not-allowed;
            transform:none;
        }

        .reset-btn{
            background:white;
            border:2px solid #E8DED2;
            padding:14px 22px;
            border-radius:14px;
            cursor:pointer;
            font-weight:600;
            color:#2C221E;
            transition:.25s;
        }

        .reset-btn:hover:not(:disabled){
            background:#FAF6F0;
            border-color:#C4956A;
        }

        .reset-btn:disabled{
            opacity:0.5;
            cursor:not-allowed;
        }

        /* ===========================
           STATUS
        =========================== */

        .unsaved{
            color:#D97706;
            font-weight:700;
            display:flex;
            align-items:center;
            gap:8px;
        }

        .success-banner{
            background:#EAF8EF;
            border-left:5px solid #4CAF50;
            padding:18px;
            border-radius:14px;
            margin-bottom:20px;
            color:#2E7D32;
            font-weight:600;
        }

        .error-banner{
            background:#FFF2F2;
            border-left:5px solid #E53935;
            padding:18px;
            border-radius:14px;
            margin-bottom:20px;
            color:#C62828;
            font-weight:600;
        }

        .loading-card{
            background:white;
            padding:60px;
            text-align:center;
            border-radius:22px;
            box-shadow:0 8px 30px rgba(44,34,30,.05);
            color:#8B7B70;
            font-weight:500;
            font-size:16px;
        }

        /* ===========================
           MOBILE
        =========================== */

        @media(max-width:768px){
            .page-header{
                flex-direction:column;
                align-items:flex-start;
                gap:20px;
            }

            .settings-grid{
                grid-template-columns:1fr;
            }

            .action-bar{
                flex-direction:column;
                gap:16px;
                align-items:stretch;
            }

            .actions{
                width:100%;
            }

            .save-btn,
            .reset-btn{
                width:100%;
            }
        }
      `}</style>

      <div className="support-settings-page">
        <div className="page-header">
          <div>
            <h2>⚙️ Support Settings</h2>
            <p>
              Manage contact information and business hours shown in the customer Help Centre.
            </p>
          </div>
        </div>

        {success && (
          <div className="success-banner">
            ✅ Support settings updated successfully.
          </div>
        )}

        {error && (
          <div className="error-banner">
            ❌ {error}
          </div>
        )}

        {/* Contact Information */}
        <div className="settings-card">
          <h3>📞 Contact Information</h3>
          <p>
            These details are shown in the customer Help Centre.
          </p>

          <div className="settings-grid">
            <div className="input-group">
              <label>Phone Number</label>
              <input
                type="text"
                name="phone"
                value={settings.phone}
                onChange={handleChange}
                placeholder="+91 9876543210"
              />
            </div>

            <div className="input-group">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                value={settings.email}
                onChange={handleChange}
                placeholder="support@brewed.com"
              />
            </div>

            <div className="input-group">
              <label>WhatsApp</label>
              <input
                type="text"
                name="whatsapp"
                value={settings.whatsapp}
                onChange={handleChange}
                placeholder="+91 9876543210"
              />
            </div>

            <div className="input-group">
              <label>Instagram</label>
              <input
                type="text"
                name="instagram"
                value={settings.instagram}
                onChange={handleChange}
                placeholder="@brewedcoffee"
              />
            </div>
          </div>
        </div>

        {/* Contact Descriptions */}
        <div className="settings-card">
          <h3>💬 Contact Descriptions</h3>
          <p>
            Customize the helper text shown below each contact option in the customer Help Centre.
          </p>

          <div className="input-group">
            <label>Call Description</label>
            <textarea
              name="callDescription"
              value={settings.callDescription}
              onChange={handleChange}
              rows={3}
              placeholder="Available during business hours."
            />
          </div>

          <div className="input-group">
            <label>Email Description</label>
            <textarea
              name="emailDescription"
              value={settings.emailDescription}
              onChange={handleChange}
              rows={3}
              placeholder="Usually replies within 24 hours."
            />
          </div>

          <div className="input-group">
            <label>WhatsApp Description</label>
            <textarea
              name="whatsappDescription"
              value={settings.whatsappDescription}
              onChange={handleChange}
              rows={3}
              placeholder="Fastest way to get help."
            />
          </div>

          <div className="input-group">
            <label>Instagram Description</label>
            <textarea
              name="instagramDescription"
              value={settings.instagramDescription}
              onChange={handleChange}
              rows={3}
              placeholder="Send us a DM anytime."
            />
          </div>
        </div>

        {/* Business Hours */}
        <div className="settings-card">
          <h3>🕒 Business Hours</h3>
          <p>
            Manage the support hours displayed in the customer Help Centre.
          </p>

          <div className="input-group">
            <label>Section Title</label>
            <input
              type="text"
              name="businessHoursTitle"
              value={settings.businessHoursTitle}
              onChange={handleChange}
              placeholder="Customer Support Hours"
            />
          </div>

          <div className="input-group">
            <label>Section Description</label>
            <textarea
              name="businessHoursDescription"
              value={settings.businessHoursDescription}
              onChange={handleChange}
              rows={3}
              placeholder="We're here to help every day."
            />
          </div>

          <div className="settings-grid">
            <div className="input-group">
              <label>Monday – Friday</label>
              <input
                type="text"
                name="mondayFriday"
                value={settings.mondayFriday}
                onChange={handleChange}
                placeholder="9:00 AM – 10:00 PM"
              />
            </div>

            <div className="input-group">
              <label>Saturday</label>
              <input
                type="text"
                name="saturday"
                value={settings.saturday}
                onChange={handleChange}
                placeholder="9:00 AM – 11:00 PM"
              />
            </div>

            <div className="input-group">
              <label>Sunday</label>
              <input
                type="text"
                name="sunday"
                value={settings.sunday}
                onChange={handleChange}
                placeholder="9:00 AM – 10:00 PM"
              />
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="action-bar">
          {hasChanges ? (
            <span className="unsaved">● Unsaved changes</span>
          ) : (
            <span />
          )}
          <div className="actions">
            <button
              className="reset-btn"
              onClick={resetChanges}
              disabled={!hasChanges || saving}
            >
              Reset
            </button>
            <button
              className="save-btn"
              onClick={saveSettings}
              disabled={!hasChanges || saving}
            >
              {saving ? "Saving..." : "💾 Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
