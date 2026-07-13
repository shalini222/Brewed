import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";


import {
  doc,
  deleteDoc
} from "firebase/firestore";


import {
EmailAuthProvider,
GoogleAuthProvider,
reauthenticateWithCredential,
reauthenticateWithPopup,
deleteUser,
} from "firebase/auth";



import {  db } from "../firebase";

import {
ArrowLeft,
Lock,
Eye,
EyeOff,
} from "lucide-react";

export default function DeleteAccountPage({ setPage }) {
const { currentUser } = useAuth();

const isGoogleUser = currentUser?.providerData?.some(
(provider) => provider.providerId === "google.com"
);

const [password, setPassword] = useState("");
const [confirmText, setConfirmText] = useState("");
  

const [showPassword, setShowPassword] = useState(false);

const [loading, setLoading] = useState(false);

const [toast, setToast] = useState({
show: false,
message: "",
});

const showToast = (message) => {
setToast({
show: true,
message,
});

setTimeout(() => {  
  setToast({  
    show: false,  
    message: "",  
  });  
}, 2500);

};

const canDelete =
confirmText === "DELETE" &&
(isGoogleUser || password.length > 0);

const handleDeleteAccount = async () => {
if (!canDelete) return;

try {
setLoading(true);

// Re-authenticate  
if (isGoogleUser) {  
  const provider = new GoogleAuthProvider();  
  await reauthenticateWithPopup(currentUser, provider);  
} else {  
  const credential = EmailAuthProvider.credential(  
    currentUser.email,  
    password  
  );  

  await reauthenticateWithCredential(  
    currentUser,  
    credential  
  );  
}  

// Delete Firestore user document  
await deleteDoc(doc(db, "users", currentUser.uid));  

// Delete Firebase Authentication account  
await deleteUser(currentUser);  

showToast("Your account has been permanently deleted.");  

setTimeout(() => {  
  window.location.reload();
}, 1800);

} catch (error) {
console.error(error);

if (error.code === "auth/wrong-password") {  
  showToast("Incorrect password.");  
} else if (error.code === "auth/requires-recent-login") {  
  showToast("Please sign in again and retry.");  
} else if (error.code === "auth/popup-closed-by-user") {  
  showToast("Google verification was cancelled.");  
} else {  
  showToast("Couldn't delete your account.");  
}

} finally {
setLoading(false);
}
};

return (
<>
<style>{`
.delete-account-page{
background:#FDFAF5;
min-height:100vh;
padding:32px 18px 120px;
font-family:'Inter',sans-serif;
}

.delete-account-container{
max-width:720px;
margin:auto;
animation:fadeUp .45s ease;
}

.back-btn{
display:flex;
align-items:center;
gap:8px;
border:none;
background:none;
color:#3B1A08;
font-weight:600;
cursor:pointer;
margin-bottom:22px;
}

.title{
font-family:'Playfair Display',serif;
font-size:2.35rem;
color:#1A0A00;
margin-bottom:10px;
}

.subtitle{
color:#7A6658;
line-height:1.6;
margin-bottom:30px;
}

.danger-card{
background:#FFF4F2;
border:1px solid rgba(180,35,24,.18);
border-radius:22px;
padding:24px;
margin-bottom:28px;
}

.danger-title{
display:flex;
align-items:center;
gap:10px;
color:#B42318;
font-weight:700;
font-size:1.05rem;
margin-bottom:14px;
}

.danger-text{
color:#7A6658;
line-height:1.7;
}

.danger-list{
margin-top:16px;
padding-left:20px;
color:#7A6658;
line-height:1.8;
}

.card{
background:#fff;
border:1px solid rgba(196,149,106,.15);
border-radius:22px;
padding:24px;
transition:.25s;
}

.card:hover{
transform:translateY(-2px);
box-shadow:0 12px 30px rgba(26,10,0,.06);
}

.input-group{
margin-top:18px;
}

.input-group label{
display:block;
margin-bottom:8px;
color:#1A0A00;
font-weight:600;
}

.password-field{
display:flex;
align-items:center;
border:1px solid rgba(196,149,106,.25);
border-radius:14px;
overflow:hidden;
background:#fff;
transition:.25s;
}

.password-field:focus-within{
border-color:#C4956A;
box-shadow:0 0 0 4px rgba(196,149,106,.15);
}

.field-icon{
margin-left:16px;
color:#C4956A;
}

.password-field input{
flex:1;
border:none;
background:transparent;
padding:15px;
outline:none;
color:#1A0A00;
font-size:.95rem;
}

.password-field input::placeholder{
color:#A39081;
}

.eye-btn{
border:none;
background:none;
cursor:pointer;
color:#7A6658;
padding:0 16px;
}

.eye-btn:hover{
color:#1A0A00;
}

.confirm-box{
margin-top:24px;
}

.confirm-box label{
display:flex;
align-items:flex-start;
gap:12px;
cursor:pointer;
color:#7A6658;
line-height:1.6;
}

.confirm-box input{
accent-color:#B42318;
margin-top:3px;
}

.button-row{
display:flex;
gap:14px;
margin-top:30px;
}

.cancel-btn,
.delete-btn{
flex:1;
padding:15px;
border-radius:14px;
font-size:.95rem;
font-weight:600;
cursor:pointer;
transition:.25s;
}

.cancel-btn{
background:#fff;
border:1px solid rgba(196,149,106,.25);
color:#7A6658;
}

.cancel-btn:hover{
background:#FCF8F2;
}

.delete-btn{
background:#B42318;
color:#fff;
border:none;
}

.google-warning{
  margin-top:18px;
  padding:16px;
  background:#F6ECE1;
  color:#7A6658;
  border:1px solid rgba(196,149,106,.25);
  border-radius:14px;
  line-height:1.6;
}

.delete-input{
  width:100%;
  padding:15px;
  border:1px solid rgba(196,149,106,.25);
  border-radius:14px;
  font-size:.95rem;
  outline:none;
  transition:.25s;
}

.delete-input:focus{
  border-color:#B42318;
  box-shadow:0 0 0 4px rgba(180,35,24,.12);
}
.delete-btn:hover{
background:#921F16;
}

.delete-btn:disabled{
background:#D8D2CC;
color:#8E8278;
cursor:not-allowed;
}

.toast{
position:fixed;
left:50%;
bottom:28px;
transform:translateX(-50%);
background:#1A0A00;
color:#fff;
padding:14px 22px;
border-radius:14px;
font-size:.92rem;
box-shadow:0 12px 28px rgba(0,0,0,.18);
animation:toastIn .25s ease;
z-index:9999;
}

@keyframes toastIn{
from{
opacity:0;
transform:translate(-50%,20px);
}
to{
opacity:1;
transform:translate(-50%,0);
}
}

@keyframes fadeUp{
from{
opacity:0;
transform:translateY(18px);
}
to{
opacity:1;
transform:translateY(0);
}
}

@media(max-width:600px){

.delete-account-page{
padding:24px 14px 100px;
}

.card,
.danger-card{
padding:18px;
border-radius:18px;
}

.title{
font-size:2rem;
}

.button-row{
flex-direction:column;
}

.cancel-btn,
.delete-btn{
width:100%;
}

.password-field input{
font-size:.92rem;
}

}
`}</style>

<div className="delete-account-page">
  <div className="delete-account-container">
  <button className="back-btn" onClick={() => setPage("settings")}>

  <ArrowLeft size={18} />  
  Back  
</button>  <h1 className="title">Delete Account</h1>  <p className="subtitle">  
  Deleting your Brewed account is permanent. This action cannot be undone.  
</p>  <div className="card danger-card">  
  <h3 className="danger-title">⚠ Delete Account</h3>    <p className="danger-text">  
    Deleting your account will permanently remove:  
  </p>    <ul className="danger-list">  
    <li>Your profile</li>  
    <li>Your favourites</li>  
    <li>Your rewards</li>  
    <li>Your saved addresses</li>  
    <li>Your account settings</li>  
  </ul>  {isGoogleUser ? (
<div className="google-warning">
You're signed in with Google.
You'll be asked to verify with Google before deleting your account.
</div>
) : (
<div className="input-group">
<label>Password</label>

<div className="password-field">  
    <Lock size={18} className="field-icon" />  

    <input  
      type={showPassword ? "text" : "password"}  
      value={password}  
      onChange={(e) => setPassword(e.target.value)}  
      placeholder="Enter your password"  
    />  

    <button  
      type="button"  
      className="eye-btn"  
      onClick={() => setShowPassword(!showPassword)}  
    >  
      {showPassword ? (  
        <EyeOff size={18} />  
      ) : (  
        <Eye size={18} />  
      )}  
    </button>  
  </div>  
</div>

)}

  <div className="input-group">  
    <label>  
      Type <strong>DELETE</strong> to confirm  
    </label> 
    
    <input
  className="delete-input"
  value={confirmText}
  onChange={(e) => setConfirmText(e.target.value)}
  placeholder="DELETE"
/>


  </div>    <div className="button-row">  
    <button  
      className="cancel-btn"  
      onClick={() => setPage("settings")}  
    >  
      Cancel  
    </button>  <button  
  className="delete-btn"  
  disabled={!canDelete || loading}  
  onClick={handleDeleteAccount}  
>  
  {loading ? "Deleting..." : "Delete Account"}  
</button>

  </div>  
</div>  
</div>  
</div>

  {toast.show && <div className="toast">{toast.message}</div>}  
</>

);
}
