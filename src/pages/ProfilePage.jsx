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
  sendPasswordResetEmail,
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
  const [isPasswordProcessing, setIsPasswordProcessing] = useState(false);
  const [isPhotoProcessing, setIsPhotoProcessing] = useState(false);

  const [isBirthdayLocked, setIsBirthdayLocked] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  /*
   * ---------------------------------------------------------
   * LOAD PROFILE
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    const fetchProfile = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        setFullName(currentUser.displayName || "");
        setEmail(currentUser.email || "");

        if (currentUser.photoURL) {
          setAvatarUrl(currentUser.photoURL);
        }

        if (currentUser.metadata?.creationTime) {
          const joined = new Date(currentUser.metadata.creationTime);

          setMemberSince(
            joined.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })
          );
        }

        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          setFullName(data.fullName || currentUser.displayName || "");
          setEmail(data.email || currentUser.email || "");
          setPhone(data.phone || "");
          setAddressType(data.addressType || "home");

          /*
           * Support old address string format
           * and new structured address format.
           */
          if (data.address) {
            if (typeof data.address === "string") {
              setAddress({
                formatted: data.address,
                placeId: "",
                lat: null,
                lng: null,
              });
            } else {
              setAddress({
                formatted: data.address.formatted || "",
                placeId: data.address.placeId || "",
                lat: data.address.lat ?? null,
                lng: data.address.lng ?? null,
              });
            }
          }

          if (data.birthday) {
            setBirthday(data.birthday);
            setIsBirthdayLocked(true);
          }

          if (data.photoURL) {
            setAvatarUrl(data.photoURL);
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        setErrorMessage(
          "Unable to load your profile. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser]);

  /*
   * ---------------------------------------------------------
   * PROFILE PHOTO
   * ---------------------------------------------------------
   */

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];

    if (!file || !currentUser) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Profile photo must be smaller than 5MB.");
      return;
    }

    setIsPhotoProcessing(true);
    setMessage("");
    setErrorMessage("");

    try {
      const storageRef = ref(
        storage,
        `users/${currentUser.uid}/profile.jpg`
      );

      await uploadBytes(storageRef, file, {
        contentType: file.type,
      });

      const downloadURL = await getDownloadURL(storageRef);

      await updateProfile(currentUser, {
        photoURL: downloadURL,
      });

      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          photoURL: downloadURL,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setAvatarUrl(downloadURL);
      setMessage("Profile photo updated successfully.");
    } catch (error) {
      console.error("Profile photo upload failed:", error);

      setErrorMessage(
        error.message || "Failed to upload profile photo."
      );
    } finally {
      setIsPhotoProcessing(false);
      e.target.value = "";
    }
  };

  /*
   * ---------------------------------------------------------
   * ADDRESS
   * ---------------------------------------------------------
   */

  const handleAddressChange = (selected) => {
    if (!selected) {
      setAddress(null);
      return;
    }

    setAddress({
      formatted: selected.label || "",
      placeId: selected.value?.place_id || "",
      lat: null,
      lng: null,
    });

    setMessage("");
    setErrorMessage("");
  };

  const clearAddress = () => {
    setAddress(null);
    setMessage("");
    setErrorMessage("");
  };

  /*
   * ---------------------------------------------------------
   * SAVE PROFILE
   * ---------------------------------------------------------
   */

  const handleSave = async (e) => {
    e.preventDefault();

    if (!currentUser) return;

    setIsProcessing(true);
    setMessage("");
    setErrorMessage("");

    try {
      /*
       * Update Firebase Auth name.
       */
      if (fullName !== currentUser.displayName) {
        await updateProfile(currentUser, {
          displayName: fullName,
        });
      }

      /*
       * Update Firebase Auth email.
       */
      if (email !== currentUser.email) {
        await updateEmail(currentUser, email);
      }

      const updateData = {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address || null,
        addressType,
        updatedAt: serverTimestamp(),
      };

      /*
       * Birthday can only be saved once.
       */
      if (!isBirthdayLocked && birthday) {
        updateData.birthday = birthday;
      }

      await setDoc(
        doc(db, "users", currentUser.uid),
        updateData,
        { merge: true }
      );

      if (!isBirthdayLocked && birthday) {
        setIsBirthdayLocked(true);
      }

      setMessage("Your profile has been updated.");
    } catch (error) {
      console.error("Failed to save profile:", error);

      if (error.code === "auth/requires-recent-login") {
        setErrorMessage(
          "For security, please sign in again before changing your email."
        );
      } else if (error.code === "auth/email-already-in-use") {
        setErrorMessage(
          "That email address is already associated with another account."
        );
      } else if (error.code === "auth/invalid-email") {
        setErrorMessage(
          "Please enter a valid email address."
        );
      } else {
        setErrorMessage(
          error.message || "Failed to save your profile."
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * PASSWORD RESET
   * ---------------------------------------------------------
   */

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
        `Password reset instructions were sent to ${currentUser.email}.`
      );
    } catch (error) {
      console.error("Password reset failed:", error);

      setErrorMessage(
        error.message ||
          "Unable to send password reset instructions."
      );
    } finally {
      setIsPasswordProcessing(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * AVATAR
   * ---------------------------------------------------------
   */

  const avatar =
    avatarUrl ||
    `https://ui-avatars.com/api/?background=3B1A08&color=fff&name=${encodeURIComponent(
      fullName || "User"
    )}`;

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

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
            font-size: 15px;
          }

          .loading-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid #E8DED4;
            border-top-color: #C4956A;
            border-radius: 50%;
            animation: profileSpin .7s linear infinite;
            margin-right: 10px;
          }

          @keyframes profileSpin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>

        <div className="profile-loading">
          <div className="loading-spinner" />
          Loading your profile...
        </div>
      </>
    );
  }

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
          background:
            radial-gradient(
              circle at top center,
              rgba(196,149,106,.08),
              transparent 420px
            ),
            #FDFAF5;

          padding: 105px 20px 70px;
        }

        .profile-container {
          width: 100%;
          max-width: 820px;
          margin: 0 auto;
        }

        /* BACK */

        .back-button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: transparent;
          border: none;
          color: #3B1A08;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          padding: 8px 0;
          margin-bottom: 20px;
        }

        .back-button:hover {
          color: #C4956A;
        }

        /* HERO */

        .profile-hero {
          background: #FFFFFF;
          border-radius: 26px;
          padding: 38px 40px;
          box-shadow: 0 18px 45px rgba(59,26,8,.07);
          border: 1px solid rgba(196,149,106,.12);
          display: flex;
          align-items: center;
          gap: 26px;
          margin-bottom: 22px;
        }

        .avatar-wrapper {
          position: relative;
          flex-shrink: 0;
        }

        .profile-avatar {
          width: 112px;
          height: 112px;
          border-radius: 50%;
          object-fit: cover;
          border: 4px solid #C4956A;
          display: block;
          background: #F8F4EE;
        }

        .avatar-edit {
          position: absolute;
          right: 0;
          bottom: 2px;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 3px solid white;
          background: #3B1A08;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 14px;
          transition: .2s;
        }

        .avatar-edit:hover {
          background: #C4956A;
          transform: scale(1.05);
        }

        .profile-hero-info {
          min-width: 0;
        }

        .profile-title {
          font-family: 'Playfair Display', serif;
          font-size: 2.35rem;
          color: #3B1A08;
          margin: 0 0 6px;
          line-height: 1.15;
        }

        .profile-email {
          color: #7A675C;
          font-size: 14px;
          word-break: break-word;
        }

        .member-since {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-top: 13px;
          padding: 7px 11px;
          border-radius: 999px;
          background: #F8F4EE;
          color: #6B5144;
          font-size: 12px;
          font-weight: 600;
        }

        /* SECTIONS */

        .profile-section {
          background: white;
          border-radius: 24px;
          padding: 32px 36px;
          margin-bottom: 20px;
          box-shadow: 0 12px 35px rgba(59,26,8,.055);
          border: 1px solid rgba(196,149,106,.10);
        }

        .section-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 25px;
        }

        .section-heading h2 {
          font-family: 'Playfair Display', serif;
          color: #3B1A08;
          font-size: 1.5rem;
          margin: 0;
        }

        .section-heading p {
          margin: 6px 0 0;
          color: #8A7770;
          font-size: 13px;
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

        .form-label {
          margin-bottom: 8px;
          color: #5A453A;
          font-size: 13px;
          font-weight: 600;
        }

        .form-input {
          width: 100%;
          padding: 14px 15px;
          border-radius: 12px;
          border: 1px solid #DDD7D1;
          background: white;
          color: #33241D;
          font-family: inherit;
          font-size: 14px;
          transition: .2s;
        }

        .form-input:focus {
          outline: none;
          border-color: #C4956A;
          box-shadow: 0 0 0 3px rgba(196,149,106,.13);
        }

        .form-input::placeholder {
          color: #A59A93;
        }

        .form-input:read-only {
          background: #F8F4EE;
          color: #6D5D54;
        }

        /* ADDRESS TYPE */

        .address-type-group {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .address-type-option {
          cursor: pointer;
        }

        .address-type-option input {
          display: none;
        }

        .address-type-pill {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 10px 16px;
          border: 1px solid #DDD7D1;
          border-radius: 999px;
          color: #6B5A51;
          background: white;
          font-size: 13px;
          font-weight: 600;
          transition: .2s;
        }

        .address-type-option input:checked + .address-type-pill {
          border-color: #C4956A;
          background: #F8F4EE;
          color: #3B1A08;
        }

        .address-type-pill:hover {
          border-color: #C4956A;
        }

        /* ADDRESS */

        .address-wrapper {
          position: relative;
        }

        .address-note {
          margin-top: 8px;
          color: #96867E;
          font-size: 11px;
        }

        .selected-address {
          margin-top: 12px;
          padding: 13px 15px;
          border-radius: 12px;
          background: #F8F4EE;
          border: 1px solid #EEE5DC;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
        }

        .selected-address-content {
          display: flex;
          gap: 10px;
          min-width: 0;
        }

        .address-icon {
          flex-shrink: 0;
          font-size: 17px;
        }

        .selected-address-text {
          color: #4D3A30;
          font-size: 13px;
          line-height: 1.5;
        }

        .selected-address-label {
          color: #967F70;
          font-size: 11px;
          margin-bottom: 2px;
          text-transform: uppercase;
          letter-spacing: .05em;
          font-weight: 600;
        }

        .clear-address {
          flex-shrink: 0;
          border: none;
          background: transparent;
          color: #92796B;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          padding: 3px;
        }

        .clear-address:hover {
          color: #9B3333;
        }

        /* SECURITY */

        .security-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 18px 0;
          border-bottom: 1px solid #EEE8E2;
        }

        .security-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .security-row:first-child {
          padding-top: 0;
        }

        .security-info {
          min-width: 0;
        }

        .security-label {
          font-size: 13px;
          font-weight: 600;
          color: #5A453A;
        }

        .security-value {
          margin-top: 5px;
          color: #8A7770;
          font-size: 13px;
          word-break: break-word;
        }

        .security-action {
          flex-shrink: 0;
          border: 1px solid #DCCFC4;
          background: white;
          color: #3B1A08;
          border-radius: 10px;
          padding: 9px 14px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: .2s;
        }

        .security-action:hover {
          border-color: #C4956A;
          background: #F8F4EE;
        }

        .security-action:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        /* MEMBERSHIP */

        .membership-card {
          background:
            linear-gradient(
              135deg,
              #3B1A08 0%,
              #5A2E16 100%
            );
          border-radius: 20px;
          padding: 25px;
          color: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .membership-left {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .membership-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: rgba(255,255,255,.10);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }

        .membership-label {
          font-size: 11px;
          color: #D8BBA4;
          text-transform: uppercase;
          letter-spacing: .08em;
          font-weight: 600;
        }

        .membership-value {
          margin-top: 4px;
          font-family: 'Playfair Display', serif;
          font-size: 1.25rem;
        }

        .membership-date {
          margin-top: 3px;
          color: #D6C2B4;
          font-size: 11px;
        }

        .rewards-button {
          border: 1px solid rgba(255,255,255,.25);
          background: rgba(255,255,255,.08);
          color: white;
          padding: 10px 15px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          transition: .2s;
        }

        .rewards-button:hover {
          background: rgba(255,255,255,.16);
        }

        /* STATUS */

        .status-message {
          margin-bottom: 20px;
          padding: 13px 16px;
          border-radius: 12px;
          font-size: 13px;
          line-height: 1.45;
        }

        .success-message {
          background: #EEF8F0;
          color: #2E6B38;
          border: 1px solid #D6ECD9;
        }

        .error-message {
          background: #FBEDED;
          color: #9B3333;
          border: 1px solid #F0D5D5;
        }

        /* ACTIONS */

        .bottom-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 10px;
        }

        .save-btn {
          min-width: 190px;
          padding: 14px 22px;
          border: none;
          border-radius: 13px;
          background: #3B1A08;
          color: white;
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          transition: .2s;
        }

        .save-btn:hover {
          background: #C4956A;
        }

        .save-btn:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .save-btn.saved {
          background: #4C7A52;
        }

        /* MOBILE */

        @media(max-width: 700px) {
          .profile-page {
            padding: 85px 14px 45px;
          }

          .profile-hero {
            padding: 28px 22px;
            flex-direction: column;
            text-align: center;
          }

          .profile-hero-info {
            width: 100%;
          }

          .profile-title {
            font-size: 2rem;
          }

          .member-since {
            margin-top: 12px;
          }

          .profile-section {
            padding: 25px 20px;
            border-radius: 20px;
          }

          .form-grid {
            grid-template-columns: 1fr;
            gap: 17px;
          }

          .form-group.full {
            grid-column: auto;
          }

          .section-heading h2 {
            font-size: 1.35rem;
          }

          .security-row {
            align-items: flex-start;
            flex-direction: column;
            gap: 10px;
          }

          .security-action {
            width: 100%;
          }

          .membership-card {
            align-items: flex-start;
            flex-direction: column;
          }

          .rewards-button {
            width: 100%;
          }

          .bottom-actions {
            justify-content: stretch;
          }

          .save-btn {
            width: 100%;
          }
        }
      `}</style>

      <div className="profile-page">
        <div className="profile-container">

          {/* BACK */}

          <button
            className="back-button"
            onClick={() => setPage("menu")}
          >
            ← Back to Menu
          </button>

          {/* HERO */}

          <div className="profile-hero">

            <div className="avatar-wrapper">

              <img
                src={avatar}
                alt="Profile"
                className="profile-avatar"
              />

              <label
                className="avatar-edit"
                title="Change profile photo"
              >
                {isPhotoProcessing ? "..." : "✎"}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: "none" }}
                  disabled={isPhotoProcessing}
                />
              </label>

            </div>

            <div className="profile-hero-info">

              <h1 className="profile-title">
                {fullName || "My Profile"}
              </h1>

              <div className="profile-email">
                {email || "No email address"}
              </div>

              <div className="member-since">
                ☕ Member since {memberSince || "Today"}
              </div>

            </div>

          </div>

          {/* STATUS */}

          {message && (
            <div className="status-message success-message">
              ✓ {message}
            </div>
          )}

          {errorMessage && (
            <div className="status-message error-message">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSave}>

            {/* PERSONAL INFORMATION */}

            <section className="profile-section">

              <div className="section-heading">
                <div>
                  <h2>Personal Information</h2>
                  <p>Keep your account details up to date.</p>
                </div>
              </div>

              <div className="form-grid">

                <div className="form-group full">
                  <label className="form-label">
                    Full Name
                  </label>

                  <input
                    className="form-input"
                    type="text"
                    value={fullName}
                    onChange={(e) =>
                      setFullName(e.target.value)
                    }
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Email Address
                  </label>

                  <input
                    className="form-input"
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Phone Number
                  </label>

                  <input
                    className="form-input"
                    type="tel"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value)
                    }
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>

                <div className="form-group full">
                  <label className="form-label">
                    Birthday
                  </label>

                  <input
                    className="form-input"
                    type={isBirthdayLocked ? "text" : "date"}
                    value={birthday}
                    onChange={(e) =>
                      setBirthday(e.target.value)
                    }
                    required
                    readOnly={isBirthdayLocked}
                  />

                  {isBirthdayLocked && (
                    <div className="address-note">
                      Your birthday is locked after being saved.
                    </div>
                  )}
                </div>

              </div>

            </section>

            {/* DELIVERY ADDRESS */}

            <section className="profile-section">

              <div className="section-heading">
                <div>
                  <h2>Delivery Address</h2>
                  <p>
                    Choose where you would like your Brewed
                    orders delivered.
                  </p>
                </div>
              </div>

              <div className="form-group">

                <label className="form-label">
                  Address Type
                </label>

                <div className="address-type-group">

                  {[
                    { value: "home", icon: "⌂", label: "Home" },
                    { value: "work", icon: "▣", label: "Work" },
                    { value: "other", icon: "♡", label: "Other" },
                  ].map((type) => (
                    <label
                      key={type.value}
                      className="address-type-option"
                    >
                      <input
                        type="radio"
                        name="addressType"
                        value={type.value}
                        checked={addressType === type.value}
                        onChange={(e) =>
                          setAddressType(e.target.value)
                        }
                      />

                      <span className="address-type-pill">
                        <span>{type.icon}</span>
                        {type.label}
                      </span>
                    </label>
                  ))}

                </div>

              </div>

              <div
                className="form-group"
                style={{ marginTop: "22px" }}
              >

                <label className="form-label">
                  Search Address
                </label>

                <div className="address-wrapper">

                  <GooglePlacesAutocomplete
                    apiKey="AIzaSyAZXXMZOvmUviZqgDoljAhSllaQLxelvfY"
                    selectProps={{
                      value: address
                        ? {
                            label:
                              address.formatted || "",
                            value:
                              address.placeId ||
                              address.formatted ||
                              "",
                          }
                        : null,

                      onChange: handleAddressChange,

                      placeholder:
                        "Start typing your address...",

                      styles: {
                        control: (
                          provided,
                          state
                        ) => ({
                          ...provided,
                          minHeight: "52px",
                          padding: "3px 5px",
                          borderRadius: "12px",
                          borderColor:
                            state.isFocused
                              ? "#C4956A"
                              : "#DDD7D1",
                          boxShadow:
                            state.isFocused
                              ? "0 0 0 3px rgba(196,149,106,.13)"
                              : "none",
                          "&:hover": {
                            borderColor: "#C4956A",
                          },
                        }),

                        input: (provided) => ({
                          ...provided,
                          fontSize: "14px",
                          color: "#33241D",
                        }),

                        placeholder: (provided) => ({
                          ...provided,
                          color: "#A59A93",
                        }),

                        singleValue: (provided) => ({
                          ...provided,
                          color: "#33241D",
                          fontSize: "14px",
                        }),

                        menu: (provided) => ({
                          ...provided,
                          zIndex: 20,
                          borderRadius: "12px",
                          overflow: "hidden",
                        }),
                      },
                    }}
                  />

                </div>

                <div className="address-note">
                  Select a suggested address for the most
                  accurate delivery information.
                </div>

                {address?.formatted && (
                  <div className="selected-address">

                    <div className="selected-address-content">

                      <div className="address-icon">
                        {addressType === "home"
                          ? "⌂"
                          : addressType === "work"
                          ? "▣"
                          : "♡"}
                      </div>

                      <div>
                        <div className="selected-address-label">
                          {addressType} address
                        </div>

                        <div className="selected-address-text">
                          {address.formatted}
                        </div>
                      </div>

                    </div>

                    <button
                      type="button"
                      className="clear-address"
                      onClick={clearAddress}
                    >
                      Clear
                    </button>

                  </div>
                )}

              </div>

            </section>

            {/* ACCOUNT & SECURITY */}

            <section className="profile-section">

              <div className="section-heading">
                <div>
                  <h2>Account & Security</h2>
                  <p>
                    Manage your login information and account
                    security.
                  </p>
                </div>
              </div>

              <div className="security-row">

                <div className="security-info">
                  <div className="security-label">
                    Email address
                  </div>

                  <div className="security-value">
                    {email}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "11px",
                    color: "#4C7A52",
                    fontWeight: 600,
                  }}
                >
                  ● Active
                </div>

              </div>

              <div className="security-row">

                <div className="security-info">
                  <div className="security-label">
                    Password
                  </div>

                  <div className="security-value">
                    Reset your password through your email.
                  </div>
                </div>

                <button
                  type="button"
                  className="security-action"
                  onClick={handleChangePassword}
                  disabled={
                    isPasswordProcessing ||
                    isProcessing
                  }
                >
                  {isPasswordProcessing
                    ? "Sending..."
                    : "Reset Password"}
                </button>

              </div>

            </section>

            {/* MEMBERSHIP */}

            <section className="profile-section">

              <div className="section-heading">
                <div>
                  <h2>Membership</h2>
                  <p>Your Brewed membership information.</p>
                </div>
              </div>

              <div className="membership-card">

                <div className="membership-left">

                  <div className="membership-icon">
                    ☕
                  </div>

                  <div>

                    <div className="membership-label">
                      Brewed
                    </div>

                    <div className="membership-value">
                      Brewed Member
                    </div>

                    <div className="membership-date">
                      Member since{" "}
                      {memberSince || "Today"}
                    </div>

                  </div>

                </div>

                <button
                  type="button"
                  className="rewards-button"
                  onClick={() => setPage("rewards")}
                >
                  View Rewards →
                </button>

              </div>

            </section>

            {/* SAVE */}

            <div className="bottom-actions">

              <button
                type="submit"
                className="save-btn"
                disabled={isProcessing}
              >
                {isProcessing
                  ? "Saving changes..."
                  : "Save Changes"}
              </button>

            </div>

          </form>

        </div>
      </div>
    </>
  );
}
