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
    sunday: "",
    supportEnabled: true,
    phoneEnabled: true,
    emailEnabled: true,
    whatsappEnabled: true,
    instagramEnabled: true,
    showPhone: true,
    showEmail: true,
    showWhatsapp: true,
    showInstagram: true,
    showBusinessHours: true,
    autoReplyEnabled: true,
    autoReplyMessage: "Thanks for contacting Brewed Support! We've received your request and will get back to you as soon as possible.",
    estimatedResponseTime: "Within 2 hours",
    responseTargetHours: 24,
    escalationHours: 48
  });
  const [originalSettings, setOriginalSettings] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
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
          setSettings(prev => ({
            ...prev,
            ...data
          }));
          setOriginalSettings(prev => ({
            ...prev,
            ...data
          }));
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
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    setSettings(prev => ({ ...prev, [name]: val }));
    setValidationErrors(prev => ({ ...prev, [name]: "" }));
  };

  const toggleSetting = (field) => {
    setSettings(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validateSettings = () => {
    const errors = {};
    if (!settings.phone.trim()) {
      errors.phone = "Phone number is required.";
    } else if (!/^[0-9+\-\s()]{7,20}$/.test(settings.phone)) {
      errors.phone = "Enter a valid phone number.";
    }
    if (!settings.email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) {
      errors.email = "Enter a valid email address.";
    }
    if (
      settings.whatsapp &&
      !/^[0-9+\-\s()]{7,20}$/.test(settings.whatsapp)
    ) {
      errors.whatsapp = "Enter a valid WhatsApp number.";
    }
    if (
      settings.instagram &&
      settings.instagram.length > 30
    ) {
      errors.instagram = "Instagram username is too long.";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveSettings = async () => {
    if (!validateSettings()) return;
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
    setValidationErrors({});
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
           PREVIEW CARD
        =========================== */

        .preview-card{
            background:white;
            border-radius:22px;
            padding:28px;
            margin-bottom:24px;
            box-shadow:
                0 4px 12px rgba(0,0,0,.03),
                0 12px 40px rgba(44,34,30,.04);
            border:1px solid #EFE5DA;
        }

        .preview-grid{
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(240px,1fr));
            gap:18px;
            margin-top:22px;
        }

        .preview-item{
            background:#FAF6F0;
            border-radius:18px;
            padding:18px;
            border:1px solid #EFE5DA;
        }

        .preview-item h4{
            margin:0 0 10px;
            font-size:17px;
            color:#2C221E;
        }

        .preview-item strong{
            display:block;
            color:#C4956A;
            font-size:16px;
            margin-bottom:8px;
        }

        .preview-item p{
            margin:0;
            color:#8B7B70;
            font-size:14px;
            line-height:1.5;
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

        .input-group input[type="text"],
        .input-group input[type="email"],
        .input-group input[type="number"],
        .input-group select,
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
        .input-group select:hover,
        .input-group textarea:hover{
            background:white;
            border-color:#E8DED2;
        }

        .input-group input:focus,
        .input-group select:focus,
        .input-group textarea:focus{
            background:white;
            border-color:#C4956A;
            box-shadow:0 0 0 5px rgba(196,149,106,.15);
        }

        .checkbox-label{
            display:flex;
            align-items:center;
            gap:12px;
            font-weight:600;
            color:#2C221E;
            cursor:pointer;
            font-size:15px;
        }

        .checkbox-label input[type="checkbox"]{
            width:20px;
            height:20px;
            accent-color:#C4956A;
            cursor:pointer;
        }

        .checkbox-grid{
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
            gap:16px;
        }

        .field-error{
            margin-top:6px;
            color:#DC2626;
            font-size:13px;
            font-weight:600;
        }

        /* ===========================
           TEST BUTTONS
        =========================== */

        .test-buttons{
            display:flex;
            flex-wrap:wrap;
            gap:16px;
            margin-top:20px;
        }

        .test-buttons button{
            background:#FAF6F0;
            border:1px solid #E8DED2;
            border-radius:14px;
            padding:14px 22px;
            cursor:pointer;
            font-weight:600;
            transition:.25s;
            color:#2C221E;
        }

        .test-buttons button:hover:not(:disabled){
            background:#C4956A;
            color:white;
            border-color:#C4956A;
        }

        .test-buttons button:disabled{
            opacity:.45;
            cursor:not-allowed;
        }

        /* ===========================
           TOGGLES
        =========================== */

        .toggle-list{
            display:flex;
            flex-direction:column;
            gap:16px;
        }

        .toggle-row{
            display:flex;
            justify-content:space-between;
            align-items:center;
            padding:18px 20px;
            background:#FAF6F0;
            border-radius:16px;
        }

        .toggle-row span{
            font-weight:600;
            color:#2C221E;
        }

        .toggle{
            border:none;
            background:#E5E7EB;
            color:#444;
            padding:10px 18px;
            border-radius:999px;
            cursor:pointer;
            font-weight:700;
            transition:.25s;
        }

        .toggle.active{
            background:#22C55E;
            color:white;
        }

        .toggle:hover{
            transform:translateY(-2px);
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

        {/* Support Availability */}
        <div className="settings-card">
          <h3>🟢 Support Availability</h3>
          <p>
            Enable or disable support channels without deleting their information.
          </p>
          <div className="toggle-list">
            <div className="toggle-row">
              <span>Support System</span>
              <button
                className={settings.supportEnabled ? "toggle active" : "toggle"}
                onClick={() => toggleSetting("supportEnabled")}
              >
                {settings.supportEnabled ? "Enabled" : "Disabled"}
              </button>
            </div>
            <div className="toggle-row">
              <span>Phone</span>
              <button
                className={settings.phoneEnabled ? "toggle active" : "toggle"}
                onClick={() => toggleSetting("phoneEnabled")}
              >
                {settings.phoneEnabled ? "Enabled" : "Disabled"}
              </button>
            </div>
            <div className="toggle-row">
              <span>Email</span>
              <button
                className={settings.emailEnabled ? "toggle active" : "toggle"}
                onClick={() => toggleSetting("emailEnabled")}
              >
                {settings.emailEnabled ? "Enabled" : "Disabled"}
              </button>
            </div>
            <div className="toggle-row">
              <span>WhatsApp</span>
              <button
                className={settings.whatsappEnabled ? "toggle active" : "toggle"}
                onClick={() => toggleSetting("whatsappEnabled")}
              >
                {settings.whatsappEnabled ? "Enabled" : "Disabled"}
              </button>
            </div>
            <div className="toggle-row">
              <span>Instagram</span>
              <button
                className={settings.instagramEnabled ? "toggle active" : "toggle"}
                onClick={() => toggleSetting("instagramEnabled")}
              >
                {settings.instagramEnabled ? "Enabled" : "Disabled"}
              </button>
            </div>
          </div>
        </div>

        {/* Support Channels Visibility */}
        <div className="settings-card">
          <h3>👁️ Support Channels Visibility</h3>
          <p>
            Control which contact methods and sections customers actually see in the Help Centre.
          </p>
          <div className="checkbox-grid">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="showPhone"
                checked={settings.showPhone}
                onChange={handleChange}
              />
              Show Phone
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="showEmail"
                checked={settings.showEmail}
                onChange={handleChange}
              />
              Show Email
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="showWhatsapp"
                checked={settings.showWhatsapp}
                onChange={handleChange}
              />
              Show WhatsApp
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="showInstagram"
                checked={settings.showInstagram}
                onChange={handleChange}
              />
              Show Instagram
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="showBusinessHours"
                checked={settings.showBusinessHours}
                onChange={handleChange}
              />
              Show Business Hours
            </label>
          </div>
        </div>

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
              {validationErrors.phone && (
                <span className="field-error">
                  {validationErrors.phone}
                </span>
              )}
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
              {validationErrors.email && (
                <span className="field-error">
                  {validationErrors.email}
                </span>
              )}
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
              {validationErrors.whatsapp && (
                <span className="field-error">
                  {validationErrors.whatsapp}
                </span>
              )}
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
              {validationErrors.instagram && (
                <span className="field-error">
                  {validationErrors.instagram}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Test Contact Actions */}
        <div className="settings-card">
          <h3>🧪 Test Contact Actions</h3>
          <p>
            Quickly verify that your support contact information works correctly.
          </p>
          <div className="test-buttons">
            <button
              onClick={() => window.open(`tel:${settings.phone}`)}
              disabled={!settings.phone}
            >
              📞 Test Call
            </button>
            <button
              onClick={() => window.open(`mailto:${settings.email}`)}
              disabled={!settings.email}
            >
              ✉️ Test Email
            </button>
            <button
              onClick={() =>
                window.open(
                  `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`
                )
              }
              disabled={!settings.whatsapp}
            >
              💬 Test WhatsApp
            </button>
            <button
              onClick={() =>
                window.open(
                  `https://instagram.com/${settings.instagram.replace("@", "")}`
                )
              }
              disabled={!settings.instagram}
            >
              📷 Test Instagram
            </button>
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

        {/* Auto Response Settings */}
        <div className="settings-card">
          <h3>🤖 Automatic Reply</h3>
          <p>
            Configure automated acknowledgement messages sent to customers upon ticket submission.
          </p>

          <div className="input-group" style={{ marginBottom: "24px" }}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="autoReplyEnabled"
                checked={settings.autoReplyEnabled}
                onChange={handleChange}
              />
              Enable automatic acknowledgement
            </label>
          </div>

          <div className="input-group">
            <label>Estimated Response Time</label>
            <select
              name="estimatedResponseTime"
              value={settings.estimatedResponseTime}
              onChange={handleChange}
            >
              <option value="Within 1 hour">Within 1 hour</option>
              <option value="Within 2 hours">Within 2 hours</option>
              <option value="Within 4 hours">Within 4 hours</option>
              <option value="Within 24 hours">Within 24 hours</option>
            </select>
          </div>

          <div className="input-group">
            <label>Message Template</label>
            <textarea
              name="autoReplyMessage"
              value={settings.autoReplyMessage}
              onChange={handleChange}
              rows={4}
              placeholder="Thanks for contacting Brewed Support!..."
            />
          </div>
        </div>

        {/* SLA & Response Targets */}
        <div className="settings-card">
          <h3>⏰ SLA & Response Targets</h3>
          <p>
            Set expected response timeframes and escalation windows for your team.
          </p>

          <div className="settings-grid">
            <div className="input-group">
              <label>Expected First Response (Hours)</label>
              <input
                type="number"
                name="responseTargetHours"
                value={settings.responseTargetHours}
                onChange={handleChange}
                min={1}
                placeholder="24"
              />
            </div>

            <div className="input-group">
              <label>Escalation Threshold (Hours)</label>
              <input
                type="number"
                name="escalationHours"
                value={settings.escalationHours}
                onChange={handleChange}
                min={1}
                placeholder="48"
              />
            </div>
          </div>
        </div>

        {/* Customer Preview */}
        <div className="preview-card">
          <h3>👀 Customer Preview</h3>
          <p>
            This is how your contact information and SLA targets will appear in the customer Help Centre.
          </p>
          <div style={{ marginBottom: "16px", fontSize: "14px", fontWeight: "600", color: "#C4956A" }}>
            Average response {settings.estimatedResponseTime ? settings.estimatedResponseTime.toLowerCase() : "within 2 hours"}
          </div>
          {!settings.supportEnabled ? (
            <div className="preview-item" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "30px" }}>
              <p style={{ fontWeight: 600, color: "#D97706" }}>Support is currently unavailable.</p>
            </div>
          ) : (
            <div className="preview-grid">
              {settings.showPhone && settings.phoneEnabled && (
                <div className="preview-item">
                  <h4>📞 Call Us</h4>
                  <strong>{settings.phone || "Not configured"}</strong>
                  <p>{settings.callDescription || "No description provided."}</p>
                </div>
              )}
              {settings.showEmail && settings.emailEnabled && (
                <div className="preview-item">
                  <h4>✉️ Email</h4>
                  <strong>{settings.email || "Not configured"}</strong>
                  <p>{settings.emailDescription || "No description provided."}</p>
                </div>
              )}
              {settings.showWhatsapp && settings.whatsappEnabled && (
                <div className="preview-item">
                  <h4>💬 WhatsApp</h4>
                  <strong>{settings.whatsapp || "Not configured"}</strong>
                  <p>{settings.whatsappDescription || "No description provided."}</p>
                </div>
              )}
              {settings.showInstagram && settings.instagramEnabled && (
                <div className="preview-item">
                  <h4>📷 Instagram</h4>
                  <strong>{settings.instagram || "Not configured"}</strong>
                  <p>{settings.instagramDescription || "No description provided."}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Business Hours */}
        {settings.showBusinessHours && (
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
        )}

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
