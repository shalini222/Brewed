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

  // Address is now stored as an object
  const [address, setAddress] = useState(null);
  const [addressType, setAddressType] = useState("home");

  const [memberSince, setMemberSince] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPasswordProcessing, setIsPasswordProcessing] = useState(false);

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
        // Firebase Auth data
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

        // Firestore profile data
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          setPhone(data.phone || "");
          setAddressType(data.addressType || "home");

          /*
           * Supports both:
           *
           * New:
           * address: {
           *   formatted,
           *   placeId,
           *   lat,
           *   lng
           * }
           *
           * Old:
           * address: "some address"
           *
           * This prevents existing Brewed users from breaking.
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
        setErrorMessage("Unable to load your profile. Please try again.");
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

    // Basic validation
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Profile photo must be smaller than 5MB.");
      return;
    }

    setIsProcessing(true);
    setMessage("");
    setErrorMessage("");

    try {
      /*
       * Upload directly to Firebase Storage.
       *
       * users/{uid}/profile.jpg
       */
      const storageRef = ref(
        storage,
        `users/${currentUser.uid}/profile.jpg`
      );

      await uploadBytes(storageRef, file, {
        contentType: file.type,
      });

      const downloadURL = await getDownloadURL(storageRef);

      // Update Firebase Auth profile
      await updateProfile(currentUser, {
        photoURL: downloadURL,
      });

      // Update Firestore profile
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
      setIsProcessing(false);

      // Allows selecting the same image again
      e.target.value = "";
    }
  };

  /*
   * ---------------------------------------------------------
   * GOOGLE PLACES
   * ---------------------------------------------------------
   */

  const handleAddressChange = (selected) => {
    if (!selected) {
      setAddress(null);
      return;
    }

    /*
     * react-google-places-autocomplete gives us
     * place_id through selected.value.place_id.
     *
     * We initially store the formatted label.
     *
     * Coordinates can be populated when the Places
     * details API is configured/available.
     */
    setAddress({
      formatted: selected.label || "",
      placeId: selected.value?.place_id || "",
      lat: null,
      lng: null,
    });
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

      /*
       * Firestore profile.
       */
      const updateData = {
        fullName,
        email,
        phone,
        address,
        addressType,
        updatedAt: serverTimestamp(),
      };

      /*
       * Birthday is permanently locked after
       * the first successful save.
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

      setMessage("Profile saved successfully.");
    } catch (error) {
      console.error("Failed to save profile:", error);

      /*
       * Firebase email updates can require recent
       * authentication.
       */
      if (error.code === "auth/requires-recent-login") {
        setErrorMessage(
          "Please sign in again before changing your email."
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
   * CHANGE PASSWORD
   * ---------------------------------------------------------
   */

  const handleChangePassword = async () => {
    if (!currentUser?.email) {
      setErrorMessage("No email address is associated with this account.");
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
      console.error("Password reset failed:", error);

      setErrorMessage(
        error.message || "Unable to send password reset email."
      );
    } finally {
      setIsPasswordProcessing(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * AVATAR FALLBACK
   * ---------------------------------------------------------
   */

  const avatar =
    avatarUrl ||
    `https://ui-avatars.com/api/?background=C4956A&color=fff&name=${encodeURIComponent(
      fullName || "User"
    )}`;

  /*
   * ---------------------------------------------------------
   * LOADING STATE
   * ---------------------------------------------------------
   */

  if (isLoading) {
    return (
      <>
        <style>{`
          body {
            margin: 0;
            background: #FDFAF5;
          }

          .profile-loading {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #FDFAF5;
            color: #3B1A08;
            font-family: Inter, sans-serif;
            font-size: 16px;
          }
        `}</style>

        <div className="profile-loading">
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

        .profile-avatar {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          object-fit: cover;
          border: 5px solid #C4956A;
          cursor: pointer;
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

        input[readonly]::-webkit-calendar-picker-indicator {
          display: none;
        }

        .member-box {
          margin-top: 25px;
          padding: 18px;
          background: #F8F4EE;
          border-radius: 14px;
        }

        .member-value {
          margin-top: 5px;
          font-size: 1.1rem;
          font-weight: 600;
          color: #3B1A08;
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

        .save-btn {
          flex: 1;
          padding: 15px;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          font-weight: 600;
          background: #3B1A08;
          color: white;
          transition: .3s;
        }

        .save-btn:hover {
          background: #C4956A;
        }

        .save-btn:disabled,
        .password-btn:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .password-btn {
          flex: 1;
          padding: 15px;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          font-weight: 600;
          background: #F8F4EE;
          color: #3B1A08;
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

        .address-note {
          margin-top: 8px;
          font-size: 12px;
          color: #8A7770;
        }

        .birthday-note {
          margin-top: 8px;
          font-size: 12px;
          color: #8A7770;
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

          <div className="profile-header">

            <label style={{ cursor: "pointer" }}>
              <img
                src={avatar}
                alt="Profile"
                className="profile-avatar"
              />

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
                ? "Saving..."
                : "Manage your Brewed account."}
            </div>

          </div>

          <form onSubmit={handleSave}>

            <div className="section-title">
              Personal Information
            </div>

            <div className="form-grid">

              {/* FULL NAME */}

              <div className="form-group full">
                <label>Full Name</label>

                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              {/* EMAIL */}

              <div className="form-group">
                <label>Email</label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* PHONE */}

              <div className="form-group">
                <label>Phone Number</label>

                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {/* ADDRESS TYPE */}

              <div className="form-group full">
                <label>Address Type</label>

                <div className="radio-group">

                  {["home", "work", "other"].map((type) => (
                    <label
                      key={type}
                      className="radio-option"
                    >
                      <input
                        type="radio"
                        name="addressType"
                        value={type}
                        checked={addressType === type}
                        onChange={(e) =>
                          setAddressType(e.target.value)
                        }
                        style={{ display: "none" }}
                      />

                      <div className="radio-circle">
                        <div className="radio-dot" />
                      </div>

                      {type.charAt(0).toUpperCase() +
                        type.slice(1)}
                    </label>
                  ))}

                </div>
              </div>

              {/* ADDRESS */}

              <div className="form-group full">
                <label>Address</label>

                
                
   <GooglePlacesAutocomplete
  apiKey="YOUR_GOOGLE_API_KEY"
  selectProps={{
    value: address
      ? {
          label: address.formatted || "",
          value: {
            place_id: address.placeId || "",
            description: address.formatted || "",
          },
        }
      : null,

    onChange: (selected) => {
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
    },

    placeholder: "Start typing your address...",

    styles: {
      control: (provided, state) => ({
        ...provided,
        padding: "5px",
        borderRadius: "12px",
        borderColor: state.isFocused ? "#C4956A" : "#DDD",
        boxShadow: state.isFocused
          ? "0 0 0 3px rgba(196,149,106,.15)"
          : "none",
      }),

      input: (provided) => ({
        ...provided,
        fontSize: "15px",
      }),

      placeholder: (provided) => ({
        ...provided,
        color: "#999",
      }),
    },
  }}
/>     
  

              
                
                
                
                
                
                
                <div className="address-note">
                  Select your address from the suggestions.
                </div>
              </div>

              {/* BIRTHDAY */}

              <div className="form-group full">
                <label>
                  Birthday{" "}
                  <span style={{ color: "#C4956A" }}>
                    *
                  </span>
                </label>

                <input
                  type={isBirthdayLocked ? "text" : "date"}
                  value={birthday}
                  onChange={(e) =>
                    setBirthday(e.target.value)
                  }
                  required
                  readOnly={isBirthdayLocked}
                  style={{
                    backgroundColor: isBirthdayLocked
                      ? "#F8F4EE"
                      : "white",

                    cursor: isBirthdayLocked
                      ? "default"
                      : "text",
                  }}
                />

                {isBirthdayLocked && (
                  <div className="birthday-note">
                    Your birthday cannot be changed after it
                    has been saved.
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
                ☕ {memberSince || "Today"}
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
                onClick={handleChangePassword}
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
