import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";

import {
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

export default function ChangePasswordPage({ setPage }) {
  const { currentUser } = useAuth();
  
  
  const isGoogleUser = currentUser?.providerData?.some(
  (provider) => provider.providerId === "google.com"
);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const hasLength = newPassword.length >= 8;

  const passwordsMatch =
    newPassword &&
    confirmPassword &&
    newPassword === confirmPassword;

  const passwordStrength =
    [
      hasLength,
      hasUppercase,
      hasNumber,
      hasSpecial,
    ].filter(Boolean).length;

  const canUpdate =
    currentPassword &&
    passwordsMatch &&
    hasLength &&
    hasUppercase &&
    hasNumber &&
    hasSpecial &&
    !loading;
  
  
  
  
  const handleUpdatePassword = async () => {
    try {
      setLoading(true);

      const credential =
        EmailAuthProvider.credential(
          currentUser.email,
          currentPassword
        );

      await reauthenticateWithCredential(
        currentUser,
        credential
      );

      await updatePassword(
        currentUser,
        newPassword
      );
       setCurrentPassword("");
setNewPassword("");
setConfirmPassword("");

      
      showToast("Password updated successfully.");

      setTimeout(() => {
        setPage("settings");
      }, 1800);

    } catch (error) {
  if (error.code === "auth/wrong-password") {
    showToast("Current password is incorrect.");
  } else if (error.code === "auth/weak-password") {
    showToast("Password is too weak.");
  } else if (error.code === "auth/too-many-requests") {
    showToast("Too many attempts. Please try again later.");
  } else if (error.code === "auth/requires-recent-login") {
    showToast("Please sign in again before changing your password.");
  } else {
    showToast("Couldn't update password.");
  }
} finally {
  setLoading(false);
    }
  };

  const handleCancel = () => {
    setPage("settings");
  };

  return (
    <>
      <style>{`.change-password-page{
  background:#FDFAF5;
  min-height:100vh;
  padding:32px 18px 120px;
  font-family:'Inter',sans-serif;
}

.change-password-container{
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
  font-size:2.3rem;
  color:#1A0A00;
  margin-bottom:8px;
}

.subtitle{
  color:#7A6658;
  line-height:1.6;
  margin-bottom:30px;
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
  box-shadow:0 12px 32px rgba(26,10,0,.06);
}

.input-group{
  margin-bottom:22px;
}

.input-group label{
  display:block;
  margin-bottom:8px;
  font-weight:600;
  color:#1A0A00;
}

.password-field{
  display:flex;
  align-items:center;
  border:1px solid rgba(196,149,106,.25);
  border-radius:14px;
  background:#fff;
  overflow:hidden;
  transition:.25s;
}

.password-field:focus-within{
  border-color:#C4956A;
  box-shadow:0 0 0 4px rgba(196,149,106,.15);
}

.field-icon{
  margin-left:16px;
  color:#C4956A;
  flex-shrink:0;
}

.password-field input{
  flex:1;
  border:none;
  background:transparent;
  padding:15px 14px;
  font-size:.96rem;
  color:#1A0A00;
  outline:none;
}

.password-field input::placeholder{
  color:#A39081;
}

.eye-btn{
  border:none;
  background:none;
  padding:0 16px;
  cursor:pointer;
  color:#7A6658;
  display:flex;
  align-items:center;
  justify-content:center;
}

.eye-btn:hover{
  color:#1A0A00;
}

.strength-wrapper{
  margin-bottom:24px;
}

.strength-header{
  display:flex;
  justify-content:space-between;
  margin-bottom:10px;
  font-size:.9rem;
  color:#7A6658;
}

.strength-bar{
  height:8px;
  border-radius:999px;
  background:#EFE7DD;
  overflow:hidden;
}

.strength-fill{
  height:100%;
  background:#C4956A;
  transition:width .3s ease;
}

.requirements{
  display:grid;
  gap:10px;
  margin-bottom:24px;
  color:#A39081;
  font-size:.88rem;
}

.requirements .valid{
  color:#4E7A55;
  font-weight:600;
}

.match{
  margin-top:-6px;
  margin-bottom:8px;
  font-size:.9rem;
  font-weight:600;
}

.match.success{
  color:#4E7A55;
}

.match.error{
  color:#B42318;
}

.button-row{
  display:flex;
  gap:14px;
  margin-top:24px;
}

.cancel-btn,
.update-btn{
  flex:1;
  padding:15px;
  border-radius:14px;
  font-family:'Inter',sans-serif;
  font-weight:600;
  font-size:.95rem;
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
  border-color:#C4956A;
  color:#1A0A00;
}

.update-btn{
  background:#1A0A00;
  color:#FDFAF5;
  border:none;
}

.update-btn:hover{
  background:#3B1A08;
}

.update-btn:disabled{
  background:#D8D2CC;
  color:#8E8278;
  cursor:not-allowed;
}

.update-btn:disabled:hover{
  background:#D8D2CC;
}

.toast{
  position:fixed;
  left:50%;
  bottom:28px;
  transform:translateX(-50%);
  background:#1A0A00;
  color:#FDFAF5;
  padding:14px 22px;
  border-radius:14px;
  font-size:.92rem;
  box-shadow:0 12px 30px rgba(0,0,0,.18);
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
  .change-password-page{
    padding:24px 14px 100px;
  }
  .card{
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
  .update-btn{
    width:100%;
  }
  .password-field input{
    font-size:.92rem;
  }
  .requirements{
    font-size:.84rem;
  }
}`}</style>
      

      <div className="change-password-page">
        <div className="change-password-container">
          <button className="back-btn" onClick={handleCancel}>
            <ArrowLeft size={18} />
            Back
          </button>

          <h1 className="title">Change Password</h1>

          <p className="subtitle">
            Keep your Brewed account secure by choosing a strong password.
          </p>
          {isGoogleUser && (
  <div
    style={{
      background:"#F6ECE1",
      color:"#7A6658",
      padding:"16px",
      borderRadius:"14px",
      marginBottom:"24px",
    }}
  >
    You're signed in with Google. Your password is managed by Google and cannot be changed here.
  </div>
)}

          <div className="card">
            {/* Current Password */}
            <div className="input-group">
              <label>Current Password</label>
              <div className="password-field">
                <Lock size={18} className="field-icon" />
                <input
                  type={showCurrent ? "text" : "password"}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowCurrent(!showCurrent)}
                >
                  {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="input-group">
              <label>New Password</label>
              <div className="password-field">
                <Lock size={18} className="field-icon" />
                <input
                  type={showNew ? "text" : "password"}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowNew(!showNew)}
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Strength */}
            <div className="strength-wrapper">
              <div className="strength-header">
                <span>Password Strength</span>
                <span>
                  {passwordStrength <= 1 && "Weak"}
                  {passwordStrength === 2 && "Fair"}
                  {passwordStrength === 3 && "Good"}
                  {passwordStrength === 4 && "Strong"}
                </span>
              </div>
              <div className="strength-bar">
                <div
                  className="strength-fill"
                  style={{
                    width: `${passwordStrength * 25}%`,
                  }}
                />
              </div>
            </div>

            {/* Checklist */}
            <div className="requirements">
              <div className={hasLength ? "valid" : ""}>✓ Minimum 8 characters</div>
              <div className={hasUppercase ? "valid" : ""}>✓ One uppercase letter</div>
              <div className={hasNumber ? "valid" : ""}>✓ One number</div>
              <div className={hasSpecial ? "valid" : ""}>✓ One special character</div>
            </div>

            {/* Confirm */}
            <div className="input-group">
              <label>Confirm Password</label>
              <div className="password-field">
                <Lock size={18} className="field-icon" />
                <input
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowConfirm(!showConfirm)}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {confirmPassword !== "" && (
              <div className={passwordsMatch ? "match success" : "match error"}>
                {passwordsMatch ? "✓ Passwords match" : "✕ Passwords don't match"}
              </div>
            )}
          </div>

          <div className="button-row">
            <button className="cancel-btn" onClick={handleCancel}>
              Cancel
            </button>
            <button
              className="update-btn"
              disabled={!canUpdate || isGoogleUser}
              onClick={handleUpdatePassword}
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </div>
      </div>

      {toast.show && <div className="toast">{toast.message}</div>}
    </>
  );
}
