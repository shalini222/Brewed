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

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.displayName || "");
      if (currentUser.metadata?.creationTime) {
        const joined = new Date(currentUser.metadata.creationTime);
        setMemberSince(
          joined.toLocaleDateString("en-US", { month: "long", year: "numeric" })
        );
      }
      const fetchProfile = async () => {
        const docSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPhone(data.phone || "");
          setBirthday(data.birthday || "");
          if (data.photoURL) setAvatarUrl(data.photoURL);
        }
      };
      fetchProfile();
    }
  }, [currentUser]);

  const validatePhone = (p) => /^\+?[0-9]{10,15}$/.test(p);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsProcessing(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 300;
        canvas.height = (300 * img.height) / img.width;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        const resizedBase64 = canvas.toDataURL("image/jpeg", 0.7);
        await setDoc(doc(db, "users", currentUser.uid), { photoURL: resizedBase64 }, { merge: true });
        setAvatarUrl(resizedBase64);
        setIsProcessing(false);
      };
    };
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (phone && !validatePhone(phone)) return alert("Invalid phone number.");
    
    setIsProcessing(true);
    try {
      await setDoc(doc(db, "users", currentUser.uid), { fullName, phone, birthday }, { merge: true });
      alert("Profile saved!");
      setIsEditing(false);
    } catch (e) { alert("Error saving."); }
    setIsProcessing(false);
  };

  const avatar = avatarUrl || `https://ui-avatars.com/api/?background=C4956A&color=fff&name=${encodeURIComponent(fullName || "User")}`;

  return (
    <>
      <style>{`
        /* ... [Your existing CSS remains here] ... */
        .edit-icon { position: absolute; bottom: 5px; right: 5px; background: #C4956A; color: white; padding: 5px; border-radius: 50%; font-size: 14px; }
      `}</style>

      <div className="profile-page">
        <div className="profile-card">
          <button className="back-button" onClick={() => setPage("menu")}>← Back</button>
          
          <div className="profile-header">
            <label style={{ position: 'relative', cursor: isEditing ? 'pointer' : 'default' }}>
              <img src={avatar} alt="Profile" className="profile-avatar" />
              {isEditing && <div className="edit-icon">✎</div>}
              {isEditing && <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />}
            </label>
            <div className="profile-title">My Profile</div>
          </div>

          <form onSubmit={handleSave}>
            <div className="form-grid">
              <div className="form-group full">
                <label>Full Name</label>
                <input type="text" value={fullName} disabled={!isEditing} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={currentUser?.email || ""} disabled />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" value={phone} disabled={!isEditing} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="form-group full">
                <label>Birthday</label>
                <input type="date" value={birthday} disabled={!isEditing} onChange={(e) => setBirthday(e.target.value)} required />
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
                  <button type="submit" className="save-btn" disabled={isProcessing}>Save Changes</button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
