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
        .support-settings-page{
            max-width:1100px;
            margin:auto;
            padding:24px;
        }

        .page-header{
            display:flex;
            justify-content:space-between;
            align-items:center;
            margin-bottom:24px;
        }

        .page-header h2{
            margin:0;
            color:#2C221E;
        }

        .page-header p{
            margin-top:6px;
            color:#8B7B70;
        }

        .success-banner{
            background:#EAF8EF;
            color:#2E7D32;
            border:1px solid #B8E6C4;
            padding:14px 18px;
            border-radius:12px;
            margin-bottom:20px;
            font-weight:600;
        }

        .error-banner{
            background:#FFF1F1;
            color:#C62828;
            border:1px solid #F3C2C2;
            padding:14px 18px;
            border-radius:12px;
            margin-bottom:20px;
            font-weight:600;
        }

        .settings-card{
            background:#fff;
            border:1px solid #E8DED2;
            border-radius:18px;
            padding:24px;
            margin-bottom:24px;
        }

        .settings-card h3{
            margin:0 0 8px;
            color:#2C221E;
        }

        .settings-card p{
            margin-bottom:22px;
            color:#8B7B70;
        }

        .settings-grid{
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
            gap:20px;
        }

        .input-group{
            display:flex;
            flex-direction:column;
            gap:8px;
            margin-bottom:16px;
        }

        .input-group:last-child{
            margin-bottom:0;
        }

        .input-group label{
            font-weight:600;
            color:#2C221E;
            font-size:14px;
        }

        .input-group input{
            padding:12px 14px;
            border:1px solid #DDD4C9;
            border-radius:12px;
            font-size:14px;
            outline:none;
            transition:.2s;
        }

        .input-group input:focus{
            border-color:#C4956A;
            box-shadow:0 0 0 3px rgba(196,149,106,.15);
        }

        .input-group textarea{
            padding:12px 14px;
            border:1px solid #DDD4C9;
            border-radius:12px;
            font-size:14px;
            outline:none;
            resize:vertical;
            min-height:80px;
            font-family:inherit;
            transition:.2s;
        }

        .input-group textarea:focus{
            border-color:#C4956A;
            box-shadow:0 0 0 3px rgba(196,149,106,.15);
        }

        .unsaved{
            color:#D97706;
            font-size:14px;
            font-weight:600;
        }

        .action-bar{
            display:flex;
            justify-content:space-between;
            align-items:center;
            margin-top:32px;
            padding-top:20px;
            border-top:1px solid #E8DED2;
        }

        .actions{
            display:flex;
            gap:12px;
        }

        .reset-btn{
            background:white;
            border:1px solid #DDD;
            padding:12px 20px;
            border-radius:12px;
            cursor:pointer;
            font-weight:600;
            color:#2C221E;
            transition:.2s;
        }

        .reset-btn:disabled{
            opacity:0.5;
            cursor:not-allowed;
        }

        .reset-btn:hover:not(:disabled){
            background:#F9F9F9;
        }

        .save-btn{
            background:#C4956A;
            color:white;
            border:none;
            padding:12px 20px;
            border-radius:12px;
            cursor:pointer;
            font-weight:600;
            transition:.2s;
        }

        .save-btn:disabled{
            opacity:0.5;
            cursor:not-allowed;
        }

        .save-btn:hover:not(:disabled){
            background:#B8865F;
        }

        .loading-card{
            background:white;
            padding:60px;
            text-align:center;
            border-radius:18px;
            border:1px solid #E8DED2;
            color:#8B7B70;
            font-weight:500;
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
