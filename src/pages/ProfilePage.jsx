import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

import {
  updateEmail,
  updateProfile,
  updatePhoneNumber,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  PhoneAuthProvider,
} from "firebase/auth";

import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

import { db, storage, auth } from "../firebase";

import GooglePlacesAutocomplete from "react-google-places-autocomplete";

export default function ProfilePage({ setPage }) {
  const { currentUser } = useAuth();

  // ---------------------------------------------------------
  // STATE
  // ---------------------------------------------------------

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");

  const [address, setAddress] = useState(null);
  const [addressType, setAddressType] = useState("home");

  const [memberSince, setMemberSince] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPasswordProcessing, setIsPasswordProcessing] =
    useState(false);

  const [isBirthdayLocked, setIsBirthdayLocked] =
    useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");


  const [phoneVerified, setPhoneVerified] = useState(false);
const [pendingPhone, setPendingPhone] = useState("");
const [otp, setOtp] = useState("");
const [otpSent, setOtpSent] = useState(false);
const [isPhoneProcessing, setIsPhoneProcessing] = useState(false);
const [verificationId, setVerificationId] = useState(null);
const [originalPhone, setOriginalPhone] = useState("");

  // ---------------------------------------------------------
  // GOOGLE API KEY
  // ---------------------------------------------------------

  const googleApiKey = "AIzaSyAZXXMZOvmUviZqgDoljAhSllaQLxelvfY";
  

  // ---------------------------------------------------------
  // LOAD PROFILE
  // ---------------------------------------------------------

  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    const fetchProfile = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        // Firebase Auth
        setFullName(currentUser.displayName || "");
        setEmail(currentUser.email || "");

        if (currentUser.photoURL) {
          setAvatarUrl(currentUser.photoURL);
        }

        // Membership date
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

        // Firestore
        const userRef = doc(
          db,
          "users",
          currentUser.uid
        );

        const snapshot = await getDoc(userRef);

        if (!snapshot.exists()) {
          setIsLoading(false);
          return;
        }

        const data = snapshot.data();

        setPhone(data.phone || "");
        setOriginalPhone(data.phone || "");
        setPhoneVerified(data.phoneVerified === true);
        setAddressType(
          data.addressType || "home"
        );

        // ---------------------------------------------------
        // ADDRESS
        // ---------------------------------------------------

        if (data.address) {
          // Old Brewed address format
          if (typeof data.address === "string") {
            setAddress({
              formatted: data.address,
              placeId: "",
              lat: null,
              lng: null,
            });
          }

          // New Brewed address format
          else {
            setAddress({
              formatted:
                data.address.formatted || "",
              placeId:
                data.address.placeId || "",
              lat:
                data.address.lat ?? null,
              lng:
                data.address.lng ?? null,
            });
          }
        }

        // Birthday
        if (data.birthday) {
          setBirthday(data.birthday);
          setIsBirthdayLocked(true);
        }

        // Photo
        if (data.photoURL) {
          setAvatarUrl(data.photoURL);
        }
      } catch (error) {
        console.error(
          "Error loading profile:",
          error
        );

        setErrorMessage(
          "Unable to load your profile. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser]);

  // ---------------------------------------------------------
  // PROFILE PHOTO
  // ---------------------------------------------------------

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];

    if (!file || !currentUser) return;

    setMessage("");
    setErrorMessage("");

    // Validate file
    if (!file.type.startsWith("image/")) {
      setErrorMessage(
        "Please select a valid image."
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage(
        "Profile photo must be smaller than 5MB."
      );
      return;
    }

    setIsProcessing(true);

    try {
      const storageRef = ref(
        storage,
        `users/${currentUser.uid}/profile.jpg`
      );

      await uploadBytes(storageRef, file, {
        contentType: file.type,
      });

      const downloadURL =
        await getDownloadURL(storageRef);

      // Firebase Auth
      await updateProfile(currentUser, {
        photoURL: downloadURL,
      });

      // Firestore
      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          photoURL: downloadURL,
          updatedAt: serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      setAvatarUrl(downloadURL);

      setMessage(
        "Profile photo updated successfully."
      );
    } catch (error) {
      console.error(
        "Profile photo upload failed:",
        error
      );

      setErrorMessage(
        error.message ||
          "Failed to upload profile photo."
      );
    } finally {
      setIsProcessing(false);

      // Allows selecting same file again
      e.target.value = "";
    }
  };

  // ---------------------------------------------------------
  // GET PLACE COORDINATES
  // ---------------------------------------------------------

  const getPlaceCoordinates = (placeId) => {
    return new Promise((resolve) => {
      if (
        !placeId ||
        !window.google?.maps?.Geocoder
      ) {
        resolve({
          lat: null,
          lng: null,
        });

        return;
      }

      const geocoder =
        new window.google.maps.Geocoder();

      geocoder.geocode(
        {
          placeId,
        },
        (results, status) => {
          if (
            status === "OK" &&
            results?.[0]?.geometry?.location
          ) {
            const location =
              results[0].geometry.location;

            resolve({
              lat: location.lat(),
              lng: location.lng(),
            });
          } else {
            resolve({
              lat: null,
              lng: null,
            });
          }
        }
      );
    });
  };

  // ---------------------------------------------------------
  // ADDRESS SELECTION
  // ---------------------------------------------------------

  const handleAddressChange = async (
    selected
  ) => {
    if (!selected) {
      setAddress(null);
      return;
    }

    const placeId =
      selected.value?.place_id || "";

    const formatted =
      selected.label || "";

    // Immediately show selected address
    setAddress({
      formatted,
      placeId,
      lat: null,
      lng: null,
    });

    // Get coordinates
    if (placeId) {
      try {
        const coordinates =
          await getPlaceCoordinates(
            placeId
          );

        setAddress((previous) => {
          if (!previous) return previous;

          return {
            ...previous,
            lat: coordinates.lat,
            lng: coordinates.lng,
          };
        });
      } catch (error) {
        console.error(
          "Unable to retrieve address coordinates:",
          error
        );
      }
    }
  };


  // ---------------------------------------------------------
  // PHONE SELECTION
  // ---------------------------------------------------------



// ---------------------------------------------------------
// PHONE OTP / VERIFICATION
// ---------------------------------------------------------

const setupRecaptcha = () => {
  if (window.recaptchaVerifier) {
    return window.recaptchaVerifier;
  }

  window.recaptchaVerifier = new RecaptchaVerifier(
    auth,
    "phone-recaptcha",
    {
      size: "invisible",

      callback: () => {
        console.log("reCAPTCHA completed");
      },

      "expired-callback": () => {
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        }
      },
    }
  );

  return window.recaptchaVerifier;
};


const handleSendPhoneOTP = async () => {
  if (!currentUser) return;

  const cleanedPhone = phone.trim();

  // E.164 format
  if (!/^\+[1-9]\d{7,14}$/.test(cleanedPhone)) {
    setErrorMessage(
      "Enter your phone number with country code, e.g. +919876543210."
    );
    return;
  }

  setIsPhoneProcessing(true);
  setMessage("");
  setErrorMessage("");

  try {
    const verifier = setupRecaptcha();

    const provider = new PhoneAuthProvider(auth);

    const id = await provider.verifyPhoneNumber(
      cleanedPhone,
      verifier
    );

    setVerificationId(id);
    setPendingPhone(cleanedPhone);
    setOtpSent(true);

    setMessage(
      `Verification code sent to ${cleanedPhone}.`
    );

  } catch (error) {
    console.error("Phone OTP error:", error);

    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }

    if (error.code === "auth/invalid-phone-number") {
      setErrorMessage("Please enter a valid phone number.");
    } else if (error.code === "auth/too-many-requests") {
      setErrorMessage(
        "Too many verification attempts. Please try again later."
      );
    } else if (error.code === "auth/quota-exceeded") {
      setErrorMessage(
        "SMS verification limit reached. Please try again later."
      );
    } else {
      setErrorMessage(
        error.message ||
        "Unable to send verification code."
      );
    }

  } finally {
    setIsPhoneProcessing(false);
  }
};


const handleVerifyPhoneOTP = async () => {
  if (!currentUser || !verificationId) {
    setErrorMessage(
      "Please request a new verification code."
    );
    return;
  }

  const cleanOTP = otp.trim();

  if (!/^\d{6}$/.test(cleanOTP)) {
    setErrorMessage(
      "Enter the 6-digit verification code."
    );
    return;
  }

  setIsPhoneProcessing(true);
  setMessage("");
  setErrorMessage("");

  try {

    // Create phone credential from OTP
    const credential =
      PhoneAuthProvider.credential(
        verificationId,
        cleanOTP
      );

    // Attach the verified phone number
    // to the currently signed-in Firebase user
    await updatePhoneNumber(
      currentUser,
      credential
    );

    // Update local state
    setPhone(pendingPhone);
    setOriginalPhone(pendingPhone);
    setPhoneVerified(true);

    // Save verified state to Firestore
    await setDoc(
      doc(db, "users", currentUser.uid),
      {
        phone: pendingPhone,
        phoneVerified: true,
        phoneVerifiedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      {
        merge: true,
      }
    );

    // Reset OTP state
    setOtp("");
    setOtpSent(false);
    setVerificationId(null);
    setPendingPhone("");

    setMessage(
      "Phone number verified successfully."
    );

  } catch (error) {
    console.error(
      "Phone OTP verification error:",
      error
    );

    if (error.code === "auth/invalid-verification-code") {
      setErrorMessage(
        "Incorrect verification code. Please try again."
      );
    } else if (
      error.code === "auth/code-expired"
    ) {
      setErrorMessage(
        "This verification code has expired. Please request a new one."
      );

      setOtpSent(false);
      setVerificationId(null);

    } else if (
      error.code === "auth/phone-number-already-exists"
    ) {
      setErrorMessage(
        "This phone number is already associated with another account."
      );
    } else if (
      error.code === "auth/requires-recent-login"
    ) {
      setErrorMessage(
        "Please sign in again before changing your phone number."
      );
    } else {
      setErrorMessage(
        error.message ||
        "Unable to verify phone number."
      );
    }

  } finally {
    setIsPhoneProcessing(false);
  }
};
  

  // ---------------------------------------------------------
  // SAVE PROFILE
  // ---------------------------------------------------------

  const handleSave = async (e) => {
    e.preventDefault();

    if (!currentUser) return;
     if (!phone) {
    setErrorMessage("Phone number is required.");
    return;
  }

  if (!phoneVerified) {
    setErrorMessage("Please verify your phone number before saving.");
    return;
  }

    setIsProcessing(true);
    setMessage("");
    setErrorMessage("");

    try {
      // -----------------------------------------------------
      // NAME
      // -----------------------------------------------------

      if (
        fullName.trim() !==
        (currentUser.displayName || "")
      ) {
        await updateProfile(currentUser, {
          displayName: fullName.trim(),
        });
      }

      // -----------------------------------------------------
      // EMAIL
      // -----------------------------------------------------

      if (
        email.trim() !== currentUser.email
      ) {
        await updateEmail(
          currentUser,
          email.trim()
        );
      }

      // -----------------------------------------------------
      // FIRESTORE
      // -----------------------------------------------------

   const updateData = {
  fullName,
  email,
  phone,
  phoneVerified,
  address,
  addressType,
  updatedAt: serverTimestamp(),
};

      // Birthday can only be saved once
      if (
        !isBirthdayLocked &&
        birthday
      ) {
        updateData.birthday = birthday;
      }

      await setDoc(
        doc(db, "users", currentUser.uid),
        updateData,
        {
          merge: true,
        }
      );

      if (
        !isBirthdayLocked &&
        birthday
      ) {
        setIsBirthdayLocked(true);
      }

      setMessage(
        "Profile saved successfully."
      );
    } catch (error) {
      console.error(
        "Failed to save profile:",
        error
      );

      if (
        error.code ===
        "auth/requires-recent-login"
      ) {
        setErrorMessage(
          "Please sign in again before changing your email."
        );
      } else if (
        error.code ===
        "auth/email-already-in-use"
      ) {
        setErrorMessage(
          "That email address is already in use."
        );
      } else if (
        error.code ===
        "auth/invalid-email"
      ) {
        setErrorMessage(
          "Please enter a valid email address."
        );
      } else {
        setErrorMessage(
          error.message ||
            "Failed to save your profile."
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // ---------------------------------------------------------
  // CHANGE PASSWORD
  // ---------------------------------------------------------

  const handleChangePassword = async () => {
    if (!currentUser?.email) {
      setErrorMessage(
        "No email address is associated with this account."
      );

      return;
    }

    setIsPasswordProcessing(true);
    setMessage("");
    setErrorMessage("");

    try {
      await sendPasswordResetEmail(
        auth,
        currentUser.email
      );

      setMessage(
        `Password reset instructions have been sent to ${currentUser.email}.`
      );
    } catch (error) {
      console.error(
        "Password reset failed:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to send password reset email."
      );
    } finally {
      setIsPasswordProcessing(false);
    }
  };

  // ---------------------------------------------------------
  // AVATAR
  // ---------------------------------------------------------

  const avatar =
    avatarUrl ||
    `https://ui-avatars.com/api/?background=C4956A&color=fff&name=${encodeURIComponent(
      fullName || "User"
    )}`;

  // ---------------------------------------------------------
  // LOADING
  // ---------------------------------------------------------

  if (isLoading) {
    return (
      <>
        <style>{`
          .profile-loading {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #FDFAF5;
            color: #3B1A08;
            font-family: Inter, sans-serif;
          }
        `}</style>

        <div className="profile-loading">
          Loading your profile...
        </div>
      </>
    );
  }

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #FDFAF5;
          font-family: 'Inter', sans-serif;
        }

        .profile-page {
          min-height: 100vh;
          background: #FDFAF5;
          display: flex;
          justify-content: center;
          padding: 120px 20px 60px;
        }

        .profile-card {
          width: 100%;
          max-width: 760px;
          background: white;
          border-radius: 24px;
          box-shadow: 0 15px 40px rgba(0,0,0,.08);
          padding: 50px;
        }

        .profile-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 45px;
        }

        .avatar-wrapper {
          position: relative;
        }

        .profile-avatar {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          object-fit: cover;
          border: 5px solid #C4956A;
          cursor: pointer;
        }

        .avatar-hint {
          position: absolute;
          bottom: 5px;
          right: 0;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #3B1A08;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          pointer-events: none;
        }

        .profile-title {
          font-family: 'Playfair Display', serif;
          font-size: 2.3rem;
          color: #3B1A08;
          margin-top: 22px;
        }

        .profile-subtitle {
          color: #7A675C;
          margin-top: 8px;
        }

        .section-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.4rem;
          color: #3B1A08;
          margin: 40px 0 18px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group.full {
          grid-column: 1 / 3;
        }

        label {
          margin-bottom: 8px;
          font-weight: 600;
          color: #5A453A;
        }

        input {
          width: 100%;
          padding: 15px;
          border-radius: 12px;
          border: 1px solid #DDD;
          font-size: 15px;
          transition: .3s;
        }

        input:focus {
          outline: none;
          border-color: #C4956A;
          box-shadow: 0 0 0 3px rgba(196,149,106,.15);
        }

        .radio-group {
          display: flex;
          gap: 20px;
          margin-top: 5px;
        }

        .radio-option {
          display: flex;
          align-items: center;
          cursor: pointer;
          font-weight: 500;
          color: #5A453A;
        }

        .radio-circle {
          width: 20px;
          height: 20px;
          border: 2px solid #C4956A;
          border-radius: 50%;
          margin-right: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .radio-dot {
          width: 10px;
          height: 10px;
          background: #C4956A;
          border-radius: 50%;
          display: none;
        }

        input[type="radio"]:checked + .radio-circle .radio-dot {
          display: block;
        }

        .member-box {
          margin-top: 25px;
          padding: 18px;
          background: #F8F4EE;
          border-radius: 14px;
        }

        .member-value {
          font-size: 1.1rem;
          font-weight: 600;
          color: #3B1A08;
        }

        .address-note,
        .birthday-note {
          margin-top: 8px;
          font-size: 12px;
          color: #8A7770;
        }

        .status-message {
          margin-top: 25px;
          padding: 14px 16px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.5;
        }

        .success-message {
          background: #EEF8F0;
          color: #2E6B38;
        }

        .error-message {
          background: #FBEDED;
          color: #9B3333;
        }

        .actions {
          margin-top: 45px;
          display: flex;
          gap: 15px;
        }


         .phone-status {
  margin-top: 7px;
  font-size: 12px;
  font-weight: 600;
}

.phone-status.verified {
  color: #2E6B38;
}

.phone-status.unverified {
  color: #9B3333;
}



        .save-btn,
        .password-btn {
          flex: 1;
          padding: 15px;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          font-weight: 600;
        }

        .save-btn {
          background: #3B1A08;
          color: white;
        }

        .save-btn:hover {
          background: #C4956A;
        }

        .password-btn {
          background: #F8F4EE;
          color: #3B1A08;
        }

        .save-btn:disabled,
        .password-btn:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .back-button {
          background: none;
          border: none;
          color: #3B1A08;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 20px;
          padding: 0;
        }


        .phone-input-row {
  display: flex;
  gap: 10px;
  align-items: stretch;
}

.phone-input-row input {
  flex: 1;
}

.verify-phone-btn {
  border: none;
  border-radius: 12px;
  padding: 0 18px;
  background: #3B1A08;
  color: white;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.verify-phone-btn:hover {
  background: #C4956A;
}

.verify-phone-btn:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.verified-badge {
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-radius: 12px;
  background: #EEF8F0;
  color: #2E6B38;
  font-weight: 600;
  white-space: nowrap;
}

.otp-box {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.otp-box input {
  flex: 1;
}

.phone-note {
  margin-top: 8px;
  font-size: 12px;
  color: #8A7770;
}

@media(max-width: 600px) {
  .phone-input-row {
    flex-direction: column;
  }

  .verify-phone-btn,
  .verified-badge {
    min-height: 48px;
    justify-content: center;
  }

  .otp-box {
    flex-direction: column;
  }
}

        @media(max-width: 768px) {
          .profile-card {
            padding: 30px 22px;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .form-group.full {
            grid-column: auto;
          }

          .actions {
            flex-direction: column;
          }
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

          {/* HEADER */}

          <div className="profile-header">

            <label className="avatar-wrapper">

              <img
                src={avatar}
                alt="Profile"
                className="profile-avatar"
              />

              <span className="avatar-hint">
                ✎
              </span>

              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: "none" }}
                disabled={isProcessing}
              />

            </label>

            <div className="profile-title">
              My Profile
            </div>

            <div className="profile-subtitle">
              {isProcessing
                ? "Saving your changes..."
                : "Manage your Brewed account."}
            </div>

          </div>

          <form onSubmit={handleSave}>

            {/* PERSONAL INFORMATION */}

            <div className="section-title">
              Personal Information
            </div>

            <div className="form-grid">

              {/* NAME */}

              <div className="form-group full">

                <label>
                  Full Name
                </label>

                <input
                  type="text"
                  value={fullName}
                  onChange={(e) =>
                    setFullName(e.target.value)
                  }
                  required
                />

              </div>

              {/* EMAIL */}

              <div className="form-group">

                <label>
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  required
                />

              </div>

              {/* PHONE */}

             <div className="form-group">
  <label>
    Phone Number <span style={{ color: "#C4956A" }}>*</span>
  </label>

  <div className="phone-input-row">
  <input
  type="tel"
  value={phone}
 onChange={(e) => {
  const newPhone = e.target.value;

  setPhone(newPhone);

  // Changing the number immediately invalidates
  // the previous verification.
  if (newPhone.trim() !== originalPhone.trim()) {
    setPhoneVerified(false);
    setOtpSent(false);
    setOtp("");
    setVerificationId(null);
    setPendingPhone("");
  }
}}
  required
/>

    {phoneVerified ? (
      <div className="verified-badge">
        ✓ Verified
      </div>
    ) : (
      <button
        type="button"
        className="verify-phone-btn"
        onClick={handleSendPhoneOTP}
        disabled={isPhoneProcessing || !phone}
      >
        {isPhoneProcessing ? "Sending..." : "Verify"}
      </button>
    )}
  </div>

  {otpSent && (
    <div className="otp-box">
      <input
        type="text"
        inputMode="numeric"
        maxLength="6"
        value={otp}
        onChange={(e) =>
          setOtp(e.target.value.replace(/\D/g, ""))
        }
        placeholder="Enter 6-digit OTP"
      />

      <button
        type="button"
        className="verify-phone-btn"
        onClick={handleVerifyPhoneOTP}
        disabled={isPhoneProcessing || otp.length !== 6}
      >
        {isPhoneProcessing ? "Verifying..." : "Verify OTP"}
      </button>
    </div>
  )}

  <div id="phone-recaptcha"></div>

  <div className="phone-note">
    {phoneVerified
      ? "Your phone number is verified."
      : "A verification code is required to use this phone number."}
  </div>
</div>

              {/* ADDRESS TYPE */}

              <div className="form-group full">

                <label>
                  Address Type
                </label>

                <div className="radio-group">

                  {[
                    "home",
                    "work",
                    "other",
                  ].map((type) => (

                    <label
                      key={type}
                      className="radio-option"
                    >

                      <input
                        type="radio"
                        name="addressType"
                        value={type}
                        checked={
                          addressType === type
                        }
                        onChange={(e) =>
                          setAddressType(
                            e.target.value
                          )
                        }
                        style={{
                          display: "none",
                        }}
                      />

                      <div className="radio-circle">
                        <div className="radio-dot" />
                      </div>

                      {type
                        .charAt(0)
                        .toUpperCase() +
                        type.slice(1)}

                    </label>

                  ))}

                </div>

              </div>

              {/* ADDRESS */}

              <div className="form-group full">

                <label>
                  Delivery Address
                </label>

                {googleApiKey ? (

                  <GooglePlacesAutocomplete
                    apiKey={googleApiKey}

                    selectProps={{
                      value: address
                        ? {
                            label:
                              address.formatted ||
                              "",
                            value:
                              address.placeId ||
                              "",
                          }
                        : null,

                      onChange:
                        handleAddressChange,

                      placeholder:
                        "Search for your delivery address...",

                      isClearable: true,

                      styles: {

                        control: (
                          provided,
                          state
                        ) => ({
                          ...provided,
                          minHeight: "52px",
                          padding: "3px",
                          borderRadius: "12px",
                          borderColor:
                            state.isFocused
                              ? "#C4956A"
                              : "#DDD",
                          boxShadow:
                            state.isFocused
                              ? "0 0 0 3px rgba(196,149,106,.15)"
                              : "none",
                        }),

                        input: (
                          provided
                        ) => ({
                          ...provided,
                          fontSize: "15px",
                        }),

                        placeholder: (
                          provided
                        ) => ({
                          ...provided,
                          color: "#999",
                        }),

                        singleValue: (
                          provided
                        ) => ({
                          ...provided,
                          color: "#3B1A08",
                        }),

                        menu: (
                          provided
                        ) => ({
                          ...provided,
                          zIndex: 9999,
                          borderRadius: "12px",
                          overflow: "hidden",
                        }),

                      },
                    }}
                  />

                ) : (

                  <div className="error-message">
                    Google Maps API key is not configured.
                  </div>

                )}

                <div className="address-note">
                  Search and select your exact delivery
                  address from the suggestions.
                </div>

              </div>

              {/* BIRTHDAY */}

              <div className="form-group full">

                <label>
                  Birthday{" "}
                  <span
                    style={{
                      color: "#C4956A",
                    }}
                  >
                    *
                  </span>
                </label>

                <input
                  type={
                    isBirthdayLocked
                      ? "text"
                      : "date"
                  }
                  value={birthday}
                  onChange={(e) =>
                    setBirthday(
                      e.target.value
                    )
                  }
                  required
                  readOnly={
                    isBirthdayLocked
                  }
                  style={{
                    backgroundColor:
                      isBirthdayLocked
                        ? "#F8F4EE"
                        : "white",
                    cursor:
                      isBirthdayLocked
                        ? "default"
                        : "text",
                  }}
                />

                {isBirthdayLocked && (
                  <div className="birthday-note">
                    Your birthday cannot be changed
                    after it has been saved.
                  </div>
                )}

              </div>

            </div>

            {/* MEMBERSHIP */}

            <div className="section-title">
              Membership
            </div>

            <div className="member-box">

              <div className="member-value">
                ☕ Member since{" "}
                {memberSince || "Today"}
              </div>

            </div>

            {/* MESSAGES */}

            {message && (
              <div className="status-message success-message">
                {message}
              </div>
            )}

            {errorMessage && (
              <div className="status-message error-message">
                {errorMessage}
              </div>
            )}

            {/* ACTIONS */}

            <div className="actions">

              <button
                type="button"
                className="password-btn"
                onClick={
                  handleChangePassword
                }
                disabled={
                  isPasswordProcessing ||
                  isProcessing
                }
              >
                {isPasswordProcessing
                  ? "Sending..."
                  : "Change Password"}
              </button>

              <button
                type="submit"
                className="save-btn"
                disabled={isProcessing}
              >
                {isProcessing
                  ? "Saving..."
                  : "Save Changes"}
              </button>

            </div>

          </form>

        </div>
      </div>
    </>
  );
}
