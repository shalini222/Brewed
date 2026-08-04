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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "supportSettings", "general"),
      (snapshot) => {
        if (snapshot.exists()) {
          setSettings(snapshot.data());
        }
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
      await updateDoc(
        doc(db, "supportSettings", "general"),
        settings
      );
      alert("Support settings updated successfully.");
    } catch (err) {
      console.log(err);
      alert("Failed to update settings.");
    } finally {
      setSaving(false);
    }
  };

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

        .save-btn{
            background:#C4956A;
            color:white;
            border:none;
            padding:12px 20px;
            border-radius:12px;
            cursor:pointer;
            font-weight:600;
        }

        .save-btn:hover{
            background:#B8865F;
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
          <button className="save-btn" onClick={saveSettings} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
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

        {/* Business Hours Card */}
        <div className="settings-card">
          <h3>⏰ Business Hours</h3>
          <p>Set your active support timings displayed across customer touchpoints.</p>

          <div className="settings-grid">
            <div className="input-group">
              <label>Section Title</label>
              <input
                type="text"
                name="businessHoursTitle"
                value={settings.businessHoursTitle}
                onChange={handleChange}
                placeholder="e.g., Working Hours"
              />
            </div>
            <div className="input-group">
              <label>Section Subtitle / Description</label>
              <input
                type="text"
                name="businessHoursDescription"
                value={settings.businessHoursDescription}
                onChange={handleChange}
                placeholder="e.g., When our team is online"
              />
            </div>
            <div className="input-group">
              <label>Monday - Friday</label>
              <input
                type="text"
                name="mondayFriday"
                value={settings.mondayFriday}
                onChange={handleChange}
                placeholder="e.g., 9:00 AM - 6:00 PM"
              />
            </div>
            <div className="input-group">
              <label>Saturday</label>
              <input
                type="text"
                name="saturday"
                value={settings.saturday}
                onChange={handleChange}
                placeholder="e.g., 10:00 AM - 4:00 PM"
              />
            </div>
            <div className="input-group">
              <label>Sunday</label>
              <input
                type="text"
                name="sunday"
                value={settings.sunday}
                onChange={handleChange}
                placeholder="e.g., Closed"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
