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

      <div className="settings-content">
        {/* Contact Information Card */}
        <div className="settings-card">
          <div className="card-header">
            <h3>📞 Contact Information</h3>
            <p>Configure the primary support channels available to customers.</p>
          </div>

          <div className="card-body">
            {/* Phone Support */}
            <div className="form-row">
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  value={settings.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className="form-group">
                <label>Phone Description / Availability</label>
                <input
                  type="text"
                  name="callDescription"
                  value={settings.callDescription}
                  onChange={handleChange}
                  placeholder="e.g., Mon-Fri from 8am to 5pm"
                />
              </div>
            </div>

            {/* Email Support */}
            <div className="form-row">
              <div className="form-group">
                <label>Support Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={settings.email}
                  onChange={handleChange}
                  placeholder="support@brewed.com"
                />
              </div>
              <div className="form-group">
                <label>Email Description</label>
                <input
                  type="text"
                  name="emailDescription"
                  value={settings.emailDescription}
                  onChange={handleChange}
                  placeholder="e.g., We reply within 24 hours"
                />
              </div>
            </div>

            {/* WhatsApp Support */}
            <div className="form-row">
              <div className="form-group">
                <label>WhatsApp Number / Link</label>
                <input
                  type="text"
                  name="whatsapp"
                  value={settings.whatsapp}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className="form-group">
                <label>WhatsApp Description</label>
                <input
                  type="text"
                  name="whatsappDescription"
                  value={settings.whatsappDescription}
                  onChange={handleChange}
                  placeholder="e.g., Chat with our support bot"
                />
              </div>
            </div>

            {/* Instagram Support */}
            <div className="form-row">
              <div className="form-group">
                <label>Instagram Handle</label>
                <input
                  type="text"
                  name="instagram"
                  value={settings.instagram}
                  onChange={handleChange}
                  placeholder="@brewed_support"
                />
              </div>
              <div className="form-group">
                <label>Instagram Description</label>
                <input
                  type="text"
                  name="instagramDescription"
                  value={settings.instagramDescription}
                  onChange={handleChange}
                  placeholder="e.g., DM us for quick queries"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Business Hours Card */}
        <div className="settings-card">
          <div className="card-header">
            <h3>⏰ Business Hours</h3>
            <p>Set your active support timings displayed across customer touchpoints.</p>
          </div>

          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label>Section Title</label>
                <input
                  type="text"
                  name="businessHoursTitle"
                  value={settings.businessHoursTitle}
                  onChange={handleChange}
                  placeholder="e.g., Working Hours"
                />
              </div>
              <div className="form-group">
                <label>Section Subtitle / Description</label>
                <input
                  type="text"
                  name="businessHoursDescription"
                  value={settings.businessHoursDescription}
                  onChange={handleChange}
                  placeholder="e.g., When our team is online"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Monday - Friday</label>
                <input
                  type="text"
                  name="mondayFriday"
                  value={settings.mondayFriday}
                  onChange={handleChange}
                  placeholder="e.g., 9:00 AM - 6:00 PM"
                />
              </div>
              <div className="form-group">
                <label>Saturday</label>
                <input
                  type="text"
                  name="saturday"
                  value={settings.saturday}
                  onChange={handleChange}
                  placeholder="e.g., 10:00 AM - 4:00 PM"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
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
      </div>
    </div>
  );
}

