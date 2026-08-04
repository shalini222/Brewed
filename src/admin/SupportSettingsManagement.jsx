Perfect. Let's build it like the rest of the Brewed admin modules.

Step 1 — Create the component skeleton

SupportSettingsManagement.jsx

import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  doc,
  onSnapshot,
  updateDoc
} from "firebase/firestore";

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


---

Step 2 — Generic change handler

const handleChange = (e) => {
  const { name, value } = e.target;

  setSettings(prev => ({
    ...prev,
    [name]: value
  }));
};


---

Step 3 — Save function

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


---

Step 4 — Start the JSX

return (
  <div className="support-settings-page">

    <div className="page-header">
      <div>
        <h2>⚙️ Support Settings</h2>
        <p>
          Manage contact information and business hours shown in the customer Help Centre.
        </p>
      </div>

      <button
        className="save-btn"
        onClick={saveSettings}
        disabled={saving}
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>

This gives us the live Firestore connection, edit state, save functionality, and the page header. Next we'll build the Contact Information card (Phone, Email, WhatsApp, Instagram) with the same polished card style as your FAQ and Policy Management pages.
