import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import {
  updateEmail,
  updateProfile,
  updatePhoneNumber,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
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

import {
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  Coffee,
  Home,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

/* ============================================================
   HELPERS
============================================================ */

const GOOGLE_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;

const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

const normalizePhone = (value = "") =>
  value.replace(/\s+/g, "").trim();

const formatPhoneForDisplay = (value = "") => {
  if (!value) return "";

  const cleaned = normalizePhone(value);

  if (cleaned.length <= 4) return cleaned;

  return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
};

const getFriendlyAuthError = (error) => {
  switch (error?.code) {
    case "auth/invalid-phone-number":
      return "Please enter a valid phone number with country code.";

    case "auth/too-many-requests":
      return "Too many verification attempts. Please try again later.";

    case "auth/quota-exceeded":
      return "SMS verification limit reached. Please try again later.";

    case "auth/invalid-verification-code":
      return "That verification code is incorrect.";

    case "auth/code-expired":
      return "That verification code has expired. Please request a new one.";

    case "auth/phone-number-already-exists":
      return "This phone number is already associated with another Brewed account.";

    case "auth/credential-already-in-use":
      return "This phone number is already associated with another account.";

    case "auth/requires-recent-login":
      return "For your security, please sign in again before changing your phone number.";

    case "auth/email-already-in-use":
      return "That email address is already associated with another account.";

    case "auth/invalid-email":
      return "Please enter a valid email address.";

    case "auth/user-token-expired":
      return "Your session has expired. Please sign in again.";

    case "auth/network-request-failed":
      return "A network error occurred. Please check your connection and try again.";

    default:
      return (
        error?.message ||
        "Something went wrong. Please try again."
      );
  }
};

/* ============================================================
   COMPONENT
============================================================ */

export default function ProfilePage({ setPage }) {
  const { currentUser } = useAuth();

  /* ----------------------------------------------------------
     PROFILE STATE
  ---------------------------------------------------------- */

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

  /* ----------------------------------------------------------
     VERIFICATION STATE
  ---------------------------------------------------------- */

  const [phoneVerified, setPhoneVerified] = useState(false);
  const [originalPhone, setOriginalPhone] = useState("");

  const [phoneModalOpen, setPhoneModalOpen] =
    useState(false);

  const [phoneModalStep, setPhoneModalStep] =
    useState("phone");

  const [pendingPhone, setPendingPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [verificationId, setVerificationId] =
    useState(null);

  const [isPhoneProcessing, setIsPhoneProcessing] =
    useState(false);

  const [phoneModalError, setPhoneModalError] =
    useState("");

  const [phoneModalMessage, setPhoneModalMessage] =
    useState("");

  const [emailVerified, setEmailVerified] =
    useState(false);

  const [emailModalOpen, setEmailModalOpen] =
    useState(false);

  const [isEmailProcessing, setIsEmailProcessing] =
    useState(false);

  const [emailModalMessage, setEmailModalMessage] =
    useState("");

  const [emailModalError, setEmailModalError] =
    useState("");

  /* ----------------------------------------------------------
     REFS
  ---------------------------------------------------------- */

  const recaptchaContainerRef = useRef(null);

  /* ==========================================================
     LOAD PROFILE
  ========================================================== */

  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const fetchProfile = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        /*
         * Firebase Auth values
         */

        if (!mounted) return;

        setFullName(currentUser.displayName || "");
        setEmail(currentUser.email || "");
        setEmailVerified(currentUser.emailVerified === true);

        if (currentUser.photoURL) {
          setAvatarUrl(currentUser.photoURL);
        }

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

        /*
         * Firestore profile
         */

        const userRef = doc(
          db,
          "users",
          currentUser.uid
        );

        const snapshot = await getDoc(userRef);

        if (!mounted) return;

        if (!snapshot.exists()) {
          setOriginalPhone("");
          setPhoneVerified(false);
          return;
        }

        const data = snapshot.data();

        const storedPhone = data.phone || "";

        setPhone(storedPhone);
        setOriginalPhone(storedPhone);
        setPhoneVerified(
          data.phoneVerified === true
        );

        setAddressType(
          data.addressType || "home"
        );

        /*
         * Address compatibility
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

        /*
         * Birthday
         */

        if (data.birthday) {
          setBirthday(data.birthday);
          setIsBirthdayLocked(true);
        }

        /*
         * Profile photo
         */

        if (data.photoURL) {
          setAvatarUrl(data.photoURL);
        }
      } catch (error) {
        console.error(
          "Error loading profile:",
          error
        );

        if (mounted) {
          setErrorMessage(
            "Unable to load your profile. Please try again."
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      mounted = false;
    };
  }, [currentUser]);

  /* ==========================================================
     REFRESH AUTH VERIFICATION STATUS
  ========================================================== */

  const refreshEmailVerificationStatus = async () => {
    if (!currentUser) return false;

    try {
      await reload(currentUser);

      const verified =
        currentUser.emailVerified === true;

      setEmailVerified(verified);

      return verified;
    } catch (error) {
      console.error(
        "Unable to refresh email verification:",
        error
      );

      return false;
    }
  };

  /* ==========================================================
     PROFILE PHOTO
  ========================================================== */

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file || !currentUser) return;

    setMessage("");
    setErrorMessage("");

    if (!file.type.startsWith("image/")) {
      setErrorMessage(
        "Please select a valid image."
      );

      event.target.value = "";
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_SIZE) {
      setErrorMessage(
        "Profile photo must be smaller than 5MB."
      );

      event.target.value = "";
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

      await updateProfile(currentUser, {
        photoURL: downloadURL,
      });

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
        "Your profile photo has been updated."
      );
    } catch (error) {
      console.error(
        "Profile photo upload failed:",
        error
      );

      setErrorMessage(
        getFriendlyAuthError(error)
      );
    } finally {
      setIsProcessing(false);

      event.target.value = "";
    }
  };

  /* ==========================================================
     GOOGLE PLACES
  ========================================================== */

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

  const handleAddressChange = async (selected) => {
    if (!selected) {
      setAddress(null);
      return;
    }

    const placeId =
      selected.value?.place_id || "";

    const formatted =
      selected.label || "";

    setAddress({
      formatted,
      placeId,
      lat: null,
      lng: null,
    });

    if (placeId) {
      try {
        const coordinates =
          await getPlaceCoordinates(placeId);

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

  /* ==========================================================
     RECAPTCHA
  ========================================================== */

  const clearRecaptcha = () => {
    try {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }
    } catch (error) {
      console.warn(
        "Unable to clear reCAPTCHA:",
        error
      );
    }

    window.recaptchaVerifier = null;
  };

  const setupRecaptcha = () => {
    if (window.recaptchaVerifier) {
      return window.recaptchaVerifier;
    }

    if (!auth || !recaptchaContainerRef.current) {
      throw new Error(
        "Phone verification is temporarily unavailable."
      );
    }

    window.recaptchaVerifier =
      new RecaptchaVerifier(
        auth,
        recaptchaContainerRef.current,
        {
          size: "invisible",

          callback: () => {
            console.log(
              "Phone verification reCAPTCHA completed."
            );
          },

          "expired-callback": () => {
            clearRecaptcha();
          },
        }
      );

    return window.recaptchaVerifier;
  };

  /* ==========================================================
     OPEN PHONE MODAL
  ========================================================== */

  const openPhoneModal = () => {
    setPhoneModalError("");
    setPhoneModalMessage("");

    setPendingPhone(
      normalizePhone(phone)
    );

    setOtp("");
    setVerificationId(null);

    setPhoneModalStep("phone");

    setPhoneModalOpen(true);
  };

  /* ==========================================================
     CLOSE PHONE MODAL
  ========================================================== */

  const closePhoneModal = () => {
    if (isPhoneProcessing) return;

    clearRecaptcha();

    setPhoneModalOpen(false);
    setPhoneModalStep("phone");

    setPendingPhone("");
    setOtp("");
    setVerificationId(null);

    setPhoneModalError("");
    setPhoneModalMessage("");
  };

  /* ==========================================================
     SEND PHONE OTP
  ========================================================== */

  const handleSendPhoneOTP = async () => {
    if (!currentUser) return;

    const cleanedPhone =
      normalizePhone(pendingPhone);

    setPhoneModalError("");
    setPhoneModalMessage("");

    if (!PHONE_REGEX.test(cleanedPhone)) {
      setPhoneModalError(
        "Enter your phone number with country code, for example +919876543210."
      );

      return;
    }

    /*
     * If user is attempting to verify the same
     * already-verified number, simply close.
     */

    if (
      phoneVerified &&
      cleanedPhone ===
        normalizePhone(originalPhone)
    ) {
      setPhoneModalMessage(
        "This phone number is already verified."
      );

      return;
    }

    setIsPhoneProcessing(true);

    try {
      clearRecaptcha();

      /*
       * Wait for React to render the fresh
       * reCAPTCHA container before constructing it.
       */

      await new Promise((resolve) =>
        requestAnimationFrame(resolve)
      );

      const verifier = setupRecaptcha();

      const provider =
        new PhoneAuthProvider(auth);

      const id =
        await provider.verifyPhoneNumber(
          cleanedPhone,
          verifier
        );

      setVerificationId(id);
      setPendingPhone(cleanedPhone);
      setOtp("");

      setPhoneModalStep("otp");

      setPhoneModalMessage(
        `We sent a 6-digit code to ${formatPhoneForDisplay(
          cleanedPhone
        )}.`
      );
    } catch (error) {
      console.error(
        "Phone OTP error:",
        error
      );

      clearRecaptcha();

      setPhoneModalError(
        getFriendlyAuthError(error)
      );
    } finally {
      setIsPhoneProcessing(false);
    }
  };

  /* ==========================================================
     VERIFY PHONE OTP
  ========================================================== */

  const handleVerifyPhoneOTP = async () => {
    if (
      !currentUser ||
      !verificationId
    ) {
      setPhoneModalError(
        "Please request a new verification code."
      );

      return;
    }

    const cleanOTP =
      otp.replace(/\D/g, "").trim();

    if (!/^\d{6}$/.test(cleanOTP)) {
      setPhoneModalError(
        "Enter the 6-digit verification code."
      );

      return;
    }

    setIsPhoneProcessing(true);
    setPhoneModalError("");
    setPhoneModalMessage("");

    try {
      const credential =
        PhoneAuthProvider.credential(
          verificationId,
          cleanOTP
        );

      /*
       * Firebase may require a recent login
       * before replacing an existing phone credential.
       */

      await updatePhoneNumber(
        currentUser,
        credential
      );

      /*
       * Persist verified phone state.
       */

      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          phone: pendingPhone,
          phoneVerified: true,
          phoneVerifiedAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      setPhone(pendingPhone);
      setOriginalPhone(pendingPhone);
      setPhoneVerified(true);

      setPhoneModalMessage(
        "Your phone number has been verified."
      );

      setOtp("");
      setVerificationId(null);

      /*
       * Small success state before closing.
       */

      setTimeout(() => {
        closePhoneModal();
      }, 900);
    } catch (error) {
      console.error(
        "Phone OTP verification error:",
        error
      );

      if (
        error?.code ===
        "auth/code-expired"
      ) {
        setVerificationId(null);
        setPhoneModalStep("phone");
      }

      setPhoneModalError(
        getFriendlyAuthError(error)
      );
    } finally {
      setIsPhoneProcessing(false);
    }
  };

  /* ==========================================================
     RESEND PHONE OTP
  ========================================================== */

  const handleResendPhoneOTP = async () => {
    setVerificationId(null);
    setOtp("");
    setPhoneModalMessage("");

    await handleSendPhoneOTP();
  };

  /* ==========================================================
     EMAIL MODAL
  ========================================================== */

  const openEmailModal = async () => {
    setEmailModalError("");
    setEmailModalMessage("");

    const verified =
      await refreshEmailVerificationStatus();

    if (verified) {
      setEmailModalMessage(
        "Your email address is already verified."
      );
    }

    setEmailModalOpen(true);
  };

  const closeEmailModal = () => {
    if (isEmailProcessing) return;

    setEmailModalOpen(false);
    setEmailModalError("");
    setEmailModalMessage("");
  };

  /* ==========================================================
     SEND EMAIL VERIFICATION
  ========================================================== */

  const handleSendEmailVerification = async () => {
    if (!currentUser?.email) {
      setEmailModalError(
        "There is no email address associated with this account."
      );

      return;
    }

    setIsEmailProcessing(true);
    setEmailModalError("");
    setEmailModalMessage("");

    try {
      await sendEmailVerification(
        currentUser
      );

      setEmailModalMessage(
        `Verification email sent to ${currentUser.email}.`
      );
    } catch (error) {
      console.error(
        "Email verification failed:",
        error
      );

      setEmailModalError(
        getFriendlyAuthError(error)
      );
    } finally {
      setIsEmailProcessing(false);
    }
  };

  /* ==========================================================
     CHECK EMAIL
  ========================================================== */

  const handleCheckEmailVerification =
    async () => {
      setIsEmailProcessing(true);
      setEmailModalError("");
      setEmailModalMessage("");

      try {
        const verified =
          await refreshEmailVerificationStatus();

        if (verified) {
          setEmailModalMessage(
            "Email verified successfully."
          );

          setTimeout(() => {
            closeEmailModal();
          }, 900);
        } else {
          setEmailModalError(
            "Your email hasn't been verified yet. Open the verification email and tap the verification link."
          );
        }
      } catch (error) {
        setEmailModalError(
          getFriendlyAuthError(error)
        );
      } finally {
        setIsEmailProcessing(false);
      }
    };

  /* ==========================================================
     SAVE PROFILE
  ========================================================== */

  const handleSave = async (event) => {
    event.preventDefault();

    if (!currentUser) return;

    setMessage("");
    setErrorMessage("");

    const cleanedPhone =
      normalizePhone(phone);

    if (!cleanedPhone) {
      setErrorMessage(
        "Phone number is required."
      );

      return;
    }

    if (!phoneVerified) {
      setErrorMessage(
        "Please verify your phone number before saving your profile."
      );

      return;
    }

    if (!fullName.trim()) {
      setErrorMessage(
        "Please enter your full name."
      );

      return;
    }

    if (!email.trim()) {
      setErrorMessage(
        "Email address is required."
      );

      return;
    }

    setIsProcessing(true);

    try {
      /*
       * NAME
       */

      if (
        fullName.trim() !==
        (currentUser.displayName || "")
      ) {
        await updateProfile(
          currentUser,
          {
            displayName:
              fullName.trim(),
          }
        );
      }

      /*
       * EMAIL
       *
       * Changing email can require recent
       * authentication depending on Firebase state.
       */

      if (
        email.trim() !==
        (currentUser.email || "")
      ) {
        await updateEmail(
          currentUser,
          email.trim()
        );

        /*
         * New email should be verified again.
         */

        setEmailVerified(false);

        /*
         * Send verification to the new email.
         */

        try {
          await sendEmailVerification(
            currentUser
          );
        } catch (verificationError) {
          console.warn(
            "Email changed but verification email could not be sent:",
            verificationError
          );
        }
      }

      /*
       * FIRESTORE
       */

      const updateData = {
        fullName:
          fullName.trim(),

        email:
          email.trim(),

        phone:
          cleanedPhone,

        phoneVerified,

        address,
        addressType,

        updatedAt:
          serverTimestamp(),
      };

      /*
       * Birthday is intentionally immutable
       * after first save.
       */

      if (
        !isBirthdayLocked &&
        birthday
      ) {
        updateData.birthday =
          birthday;
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
        "Your profile has been saved."
      );
    } catch (error) {
      console.error(
        "Failed to save profile:",
        error
      );

      setErrorMessage(
        getFriendlyAuthError(error)
      );
    } finally {
      setIsProcessing(false);
    }
  };

  /* ==========================================================
     PASSWORD RESET
  ========================================================== */

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
        getFriendlyAuthError(error)
      );
    } finally {
      setIsPasswordProcessing(false);
    }
  };

  /* ==========================================================
     AVATAR
  ========================================================== */

  const avatar = useMemo(() => {
    if (avatarUrl) return avatarUrl;

    return `https://ui-avatars.com/api/?background=EFE6DB&color=4B2E20&bold=true&name=${encodeURIComponent(
      fullName || "User"
    )}`;
  }, [avatarUrl, fullName]);

  /* ==========================================================
     LOADING
  ========================================================== */

  if (isLoading) {
    return (
      <>
        <style>{PROFILE_STYLES}</style>

        <div className="brew-profile-loading">
          <div className="brew-loading-mark">
            <Coffee size={20} strokeWidth={1.7} />
          </div>

          <span>Preparing your profile</span>
        </div>
      </>
    );
  }

  /* ==========================================================
     UI
  ========================================================== */

  return (
    <>
      <style>{PROFILE_STYLES}</style>

      <main className="brew-profile-page">

        {/* ---------------------------------------------------
            BACK
        --------------------------------------------------- */}

        <button
          type="button"
          className="brew-back"
          onClick={() => setPage("menu")}
        >
          <ArrowLeft size={17} />
          <span>Back to menu</span>
        </button>

        {/* ---------------------------------------------------
            HERO
        --------------------------------------------------- */}

        <section className="brew-profile-shell">

          <div className="brew-profile-intro">
            <div className="brew-eyebrow">
              <Sparkles size={14} />
              YOUR BREWED
            </div>

            <h1>
              Make it
              <br />
              <em>yours.</em>
            </h1>

            <p>
              Keep your details, delivery
              preferences and Brewed
              experience beautifully up to date.
            </p>
          </div>

          {/* -------------------------------------------------
              PROFILE CARD
          ------------------------------------------------- */}

          <section className="brew-profile-card">

            {/* PHOTO */}

            <div className="brew-profile-photo-row">

              <label className="brew-avatar-wrap">

                <img
                  src={avatar}
                  alt="Your profile"
                  className="brew-avatar"
                />

                <span className="brew-avatar-edit">
                  <Camera
                    size={15}
                    strokeWidth={2}
                  />
                </span>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isProcessing}
                  hidden
                />
              </label>

              <div>
                <p className="brew-photo-label">
                  Your profile
                </p>

                <p className="brew-photo-copy">
                  Add a photo that feels like you.
                </p>

                <p className="brew-photo-meta">
                  JPG, PNG · max 5MB
                </p>
              </div>

            </div>

            {/* FORM */}

            <form onSubmit={handleSave}>

              {/* PERSONAL */}

              <div className="brew-section-head">
                <div>
                  <span>01</span>
                  <h2>Personal details</h2>
                </div>
              </div>

              <div className="brew-fields">

                {/* NAME */}

                <div className="brew-field brew-field-full">

                  <label>
                    Full name
                  </label>

                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) =>
                      setFullName(
                        event.target.value
                      )
                    }
                    placeholder="Your full name"
                    autoComplete="name"
                    required
                  />

                </div>

                {/* EMAIL */}

                <div className="brew-field">

                  <label>
                    Email address
                  </label>

                  <div className="brew-input-action">

                    <input
                      type="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(
                          event.target.value
                        )
                      }
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />

                    {!emailVerified && (
                      <button
                        type="button"
                        className="brew-field-action"
                        onClick={
                          openEmailModal
                        }
                      >
                        Verify
                      </button>
                    )}

                  </div>

                  <button
                    type="button"
                    className={`brew-inline-status ${
                      emailVerified
                        ? "is-verified"
                        : "is-unverified"
                    }`}
                    onClick={
                      emailVerified
                        ? undefined
                        : openEmailModal
                    }
                  >
                    <span className="brew-status-dot" />

                    {emailVerified
                      ? "Email verified"
                      : "Email verification required"}
                  </button>

                </div>

                {/* PHONE */}

                <div className="brew-field">

                  <label>
                    Phone number
                  </label>

                  <div className="brew-input-action">

                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => {
                        const value =
                          event.target.value;

                        setPhone(value);

                        /*
                         * Changing the phone
                         * immediately invalidates
                         * its previous verification.
                         */

                        if (
                          normalizePhone(
                            value
                          ) !==
                          normalizePhone(
                            originalPhone
                          )
                        ) {
                          setPhoneVerified(
                            false
                          );
                        }
                      }}
                      placeholder="+91 9876543210"
                      autoComplete="tel"
                      required
                    />

                    {!phoneVerified && (
                      <button
                        type="button"
                        className="brew-field-action"
                        onClick={
                          openPhoneModal
                        }
                      >
                        Verify
                      </button>
                    )}

                  </div>

                  <button
                    type="button"
                    className={`brew-inline-status ${
                      phoneVerified
                        ? "is-verified"
                        : "is-unverified"
                    }`}
                    onClick={
                      phoneVerified
                        ? undefined
                        : openPhoneModal
                    }
                  >
                    <span className="brew-status-dot" />

                    {phoneVerified
                      ? "Phone verified"
                      : "Phone verification required"}
                  </button>

                </div>

                {/* BIRTHDAY */}

                <div className="brew-field brew-field-full">

                  <label>
                    Birthday
                  </label>

                  <input
                    type={
                      isBirthdayLocked
                        ? "text"
                        : "date"
                    }
                    value={birthday}
                    onChange={(event) =>
                      setBirthday(
                        event.target.value
                      )
                    }
                    readOnly={
                      isBirthdayLocked
                    }
                    required
                    className={
                      isBirthdayLocked
                        ? "is-locked"
                        : ""
                    }
                  />

                  {isBirthdayLocked && (
                    <p className="brew-field-note">
                      Your birthday is locked
                      after the first save.
                    </p>
                  )}

                </div>

              </div>

              {/* ------------------------------------------------
                  DELIVERY
              ------------------------------------------------ */}

              <div className="brew-section-head brew-section-spaced">
                <div>
                  <span>02</span>
                  <h2>Delivery details</h2>
                </div>
              </div>

              <div className="brew-delivery-card">

                <div className="brew-delivery-icon">
                  <MapPin size={19} />
                </div>

                <div className="brew-delivery-content">

                  <label>
                    Address type
                  </label>

                  <div className="brew-address-types">

                    {[
                      {
                        value: "home",
                        label: "Home",
                        icon: Home,
                      },
                      {
                        value: "work",
                        label: "Work",
                        icon: Coffee,
                      },
                      {
                        value: "other",
                        label: "Other",
                        icon: MapPin,
                      },
                    ].map(
                      ({
                        value,
                        label,
                        icon: Icon,
                      }) => (
                        <label
                          key={value}
                          className={`brew-address-type ${
                            addressType === value
                              ? "is-active"
                              : ""
                          }`}
                        >
                          <input
                            type="radio"
                            name="addressType"
                            value={value}
                            checked={
                              addressType ===
                              value
                            }
                            onChange={(event) =>
                              setAddressType(
                                event.target
                                  .value
                              )
                            }
                          />

                          <Icon size={15} />

                          <span>
                            {label}
                          </span>
                        </label>
                      )
                    )}

                  </div>

                </div>

              </div>

              <div className="brew-address-field">

                {GOOGLE_API_KEY ? (
                  <GooglePlacesAutocomplete
                    apiKey={
                      GOOGLE_API_KEY
                    }
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
                        "Search your delivery address",

                      isClearable: true,

                      styles: {
                        control: (
                          provided,
                          state
                        ) => ({
                          ...provided,
                          minHeight: "58px",
                          borderRadius:
                            "16px",
                          border:
                            state.isFocused
                              ? "1px solid #9B6F4F"
                              : "1px solid #E7DED4",
                          boxShadow:
                            state.isFocused
                              ? "0 0 0 4px rgba(155,111,79,.08)"
                              : "none",
                          background:
                            "#FCFAF7",
                          padding:
                            "2px 8px",
                          transition:
                            "all .2s ease",
                        }),

                        input: (
                          provided
                        ) => ({
                          ...provided,
                          fontSize:
                            "14px",
                          color:
                            "#33231C",
                        }),

                        placeholder: (
                          provided
                        ) => ({
                          ...provided,
                          color:
                            "#9A8B82",
                        }),

                        singleValue: (
                          provided
                        ) => ({
                          ...provided,
                          color:
                            "#33231C",
                          fontSize:
                            "14px",
                        }),

                        menu: (
                          provided
                        ) => ({
                          ...provided,
                          zIndex: 10000,
                          borderRadius:
                            "14px",
                          overflow:
                            "hidden",
                          border:
                            "1px solid #E7DED4",
                          boxShadow:
                            "0 18px 45px rgba(55,38,27,.12)",
                        }),
                      },
                    }}
                  />
                ) : (
                  <div className="brew-config-warning">
                    Google Places is not configured.
                    Add{" "}
                    <strong>
                      VITE_GOOGLE_MAPS_API_KEY
                    </strong>{" "}
                    to your environment variables.
                  </div>
                )}

                <p className="brew-field-note">
                  Search and select the exact
                  address you'd like Brewed to use
                  for delivery.
                </p>

              </div>

              {/* ------------------------------------------------
                  MEMBERSHIP
              ------------------------------------------------ */}

              <div className="brew-section-head brew-section-spaced">
                <div>
                  <span>03</span>
                  <h2>Your Brewed membership</h2>
                </div>
              </div>

              <div className="brew-membership">

                <div className="brew-membership-mark">
                  <Coffee size={20} />
                </div>

                <div className="brew-membership-copy">
                  <span>Member since</span>

                  <strong>
                    {memberSince ||
                      "Today"}
                  </strong>
                </div>

                <div className="brew-membership-line" />

                <Sparkles
                  size={17}
                  className="brew-membership-spark"
                />

              </div>

              {/* ------------------------------------------------
                  MESSAGES
              ------------------------------------------------ */}

              {message && (
                <div className="brew-message brew-success">
                  <Check size={17} />
                  <span>{message}</span>
                </div>
              )}

              {errorMessage && (
                <div className="brew-message brew-error">
                  <X size={17} />
                  <span>
                    {errorMessage}
                  </span>
                </div>
              )}

              {/* ------------------------------------------------
                  ACTIONS
              ------------------------------------------------ */}

              <div className="brew-actions">

                <button
                  type="button"
                  className="brew-password-btn"
                  onClick={
                    handleChangePassword
                  }
                  disabled={
                    isPasswordProcessing ||
                    isProcessing
                  }
                >
                  {isPasswordProcessing ? (
                    <>
                      <Loader2
                        size={16}
                        className="brew-spin"
                      />
                      Sending
                    </>
                  ) : (
                    <>
                      Reset password
                      <ChevronRight
                        size={16}
                      />
                    </>
                  )}
                </button>

                <button
                  type="submit"
                  className="brew-save-btn"
                  disabled={
                    isProcessing
                  }
                >
                  {isProcessing ? (
                    <>
                      <Loader2
                        size={17}
                        className="brew-spin"
                      />
                      Saving
                    </>
                  ) : (
                    <>
                      Save changes
                      <Check size={17} />
                    </>
                  )}
                </button>

              </div>

            </form>

          </section>
        </section>

      </main>

      {/* ======================================================
          PHONE VERIFICATION MODAL
      ====================================================== */}

      {phoneModalOpen && (
        <div
          className="brew-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closePhoneModal();
            }
          }}
        >

          <div
            className="brew-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="phone-modal-title"
          >

            <button
              type="button"
              className="brew-modal-close"
              onClick={closePhoneModal}
              disabled={
                isPhoneProcessing
              }
            >
              <X size={18} />
            </button>

            <div className="brew-modal-icon">
              <Phone size={20} />
            </div>

            {phoneModalStep === "phone" ? (
              <>
                <span className="brew-modal-eyebrow">
                  PHONE VERIFICATION
                </span>

                <h2 id="phone-modal-title">
                  Verify your number
                </h2>

                <p className="brew-modal-copy">
                  We'll send a one-time
                  verification code to make
                  sure this number belongs to
                  you.
                </p>

                <div className="brew-modal-field">

                  <label>
                    Phone number
                  </label>

                  <input
                    type="tel"
                    value={pendingPhone}
                    onChange={(event) =>
                      setPendingPhone(
                        event.target.value
                      )
                    }
                    placeholder="+919876543210"
                    autoComplete="tel"
                    autoFocus
                  />

                </div>

                {phoneModalError && (
                  <div className="brew-modal-error">
                    <X size={15} />
                    {phoneModalError}
                  </div>
                )}

                {phoneModalMessage && (
                  <div className="brew-modal-success">
                    <Check size={15} />
                    {phoneModalMessage}
                  </div>
                )}

                <button
                  type="button"
                  className="brew-modal-primary"
                  onClick={
                    handleSendPhoneOTP
                  }
                  disabled={
                    isPhoneProcessing
                  }
                >
                  {isPhoneProcessing ? (
                    <>
                      <Loader2
                        size={17}
                        className="brew-spin"
                      />
                      Sending code
                    </>
                  ) : (
                    <>
                      Send verification code
                      <ChevronRight
                        size={17}
                      />
                    </>
                  )}
                </button>

                <p className="brew-modal-footnote">
                  Standard SMS rates may apply.
                </p>
              </>
            ) : (
              <>
                <span className="brew-modal-eyebrow">
                  ONE-TIME CODE
                </span>

                <h2 id="phone-modal-title">
                  Enter your code
                </h2>

                <p className="brew-modal-copy">
                  Enter the 6-digit code we
                  sent to{" "}
                  <strong>
                    {formatPhoneForDisplay(
                      pendingPhone
                    )}
                  </strong>
                  .
                </p>

                <div className="brew-otp-input-wrap">

                  <input
                    className="brew-otp-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(event) =>
                      setOtp(
                        event.target.value
                          .replace(
                            /\D/g,
                            ""
                          )
                      )
                    }
                    autoFocus
                    placeholder="000000"
                  />

                </div>

                {phoneModalError && (
                  <div className="brew-modal-error">
                    <X size={15} />
                    {phoneModalError}
                  </div>
                )}

                {phoneModalMessage && (
                  <div className="brew-modal-success">
                    <Check size={15} />
                    {phoneModalMessage}
                  </div>
                )}

                <button
                  type="button"
                  className="brew-modal-primary"
                  onClick={
                    handleVerifyPhoneOTP
                  }
                  disabled={
                    isPhoneProcessing ||
                    otp.length !== 6
                  }
                >
                  {isPhoneProcessing ? (
                    <>
                      <Loader2
                        size={17}
                        className="brew-spin"
                      />
                      Verifying
                    </>
                  ) : (
                    <>
                      Verify number
                      <Check size={17} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="brew-modal-secondary"
                  onClick={
                    handleResendPhoneOTP
                  }
                  disabled={
                    isPhoneProcessing
                  }
                >
                  <RotateCcw size={14} />
                  Send a new code
                </button>

                <button
                  type="button"
                  className="brew-modal-back-link"
                  onClick={() =>
                    setPhoneModalStep(
                      "phone"
                    )
                  }
                  disabled={
                    isPhoneProcessing
                  }
                >
                  Change phone number
                </button>
              </>
            )}

            <div
              ref={
                recaptchaContainerRef
              }
              className="brew-recaptcha"
            />

          </div>
        </div>
      )}

      {/* ======================================================
          EMAIL VERIFICATION MODAL
      ====================================================== */}

      {emailModalOpen && (
        <div
          className="brew-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeEmailModal();
            }
          }}
        >

          <div
            className="brew-modal brew-email-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="email-modal-title"
          >

            <button
              type="button"
              className="brew-modal-close"
              onClick={closeEmailModal}
              disabled={
                isEmailProcessing
              }
            >
              <X size={18} />
            </button>

            <div className="brew-modal-icon">
              {emailVerified ? (
                <Check size={20} />
              ) : (
                <Mail size={20} />
              )}
            </div>

            <span className="brew-modal-eyebrow">
              EMAIL VERIFICATION
            </span>

            <h2 id="email-modal-title">
              {emailVerified
                ? "You're all set."
                : "Verify your email"}
            </h2>

            <p className="brew-modal-copy">
              {emailVerified
                ? "Your email address has been successfully verified."
                : "We'll send a secure verification link to your email address."}
            </p>

            <div className="brew-email-preview">

              <Mail size={17} />

              <div>
                <span>Email address</span>
                <strong>
                  {currentUser?.email ||
                    email}
                </strong>
              </div>

            </div>

            {emailModalError && (
              <div className="brew-modal-error">
                <X size={15} />
                {emailModalError}
              </div>
            )}

            {emailModalMessage && (
              <div className="brew-modal-success">
                <Check size={15} />
                {emailModalMessage}
              </div>
            )}

            {!emailVerified && (
              <>
                <button
                  type="button"
                  className="brew-modal-primary"
                  onClick={
                    handleSendEmailVerification
                  }
                  disabled={
                    isEmailProcessing
                  }
                >
                  {isEmailProcessing ? (
                    <>
                      <Loader2
                        size={17}
                        className="brew-spin"
                      />
                      Sending
                    </>
                  ) : (
                    <>
                      Send verification email
                      <Mail size={17} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="brew-modal-secondary"
                  onClick={
                    handleCheckEmailVerification
                  }
                  disabled={
                    isEmailProcessing
                  }
                >
                  {isEmailProcessing ? (
                    <>
                      <Loader2
                        size={15}
                        className="brew-spin"
                      />
                      Checking
                    </>
                  ) : (
                    <>
                      I've verified my email
                      <Check size={15} />
                    </>
                  )}
                </button>
              </>
            )}

            {!emailVerified && (
              <p className="brew-modal-footnote">
                Check your spam or promotions
                folder if you don't see it.
              </p>
            )}

          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================
   PREMIUM BREWED STYLES
============================================================ */

const PROFILE_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;1,500;1,600&display=swap');

:root {
  --brew-ink: #33231C;
  --brew-brown: #5B3828;
  --brew-brown-dark: #42271C;
  --brew-muted: #8F8077;
  --brew-soft: #F5EFE8;
  --brew-paper: #FCFAF7;
  --brew-cream: #F8F3EC;
  --brew-line: #E8DED4;
  --brew-accent: #A47757;
  --brew-green: #55745A;
  --brew-red: #A6534D;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

button,
input {
  font: inherit;
}

.brew-profile-page {
  min-height: 100vh;
  background:
    radial-gradient(
      circle at 12% 10%,
      rgba(210,184,158,.16),
      transparent 27%
    ),
    radial-gradient(
      circle at 92% 70%,
      rgba(210,184,158,.10),
      transparent 28%
    ),
    #F9F6F1;

  color: var(--brew-ink);
  font-family: "DM Sans", sans-serif;

  padding:
    108px
    clamp(20px, 5vw, 78px)
    90px;
}

.brew-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;

  border: 0;
  background: transparent;

  color: #6F5D53;

  font-size: 13px;
  font-weight: 600;

  cursor: pointer;

  padding: 8px 0;

  transition:
    color .2s ease,
    transform .2s ease;
}

.brew-back:hover {
  color: var(--brew-brown);
  transform: translateX(-2px);
}

.brew-profile-shell {
  width: min(1120px, 100%);
  margin: 36px auto 0;
}

.brew-profile-intro {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, .62fr);
  align-items: end;

  gap: 60px;

  margin-bottom: 36px;
}

.brew-eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;

  color: var(--brew-accent);

  font-size: 10px;
  font-weight: 700;
  letter-spacing: .19em;
}

.brew-profile-intro h1 {
  margin: 13px 0 0;

  font-family: "Playfair Display", serif;

  font-size: clamp(52px, 7vw, 88px);
  line-height: .88;
  font-weight: 500;
  letter-spacing: -.055em;

  color: var(--brew-brown-dark);
}

.brew-profile-intro h1 em {
  color: var(--brew-accent);
  font-weight: 500;
}

.brew-profile-intro p {
  max-width: 340px;

  margin: 0 0 7px;

  color: #88786E;

  font-size: 14px;
  line-height: 1.8;
}

.brew-profile-card {
  background: rgba(255,255,255,.76);

  border:
    1px solid rgba(226,216,207,.9);

  border-radius: 28px;

  padding:
    clamp(26px, 4vw, 48px);

  box-shadow:
    0 25px 80px rgba(71,49,37,.075),
    0 3px 12px rgba(71,49,37,.025);

  backdrop-filter: blur(12px);
}

.brew-profile-photo-row {
  display: flex;
  align-items: center;
  gap: 20px;

  padding-bottom: 34px;

  border-bottom:
    1px solid var(--brew-line);

  margin-bottom: 36px;
}

.brew-avatar-wrap {
  position: relative;

  width: 88px;
  height: 88px;

  flex: 0 0 88px;

  cursor: pointer;
}

.brew-avatar {
  width: 88px;
  height: 88px;

  object-fit: cover;

  border-radius: 50%;

  border:
    4px solid #FFF;

  box-shadow:
    0 8px 25px rgba(62,42,31,.14);
}

.brew-avatar-edit {
  position: absolute;

  right: -1px;
  bottom: 0;

  width: 28px;
  height: 28px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 50%;

  background: var(--brew-brown);
  color: #FFF;

  border: 3px solid #FFF;

  box-shadow:
    0 4px 12px rgba(54,35,25,.18);
}

.brew-photo-label {
  margin: 0 0 4px;

  font-size: 14px;
  font-weight: 700;

  color: var(--brew-ink);
}

.brew-photo-copy {
  margin: 0;

  color: #81736B;

  font-size: 13px;
}

.brew-photo-meta {
  margin: 7px 0 0;

  color: #A09289;

  font-size: 11px;
  letter-spacing: .02em;
}

.brew-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;

  margin-bottom: 20px;
}

.brew-section-head > div {
  display: flex;
  align-items: center;
  gap: 13px;
}

.brew-section-head span {
  color: #B39A86;

  font-size: 10px;
  font-weight: 700;
  letter-spacing: .14em;
}

.brew-section-head h2 {
  margin: 0;

  font-family: "Playfair Display", serif;

  font-size: 24px;
  font-weight: 500;

  letter-spacing: -.025em;

  color: var(--brew-brown-dark);
}

.brew-section-spaced {
  margin-top: 44px;
}

.brew-fields {
  display: grid;

  grid-template-columns:
    repeat(2, minmax(0, 1fr));

  gap: 22px 20px;
}

.brew-field {
  min-width: 0;
}

.brew-field-full {
  grid-column: 1 / -1;
}

.brew-field label,
.brew-modal-field label,
.brew-delivery-content > label {
  display: block;

  margin-bottom: 8px;

  color: #66564D;

  font-size: 11px;
  font-weight: 700;

  letter-spacing: .06em;
  text-transform: uppercase;
}

.brew-field input,
.brew-modal-field input {
  width: 100%;

  height: 56px;

  border:
    1px solid var(--brew-line);

  border-radius: 15px;

  background: #FCFAF7;

  color: var(--brew-ink);

  padding:
    0 16px;

  outline: none;

  font-size: 14px;

  transition:
    border-color .2s ease,
    box-shadow .2s ease,
    background .2s ease;
}

.brew-field input::placeholder,
.brew-modal-field input::placeholder {
  color: #ADA198;
}

.brew-field input:focus,
.brew-modal-field input:focus {
  background: #FFF;

  border-color:
    rgba(145,103,73,.72);

  box-shadow:
    0 0 0 4px
    rgba(155,111,79,.075);
}

.brew-field input.is-locked {
  color: #87776D;
  background: #F4EFE9;
  cursor: default;
}

.brew-field-note {
  margin: 8px 0 0;

  color: #9B8D84;

  font-size: 11px;
  line-height: 1.55;
}

.brew-input-action {
  position: relative;
}

.brew-input-action input {
  padding-right: 90px;
}

.brew-field-action {
  position: absolute;

  top: 50%;
  right: 7px;

  transform: translateY(-50%);

  height: 42px;

  padding:
    0 13px;

  border: 0;
  border-radius: 11px;

  background: #EFE5DA;

  color: var(--brew-brown);

  font-size: 11px;
  font-weight: 700;

  cursor: pointer;

  transition:
    background .2s ease,
    transform .2s ease;
}

.brew-field-action:hover {
  background: #E5D6C8;
  transform:
    translateY(-50%)
    translateY(-1px);
}

.brew-inline-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  margin-top: 7px;

  padding: 0;

  border: 0;
  background: transparent;

  font-size: 11px;
  font-weight: 600;

  cursor: default;
}

.brew-inline-status.is-unverified {
  color: #A45B52;
  cursor: pointer;
}

.brew-inline-status.is-verified {
  color: var(--brew-green);
}

.brew-status-dot {
  width: 6px;
  height: 6px;

  border-radius: 50%;

  background: currentColor;
}

.brew-delivery-card {
  display: flex;
  align-items: flex-start;

  gap: 15px;

  padding: 18px;

  border-radius: 18px;

  background: #F8F3ED;

  border:
    1px solid #EDE3D9;
}

.brew-delivery-icon {
  width: 38px;
  height: 38px;

  display: flex;
  align-items: center;
  justify-content: center;

  flex: 0 0 38px;

  border-radius: 12px;

  background: #FFF;

  color: var(--brew-accent);

  box-shadow:
    0 4px 12px rgba(75,50,36,.06);
}

.brew-delivery-content {
  flex: 1;
  min-width: 0;
}

.brew-address-types {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.brew-address-type {
  display: inline-flex;
  align-items: center;
  gap: 7px;

  height: 38px;

  padding:
    0 12px;

  border:
    1px solid #E5D9CE;

  border-radius: 10px;

  background: rgba(255,255,255,.65);

  color: #77685F;

  font-size: 11px;
  font-weight: 600;

  cursor: pointer;

  transition:
    all .2s ease;
}

.brew-address-type input {
  display: none;
}

.brew-address-type.is-active {
  border-color: #C7AA92;
  background: #FFF;
  color: var(--brew-brown);
  box-shadow:
    0 3px 10px rgba(65,42,29,.06);
}

.brew-address-field {
  margin-top: 14px;
}

.brew-config-warning {
  padding: 15px;

  border-radius: 14px;

  background: #FBF0EE;

  color: #925149;

  font-size: 12px;
}

.brew-membership {
  display: flex;
  align-items: center;

  min-height: 84px;

  padding:
    17px 20px;

  border-radius: 18px;

  background:
    linear-gradient(
      120deg,
      #F5EDE4,
      #FAF7F2
    );

  border:
    1px solid #E8DCCF;
}

.brew-membership-mark {
  width: 44px;
  height: 44px;

  display: flex;
  align-items: center;
  justify-content: center;

  flex: 0 0 44px;

  border-radius: 14px;

  background: #FFF;

  color: var(--brew-brown);

  box-shadow:
    0 5px 15px rgba(65,42,29,.07);
}

.brew-membership-copy {
  display: flex;
  flex-direction: column;

  margin-left: 14px;
}

.brew-membership-copy span {
  color: #95847A;

  font-size: 10px;
  font-weight: 600;

  letter-spacing: .08em;
  text-transform: uppercase;
}

.brew-membership-copy strong {
  margin-top: 4px;

  color: var(--brew-brown-dark);

  font-family: "Playfair Display", serif;

  font-size: 18px;
  font-weight: 500;
}

.brew-membership-line {
  flex: 1;
}

.brew-membership-spark {
  color: #B98B63;
}

.brew-message {
  display: flex;
  align-items: center;
  gap: 9px;

  margin-top: 22px;

  padding: 13px 15px;

  border-radius: 13px;

  font-size: 12px;
  line-height: 1.5;
}

.brew-success {
  background: #EFF6EF;
  color: #4F7255;
}

.brew-error {
  background: #FBEEEE;
  color: #98514B;
}

.brew-actions {
  display: grid;

  grid-template-columns:
    minmax(0, .72fr)
    minmax(0, 1fr);

  gap: 10px;

  margin-top: 30px;

  padding-top: 27px;

  border-top:
    1px solid var(--brew-line);
}

.brew-password-btn,
.brew-save-btn {
  min-height: 56px;

  border-radius: 15px;

  display: flex;
  align-items: center;
  justify-content: center;

  gap: 9px;

  cursor: pointer;

  font-size: 12px;
  font-weight: 700;

  transition:
    transform .2s ease,
    box-shadow .2s ease,
    background .2s ease,
    opacity .2s ease;
}

.brew-password-btn {
  border:
    1px solid #E5DAD0;

  background: #FFF;

  color: var(--brew-brown);
}

.brew-password-btn:hover:not(:disabled) {
  background: #FAF6F1;
  transform: translateY(-1px);
}

.brew-save-btn {
  border: 0;

  background:
    linear-gradient(
      135deg,
      #543426,
      #704934
    );

  color: #FFF;

  box-shadow:
    0 8px 22px rgba(70,43,29,.17);
}

.brew-save-btn:hover:not(:disabled) {
  transform: translateY(-2px);

  box-shadow:
    0 12px 28px rgba(70,43,29,.22);
}

.brew-password-btn:disabled,
.brew-save-btn:disabled,
.brew-modal-primary:disabled,
.brew-modal-secondary:disabled {
  opacity: .58;
  cursor: not-allowed;
}

.brew-spin {
  animation:
    brew-spin .85s linear infinite;
}

@keyframes brew-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ============================================================
   MODALS
============================================================ */

.brew-modal-backdrop {
  position: fixed;

  inset: 0;

  z-index: 99999;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 20px;

  background:
    rgba(38,26,20,.48);

  backdrop-filter:
    blur(10px);

  animation:
    brew-fade-in .2s ease;
}

@keyframes brew-fade-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.brew-modal {
  position: relative;

  width: min(430px, 100%);

  padding: 35px;

  border:
    1px solid rgba(225,214,204,.95);

  border-radius: 26px;

  background:
    linear-gradient(
      145deg,
      #FFFDFC,
      #F9F5EF
    );

  box-shadow:
    0 30px 100px rgba(30,19,13,.22);

  animation:
    brew-modal-in .25s ease;
}

@keyframes brew-modal-in {
  from {
    opacity: 0;
    transform:
      translateY(12px)
      scale(.985);
  }

  to {
    opacity: 1;
    transform:
      translateY(0)
      scale(1);
  }
}

.brew-modal-close {
  position: absolute;

  top: 16px;
  right: 16px;

  width: 34px;
  height: 34px;

  display: flex;
  align-items: center;
  justify-content: center;

  border: 0;
  border-radius: 50%;

  background: #F2ECE5;

  color: #76665C;

  cursor: pointer;

  transition:
    background .2s ease,
    transform .2s ease;
}

.brew-modal-close:hover:not(:disabled) {
  background: #E9DED3;
  transform: rotate(4deg);
}

.brew-modal-icon {
  width: 48px;
  height: 48px;

  display: flex;
  align-items: center;
  justify-content: center;

  margin-bottom: 22px;

  border-radius: 15px;

  background: #EFE4D8;

  color: var(--brew-brown);
}

.brew-modal-eyebrow {
  display: block;

  color: #A17D61;

  font-size: 9px;
  font-weight: 700;

  letter-spacing: .2em;
}

.brew-modal h2 {
  margin:
    8px 0 9px;

  color: var(--brew-brown-dark);

  font-family:
    "Playfair Display",
    serif;

  font-size: 31px;
  font-weight: 500;

  letter-spacing: -.035em;
}

.brew-modal-copy {
  margin: 0 0 25px;

  color: #82736A;

  font-size: 13px;
  line-height: 1.7;
}

.brew-modal-copy strong {
  color: var(--brew-brown);
  font-weight: 700;
}

.brew-modal-field {
  margin-bottom: 17px;
}

.brew-modal-error,
.brew-modal-success {
  display: flex;
  align-items: flex-start;
  gap: 8px;

  margin:
    12px 0;

  padding: 11px 12px;

  border-radius: 11px;

  font-size: 11px;
  line-height: 1.5;
}

.brew-modal-error {
  background: #FBEEEE;
  color: #97504A;
}

.brew-modal-success {
  background: #EEF6EF;
  color: #4D7254;
}

.brew-modal-primary {
  width: 100%;

  min-height: 52px;

  display: flex;
  align-items: center;
  justify-content: center;

  gap: 8px;

  border: 0;
  border-radius: 14px;

  background:
    linear-gradient(
      135deg,
      #513124,
      #714A35
    );

  color: #FFF;

  font-size: 12px;
  font-weight: 700;

  cursor: pointer;

  box-shadow:
    0 8px 20px rgba(70,43,29,.15);

  transition:
    transform .2s ease,
    box-shadow .2s ease;
}

.brew-modal-primary:hover:not(:disabled) {
  transform: translateY(-1px);

  box-shadow:
    0 12px 25px rgba(70,43,29,.19);
}

.brew-modal-secondary {
  width: 100%;

  min-height: 48px;

  display: flex;
  align-items: center;
  justify-content: center;

  gap: 7px;

  margin-top: 9px;

  border:
    1px solid #E5D9CE;

  border-radius: 13px;

  background: rgba(255,255,255,.7);

  color: var(--brew-brown);

  font-size: 11px;
  font-weight: 700;

  cursor: pointer;
}

.brew-modal-secondary:hover:not(:disabled) {
  background: #FFF;
}

.brew-modal-back-link {
  display: block;

  margin: 17px auto 0;

  border: 0;
  background: transparent;

  color: #9B7C64;

  font-size: 11px;
  font-weight: 600;

  cursor: pointer;
}

.brew-modal-back-link:hover {
  color: var(--brew-brown);
}

.brew-modal-footnote {
  margin:
    15px 0 0;

  color: #A1948C;

  font-size: 10px;

  text-align: center;

  line-height: 1.5;
}

.brew-otp-input-wrap {
  margin:
    3px 0 15px;
}

.brew-otp-input {
  width: 100%;

  height: 68px;

  border:
    1px solid #E3D7CD;

  border-radius: 16px;

  background: #FFF;

  color: var(--brew-brown-dark);

  text-align: center;

  font-family:
    "DM Sans",
    sans-serif;

  font-size: 26px;
  font-weight: 700;

  letter-spacing: .42em;

  padding-left: .42em;

  outline: none;

  transition:
    border-color .2s ease,
    box-shadow .2s ease;
}

.brew-otp-input:focus {
  border-color: #A98263;

  box-shadow:
    0 0 0 4px
    rgba(155,111,79,.08);
}

.brew-email-preview {
  display: flex;
  align-items: center;
  gap: 12px;

  margin:
    0 0 17px;

  padding: 14px;

  border:
    1px solid #E9DED4;

  border-radius: 14px;

  background: rgba(255,255,255,.62);

  color: var(--brew-accent);
}

.brew-email-preview > div {
  min-width: 0;

  display: flex;
  flex-direction: column;
  gap: 3px;
}

.brew-email-preview span {
  color: #9A8B82;

  font-size: 9px;
  font-weight: 700;

  text-transform: uppercase;
  letter-spacing: .08em;
}

.brew-email-preview strong {
  overflow: hidden;

  color: var(--brew-ink);

  font-size: 12px;

  text-overflow: ellipsis;
  white-space: nowrap;
}

.brew-recaptcha {
  position: absolute;

  width: 1px;
  height: 1px;

  overflow: hidden;

  opacity: 0;
  pointer-events: none;
}

/* ============================================================
   LOADING
============================================================ */

.brew-profile-loading {
  min-height: 100vh;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  gap: 12px;

  background: #F9F6F1;

  color: #8C7B71;

  font-family:
    "DM Sans",
    sans-serif;

  font-size: 12px;
}

.brew-loading-mark {
  width: 44px;
  height: 44px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 14px;

  background: #EFE5DA;

  color: var(--brew-brown);
}

/* ============================================================
   RESPONSIVE
============================================================ */

@media (max-width: 820px) {
  .brew-profile-page {
    padding:
      92px
      20px
      55px;
  }

  .brew-profile-intro {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .brew-profile-intro p {
    max-width: 500px;
  }

  .brew-profile-intro h1 {
    font-size: clamp(52px, 15vw, 78px);
  }
}

@media (max-width: 640px) {
  .brew-profile-page {
    padding:
      80px
      14px
      35px;
  }

  .brew-profile-shell {
    margin-top: 28px;
  }

  .brew-profile-card {
    padding:
      23px
      17px;

    border-radius: 22px;
  }

  .brew-profile-intro {
    margin-bottom: 25px;
  }

  .brew-profile-intro h1 {
    font-size: 57px;
  }

  .brew-profile-intro p {
    font-size: 13px;
  }

  .brew-profile-photo-row {
    gap: 14px;
    padding-bottom: 26px;
    margin-bottom: 28px;
  }

  .brew-avatar-wrap,
  .brew-avatar {
    width: 72px;
    height: 72px;
  }

  .brew-avatar-wrap {
    flex-basis: 72px;
  }

  .brew-avatar-edit {
    width: 25px;
    height: 25px;
  }

  .brew-fields {
    grid-template-columns: 1fr;
    gap: 19px;
  }

  .brew-field-full {
    grid-column: auto;
  }

  .brew-section-head h2 {
    font-size: 21px;
  }

  .brew-section-spaced {
    margin-top: 36px;
  }

  .brew-delivery-card {
    padding: 15px;
  }

  .brew-address-types {
    gap: 6px;
  }

  .brew-address-type {
    flex: 1;
    justify-content: center;
  }

  .brew-membership {
    min-height: 76px;
    padding: 14px;
  }

  .brew-membership-line {
    display: none;
  }

  .brew-membership-spark {
    margin-left: auto;
  }

  .brew-actions {
    grid-template-columns: 1fr;
  }

  .brew-modal {
    padding:
      29px
      21px
      24px;

    border-radius: 22px;
  }

  .brew-modal h2 {
    font-size: 28px;
  }
}

@media (max-width: 420px) {
  .brew-profile-page {
    padding-left: 11px;
    padding-right: 11px;
  }

  .brew-profile-card {
    padding:
      20px
      14px;
  }

  .brew-profile-intro h1 {
    font-size: 50px;
  }

  .brew-photo-copy {
    font-size: 12px;
  }

  .brew-input-action input {
    padding-right: 78px;
  }

  .brew-field-action {
    padding: 0 10px;
    font-size: 10px;
  }

  .brew-address-type {
    padding: 0 8px;
    font-size: 10px;
  }
}
`;
