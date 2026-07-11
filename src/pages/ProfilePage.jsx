  import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function ProfilePage({ setPage }) {
  const { currentUser } = useAuth();
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
        setMemberSince(joined.toLocaleDateString("en-US", { month: "long", year: "numeric" }));
      }
      const fetchProfile = async () => {
        const docSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPhone(data.phone || "");
          setBirthday(data.birthday || "");
          setAvatarUrl(data.photoURL || "");
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
        // Resize image to 300x300 to fit in Firestore
        const canvas = document.createElement("canvas");
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, 300, 300);
        const resizedBase64 = canvas.toDataURL("image/jpeg", 0.7);

        try {
          await setDoc(doc(db, "users", currentUser.uid), { photoURL: resizedBase64 }, { merge: true });
          setAvatarUrl(resizedBase64);
          alert("Profile photo saved!");
        } catch (err) {
          alert("Error saving: " + err.message);
        } finally {
          setIsProcessing(false);
        }
      };
    };
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await setDoc(doc(db, "users", currentUser.uid), { fullName, phone, birthday }, { merge: true });
    alert("Profile saved!");
  };

  const avatar = avatarUrl || `https://ui-avatars.com/api/?background=C4956A&color=fff&name=${encodeURIComponent(fullName || "User")}`;

  return (
    <>
      <style>{`
        .profile-page { min-height: 100vh; background: #FDFAF5; display: flex; justify-content: center; padding: 120px 20px; }
        .profile-card { width: 100%; max-width: 760px; background: white; border-radius: 24px; padding: 50px; box-shadow: 0 15px 40px rgba(0,0,0,.08); }
        .profile-avatar { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 5px solid #C4956A; cursor: pointer; }
        .profile-header { display: flex; flex-direction: column; align-items: center; margin-bottom: 45px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .full { grid-column: 1 / 3; }
        input { width: 100%; padding: 15px; border-radius: 12px; border: 1px solid #DDD; }
        .save-btn { width: 100%; padding: 15px; background: #3B1A08; color: white; border: none; border-radius: 14px; cursor: pointer; margin-top: 20px; }
        @media(max-width: 768px) { .form-grid { grid-template-columns: 1fr; } .full { grid-column: auto; } }
      `}</style>

      <div className="profile-page">
        <div className="profile-card">
          <button onClick={() => setPage("menu")}>← Back</button>
          <div className="profile-header">
            <label>
              <img src={avatar} alt="Profile" className="profile-avatar" />
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={isProcessing} />
            </label>
            <p>{isProcessing ? "Resizing and saving..." : "Click image to change"}</p>
          </div>
          <form onSubmit={handleSave}>
            <div className="form-grid">
              <div className="full"><label>Full Name</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
              <div><label>Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div><label>Birthday</label><input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} /></div>
            </div>
            <button type="submit" className="save-btn">Save Changes</button>
          </form>
        </div>
      </div>
    </>
  );
}
