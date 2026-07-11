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
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.displayName || "");
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
    setIsProcessing(true);
    try {
      await setDoc(doc(db, "users", currentUser.uid), { fullName, phone, birthday }, { merge: true });
      alert("Profile saved!");
      setIsEditing(false);
    } catch (err) { alert("Error saving profile."); }
    setIsProcessing(false);
  };

  const avatar = avatarUrl || `https://ui-avatars.com/api/?background=C4956A&color=fff&name=${encodeURIComponent(fullName || "User")}`;

  return (
    <>
      <style>{`
        .profile-page { min-height: 100vh; background: #FDFAF5; display: flex; justify-content: center; padding: 60px 20px; font-family: 'Inter', sans-serif; }
        .profile-card { width: 100%; max-width: 500px; background: white; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); padding: 40px; }
        .back-button { background: none; border: none; font-weight: 600; cursor: pointer; color: #3B1A08; margin-bottom: 20px; padding: 0; }
        .profile-header { text-align: center; margin-bottom: 30px; }
        .avatar-container { position: relative; display: inline-block; cursor: ${isEditing ? 'pointer' : 'default'}; }
        .profile-avatar { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #C4956A; }
        .edit-icon { position: absolute; bottom: 0; right: 0; background: #3B1A08; color: white; padding: 6px; border-radius: 50%; font-size: 12px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; font-weight: 600; color: #5A453A; margin-bottom: 8px; font-size: 0.9rem; }
        input { width: 100%; padding: 12px; border: 1px solid #E0E0E0; border-radius: 10px; font-size: 1rem; }
        input:disabled { background: #F8F8F8; color: #7A675C; }
        .actions { display: flex; gap: 12px; margin-top: 30px; }
        button { flex: 1; padding: 14px; border-radius: 10px; border: none; font-weight: 600; cursor: pointer; }
        .save-btn { background: #3B1A08; color: white; }
        .password-btn { background: #F8F4EE; color: #3B1A08; }
      `}</style>

      <div className="profile-page">
        <div className="profile-card">
          <button className="back-button" onClick={() => setPage("menu")}>← Back</button>
          <div className="profile-header">
            <label className="avatar-container">
              <img src={avatar} alt="Profile" className="profile-avatar" />
              {isEditing && <div className="edit-icon">✎</div>}
              {isEditing && <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />}
            </label>
            <h2 style={{ color: "#3B1A08", marginTop: "15px" }}>My Profile</h2>
          </div>

          <form onSubmit={handleSave}>
            <div className="form-group">
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
            <div className="form-group">
              <label>Birthday</label>
              <input type="date" value={birthday} disabled={!isEditing} onChange={(e) => setBirthday(e.target.value)} required />
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
        </div>
      </div>
    </>
  );
}
