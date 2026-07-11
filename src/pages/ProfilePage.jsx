 import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { doc, setDoc, getDoc, updateDoc, deleteField } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "../firebase";

export default function ProfilePage({ setPage }) {
  const { currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [address, setAddress] = useState("");
  const [addressType, setAddressType] = useState("Home");
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
          setAddress(data.address || "");
          setAddressType(data.addressType || "Home");
          if (data.photoURL) setAvatarUrl(data.photoURL);
        }
      };
      fetchProfile();
    }
  }, [currentUser]);

  const handlePasswordReset = async () => {
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      alert("Password reset email sent!");
    } catch (e) { alert("Error: " + e.message); }
  };

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
        canvas.width = 300; canvas.height = (300 * img.height) / img.width;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        const resizedBase64 = canvas.toDataURL("image/jpeg", 0.7);
        await setDoc(doc(db, "users", currentUser.uid), { photoURL: resizedBase64 }, { merge: true });
        setAvatarUrl(resizedBase64);
        setIsProcessing(false);
      };
    };
  };

  const handleRemovePhoto = async () => {
    setIsProcessing(true);
    await updateDoc(doc(db, "users", currentUser.uid), { photoURL: deleteField() });
    setAvatarUrl("");
    setIsProcessing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    await setDoc(doc(db, "users", currentUser.uid), { fullName, phone, birthday, address, addressType }, { merge: true });
    setIsEditing(false);
    setIsProcessing(false);
  };

  const avatar = avatarUrl || `https://ui-avatars.com/api/?background=C4956A&color=fff&name=${encodeURIComponent(currentUser?.email?.charAt(0) || "U")}`;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #FDFAF5; font-family: 'Inter', sans-serif; }
        .profile-page { min-height: 100vh; background: #FDFAF5; display: flex; justify-content: center; padding: 120px 20px 60px; }
        .profile-card { width: 100%; max-width: 760px; background: white; border-radius: 24px; box-shadow: 0 15px 40px rgba(0,0,0,.08); padding: 50px; }
        .profile-header { display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 45px; }
        .profile-avatar { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 5px solid #C4956A; }
        .profile-title { font-family: 'Playfair Display', serif; font-size: 2.3rem; color: #3B1A08; margin-top: 22px; }
        .section-title { font-family: 'Playfair Display', serif; font-size: 1.4rem; color: #3B1A08; margin: 40px 0 18px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .form-group { display: flex; flex-direction: column; }
        .form-group.full { grid-column: 1 / 3; }
        label { margin-bottom: 8px; font-weight: 600; color: #5A453A; }
        input { width: 100%; padding: 15px; border-radius: 12px; border: 1px solid #DDD; font-size: 15px; }
        input:disabled { background: #F8F8F8; color: #7A675C; cursor: not-allowed; }
        .member-box { margin-top: 25px; padding: 18px; background: #F8F4EE; border-radius: 14px; }
        .member-value { font-size: 1.1rem; font-weight: 600; color: #3B1A08; }
        .actions { margin-top: 45px; display: flex; gap: 15px; }
        .save-btn { flex: 1; padding: 15px; border: none; border-radius: 14px; cursor: pointer; font-weight: 600; background: #3B1A08; color: white; }
        .password-btn { flex: 1; padding: 15px; border: none; border-radius: 14px; cursor: pointer; font-weight: 600; background: #F8F4EE; color: #3B1A08; }
        .back-button { background: none; border: none; color: #3B1A08; font-size: 16px; font-weight: 600; cursor: pointer; margin-bottom: 20px; padding: 0; }
        .addr-opts { display: flex; gap: 20px; margin-top: 10px; }
        .circle { width: 20px; height: 20px; border: 2px solid #3B1A08; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .dot { width: 8px; height: 8px; background: #C4956A; border-radius: 50%; }
        @media(max-width: 768px) { .profile-card { padding: 30px 22px; } .form-grid { grid-template-columns: 1fr; } .form-group.full { grid-column: auto; } }
      `}</style>

      <div className="profile-page">
        <div className="profile-card">
          <button className="back-button" onClick={() => setPage("menu")}>← Back</button>
          
          <div className="profile-header">
            {isProcessing ? <div>Uploading...</div> : <img src={avatar} className="profile-avatar" />}
            {isEditing && <><input type="file" onChange={handleImageUpload} /><div onClick={handleRemovePhoto} style={{cursor:'pointer', color:'#C4956A'}}>Remove</div></>}
            <div className="profile-title">My Profile</div>
          </div>

          <form onSubmit={handleSave}>
            <div className="section-title">Personal Information</div>
            <div className="form-grid">
              <div className="form-group full"><label>Full Name</label><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={!isEditing} /></div>
              <div className="form-group"><label>Email</label><input type="email" value={currentUser?.email || ""} disabled /></div>
              <div className="form-group"><label>Phone Number</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!isEditing} /></div>
              <div className="form-group full"><label>Address</label><input placeholder="Street address..." value={address} onChange={(e) => setAddress(e.target.value)} disabled={!isEditing} />
                <div className="addr-opts">
                  {['Home', 'Work', 'Other'].map(type => (
                    <div key={type} onClick={() => isEditing && setAddressType(type)} style={{display:'flex', alignItems:'center', gap:'5px', cursor:'pointer'}}>
                      <div className="circle">{addressType === type && <div className="dot" />}</div>
                      <span>{type}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="form-group full"><label>Birthday</label><input type="date" value={birthday} disabled /></div>
            </div>

            <div className="section-title">Membership</div>
            <div className="member-box"><div className="member-value">☕ Member since {memberSince || "today"}</div></div>

            <div className="actions">
              {!isEditing ? 
                <><button type="button" className="password-btn" onClick={handlePasswordReset}>Change Password</button><button type="button" className="save-btn" onClick={() => setIsEditing(true)}>Edit</button></> :
                <><button type="button" className="password-btn" onClick={() => setIsEditing(false)}>Cancel</button><button type="submit" className="save-btn">Save</button></>
              }
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
