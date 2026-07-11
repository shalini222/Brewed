import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function ProfilePage({ setPage }) {
  const { currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [memberSince, setMemberSince] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // ... [Keep your useEffect fetchProfile here] ...

  const handleSave = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await setDoc(doc(db, "users", currentUser.uid), { fullName, phone, birthday }, { merge: true });
      alert("Profile updated!");
      setIsEditing(false);
    } catch (error) {
      alert("Failed to save.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <style>{`
        /* ... [Keep your existing styles] ... */
        .edit-overlay { position: absolute; bottom: 0; right: 0; background: #C4956A; padding: 8px; border-radius: 50%; color: white; font-size: 12px; }
        .footer-links { margin-top: 40px; text-align: center; color: #7A675C; font-size: 0.85rem; }
        .footer-links a { color: #3B1A08; text-decoration: none; margin: 0 10px; }
      `}</style>

      <div className="profile-page">
        <div className="profile-card">
          <button className="back-button" onClick={() => setPage("menu")}>← Back</button>
          
          <div className="profile-header">
            <label style={{ position: 'relative', cursor: isEditing ? 'pointer' : 'default' }}>
              <img src={avatarUrl || `https://ui-avatars.com/api/?name=${fullName}`} alt="Profile" className="profile-avatar" />
              {isEditing && <div className="edit-overlay">✎</div>}
              {isEditing && <input type="file" onChange={handleImageUpload} style={{ display: 'none' }} />}
            </label>
            <div className="profile-title">{fullName || "User"}</div>
          </div>

          <form onSubmit={handleSave}>
            <div className="form-grid">
              <div className="form-group full">
                <label>Full Name</label>
                <input type="text" value={fullName} disabled={!isEditing} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Email (Locked)</label>
                <input type="email" value={currentUser?.email || ""} disabled />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" value={phone} disabled={!isEditing} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            <div className="actions">
              {!isEditing ? (
                <>
                  <button type="button" className="password-btn">Change Password</button>
                  <button type="button" className="save-btn" onClick={() => setIsEditing(true)}>Edit Profile</button>
                </>
              ) : (
                <>
                  <button type="button" className="password-btn" onClick={() => setIsEditing(false)}>Cancel</button>
                  <button type="submit" className="save-btn" disabled={isProcessing}>
                    {isProcessing ? "Saving..." : "Save Changes"}
                  </button>
                </>
              )}
            </div>
          </form>

          <div className="footer-links">
            <a href="/terms">Terms of Service</a> | <a href="/privacy">Privacy Policy</a>
          </div>
        </div>
      </div>
    </>
  );
}
