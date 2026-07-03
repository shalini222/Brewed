import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function ProfilePage({setPage}) {
  const { currentUser } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [memberSince, setMemberSince] = useState("");

  useEffect(() => {
    if (currentUser) {
      setFullName(
        currentUser.displayName ||
          currentUser.email.split("@")[0]
      );

      if (currentUser.metadata?.creationTime) {
        const joined = new Date(
          currentUser.metadata.creationTime
        );

        setMemberSince(
          joined.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })
        );
      }
    }
  }, [currentUser]);

  function handleSave(e) {
    e.preventDefault();

    if (!birthday) {
      alert("Birthday is required.");
      return;
    }

    alert("Profile saved! (Firestore integration coming next)");
  }

  const avatar =
    currentUser?.photoURL ||
    `https://ui-avatars.com/api/?background=C4956A&color=fff&name=${encodeURIComponent(
      fullName
    )}`;

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');

*{
  box-sizing:border-box;
}

body{
  margin:0;
  background:#FDFAF5;
  font-family:'Inter',sans-serif;
}

.profile-page{
  min-height:100vh;
  background:#FDFAF5;
  display:flex;
  justify-content:center;
  padding:120px 20px 60px;
}

.profile-card{
  width:100%;
  max-width:760px;
  background:white;
  border-radius:24px;
  box-shadow:0 15px 40px rgba(0,0,0,.08);
  padding:50px;
}

.profile-header{
  display:flex;
  flex-direction:column;
  align-items:center;
  text-align:center;
  margin-bottom:45px;
}

.profile-avatar{
  width:120px;
  height:120px;
  border-radius:50%;
  object-fit:cover;
  border:5px solid #C4956A;
}

.profile-title{
  font-family:'Playfair Display',serif;
  font-size:2.3rem;
  color:#3B1A08;
  margin-top:22px;
}

.profile-subtitle{
  color:#7A675C;
  margin-top:8px;
}

.section-title{
  font-family:'Playfair Display',serif;
  font-size:1.4rem;
  color:#3B1A08;
  margin:40px 0 18px;
}

.form-grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:20px;
}

.form-group{
  display:flex;
  flex-direction:column;
}

.form-group.full{
  grid-column:1/3;
}

label{
  margin-bottom:8px;
  font-weight:600;
  color:#5A453A;
}

input{
  width:100%;
  padding:15px;
  border-radius:12px;
  border:1px solid #DDD;
  font-size:15px;
  transition:.3s;
}

input:focus{
  outline:none;
  border-color:#C4956A;
  box-shadow:0 0 0 3px rgba(196,149,106,.15);
}

input[readonly]{
  background:#F8F4EE;
}

.member-box{
  margin-top:25px;
  padding:18px;
  background:#F8F4EE;
  border-radius:14px;
}

.member-title{
  color:#7A675C;
  font-size:.9rem;
}

.member-value{
  margin-top:5px;
  font-size:1.1rem;
  font-weight:600;
  color:#3B1A08;
}

.actions{
  margin-top:45px;
  display:flex;
  gap:15px;
}

.save-btn,
.password-btn{
  flex:1;
  padding:15px;
  border:none;
  border-radius:14px;
  cursor:pointer;
  font-weight:600;
  transition:.3s;
}

.save-btn{
  background:#3B1A08;
  color:white;
}

.save-btn:hover{
  background:#C4956A;
  color:#3B1A08;
}

.password-btn{
  background:#F8F4EE;
  color:#3B1A08;
}

.password-btn:hover{
  background:#EFE4D6;
}

@media(max-width:768px){

.profile-card{
padding:30px 22px;
}

.form-grid{
grid-template-columns:1fr;
}

.form-group.full{
grid-column:auto;
}

.actions{
flex-direction:column;
}

.profile-title{
font-size:2rem;
}

.profile-avatar{
width:100px;
height:100px;
}

}
.profile-container{
  width:100%;
  max-width:760px;
}

.back-button{
  background:none;
  border:none;
  color:#3B1A08;
  font-size:16px;
  font-weight:600;
  cursor:pointer;
  margin-bottom:20px;
  padding:0;
  transition:.3s;
}

.back-button:hover{
  color:#C4956A;
  transform:translateX(-4px);
}
`}</style>

<div className="profile-page">
  <div className="profile-card">

    <button
      className="back-button"
      onClick={() => setPage("menu")}
    >
      ← Back
    </button>

    <div className="profile-header">

      <img
        src={avatar}
        alt="Profile"
        className="profile-avatar"
      />

      <div className="profile-title">
        My Profile
      </div>

      <div className="profile-subtitle">
        Manage your Brewed account.
      </div>

    </div>

    <form onSubmit={handleSave}>

      <div className="section-title">
        Personal Information
      </div>

      <div className="form-grid">

        <div className="form-group full">
          <label>Full Name</label>

          <input
            type="text"
            value={fullName}
            onChange={(e)=>setFullName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Email</label>

          <input
            type="email"
            value={currentUser?.email || ""}
            readOnly
          />
        </div>

        <div className="form-group">
          <label>Phone Number</label>

          <input
            type="tel"
            placeholder="+44..."
            value={phone}
            onChange={(e)=>setPhone(e.target.value)}
          />
        </div>

        <div className="form-group full">
          <label>Birthday <span style={{color:"#C4956A"}}>*</span></label>

          <input
            type="date"
            value={birthday}
            onChange={(e)=>setBirthday(e.target.value)}
            required
          />
        </div>

      </div>

      <div className="section-title">
        Membership
      </div>

      <div className="member-box">

        <div className="member-title">
          Brewed Member Since
        </div>

        <div className="member-value">
          ☕ {memberSince || "Today"}
        </div>

      </div>

      <div className="actions">

        <button
          type="button"
          className="password-btn"
        >
          Change Password
        </button>

        <button
          type="submit"
          className="save-btn"
        >
          Save Changes
        </button>

      </div>

    </form>

  </div>
</div>

</>
);
}
