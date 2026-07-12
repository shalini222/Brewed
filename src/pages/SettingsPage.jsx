import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase"; // adjust path as needed

export default function SettingsPage({ setPage }) {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const saveSettings = async () => {
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        settings: { notifications, darkMode }
      });
      alert("Settings saved!");
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  return (
    <div className="profile-card">
      <button onClick={() => setPage("menu")}>← Back</button>
      <h1>Settings</h1>
      
      <div className="setting-item">
        <label>Enable Notifications</label>
        <input 
          type="checkbox" 
          checked={notifications} 
          onChange={(e) => setNotifications(e.target.checked)} 
        />
      </div>

      <div className="setting-item">
        <label>Dark Mode</label>
        <input 
          type="checkbox" 
          checked={darkMode} 
          onChange={(e) => setDarkMode(e.target.checked)} 
        />
      </div>

      <button onClick={saveSettings} className="save-btn">Save Settings</button>
    </div>
  );
}

