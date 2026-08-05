import { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { 
  Phone, 
  Mail, 
  MessageCircle, 
  Camera, 
  Clock, 
  Bot, 
  Eye, 
  Settings, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Smartphone,
  ShieldCheck,
  Layers,
  Timer,
  HelpCircle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export default function SupportFaqManagement() {
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
    monday: "",
    tuesday: "",
    wednesday: "",
    thursday: "",
    friday: "",
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
    escalationHours: 48,
    faqs: []
  });

  const [originalSettings, setOriginalSettings] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [newFaq, setNewFaq] = useState({ question: "", answer: "", category: "General" });
  const [expandedFaqIndex, setExpandedFaqIndex] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "supportSettings", "general"),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setSettings(prev => ({
            ...prev,
            ...data,
            faqs: data.faqs || []
          }));
          setOriginalSettings(prev => ({
            ...prev,
            ...data,
            faqs: data.faqs || []
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

  const handleFaqChange = (index, field, value) => {
    const updatedFaqs = [...settings.faqs];
    updatedFaqs[index][field] = value;
    setSettings(prev => ({ ...prev, faqs: updatedFaqs }));
  };

  const addFaq = () => {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) return;
    setSettings(prev => ({
      ...prev,
      faqs: [...prev.faqs, { ...newFaq }]
    }));
    setNewFaq({ question: "", answer: "", category: "General" });
  };

  const removeFaq = (index) => {
    const updatedFaqs = settings.faqs.filter((_, i) => i !== index);
    setSettings(prev => ({ ...prev, faqs: updatedFaqs }));
  };

  const validateSettings = () => {
    const errors = {};
    if (settings.phone && !/^[0-9+\-\s()]{7,20}$/.test(settings.phone)) {
      errors.phone = "Enter a valid phone number.";
    }
    if (settings.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) {
      errors.email = "Enter a valid email address.";
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

  const activeChannelsCount = [
    settings.phoneEnabled, 
    settings.emailEnabled, 
    settings.whatsappEnabled, 
    settings.instagramEnabled
  ].filter(Boolean).length;

  const visibleChannelsCount = [
    settings.showPhone, 
    settings.showEmail, 
    settings.showWhatsapp, 
    settings.showInstagram
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading-card">
          <div className="spinner"></div>
          Loading support and FAQ management...
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* ===========================
           BREWED LUXURY ADMIN V1 DESIGN SYSTEM
        =========================== */

        .admin-page {
          padding: 32px;
          background: #F8F6F2;
          min-height: 100vh;
          font-family: inherit;
          color: #1A1614;
          box-sizing: border-box;
          position: relative;
        }

        /* HERO HEADER & STAT CARDS */
        .admin-hero {
          margin-bottom: 28px;
        }

        .hero-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          background: white;
          padding: 24px 28px;
          border-radius: 20px;
          border: 1px solid #ECE8E3;
          box-shadow: 0 4px 20px rgba(44,34,30,0.02);
        }

        .hero-title-area h2 {
          margin: 0;
          font-size: 26px;
          color: #1A1614;
          font-weight: 600;
          letter-spacing: -0.02em;
        }

        .hero-title-area p {
          margin: 6px 0 0;
          color: #7A6E65;
          font-size: 15px;
        }

        .hero-action-slot {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .hero-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }

        .stat-card {
          background: white;
          border-radius: 18px;
          padding: 20px 24px;
          border: 1px solid #ECE8E3;
          box-shadow: 0 4px 20px rgba(44,34,30,0.02);
          display: flex;
          align-items: center;
          gap: 16px;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .stat-card:hover {
          border-color: #D8D0C7;
          transform: translateY(-2px);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: #FAF8F6;
          border: 1px solid #ECE8E3;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1A1614;
          flex-shrink: 0;
        }

        .stat-content .stat-label {
          font-size: 13px;
          font-weight: 500;
          color: #7A6E65;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 4px;
        }

        .stat-content .stat-value {
          font-size: 20px;
          font-weight: 600;
          color: #1A1614;
          letter-spacing: -0.01em;
        }

        /* TOAST NOTIFICATION */
        .success-toast {
          background: #EEF5EF;
          border: 1px solid #D8E6D8;
          padding: 14px 20px;
          border-radius: 14px;
          margin-bottom: 24px;
          color: #36543A;
          font-weight: 500;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          animation: slideDown 0.3s ease;
        }

        .error-banner {
          background: #FEF2F2;
          border: 1px solid #FEE2E2;
          padding: 14px 20px;
          border-radius: 14px;
          margin-bottom: 24px;
          color: #991B1B;
          font-weight: 500;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* UNSAVED CHANGES PILL & BANNER */
        .unsaved-pill-banner {
          background: #F8F3E8;
          border: 1px solid #E7D9B5;
          color: #8B6A2B;
          border-radius: 999px;
          padding: 8px 16px;
          font-weight: 600;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 2px 8px rgba(139, 106, 43, 0.05);
        }

        .saved-status-text {
          color: #7A6E65;
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* DASHBOARD CARDS */
        .dashboard-card {
          background: white;
          border-radius: 20px;
          padding: 28px;
          margin-bottom: 24px;
          border: 1px solid #ECE8E3;
          box-shadow: 0 4px 24px rgba(44,34,30,0.03);
          transition: border-color 0.2s ease;
        }

        .dashboard-card:hover {
          border-color: #D8D0C7;
        }

        .dashboard-card h3 {
          margin: 0;
          color: #1A1614;
          font-size: 19px;
          font-weight: 600;
          letter-spacing: -0.01em;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .dashboard-card > p {
          margin: 6px 0 24px;
          color: #7A6E65;
          font-size: 14px;
          line-height: 1.5;
        }

        .card-subsection-title {
          font-size: 13px;
          font-weight: 600;
          color: #5A4E46;
          margin: 24px 0 14px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* GRIDS */
        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        /* INPUTS */
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }

        .input-group:last-child {
          margin-bottom: 0;
        }

        .input-group label {
          font-size: 12px;
          font-weight: 600;
          color: #5A4E46;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .input-group input[type="text"],
        .input-group input[type="email"],
        .input-group input[type="number"],
        .input-group select,
        .input-group textarea {
          background: #FCFBF8;
          border: 1px solid #ECE8E3;
          border-radius: 14px;
          height: 48px;
          padding: 0 16px;
          font-size: 14px;
          transition: all 0.2s ease;
          outline: none;
          color: #1A1614;
          font-family: inherit;
          box-sizing: border-box;
          width: 100%;
        }

        .input-group textarea {
          height: auto;
          min-height: 110px;
          padding: 14px 16px;
          resize: vertical;
        }

        .input-group input:hover,
        .input-group select:hover,
        .input-group textarea:hover {
          border-color: #C8BFC5;
          background: white;
        }

        .input-group input:focus,
        .input-group select:focus,
        .input-group textarea:focus {
          border-color: #1A1614;
          background: white;
          box-shadow: 0 0 0 4px rgba(26,22,20,0.06);
        }

        .field-error {
          margin-top: 4px;
          color: #DC2626;
          font-size: 12px;
          font-weight: 500;
        }

        /* FAQ SPECIFIC STYLES */
        .faq-item-card {
          background: #FAF8F6;
          border: 1px solid #ECE8E3;
          border-radius: 16px;
          padding: 18px 20px;
          margin-bottom: 14px;
          transition: border-color 0.2s ease;
        }

        .faq-item-card:hover {
          border-color: #D8D0C7;
        }

        .faq-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
        }

        .faq-item-title-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .faq-badge {
          font-size: 11px;
          font-weight: 600;
          background: #EFECE6;
          color: #5A4E46;
          padding: 4px 10px;
          border-radius: 6px;
          text-transform: uppercase;
        }

        .faq-item-body {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #ECE8E3;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .icon-btn-danger {
          background: #FEF2F2;
          border: 1px solid #FEE2E2;
          color: #991B1B;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .icon-btn-danger:hover {
          background: #FEE2E2;
        }

        /* CHECKBOXES & TOGGLES */
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 500;
          color: #1A1614;
          cursor: pointer;
          font-size: 14px;
          background: #FAF8F6;
          padding: 14px 18px;
          border-radius: 14px;
          border: 1px solid #ECE8E3;
          transition: border-color 0.2s ease;
        }

        .checkbox-label:hover {
          border-color: #D8D0C7;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: #1A1614;
          cursor: pointer;
        }

        .checkbox-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 14px;
        }

        .toggle-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #FAF8F6;
          border-radius: 14px;
          border: 1px solid #ECE8E3;
          transition: border-color 0.2s ease;
        }

        .toggle-row:hover {
          border-color: #D8D0C7;
        }

        .toggle-row-info {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .toggle-row-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: white;
          border: 1px solid #ECE8E3;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1A1614;
        }

        .toggle-row-text strong {
          display: block;
          font-weight: 600;
          color: #1A1614;
          font-size: 14px;
          margin-bottom: 2px;
        }

        .toggle-row-text span {
          color: #7A6E65;
          font-size: 13px;
        }

        /* SWITCH TOGGLE */
        .switch {
          position: relative;
          display: inline-block;
          width: 46px;
          height: 26px;
          cursor: pointer;
          flex-shrink: 0;
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
          transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 26px;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
        }

        input:checked + .slider {
          background-color: #1A1614;
        }

        input:checked + .slider:before {
          transform: translateX(20px);
        }

        /* TEST BUTTONS */
        .test-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 20px;
        }

        .test-buttons button {
          background: #FAF8F6;
          border: 1px solid #ECE8E3;
          border-radius: 12px;
          padding: 10px 18px;
          cursor: pointer;
          font-weight: 500;
          font-size: 13px;
          transition: all 0.2s ease;
          color: #1A1614;
        }

        .test-buttons button:hover:not(:disabled) {
          background: white;
          border-color: #1A1614;
        }

        .test-buttons button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* PHONE MOCKUP PREVIEW */
        .preview-container {
          display: flex;
          justify-content: center;
          padding: 20px 0;
        }

        .phone-mockup {
          width: 100%;
          max-width: 380px;
          background: #1A1614;
          border-radius: 40px;
          padding: 16px;
          box-shadow: 0 20px 40px rgba(26,22,20,0.15);
          border: 4px solid #332C28;
        }

        .phone-screen {
          background: #FAF8F6;
          border-radius: 30px;
          padding: 24px 18px;
          min-height: 520px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: relative;
          overflow: hidden;
        }

        .phone-notch {
          width: 100px;
          height: 18px;
          background: #1A1614;
          border-radius: 0 0 10px 10px;
          margin: -24px auto 14px auto;
        }

        .mock-header {
          text-align: center;
          border-bottom: 1px solid #ECE8E3;
          padding-bottom: 14px;
        }

        .mock-header h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #1A1614;
        }

        .mock-response-badge {
          display: inline-block;
          font-size: 12px;
          color: #5A4E46;
          background: #F0ECE6;
          padding: 4px 12px;
          border-radius: 20px;
          font-weight: 500;
          margin-top: 6px;
        }

        .mock-channels-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .mock-channel-row {
          background: white;
          border-radius: 12px;
          padding: 12px 14px;
          border: 1px solid #ECE8E3;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .mock-channel-info strong {
          display: block;
          color: #1A1614;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 2px;
        }

        .mock-channel-info span {
          color: #7A6E65;
          font-size: 11px;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .mock-channel-action {
          font-size: 11px;
          font-weight: 600;
          color: #FAF8F6;
          background: #1A1614;
          padding: 6px 10px;
          border-radius: 8px;
          flex-shrink: 0;
        }

        /* SECTION FOOTER ACTIONS */
        .section-footer-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 12px;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #ECE8E3;
        }

        .save-btn {
          background: #1A1614;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 14px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background 0.2s ease;
        }

        .save-btn:hover:not(:disabled) {
          background: #332C28;
        }

        .save-btn:disabled {
          background: #D6CEC7;
          cursor: not-allowed;
        }

        .reset-btn {
          background: #FAF8F6;
          border: 1px solid #ECE8E3;
          padding: 12px 20px;
          border-radius: 14px;
          cursor: pointer;
          font-weight: 500;
          color: #1A1614;
          transition: all 0.2s ease;
          font-size: 14px;
        }

        .reset-btn:hover:not(:disabled) {
          background: white;
          border-color: #1A1614;
        }

        .reset-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .loading-card {
          background: white;
          padding: 60px;
          text-align: center;
          border-radius: 20px;
          border: 1px solid #ECE8E3;
          color: #7A6E65;
          font-weight: 500;
          font-size: 15px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #ECE8E3;
          border-top-color: #1A1614;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* RESPONSIVE */
        @media(max-width: 768px) {
          .admin-page {
            padding: 16px;
          }
          .hero-top-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
            padding: 20px;
          }
          .hero-action-slot {
            width: 100%;
            justify-content: space-between;
          }
          .section-footer-actions {
            flex-direction: column-reverse;
            align-items: stretch;
          }
          .save-btn, .reset-btn {
            width: 100%;
          }
        }
      `}</style>

      <div className="admin-page">
        {/* Hero Header & Stat Cards */}
        <div className="admin-hero">
          <div className="hero-top-row">
            <div className="hero-title-area">
              <h2>Support & FAQ Management</h2>
              <p>Manage support settings, contact channels, and FAQs./p>
            </div>
            <div className="hero-action-slot">
              {hasChanges ? (
                <div className="unsaved-pill-banner">
                  ● You have unsaved changes
                </div>
              ) : (
                <div className="saved-status-text">
                  <CheckCircle2 size={16} color="#36543A" /> All changes saved
                </div>
              )}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="reset-btn"
                  onClick={resetChanges}
                  disabled={!hasChanges || saving}
                  style={{ padding: "10px 16px", height: "46px" }}
                >
                  Reset
                </button>
                <button
                  className="save-btn"
                  onClick={saveSettings}
                  disabled={!hasChanges || saving}
                  style={{ padding: "10px 20px", height: "46px" }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>

          <div className="hero-stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <ShieldCheck size={22} />
              </div>
              <div className="stat-content">
                <div className="stat-label">Support Status</div>
                <div className="stat-value">{settings.supportEnabled ? "Active" : "Disabled"}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <HelpCircle size={22} />
              </div>
              <div className="stat-content">
                <div className="stat-label">Total FAQs</div>
                <div className="stat-value">{settings.faqs.length}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <Layers size={22} />
              </div>
              <div className="stat-content">
                <div className="stat-label">Active Channels</div>
                <div className="stat-value">{activeChannelsCount} / 4</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <Timer size={22} />
              </div>
              <div className="stat-content">
                <div className="stat-label">Avg Response</div>
                <div className="stat-value">{settings.estimatedResponseTime || "N/A"}</div>
              </div>
            </div>
          </div>
        </div>

        {success && (
          <div className="success-toast">
            <CheckCircle2 size={18} color="#36543A" />
            Support and FAQ settings updated successfully.
          </div>
        )}

        {error && (
          <div className="error-banner">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Section 1: Support Availability */}
        <div className="dashboard-card">
          <h3>
            <Settings size={20} />
            Support Availability & Visibility
          </h3>
          <p>Control system availability, communication channels, and frontend visibility.</p>
          
          <div className="toggle-list" style={{ marginBottom: "24px" }}>
            <div className="toggle-row">
              <div className="toggle-row-info">
                <div className="toggle-row-icon"><ShieldCheck size={18} /></div>
                <div className="toggle-row-text">
                  <strong>Support System</strong>
                  <span>Global toggle for entire customer support interface</span>
                </div>
              </div>
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
              <div className="toggle-row-info">
                <div className="toggle-row-icon"><Phone size={18} /></div>
                <div className="toggle-row-text">
                  <strong>Phone Channel</strong>
                  <span>Receive customer phone inquiries</span>
                </div>
              </div>
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
              <div className="toggle-row-info">
                <div className="toggle-row-icon"><Mail size={18} /></div>
                <div className="toggle-row-text">
                  <strong>Email Channel</strong>
                  <span>Receive customer support tickets via email</span>
                </div>
              </div>
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
              <div className="toggle-row-info">
                <div className="toggle-row-icon"><MessageCircle size={18} /></div>
                <div className="toggle-row-text">
                  <strong>WhatsApp Channel</strong>
                  <span>Enable direct WhatsApp customer communication</span>
                </div>
              </div>
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
              <div className="toggle-row-info">
                <div className="toggle-row-icon"><Camera size={18} /></div>
                <div className="toggle-row-text">
                  <strong>Instagram Channel</strong>
                  <span>Display Instagram support handle and direct DM link</span>
                </div>
              </div>
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

          <div className="card-subsection-title">
            <Eye size={16} />
            Frontend Channel Visibility Toggles
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

        {/* Section 2: Contact Channels */}
        <div className="dashboard-card">
          <h3>
            <Phone size={20} />
            Contact Channels
          </h3>
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

          <div className="card-subsection-title">
            <Sparkles size={16} />
            Channel Descriptions
          </div>

          <div className="settings-grid">
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

        {/* Section 2.5: Frequently Asked Questions (FAQs) */}
        <div className="dashboard-card">
          <h3>
            <HelpCircle size={20} />
            Frequently Asked Questions (FAQs)
          </h3>
          <p>Add and manage quick answers to common customer inquiries displayed on the support portal.</p>

          <div style={{ marginBottom: "24px" }}>
            {settings.faqs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px", background: "#FAF8F6", borderRadius: "14px", border: "1px solid #ECE8E3", color: "#7A6E65", fontSize: "14px" }}>
                No FAQs added yet. Use the form below to create your first FAQ.
              </div>
            ) : (
              settings.faqs.map((faq, index) => {
                const isExpanded = expandedFaqIndex === index;
                return (
                  <div key={index} className="faq-item-card">
                    <div 
                      className="faq-item-header"
                      onClick={() => setExpandedFaqIndex(isExpanded ? null : index)}
                    >
                      <div className="faq-item-title-row">
                        <span className="faq-badge">{faq.category || "General"}</span>
                        <strong style={{ fontSize: "14px", color: "#1A1614" }}>
                          {faq.question || "Untitled Question"}
                        </strong>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <button
                          type="button"
                          className="icon-btn-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFaq(index);
                          }}
                          title="Delete FAQ"
                        >
                          <Trash2 size={16} />
                        </button>
                        {isExpanded ? <ChevronUp size={18} color="#7A6E65" /> : <ChevronDown size={18} color="#7A6E65" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="faq-item-body">
                        <div className="settings-grid">
                          <div className="input-group">
                            <label>Question</label>
                            <input
                              type="text"
                              value={faq.question}
                              onChange={(e) => handleFaqChange(index, "question", e.target.value)}
                              placeholder="e.g., What are your shipping times?"
                            />
                          </div>
                          <div className="input-group">
                            <label>Category</label>
                            <input
                              type="text"
                              value={faq.category}
                              onChange={(e) => handleFaqChange(index, "category", e.target.value)}
                              placeholder="e.g., Shipping, Orders"
                            />
                          </div>
                        </div>
                        <div className="input-group">
                          <label>Answer</label>
                          <textarea
                            value={faq.answer}
                            onChange={(e) => handleFaqChange(index, "answer", e.target.value)}
                            rows={3}
                            placeholder="Provide a clear, detailed answer..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="card-subsection-title">
            <Plus size={16} />
            Add New FAQ
          </div>
          <div className="settings-grid" style={{ marginBottom: "16px" }}>
            <div className="input-group">
              <label>Question</label>
              <input
                type="text"
                value={newFaq.question}
                onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                placeholder="e.g., How do I track my order?"
              />
            </div>
            <div className="input-group">
              <label>Category</label>
              <input
                type="text"
                value={newFaq.category}
                onChange={(e) => setNewFaq({ ...newFaq, category: e.target.value })}
                placeholder="e.g., Orders"
              />
            </div>
          </div>
          <div className="input-group" style={{ marginBottom: "20px" }}>
            <label>Answer</label>
            <textarea
              value={newFaq.answer}
              onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
              rows={3}
              placeholder="Enter the comprehensive answer for customers..."
            />
          </div>
          <button
            type="button"
            className="save-btn"
            onClick={addFaq}
            disabled={!newFaq.question.trim() || !newFaq.answer.trim()}
          >
            <Plus size={16} style={{ verticalAlign: "middle", marginRight: "6px" }} /> Add FAQ Item
          </button>
        </div>

        {/* Section 3: Customer Experience */}
        <div className="dashboard-card">
          <h3>
            <Bot size={20} />
            Customer Experience & Automation
          </h3>
          <p>Configure helper copy, automated acknowledgements, and response timelines.</p>

          <div className="toggle-row" style={{ marginBottom: "20px" }}>
            <div className="toggle-row-info">
              <div className="toggle-row-icon"><Bot size={18} /></div>
              <div className="toggle-row-text">
                <strong>Automatic Acknowledgement Email</strong>
                <span>Instantly email customers when a new request is logged</span>
              </div>
            </div>
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
              <label>Estimated Response Time Badge</label>
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
          </div>

          <div className="input-group">
            <label>Auto-Reply Message Template</label>
            <textarea
              name="autoReplyMessage"
              value={settings.autoReplyMessage}
              onChange={handleChange}
              rows={3}
            />
          </div>
        </div>

        {/* Section 4: Business Hours */}
        {settings.showBusinessHours && (
          <div className="dashboard-card">
            <h3>
              <Clock size={20} />
              Business Hours Schedule
            </h3>
            <p>Set team availability and schedule timelines across the week.</p>

            <div className="settings-grid" style={{ marginBottom: "20px" }}>
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
                <label>Monday</label>
                <input
                  type="text"
                  name="monday"
                  value={settings.monday}
                  onChange={handleChange}
                  placeholder="9:00 AM – 10:00 PM"
                />
              </div>
              <div className="input-group">
                <label>Tuesday</label>
                <input
                  type="text"
                  name="tuesday"
                  value={settings.tuesday}
                  onChange={handleChange}
                  placeholder="9:00 AM – 10:00 PM"
                />
              </div>
              <div className="input-group">
                <label>Wednesday</label>
                <input
                  type="text"
                  name="wednesday"
                  value={settings.wednesday}
                  onChange={handleChange}
                  placeholder="9:00 AM – 10:00 PM"
                />
              </div>
              <div className="input-group">
                <label>Thursday</label>
                <input
                  type="text"
                  name="thursday"
                  value={settings.thursday}
                  onChange={handleChange}
                  placeholder="9:00 AM – 10:00 PM"
                />
              </div>
              <div className="input-group">
                <label>Friday</label>
                <input
                  type="text"
                  name="friday"
                  value={settings.friday}
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

        {/* Section 5: Live Preview */}
        <div className="dashboard-card">
          <h3>
            <Smartphone size={20} />
            Customer Preview
          </h3>
          <p>Real-time phone emulation of the customer Help Centre and FAQ view.</p>

          <div className="preview-container">
            <div className="phone-mockup">
              <div className="phone-notch"></div>
              <div className="phone-screen">
                <div className="mock-header">
                  <h4>Need Help?</h4>
                  <div className="mock-response-badge">
                    {settings.estimatedResponseTime || "Replies within 2 hours"}
                  </div>
                </div>

                {!settings.supportEnabled ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#7A6E65", fontSize: "13px" }}>
                    Support is currently unavailable.
                  </div>
                ) : (
                  <div className="mock-channels-list">
                    {settings.showPhone && settings.phoneEnabled && (
                      <div className="mock-channel-row">
                        <div className="mock-channel-info">
                          <strong>Phone Support</strong>
                          <span>{settings.phone || "Not set"}</span>
                        </div>
                        <div className="mock-channel-action">Call</div>
                      </div>
                    )}
                    {settings.showEmail && settings.emailEnabled && (
                      <div className="mock-channel-row">
                        <div className="mock-channel-info">
                          <strong>Email Support</strong>
                          <span>{settings.email || "Not set"}</span>
                        </div>
                        <div className="mock-channel-action">Email</div>
                      </div>
                    )}
                    {settings.showWhatsapp && settings.whatsappEnabled && (
                      <div className="mock-channel-row">
                        <div className="mock-channel-info">
                          <strong>WhatsApp</strong>
                          <span>{settings.whatsapp || "Not set"}</span>
                        </div>
                        <div className="mock-channel-action">Chat</div>
                      </div>
                    )}
                    {settings.showInstagram && settings.instagramEnabled && (
                      <div className="mock-channel-row">
                        <div className="mock-channel-info">
                          <strong>Instagram</strong>
                          <span>{settings.instagram || "Not set"}</span>
                        </div>
                        <div className="mock-channel-action">DM</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section Footer Actions */}
          <div className="section-footer-actions">
            {hasChanges && (
              <div className="unsaved-pill-banner" style={{ marginRight: "auto" }}>
                ● You have unsaved changes
              </div>
            )}
            <div style={{ display: "flex", gap: "12px", width: "auto" }}>
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
      </div>
    </>
  );
}

