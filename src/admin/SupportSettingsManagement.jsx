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
           SUPPORT SETTINGS (SaaS Polish)
        =========================== */

        .support-settings-page{
            max-width:960px;
            margin:auto;
            padding:32px 20px;
            background:#FAF8F6;
            font-family: inherit;
            color: #1A1614;
        }

        /* ===========================
           HEADER
        =========================== */

        .page-header{
            display:flex;
            justify-content:space-between;
            align-items:center;
            margin-bottom:24px;
            padding:20px 24px;
            background:white;
            border-radius:14px;
            border:1px solid #ECE8E3;
            box-shadow:0 1px 3px rgba(0,0,0,.02);
        }

        .page-header h2{
            margin:0;
            font-size:22px;
            color:#1A1614;
            font-weight:600;
            letter-spacing: -0.01em;
        }

        .page-header p{
            margin:4px 0 0;
            color:#7A6E65;
            font-size:14px;
        }

        /* ===========================
           CARDS
        =========================== */

        .settings-card{
            background:white;
            border-radius:14px;
            padding:24px;
            margin-bottom:20px;
            border:1px solid #ECE8E3;
            box-shadow:0 1px 3px rgba(0,0,0,.03), 0 8px 24px rgba(44,34,30,.02);
            transition:border-color .2s;
        }

        .settings-card:hover{
            border-color: #D8D0C7;
        }

        .settings-card h3{
            margin:0;
            color:#1A1614;
            font-size:18px;
            font-weight:600;
            letter-spacing: -0.01em;
        }

        .settings-card > p{
            margin:6px 0 20px;
            color:#7A6E65;
            font-size:14px;
            line-height:1.5;
        }

        /* ===========================
           PREVIEW CARD (Help Centre Mock)
        =========================== */

        .preview-card{
            background:white;
            border-radius:14px;
            padding:24px;
            margin-bottom:20px;
            border:1px solid #ECE8E3;
            box-shadow:0 1px 3px rgba(0,0,0,.03), 0 8px 24px rgba(44,34,30,.02);
        }

        .help-centre-mock{
            background:#FAF8F6;
            border-radius:10px;
            border:1px solid #ECE8E3;
            padding:20px;
            margin-top:16px;
        }

        .mock-header{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid #ECE8E3;
        }

        .mock-header h4 {
            margin: 0;
            font-size: 15px;
            font-weight: 600;
            color: #1A1614;
        }

        .mock-response-badge {
            font-size: 13px;
            color: #5A4E46;
            background: #F0ECE6;
            padding: 4px 10px;
            border-radius: 20px;
            font-weight: 500;
        }

        .mock-channels-list{
            display:flex;
            flex-direction:column;
            gap:12px;
        }

        .mock-channel-row{
            background:white;
            border-radius:8px;
            padding:14px 16px;
            border:1px solid #ECE8E3;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .mock-channel-info strong{
            display:block;
            color:#1A1614;
            font-size:14px;
            font-weight:600;
            margin-bottom:2px;
        }

        .mock-channel-info span{
            color:#7A6E65;
            font-size:13px;
        }

        .mock-channel-action {
            font-size: 13px;
            font-weight: 500;
            color: #2C221E;
            background: #FAF8F6;
            padding: 6px 12px;
            border-radius: 6px;
            border: 1px solid #ECE8E3;
        }

        /* ===========================
           GRID
        =========================== */

        .settings-grid{
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
            gap:16px;
        }

        /* ===========================
           INPUTS
        =========================== */

        .input-group{
            display:flex;
            flex-direction:column;
            gap:8px;
            margin-bottom:14px;
        }

        .input-group:last-child{
            margin-bottom:0;
        }

        .input-group label{
            font-size:12px;
            font-weight:600;
            color:#5A4E46;
            letter-spacing:.3px;
            text-transform:uppercase;
        }

        .input-group input[type="text"],
        .input-group input[type="email"],
        .input-group input[type="number"],
        .input-group select,
        .input-group textarea{
            background:white;
            border:1px solid #ECE8E3;
            border-radius:10px;
            padding:12px 14px;
            font-size:14px;
            transition:.2s;
            outline:none;
            color:#1A1614;
            font-family:inherit;
        }

        .input-group textarea{
            min-height:90px;
            resize:vertical;
        }

        .input-group input:hover,
        .input-group select:hover,
        .input-group textarea:hover{
            border-color:#C8BFC5;
        }

        .input-group input:focus,
        .input-group select:focus,
        .input-group textarea:focus{
            border-color:#1A1614;
            box-shadow:0 0 0 3px rgba(26,22,20,.08);
        }

        .checkbox-label{
            display:flex;
            align-items:center;
            gap:10px;
            font-weight:500;
            color:#1A1614;
            cursor:pointer;
            font-size:14px;
        }

        .checkbox-label input[type="checkbox"]{
            width:16px;
            height:16px;
            accent-color:#1A1614;
            cursor:pointer;
        }

        .checkbox-grid{
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
            gap:12px;
        }

        .field-error{
            margin-top:4px;
            color:#DC2626;
            font-size:12px;
            font-weight:500;
        }

        /* ===========================
           TEST BUTTONS
        =========================== */

        .test-buttons{
            display:flex;
            flex-wrap:wrap;
            gap:12px;
            margin-top:16px;
        }

        .test-buttons button{
            background:white;
            border:1px solid #ECE8E3;
            border-radius:10px;
            padding:10px 16px;
            cursor:pointer;
            font-weight:500;
            font-size:13px;
            transition:.2s;
            color:#1A1614;
        }

        .test-buttons button:hover:not(:disabled){
            background:#FAF8F6;
            border-color:#1A1614;
        }

        .test-buttons button:disabled{
            opacity:.4;
            cursor:not-allowed;
        }

        /* ===========================
           SWITCH TOGGLES (iOS Style)
        =========================== */

        .toggle-list{
            display:flex;
            flex-direction:column;
            gap:12px;
        }

        .toggle-row{
            display:flex;
            justify-content:space-between;
            align-items:center;
            padding:14px 16px;
            background:#FAF8F6;
            border-radius:10px;
            border:1px solid #ECE8E3;
        }

        .toggle-row span{
            font-weight:500;
            color:#1A1614;
            font-size:14px;
        }

        .switch {
            position: relative;
            display: inline-block;
            width: 44px;
            height: 24px;
            cursor: pointer;
        }

        .switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .slider {
            position: absolute;
            cursor: pointer;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: #D6CEC7;
            transition: .2s;
            border-radius: 24px;
        }

        .slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .2s;
            border-radius: 50%;
            box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }

        input:checked + .slider {
            background-color: #1A1614;
        }

        input:checked + .slider:before {
            transform: translateX(20px);
        }

        /* ===========================
           ACTION BAR
        =========================== */

        .action-bar{
            position:sticky;
            bottom:16px;
            background:white;
            border-radius:14px;
            padding:16px 20px;
            display:flex;
            justify-content:space-between;
            align-items:center;
            margin-top:24px;
            border:1px solid #ECE8E3;
            box-shadow:0 4px 20px rgba(0,0,0,.06);
            z-index: 10;
        }

        .actions{
            display:flex;
            gap:10px;
        }

        /* ===========================
           BUTTONS
        =========================== */

        .save-btn{
            background:#1A1614;
            color:white;
            border:none;
            padding:10px 18px;
            border-radius:10px;
            cursor:pointer;
            font-size:14px;
            font-weight:500;
            transition:.2s;
        }

        .save-btn:hover:not(:disabled){
            background:#332C28;
        }

        .save-btn:disabled{
            background:#D6CEC7;
            cursor:not-allowed;
        }

        .reset-btn{
            background:white;
            border:1px solid #ECE8E3;
            padding:10px 16px;
            border-radius:10px;
            cursor:pointer;
            font-weight:500;
            color:#1A1614;
            transition:.2s;
            font-size: 14px;
        }

        .reset-btn:hover:not(:disabled){
            background:#FAF8F6;
            border-color:#1A1614;
        }

        .reset-btn:disabled{
            opacity:0.4;
            cursor:not-allowed;
        }

        /* ===========================
           STATUS
        =========================== */

        .unsaved{
            color:#9A6B00;
            font-weight:500;
            font-size: 13px;
            display:flex;
            align-items:center;
            gap:6px;
        }

        .success-banner{
            background:#F0FDF4;
            border:1px solid #DCFCE7;
            padding:14px;
            border-radius:10px;
            margin-bottom:16px;
            color:#166534;
            font-weight:500;
            font-size: 14px;
        }

        .error-banner{
            background:#FEF2F2;
            border:1px solid #FEE2E2;
            padding:14px;
            border-radius:10px;
            margin-bottom:16px;
            color:#991B1B;
            font-weight:500;
            font-size: 14px;
        }

        .loading-card{
            background:white;
            padding:40px;
            text-align:center;
            border-radius:14px;
            border:1px solid #ECE8E3;
            color:#7A6E65;
            font-weight:500;
            font-size:14px;
        }

        /* ===========================
           MOBILE
        =========================== */

        @media(max-width:768px){
            .page-header{
                flex-direction:column;
                align-items:flex-start;
                gap:14px;
            }

            .settings-grid{
                grid-template-columns:1fr;
            }

            .action-bar{
                flex-direction:column;
                gap:12px;
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
            <h2>Support Settings</h2>
            <p>Configure customer support channels.</p>
          </div>
        </div>

        {success && (
          <div className="success-banner">
            Support settings updated successfully.
          </div>
        )}

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        {/* Card 1: Support • Availability • Visibility */}
        <div className="settings-card">
          <h3>Support Availability & Visibility</h3>
          <p>Control system availability, communication channels, and frontend visibility.</p>
          
          <div className="toggle-list" style={{ marginBottom: "20px" }}>
            <div className="toggle-row">
              <span>Support System</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.supportEnabled}
                  onChange={() => toggleSetting("supportEnabled")}
                />
                <span className="slider"></span>
              </label>
            </div>
            <div className="toggle-row">
              <span>Phone Channel</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.phoneEnabled}
                  onChange={() => toggleSetting("phoneEnabled")}
                />
                <span className="slider"></span>
              </label>
            </div>
            <div className="toggle-row">
              <span>Email Channel</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.emailEnabled}
                  onChange={() => toggleSetting("emailEnabled")}
                />
                <span className="slider"></span>
              </label>
            </div>
            <div className="toggle-row">
              <span>WhatsApp Channel</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.whatsappEnabled}
                  onChange={() => toggleSetting("whatsappEnabled")}
                />
                <span className="slider"></span>
              </label>
            </div>
            <div className="toggle-row">
              <span>Instagram Channel</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.instagramEnabled}
                  onChange={() => toggleSetting("instagramEnabled")}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          <div style={{ fontSize: "13px", fontWeight: 600, color: "#5A4E46", marginBottom: "12px", textTransform: "uppercase", letterSpacing: ".3px" }}>
            Channel Visibility Toggles
          </div>
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

        {/* Card 2: Contact Information */}
        <div className="settings-card">
          <h3>Contact Information</h3>
          <p>Provide contact credentials exposed across customer support touchpoints.</p>

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
              <label>WhatsApp Number</label>
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
              <label>Instagram Handle</label>
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

          <div className="test-buttons">
            <button
              onClick={() => window.open(`tel:${settings.phone}`)}
              disabled={!settings.phone}
            >
              Test Call
            </button>
            <button
              onClick={() => window.open(`mailto:${settings.email}`)}
              disabled={!settings.email}
            >
              Test Email
            </button>
            <button
              onClick={() =>
                window.open(
                  `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`
                )
              }
              disabled={!settings.whatsapp}
            >
              Test WhatsApp
            </button>
            <button
              onClick={() =>
                window.open(
                  `https://instagram.com/${settings.instagram.replace("@", "")}`
                )
              }
              disabled={!settings.instagram}
            >
              Test Instagram
            </button>
          </div>
        </div>

        {/* Card 3: Customer Experience */}
        <div className="settings-card">
          <h3>Customer Experience</h3>
          <p>Configure helper copy, automated acknowledgements, and response timelines.</p>

          <div className="settings-grid" style={{ marginBottom: "16px" }}>
            <div className="input-group">
              <label>Call Description</label>
              <textarea
                name="callDescription"
                value={settings.callDescription}
                onChange={handleChange}
                rows={2}
                placeholder="Available during business hours."
              />
            </div>
            <div className="input-group">
              <label>Email Description</label>
              <textarea
                name="emailDescription"
                value={settings.emailDescription}
                onChange={handleChange}
                rows={2}
                placeholder="Usually replies within 24 hours."
              />
            </div>
            <div className="input-group">
              <label>WhatsApp Description</label>
              <textarea
                name="whatsappDescription"
                value={settings.whatsappDescription}
                onChange={handleChange}
                rows={2}
                placeholder="Fastest way to get help."
              />
            </div>
            <div className="input-group">
              <label>Instagram Description</label>
              <textarea
                name="instagramDescription"
                value={settings.instagramDescription}
                onChange={handleChange}
                rows={2}
                placeholder="Send us a DM anytime."
              />
            </div>
          </div>

          <div className="toggle-row" style={{ marginBottom: "16px" }}>
            <span>Automatic Acknowledgement Email</span>
            <label className="switch">
              <input
                type="checkbox"
                name="autoReplyEnabled"
                checked={settings.autoReplyEnabled}
                onChange={handleChange}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="settings-grid" style={{ marginBottom: "16px" }}>
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
              <label>Expected First Response (Hours)</label>
              <input
                type="number"
                name="responseTargetHours"
                value={settings.responseTargetHours}
                onChange={handleChange}
                min={1}
              />
            </div>
            <div className="input-group" style={{ gridColumn: "1 / -1" }}>
              <label>Auto-Reply Message Template</label>
              <textarea
                name="autoReplyMessage"
                value={settings.autoReplyMessage}
                onChange={handleChange}
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Card 4: Business Hours */}
        {settings.showBusinessHours && (
          <div className="settings-card">
            <h3>Business Hours</h3>
            <p>Set team availability and schedule schedules.</p>

            <div className="settings-grid" style={{ marginBottom: "16px" }}>
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
                <input
                  type="text"
                  name="businessHoursDescription"
                  value={settings.businessHoursDescription}
                  onChange={handleChange}
                  placeholder="We're here to help every day."
                />
              </div>
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

        {/* Card 5: Live Preview */}
        <div className="preview-card">
          <h3>Customer Preview</h3>
          <p>Real-time emulation of the customer Help Centre view.</p>

          <div className="help-centre-mock">
            <div className="mock-header">
              <h4>Need help?</h4>
              <div className="mock-response-badge">
                Average response {settings.estimatedResponseTime ? settings.estimatedResponseTime.toLowerCase() : "within 2 hours"}
              </div>
            </div>

            {!settings.supportEnabled ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#7A6E65", fontSize: "14px" }}>
                Support is currently unavailable.
              </div>
            ) : (
              <div className="mock-channels-list">
                {settings.showPhone && settings.phoneEnabled && (
                  <div className="mock-channel-row">
                    <div className="mock-channel-info">
                      <strong>Phone Support</strong>
                      <span>{settings.phone || "Not configured"} • {settings.callDescription || "Available during business hours."}</span>
                    </div>
                    <div className="mock-channel-action">Call</div>
                  </div>
                )}
                {settings.showEmail && settings.emailEnabled && (
                  <div className="mock-channel-row">
                    <div className="mock-channel-info">
                      <strong>Email Support</strong>
                      <span>{settings.email || "Not configured"} • {settings.emailDescription || "Replies within 24 hours"}</span>
                    </div>
                    <div className="mock-channel-action">Email</div>
                  </div>
                )}
                {settings.showWhatsapp && settings.whatsappEnabled && (
                  <div className="mock-channel-row">
                    <div className="mock-channel-info">
                      <strong>WhatsApp</strong>
                      <span>{settings.whatsapp || "Not configured"} • {settings.whatsappDescription || "Fastest way to get help."}</span>
                    </div>
                    <div className="mock-channel-action">Chat</div>
                  </div>
                )}
                {settings.showInstagram && settings.instagramEnabled && (
                  <div className="mock-channel-row">
                    <div className="mock-channel-info">
                      <strong>Instagram</strong>
                      <span>{settings.instagram || "Not configured"} • {settings.instagramDescription || "Send us a DM anytime."}</span>
                    </div>
                    <div className="mock-channel-action">DM</div>
                  </div>
                )}
              </div>
            )}
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
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

