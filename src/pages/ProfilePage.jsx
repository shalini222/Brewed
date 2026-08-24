import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import {
  PhoneAuthProvider,
  RecaptchaVerifier,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateEmail,
  updatePhoneNumber,
  updateProfile,
  reload,
} from "firebase/auth";

import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

import {
  Camera,
  Check,
  ChevronLeft,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  X,
  Crown,
} from "lucide-react";

import { db, storage, auth } from "../firebase";

import GooglePlacesAutocomplete from "react-google-places-autocomplete";

export default function ProfilePage({ setPage }) {
  const { currentUser } = useAuth();

  // =========================================================
  // STATE
  // =========================================================

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");

  const [address, setAddress] = useState(null);
  const [addressType, setAddressType] = useState("home");

  const [memberSince, setMemberSince] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [loyaltyTier, setLoyaltyTier] = useState("Bronze");

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPasswordProcessing, setIsPasswordProcessing] =
    useState(false);

  const [isBirthdayLocked, setIsBirthdayLocked] =
    useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // ---------------------------------------------------------
  // ORIGINAL VERIFIED CONTACT VALUES
  // ---------------------------------------------------------

  const [originalPhone, setOriginalPhone] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");

  // ---------------------------------------------------------
  // PHONE VERIFICATION
  // ---------------------------------------------------------

  const [phoneVerified, setPhoneVerified] = useState(false);
  const [pendingPhone, setPendingPhone] = useState("");

  const [otp, setOtp] = useState("");
  const [verificationId, setVerificationId] =
    useState(null);

  const [isPhoneProcessing, setIsPhoneProcessing] =
    useState(false);

  const [showPhoneModal, setShowPhoneModal] =
    useState(false);

  // ---------------------------------------------------------
  // EMAIL VERIFICATION
  // ---------------------------------------------------------

  const [emailVerified, setEmailVerified] =
    useState(false);

  const [isEmailProcessing, setIsEmailProcessing] =
    useState(false);

  const [showEmailModal, setShowEmailModal] =
    useState(false);

  // =========================================================
  // CONFIG
  // =========================================================

  const googleApiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  // =========================================================
  // HELPERS
  // =========================================================

  const clearMessages = () => {
    setMessage("");
    setErrorMessage("");
  };

  const normalizePhone = (value) =>
    value.trim().replace(/\s+/g, "");

  const normalizeEmail = (value) =>
    value.trim().toLowerCase();

  const phoneChanged = useMemo(() => {
    return (
      normalizePhone(phone) !==
      normalizePhone(originalPhone)
    );
  }, [phone, originalPhone]);

  const emailChanged = useMemo(() => {
    return (
      normalizeEmail(email) !==
      normalizeEmail(originalEmail)
    );
  }, [email, originalEmail]);

  // =========================================================
  // LOYALTY TIER
  // =========================================================

  const normalizedTier =
    String(loyaltyTier || "Bronze").trim();

  const tierConfig = {
    Bronze: {
      label: "Bronze",
      icon: "✦",
      className: "tier-bronze",
    },

    Silver: {
      label: "Silver",
      icon: "✧",
      className: "tier-silver",
    },

    Gold: {
      label: "Gold",
      icon: "✦",
      className: "tier-gold",
    },

    Platinum: {
      label: "Platinum",
      icon: "◇",
      className: "tier-platinum",
    },
  };

  const currentTier =
    tierConfig[normalizedTier] ||
    tierConfig.Bronze;

  // =========================================================
  // LOAD PROFILE
  // =========================================================

  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const fetchProfile = async () => {
      setIsLoading(true);
      clearMessages();

      try {
        await reload(currentUser);

        if (!mounted) return;

        setFullName(currentUser.displayName || "");
        setEmail(currentUser.email || "");

        setOriginalEmail(
          normalizeEmail(currentUser.email || "")
        );

        setEmailVerified(
          currentUser.emailVerified === true
        );

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

        const userRef = doc(
          db,
          "users",
          currentUser.uid
        );

        const snapshot = await getDoc(userRef);

        if (!mounted) return;

        if (!snapshot.exists()) {
          setIsLoading(false);
          return;
        }

        const data = snapshot.data();

        // -----------------------------------------------------
        // TIER
        // -----------------------------------------------------

        setLoyaltyTier(
          data.tier || "Bronze"
        );

        // -----------------------------------------------------
        // PHONE
        // -----------------------------------------------------

        const storedPhone =
          normalizePhone(data.phone || "");

        setPhone(storedPhone);
        setOriginalPhone(storedPhone);

        setPhoneVerified(
          data.phoneVerified === true
        );

        // -----------------------------------------------------
        // ADDRESS
        // -----------------------------------------------------

        setAddressType(
          data.addressType || "home"
        );

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

        // -----------------------------------------------------
        // BIRTHDAY
        // -----------------------------------------------------

        if (data.birthday) {
          setBirthday(data.birthday);
          setIsBirthdayLocked(true);
        }

        // -----------------------------------------------------
        // PHOTO
        // -----------------------------------------------------

        if (data.photoURL) {
          setAvatarUrl(data.photoURL);
        }
      } catch (error) {
        console.error(
          "Profile loading failed:",
          error
        );

        if (mounted) {
          setErrorMessage(
            "We couldn't load your profile. Please try again."
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

  // =========================================================
  // PROFILE PHOTO
  // =========================================================

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file || !currentUser) return;

    clearMessages();

    if (!file.type.startsWith("image/")) {
      setErrorMessage(
        "Please choose a valid image file."
      );

      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage(
        "Your profile photo must be smaller than 5MB."
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
        { merge: true }
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
        error.message ||
          "Unable to update your profile photo."
      );
    } finally {
      setIsProcessing(false);
      event.target.value = "";
    }
  };

  // =========================================================
  // GOOGLE PLACE COORDINATES
  // =========================================================

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
        { placeId },
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

  // =========================================================
  // ADDRESS
  // =========================================================

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

    if (!placeId) return;

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
        "Address coordinate lookup failed:",
        error
      );
    }
  };

  // =========================================================
  // RECAPTCHA
  // =========================================================

  const setupRecaptcha = () => {
    if (window.recaptchaVerifier) {
      return window.recaptchaVerifier;
    }

    const verifier = new RecaptchaVerifier(
      auth,
      "phone-recaptcha",
      {
        size: "invisible",

        callback: () => {
          console.log(
            "Phone reCAPTCHA completed."
          );
        },

        "expired-callback": () => {
          try {
            window.recaptchaVerifier?.clear();
          } catch {}

          window.recaptchaVerifier = null;
        },
      }
    );

    window.recaptchaVerifier = verifier;

    return verifier;
  };

  const clearRecaptcha = () => {
    try {
      window.recaptchaVerifier?.clear();
    } catch {}

    window.recaptchaVerifier = null;
  };

  // =========================================================
  // PHONE INPUT
  // =========================================================

  const handlePhoneChange = (event) => {
    const newPhone = event.target.value;

    setPhone(newPhone);

    const normalizedNewPhone =
      normalizePhone(newPhone);

    /*
     * IMPORTANT:
     *
     * If the customer changes their phone and then
     * puts the original verified number back,
     * restore the original verified state.
     */
    if (
      normalizedNewPhone ===
      normalizePhone(originalPhone)
    ) {
      setPhoneVerified(true);
      setOtp("");
      setVerificationId(null);
      setPendingPhone("");
      setShowPhoneModal(false);
      return;
    }

    setPhoneVerified(false);
    setOtp("");
    setVerificationId(null);
    setPendingPhone("");
  };

  // =========================================================
  // SEND PHONE OTP
  // =========================================================

  const handleSendPhoneOTP = async () => {
    if (!currentUser) return;

    const cleanedPhone =
      normalizePhone(phone);

    if (
      !/^\+[1-9]\d{7,14}$/.test(
        cleanedPhone
      )
    ) {
      setErrorMessage(
        "Enter your phone number with country code, for example +919876543210."
      );

      return;
    }

    /*
     * Original verified phone restored.
     * No verification required.
     */
    if (
      cleanedPhone ===
      normalizePhone(originalPhone)
    ) {
      setPhoneVerified(true);
      setShowPhoneModal(false);

      setMessage(
        "Your phone number is verified."
      );

      return;
    }

    setIsPhoneProcessing(true);
    clearMessages();

    try {
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
      setShowPhoneModal(true);

      setMessage(
        `Verification code sent to ${cleanedPhone}.`
      );
    } catch (error) {
      console.error(
        "Phone OTP sending failed:",
        error
      );

      clearRecaptcha();

      switch (error.code) {
        case "auth/invalid-phone-number":
          setErrorMessage(
            "Please enter a valid phone number."
          );
          break;

        case "auth/too-many-requests":
          setErrorMessage(
            "Too many verification attempts. Please try again later."
          );
          break;

        case "auth/quota-exceeded":
          setErrorMessage(
            "SMS verification limit reached. Please try again later."
          );
          break;

        case "auth/captcha-check-failed":
          setErrorMessage(
            "Verification security check failed. Please try again."
          );
          break;

        default:
          setErrorMessage(
            error.message ||
              "Unable to send verification code."
          );
      }
    } finally {
      setIsPhoneProcessing(false);
    }
  };

  // =========================================================
  // VERIFY PHONE OTP
  // =========================================================

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
    clearMessages();

    try {
      const credential =
        PhoneAuthProvider.credential(
          verificationId,
          cleanOTP
        );

      await updatePhoneNumber(
        currentUser,
        credential
      );

      const verifiedPhone =
        pendingPhone;

      setPhone(verifiedPhone);
      setOriginalPhone(verifiedPhone);
      setPhoneVerified(true);

      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          phone: verifiedPhone,
          phoneVerified: true,
          phoneVerifiedAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        },
        { merge: true }
      );

      setOtp("");
      setVerificationId(null);
      setPendingPhone("");

      setShowPhoneModal(false);

      clearRecaptcha();

      setMessage(
        "Your phone number is verified."
      );
    } catch (error) {
      console.error(
        "Phone verification failed:",
        error
      );

      if (
        error.code ===
        "auth/invalid-verification-code"
      ) {
        setErrorMessage(
          "That verification code is incorrect."
        );
      } else if (
        error.code ===
        "auth/code-expired"
      ) {
        setErrorMessage(
          "That code has expired. Please request a new one."
        );

        setVerificationId(null);
        setShowPhoneModal(false);
      } else if (
        error.code ===
        "auth/phone-number-already-exists"
      ) {
        setErrorMessage(
          "This phone number is already associated with another Brewed account."
        );
      } else if (
        error.code ===
        "auth/requires-recent-login"
      ) {
        setPhoneVerified(false);

        setErrorMessage(
          "For your security, please sign in again and then verify your new phone number."
        );
      } else if (
        error.code ===
        "auth/provider-already-linked"
      ) {
        setErrorMessage(
          "This phone number is already linked to your account."
        );
      } else {
        setErrorMessage(
          error.message ||
            "Unable to verify this phone number."
        );
      }
    } finally {
      setIsPhoneProcessing(false);
    }
  };

  // =========================================================
  // EMAIL INPUT
  // =========================================================

  const handleEmailChange = (event) => {
    const newEmail = event.target.value;

    setEmail(newEmail);

    const normalizedNewEmail =
      normalizeEmail(newEmail);

    /*
     * IMPORTANT:
     *
     * If the customer temporarily changes the email
     * and puts the original verified email back,
     * restore its verified state.
     */
    if (
      normalizedNewEmail ===
      normalizeEmail(originalEmail)
    ) {
      setEmailVerified(true);
      setShowEmailModal(false);
      return;
    }

    setEmailVerified(false);
  };

  // =========================================================
  // SEND EMAIL VERIFICATION
  // =========================================================

  const handleSendEmailVerification = async () => {
    if (!currentUser) return;

    const newEmail =
      normalizeEmail(email);

    if (!newEmail) {
      setErrorMessage(
        "Please enter an email address."
      );

      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        newEmail
      )
    ) {
      setErrorMessage(
        "Please enter a valid email address."
      );

      return;
    }

    /*
     * Original verified email restored.
     * No verification required.
     */
    if (
      newEmail ===
      normalizeEmail(originalEmail)
    ) {
      setEmailVerified(true);
      setShowEmailModal(false);

      setMessage(
        "Your email address is verified."
      );

      return;
    }

    setIsEmailProcessing(true);
    clearMessages();

    try {
      /*
       * The email must be updated in Firebase before
       * Firebase can send verification to the new address.
       */
      if (
        normalizeEmail(currentUser.email || "") !==
        newEmail
      ) {
        await updateEmail(
          currentUser,
          newEmail
        );
      }

      await sendEmailVerification(
        currentUser
      );

      setEmail(newEmail);
      setEmailVerified(false);
      setShowEmailModal(true);

      setMessage(
        `Verification link sent to ${newEmail}.`
      );
    } catch (error) {
      console.error(
        "Email verification failed:",
        error
      );

      if (
        error.code ===
        "auth/requires-recent-login"
      ) {
        setErrorMessage(
          "Please sign in again before changing your email address."
        );
      } else if (
        error.code ===
        "auth/email-already-in-use"
      ) {
        setErrorMessage(
          "That email address is already associated with another account."
        );
      } else if (
        error.code ===
        "auth/invalid-email"
      ) {
        setErrorMessage(
          "Please enter a valid email address."
        );
      } else if (
        error.code ===
        "auth/too-many-requests"
      ) {
        setErrorMessage(
          "Too many verification emails were requested. Please try again later."
        );
      } else {
        setErrorMessage(
          error.message ||
            "Unable to send verification email."
        );
      }
    } finally {
      setIsEmailProcessing(false);
    }
  };

  // =========================================================
  // REFRESH EMAIL VERIFICATION
  // =========================================================

  const handleRefreshEmailVerification =
    async () => {
      if (!currentUser) return;

      setIsEmailProcessing(true);
      clearMessages();

      try {
        await reload(currentUser);

        const verified =
          currentUser.emailVerified === true;

        setEmailVerified(verified);

        if (verified) {
          setShowEmailModal(false);

          setOriginalEmail(
            normalizeEmail(
              currentUser.email || email
            )
          );

          setMessage(
            "Your email address is verified."
          );
        } else {
          setErrorMessage(
            "Your email is not verified yet. Please check your inbox and try again."
          );
        }
      } catch (error) {
        console.error(
          "Email verification refresh failed:",
          error
        );

        setErrorMessage(
          "Unable to refresh verification status."
        );
      } finally {
        setIsEmailProcessing(false);
      }
    };

  // =========================================================
  // SAVE PROFILE
  // =========================================================

  const handleSave = async (event) => {
    event.preventDefault();

    if (!currentUser) return;

    clearMessages();

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

    if (!phone.trim()) {
      setErrorMessage(
        "Phone number is required."
      );

      return;
    }

    /*
     * Original verified phone restored:
     * verification is automatically valid.
     */
    if (
      normalizePhone(phone) ===
      normalizePhone(originalPhone)
    ) {
      setPhoneVerified(true);
    }

    /*
     * Original verified email restored:
     * verification is automatically valid.
     */
    if (
      normalizeEmail(email) ===
      normalizeEmail(originalEmail)
    ) {
      setEmailVerified(true);
    }

    if (
      normalizePhone(phone) !==
        normalizePhone(originalPhone) &&
      !phoneVerified
    ) {
      setErrorMessage(
        "Please verify your new phone number before saving."
      );

      return;
    }

    if (
      normalizeEmail(email) !==
        normalizeEmail(originalEmail) &&
      !emailVerified
    ) {
      setErrorMessage(
        "Please verify your new email address before saving."
      );

      return;
    }

    setIsProcessing(true);

    try {
      // -----------------------------------------------------
      // NAME
      // -----------------------------------------------------

      if (
        fullName.trim() !==
        (currentUser.displayName || "")
      ) {
        await updateProfile(currentUser, {
          displayName:
            fullName.trim(),
        });
      }

      // -----------------------------------------------------
      // EMAIL
      // -----------------------------------------------------

      const newEmail =
        normalizeEmail(email);

      const oldEmail =
        normalizeEmail(
          currentUser.email || ""
        );

      if (newEmail !== oldEmail) {
        try {
          await updateEmail(
            currentUser,
            newEmail
          );

          await sendEmailVerification(
            currentUser
          );

          setEmailVerified(false);
          setShowEmailModal(true);

          setMessage(
            "Email updated. We sent a new verification link to your email."
          );
        } catch (emailError) {
          if (
            emailError.code ===
            "auth/requires-recent-login"
          ) {
            setErrorMessage(
              "Please sign in again before changing your email address."
            );

            return;
          }

          throw emailError;
        }
      }

      // -----------------------------------------------------
      // FIRESTORE
      // -----------------------------------------------------

      const updateData = {
        fullName:
          fullName.trim(),

        email: newEmail,

        phone:
          normalizePhone(phone),

        phoneVerified,

        address,

        addressType,

        updatedAt:
          serverTimestamp(),
      };

      if (
        !isBirthdayLocked &&
        birthday
      ) {
        updateData.birthday =
          birthday;
      }

      await setDoc(
        doc(
          db,
          "users",
          currentUser.uid
        ),
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

      /*
       * If email wasn't changed, preserve its
       * current Firebase verification state.
       */
      if (newEmail === oldEmail) {
        await reload(currentUser);

        setEmailVerified(
          currentUser.emailVerified === true
        );
      }

      setOriginalPhone(
        normalizePhone(phone)
      );

      setOriginalEmail(newEmail);

      setMessage(
        "Your profile has been saved."
      );
    } catch (error) {
      console.error(
        "Profile save failed:",
        error
      );

      switch (error.code) {
        case "auth/requires-recent-login":
          setErrorMessage(
            "Please sign in again before making this security-sensitive change."
          );
          break;

        case "auth/email-already-in-use":
          setErrorMessage(
            "That email address is already associated with another account."
          );
          break;

        case "auth/invalid-email":
          setErrorMessage(
            "Please enter a valid email address."
          );
          break;

        case "auth/operation-not-allowed":
          setErrorMessage(
            "This account change is currently unavailable."
          );
          break;

        default:
          setErrorMessage(
            error.message ||
              "Unable to save your profile."
          );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // =========================================================
  // PASSWORD RESET
  // =========================================================

  const handleChangePassword = async () => {
    if (!currentUser?.email) {
      setErrorMessage(
        "No email address is associated with this account."
      );

      return;
    }

    setIsPasswordProcessing(true);
    clearMessages();

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
          "Unable to send password reset instructions."
      );
    } finally {
      setIsPasswordProcessing(false);
    }
  };

  // =========================================================
  // CLOSE PHONE MODAL
  // =========================================================

  const closePhoneModal = () => {
    if (isPhoneProcessing) return;

    setShowPhoneModal(false);
    setOtp("");
    setVerificationId(null);
    setPendingPhone("");

    clearRecaptcha();
  };

  // =========================================================
  // CLOSE EMAIL MODAL
  // =========================================================

  const closeEmailModal = () => {
    if (isEmailProcessing) return;

    setShowEmailModal(false);
  };

  // =========================================================
  // AVATAR
  // =========================================================

  const avatar =
    avatarUrl ||
    `https://ui-avatars.com/api/?background=E8D8C8&color=3A2418&name=${encodeURIComponent(
      fullName || "Brewed Member"
    )}`;

  // =========================================================
  // LOADING
  // =========================================================

  if (isLoading) {
    return (
      <div className="profile-loading-screen">
        <div className="profile-loader">
          <div className="loader-mark">
            B
          </div>

          <span>
            Preparing your profile
          </span>
        </div>

        <style>{`
          .profile-loading-screen {
            min-height: 100vh;
            background:
              radial-gradient(
                circle at 20% 10%,
                rgba(196,149,106,.12),
                transparent 30%
              ),
              #FBF8F4;
            display:flex;
            align-items:center;
            justify-content:center;
            font-family:Inter, sans-serif;
            color:#6F625A;
          }

          .profile-loader {
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:14px;
            font-size:13px;
            letter-spacing:.02em;
          }

          .loader-mark {
            width:48px;
            height:48px;
            border-radius:16px;
            display:flex;
            align-items:center;
            justify-content:center;
            background:#2D1B12;
            color:#F7EDE2;
            font-family:Georgia,serif;
            font-size:20px;
            box-shadow:0 12px 30px rgba(45,27,18,.14);
          }
        `}</style>
      </div>
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap');

        :root {
          --brew-espresso: #2D1B12;
          --brew-coffee: #493126;
          --brew-muted: #76685F;
          --brew-tan: #B88961;
          --brew-sand: #EAD8C7;
          --brew-cream: #FBF8F4;
          --brew-white: #FFFFFF;
          --brew-border: #E9E0D8;
          --brew-soft: #F5EEE7;
          --brew-green: #39704A;
          --brew-green-bg: #EEF7F0;
          --brew-red: #A04444;
          --brew-red-bg: #FBEEEE;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: var(--brew-cream);
          color: var(--brew-espresso);
          font-family: "DM Sans", sans-serif;
        }

        button,
        input {
          font: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        .profile-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 7% 4%,
              rgba(184,137,97,.13),
              transparent 27%
            ),
            radial-gradient(
              circle at 95% 32%,
              rgba(234,216,199,.42),
              transparent 28%
            ),
            var(--brew-cream);
          padding: 104px 24px 70px;
        }

        .profile-shell {
          width: 100%;
          max-width: 1040px;
          margin: 0 auto;
        }

        .profile-topbar {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:20px;
          margin-bottom:28px;
        }

        .back-button {
          display:inline-flex;
          align-items:center;
          gap:8px;
          border:0;
          background:transparent;
          color:var(--brew-muted);
          cursor:pointer;
          padding:8px 0;
          font-size:14px;
          font-weight:600;
          transition:.2s ease;
        }

        .back-button:hover {
          color:var(--brew-espresso);
          transform:translateX(-2px);
        }

        .topbar-label {
          font-size:11px;
          letter-spacing:.16em;
          text-transform:uppercase;
          color:#A08F84;
          font-weight:700;
        }

        /* =====================================================
           HERO
        ===================================================== */

        .profile-hero {
          position:relative;
          overflow:hidden;
          min-height:270px;
          border-radius:30px;
          padding:38px 42px;
          display:flex;
          align-items:center;
          gap:36px;
          background:
            linear-gradient(
              135deg,
              #382219 0%,
              #2D1B12 55%,
              #24150F 100%
            );
          box-shadow:
            0 24px 70px rgba(45,27,18,.16);
          color:white;
        }

        .hero-glow-one,
        .hero-glow-two {
          position:absolute;
          border-radius:999px;
          pointer-events:none;
        }

        .hero-glow-one {
          width:300px;
          height:300px;
          right:-90px;
          top:-150px;
          background:rgba(234,216,199,.12);
        }

        .hero-glow-two {
          width:230px;
          height:230px;
          left:-150px;
          bottom:-150px;
          background:rgba(184,137,97,.14);
        }

        .hero-avatar-wrap {
          position:relative;
          flex:none;
          z-index:1;
        }

        .hero-avatar {
          width:128px;
          height:128px;
          border-radius:38px;
          object-fit:cover;
          border:4px solid rgba(255,255,255,.18);
          box-shadow:0 18px 45px rgba(0,0,0,.25);
          display:block;
          background:#EAD8C7;
        }

        .avatar-upload {
          position:absolute;
          right:-8px;
          bottom:-8px;
          width:42px;
          height:42px;
          border-radius:15px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:#F4E6D8;
          color:var(--brew-espresso);
          border:3px solid #2D1B12;
          cursor:pointer;
          box-shadow:0 7px 20px rgba(0,0,0,.18);
          transition:.2s ease;
        }

        .avatar-upload:hover {
          transform:translateY(-2px);
          background:white;
        }

        .hero-copy {
          position:relative;
          z-index:1;
          min-width:0;
        }

        .hero-eyebrow {
          display:flex;
          align-items:center;
          gap:7px;
          color:#D9C3AF;
          font-size:11px;
          font-weight:700;
          letter-spacing:.14em;
          text-transform:uppercase;
          margin-bottom:10px;
        }

        .hero-title {
          margin:0;
          font-family:"Playfair Display", serif;
          font-size:clamp(2.2rem, 5vw, 3.5rem);
          line-height:1;
          letter-spacing:-.035em;
          font-weight:600;
        }

        .hero-subtitle {
          margin:13px 0 0;
          color:#D7C8BE;
          font-size:14px;
          line-height:1.7;
          max-width:520px;
        }

        /* =====================================================
           AESTHETIC LOYALTY BADGE
        ===================================================== */

        .tier-badge {
          position:relative;
          display:inline-flex;
          align-items:center;
          gap:9px;
          margin-top:18px;
          padding:7px 12px 7px 8px;
          border-radius:999px;
          background:rgba(255,255,255,.065);
          border:1px solid rgba(255,255,255,.13);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.08),
            0 8px 25px rgba(0,0,0,.08);
          backdrop-filter:blur(10px);
        }

        .tier-badge::before {
          content:"";
          position:absolute;
          inset:1px;
          border-radius:inherit;
          pointer-events:none;
          background:linear-gradient(
            120deg,
            rgba(255,255,255,.08),
            transparent 45%
          );
        }

        .tier-emblem {
          position:relative;
          z-index:1;
          width:28px;
          height:28px;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:13px;
          font-weight:800;
          box-shadow:
            inset 0 1px 1px rgba(255,255,255,.55),
            0 4px 12px rgba(0,0,0,.16);
        }

        .tier-copy {
          position:relative;
          z-index:1;
          display:flex;
          flex-direction:column;
          gap:1px;
        }

        .tier-caption {
          color:rgba(255,255,255,.5);
          font-size:8px;
          line-height:1;
          letter-spacing:.15em;
          text-transform:uppercase;
          font-weight:800;
        }

        .tier-name {
          color:#F7EEE7;
          font-size:11px;
          line-height:1.2;
          font-weight:700;
          letter-spacing:.02em;
        }

        .tier-bronze .tier-emblem {
          background:
            radial-gradient(
              circle at 32% 25%,
              #F4D5B6,
              #B8734A 58%,
              #70402B
            );
          color:#FFF2E5;
        }

        .tier-silver .tier-emblem {
          background:
            radial-gradient(
              circle at 32% 25%,
              #FFFFFF,
              #C7C7C7 55%,
              #777777
            );
          color:#493F39;
        }

        .tier-gold .tier-emblem {
          background:
            radial-gradient(
              circle at 32% 25%,
              #FFF3B7,
              #D7A943 58%,
              #8B5C15
            );
          color:#FFF8D6;
        }

        .tier-platinum .tier-emblem {
          background:
            radial-gradient(
              circle at 32% 25%,
              #FFFFFF,
              #D7D6E5 48%,
              #8C899C
            );
          color:#504D61;
        }

        /* =====================================================
           CONTENT
        ===================================================== */

        .profile-content {
          margin-top:18px;
          display:block;
        }

        .profile-card {
          background:rgba(255,255,255,.82);
          border:1px solid rgba(221,211,202,.72);
          border-radius:26px;
          padding:30px;
          box-shadow:
            0 14px 45px rgba(65,44,31,.055);
          backdrop-filter:blur(12px);
        }

        .section {
          padding-bottom:30px;
          margin-bottom:30px;
          border-bottom:1px solid var(--brew-border);
        }

        .section:last-child {
          padding-bottom:0;
          margin-bottom:0;
          border-bottom:0;
        }

        .section-heading {
          display:flex;
          align-items:flex-start;
          gap:12px;
          margin-bottom:22px;
        }

        .section-icon {
          width:38px;
          height:38px;
          border-radius:13px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:var(--brew-soft);
          color:var(--brew-coffee);
          flex:none;
        }

        .section-title {
          margin:0;
          font-family:"Playfair Display", serif;
          font-size:21px;
          font-weight:600;
          letter-spacing:-.02em;
          color:var(--brew-espresso);
        }

        .section-description {
          margin:4px 0 0;
          color:#92847B;
          font-size:12px;
          line-height:1.5;
        }

        .form-grid {
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:18px;
        }

        .form-group {
          min-width:0;
        }

        .form-group.full {
          grid-column:1 / -1;
        }

        .field-label {
          display:flex;
          align-items:center;
          gap:5px;
          margin:0 0 8px;
          color:#58463C;
          font-size:12px;
          font-weight:700;
        }

        .required {
          color:var(--brew-tan);
        }

        .field-input {
          width:100%;
          min-height:50px;
          padding:13px 15px;
          border:1px solid var(--brew-border);
          border-radius:14px;
          background:#FFFDFC;
          color:var(--brew-espresso);
          outline:none;
          font-size:14px;
          transition:
            border-color .2s ease,
            box-shadow .2s ease,
            background .2s ease;
        }

        .field-input:hover {
          border-color:#D6C5B7;
        }

        .field-input:focus {
          border-color:#B88961;
          box-shadow:
            0 0 0 4px rgba(184,137,97,.10);
          background:white;
        }

        .field-input::placeholder {
          color:#B1A49C;
        }

        .field-input.locked {
          background:#F6F0EA;
          color:#806E63;
        }

        /* =====================================================
           VERIFIED CONTACT STATUS
        ===================================================== */

        .verified-status {
          display:flex;
          align-items:center;
          gap:7px;
          margin-top:9px;
          color:var(--brew-green);
          font-size:11px;
          font-weight:600;
        }

        .verify-contact-button {
          margin-top:9px;
          border:0;
          padding:0;
          background:transparent;
          color:#9A6640;
          font-size:11px;
          font-weight:700;
          cursor:pointer;
        }

        .verify-contact-button:hover {
          text-decoration:underline;
        }

        /* =====================================================
           ADDRESS
        ===================================================== */

        .address-type {
          display:flex;
          gap:9px;
          flex-wrap:wrap;
        }

        .address-option {
          position:relative;
        }

        .address-option input {
          position:absolute;
          opacity:0;
          pointer-events:none;
        }

        .address-label {
          display:inline-flex;
          align-items:center;
          gap:7px;
          padding:10px 14px;
          border-radius:999px;
          border:1px solid var(--brew-border);
          background:#FFFDFC;
          color:#78685E;
          font-size:12px;
          font-weight:600;
          cursor:pointer;
          transition:.2s ease;
        }

        .address-label:hover {
          border-color:#D2BCA9;
        }

        .address-option input:checked + .address-label {
          border-color:#B88961;
          background:#F6EDE4;
          color:var(--brew-coffee);
        }

        .birthday-lock {
          display:flex;
          align-items:center;
          gap:7px;
          margin-top:9px;
          color:#9A8A80;
          font-size:11px;
        }

        /* =====================================================
           ALERTS
        ===================================================== */

        .status-message {
          display:flex;
          align-items:flex-start;
          gap:10px;
          margin-top:22px;
          padding:13px 15px;
          border-radius:15px;
          font-size:12px;
          line-height:1.5;
        }

        .success-message {
          background:var(--brew-green-bg);
          color:#356943;
          border:1px solid #D8EBDD;
        }

        .error-message {
          background:var(--brew-red-bg);
          color:#923D3D;
          border:1px solid #F1D9D9;
        }

        /* =====================================================
           ACTIONS
        ===================================================== */

        .actions {
          margin-top:30px;
          display:flex;
          justify-content:flex-end;
          gap:10px;
        }

        .action-button {
          min-height:50px;
          padding:0 20px;
          border-radius:15px;
          border:1px solid var(--brew-border);
          cursor:pointer;
          font-size:12px;
          font-weight:700;
          transition:.2s ease;
        }

        .password-button {
          background:#FFFDFC;
          color:var(--brew-coffee);
        }

        .password-button:hover:not(:disabled) {
          background:#F7F0EA;
          border-color:#D8C6B7;
        }

        .save-button {
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          min-width:150px;
          background:var(--brew-espresso);
          color:white;
          border-color:var(--brew-espresso);
          box-shadow:0 9px 22px rgba(45,27,18,.13);
        }

        .save-button:hover:not(:disabled) {
          background:#493126;
          transform:translateY(-1px);
          box-shadow:0 12px 26px rgba(45,27,18,.17);
        }

        .action-button:disabled {
          opacity:.5;
          cursor:not-allowed;
          transform:none;
        }

        /* =====================================================
           GOOGLE PLACES
        ===================================================== */

        .places-control {
          min-height:50px !important;
          border-radius:14px !important;
          border-color:var(--brew-border) !important;
          background:#FFFDFC !important;
          box-shadow:none !important;
        }

        /* =====================================================
           MODALS
        ===================================================== */

        .verification-overlay {
          position:fixed;
          inset:0;
          z-index:10000;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:20px;
          background:rgba(35,22,16,.52);
          backdrop-filter:blur(8px);
          animation:verificationFadeIn .18s ease;
        }

        .verification-modal {
          width:100%;
          max-width:420px;
          border-radius:27px;
          background:#FFFCF9;
          border:1px solid rgba(255,255,255,.6);
          box-shadow:
            0 30px 90px rgba(30,18,12,.25);
          overflow:hidden;
          animation:verificationModalIn .22s ease;
        }

        .verification-modal-top {
          position:relative;
          padding:27px 27px 23px;
          background:
            radial-gradient(
              circle at 90% 0%,
              rgba(184,137,97,.22),
              transparent 36%
            ),
            #F6EDE4;
          border-bottom:1px solid #E9DCCE;
        }

        .verification-close {
          position:absolute;
          top:17px;
          right:17px;
          width:32px;
          height:32px;
          border:0;
          border-radius:11px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:rgba(255,255,255,.65);
          color:#806E63;
          cursor:pointer;
        }

        .verification-close:hover {
          background:white;
          color:var(--brew-espresso);
        }

        .verification-icon {
          width:48px;
          height:48px;
          border-radius:16px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:#2D1B12;
          color:#F8EBDD;
          box-shadow:
            0 10px 24px rgba(45,27,18,.15);
          margin-bottom:16px;
        }

        .verification-title {
          margin:0;
          font-family:"Playfair Display",serif;
          color:var(--brew-espresso);
          font-size:25px;
          line-height:1.15;
          letter-spacing:-.025em;
        }

        .verification-subtitle {
          margin:7px 0 0;
          color:#806F64;
          font-size:12px;
          line-height:1.6;
          max-width:320px;
        }

        .verification-modal-body {
          padding:24px 27px 27px;
        }

        .verification-destination {
          padding:12px 14px;
          border-radius:14px;
          background:#F8F2EC;
          border:1px solid #EDE2D8;
          color:#604C40;
          font-size:12px;
          font-weight:700;
          word-break:break-word;
          margin-bottom:15px;
        }

        .verification-input {
          width:100%;
          min-height:54px;
          border:1px solid #E4D8CE;
          border-radius:15px;
          outline:none;
          background:#FFFDFC;
          color:var(--brew-espresso);
          padding:14px 16px;
          font-size:17px;
          letter-spacing:.24em;
          font-weight:700;
          text-align:center;
          transition:.2s ease;
        }

        .verification-input:focus {
          border-color:#B88961;
          box-shadow:
            0 0 0 4px rgba(184,137,97,.10);
        }

        .verification-input::placeholder {
          color:#B5A69B;
          letter-spacing:.12em;
          font-size:13px;
        }

        .verification-primary {
          width:100%;
          min-height:50px;
          margin-top:12px;
          border:0;
          border-radius:15px;
          background:#2D1B12;
          color:white;
          font-size:12px;
          font-weight:700;
          cursor:pointer;
          transition:.2s ease;
        }

        .verification-primary:hover:not(:disabled) {
          background:#493126;
          transform:translateY(-1px);
        }

        .verification-primary:disabled {
          opacity:.45;
          cursor:not-allowed;
        }

        .verification-secondary {
          width:100%;
          min-height:42px;
          margin-top:5px;
          border:0;
          background:transparent;
          color:#96735B;
          font-size:11px;
          font-weight:700;
          cursor:pointer;
        }

        .verification-secondary:hover:not(:disabled) {
          color:#60402D;
        }

        .verification-secondary:disabled {
          opacity:.45;
          cursor:not-allowed;
        }

        .verification-note {
          margin-top:13px;
          text-align:center;
          color:#9A8A80;
          font-size:10px;
          line-height:1.5;
        }

        .verification-success {
          text-align:center;
          padding:8px 0 4px;
        }

        .verification-success-icon {
          width:58px;
          height:58px;
          margin:0 auto 14px;
          border-radius:20px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:#EEF7F0;
          color:#39704A;
        }

        .verification-success-title {
          font-family:"Playfair Display",serif;
          font-size:23px;
          color:var(--brew-espresso);
          margin:0;
        }

        .verification-success-copy {
          color:#8C7D73;
          font-size:11px;
          line-height:1.6;
          margin:7px 0 0;
        }

        @keyframes verificationFadeIn {
          from {
            opacity:0;
          }
          to {
            opacity:1;
          }
        }

        @keyframes verificationModalIn {
          from {
            opacity:0;
            transform:translateY(10px) scale(.98);
          }
          to {
            opacity:1;
            transform:translateY(0) scale(1);
          }
        }

        /* =====================================================
           RESPONSIVE
        ===================================================== */

        @media (max-width: 680px) {
          .profile-page {
            padding:84px 14px 45px;
          }

          .profile-topbar {
            margin-bottom:18px;
          }

          .topbar-label {
            display:none;
          }

          .profile-hero {
            min-height:auto;
            padding:28px 23px;
            border-radius:25px;
            flex-direction:column;
            align-items:flex-start;
            gap:22px;
          }

          .hero-avatar {
            width:104px;
            height:104px;
            border-radius:30px;
          }

          .hero-title {
            font-size:2.45rem;
          }

          .profile-card {
            padding:22px 18px;
            border-radius:23px;
          }

          .form-grid {
            grid-template-columns:1fr;
          }

          .form-group.full {
            grid-column:auto;
          }

          .actions {
            flex-direction:column-reverse;
          }

          .action-button {
            width:100%;
          }

          .verification-modal {
            max-width:calc(100vw - 24px);
            border-radius:24px;
          }

          .verification-modal-top {
            padding:24px 21px 21px;
          }

          .verification-modal-body {
            padding:21px;
          }
        }

        @media (max-width: 420px) {
          .profile-page {
            padding-left:10px;
            padding-right:10px;
          }

          .profile-hero {
            padding:24px 20px;
          }

          .profile-card {
            padding:20px 15px;
          }

          .hero-title {
            font-size:2.15rem;
          }

          .section {
            padding-bottom:25px;
            margin-bottom:25px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            scroll-behavior:auto !important;
            transition:none !important;
            animation:none !important;
          }
        }
      `}</style>

      <main className="profile-page">
        <div className="profile-shell">

          {/* =================================================
              TOP BAR
          ================================================= */}

          <div className="profile-topbar">
            <button
              type="button"
              className="back-button"
              onClick={() =>
                setPage("menu")
              }
            >
              <ChevronLeft size={17} />
              Back to menu
            </button>

            <div className="topbar-label">
              Brewed / Account
            </div>
          </div>

          {/* =================================================
              HERO
          ================================================= */}

          <section className="profile-hero">
            <div className="hero-glow-one" />
            <div className="hero-glow-two" />

            <div className="hero-avatar-wrap">
              <img
                src={avatar}
                alt="Profile"
                className="hero-avatar"
              />

              <label
                className="avatar-upload"
                title="Change profile photo"
              >
                <Camera size={17} />

                <input
                  type="file"
                  accept="image/*"
                  onChange={
                    handleImageUpload
                  }
                  disabled={isProcessing}
                  style={{
                    display: "none",
                  }}
                />
              </label>
            </div>

            <div className="hero-copy">
              <div className="hero-eyebrow">
                <Sparkles size={13} />
                Your Brewed account
              </div>

              <h1 className="hero-title">
                Hey,{" "}
                {fullName?.split(" ")[0] ||
                  "there"}.
              </h1>

              <p className="hero-subtitle">
                Keep your details up to date
                so every Brewed experience
                feels a little more personal.
              </p>

              {/* LOYALTY TIER */}

              <div
                className={`tier-badge ${currentTier.className}`}
                title={`${currentTier.label} loyalty tier`}
              >
                <div className="tier-emblem">
                  {currentTier.icon}
                </div>

                <div className="tier-copy">
                  <span className="tier-caption">
                    Loyalty tier
                  </span>

                  <span className="tier-name">
                    {currentTier.label}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              CONTENT
          ================================================= */}

          <div className="profile-content">
            <form
              className="profile-card"
              onSubmit={handleSave}
            >

              {/* =================================================
                  PERSONAL
              ================================================= */}

              <section className="section">
                <div className="section-heading">
                  <div className="section-icon">
                    <User size={18} />
                  </div>

                  <div>
                    <h2 className="section-title">
                      Personal details
                    </h2>

                    <p className="section-description">
                      The basics we use to
                      personalize your account.
                    </p>
                  </div>
                </div>

                <div className="form-grid">

                  {/* NAME */}

                  <div className="form-group full">
                    <label className="field-label">
                      Full name
                      <span className="required">
                        *
                      </span>
                    </label>

                    <input
                      className="field-input"
                      type="text"
                      value={fullName}
                      onChange={(e) =>
                        setFullName(
                          e.target.value
                        )
                      }
                      placeholder="Your full name"
                      autoComplete="name"
                      required
                    />
                  </div>

                  {/* EMAIL */}

                  <div className="form-group">
                    <label className="field-label">
                      Email address
                      <span className="required">
                        *
                      </span>
                    </label>

                    <input
                      className="field-input"
                      type="email"
                      value={email}
                      onChange={
                        handleEmailChange
                      }
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />

                    {emailVerified &&
                    !emailChanged ? (
                      <div className="verified-status">
                        <Check size={14} />
                        Your email address is
                        verified.
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="verify-contact-button"
                        onClick={
                          handleSendEmailVerification
                        }
                        disabled={
                          isEmailProcessing ||
                          !email.trim()
                        }
                      >
                        {isEmailProcessing
                          ? "Sending..."
                          : "Verify email"}
                      </button>
                    )}
                  </div>

                  {/* PHONE */}

                  <div className="form-group">
                    <label className="field-label">
                      Phone number
                      <span className="required">
                        *
                      </span>
                    </label>

                    <input
                      className="field-input"
                      type="tel"
                      value={phone}
                      onChange={
                        handlePhoneChange
                      }
                      placeholder="+919876543210"
                      autoComplete="tel"
                      required
                    />

                    {phoneVerified &&
                    !phoneChanged ? (
                      <div className="verified-status">
                        <Check size={14} />
                        Your phone number is
                        verified.
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="verify-contact-button"
                        onClick={
                          handleSendPhoneOTP
                        }
                        disabled={
                          isPhoneProcessing ||
                          !phone.trim()
                        }
                      >
                        {isPhoneProcessing
                          ? "Sending..."
                          : "Verify phone"}
                      </button>
                    )}

                    <div
                      id="phone-recaptcha"
                    />
                  </div>

                  {/* BIRTHDAY */}

                  <div className="form-group full">
                    <label className="field-label">
                      Birthday
                      <span className="required">
                        *
                      </span>
                    </label>

                    <input
                      className={`field-input ${
                        isBirthdayLocked
                          ? "locked"
                          : ""
                      }`}
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
                      readOnly={
                        isBirthdayLocked
                      }
                      required
                    />

                    {isBirthdayLocked && (
                      <div className="birthday-lock">
                        <Lock size={12} />
                        Your birthday is locked
                        after the first save.
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* =================================================
                  ADDRESS
              ================================================= */}

              <section className="section">
                <div className="section-heading">
                  <div className="section-icon">
                    <MapPin size={18} />
                  </div>

                  <div>
                    <h2 className="section-title">
                      Delivery details
                    </h2>

                    <p className="section-description">
                      Save the address you use
                      most often for orders.
                    </p>
                  </div>
                </div>

                <div className="form-grid">

                  <div className="form-group full">
                    <label className="field-label">
                      Address type
                    </label>

                    <div className="address-type">
                      {[
                        "home",
                        "work",
                        "other",
                      ].map((type) => (
                        <label
                          key={type}
                          className="address-option"
                        >
                          <input
                            type="radio"
                            name="addressType"
                            value={type}
                            checked={
                              addressType ===
                              type
                            }
                            onChange={(e) =>
                              setAddressType(
                                e.target.value
                              )
                            }
                          />

                          <span className="address-label">
                            {type
                              .charAt(0)
                              .toUpperCase() +
                              type.slice(1)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-group full">
                    <label className="field-label">
                      Delivery address
                    </label>

                    {googleApiKey ? (
                      <GooglePlacesAutocomplete
                        apiKey={
                          googleApiKey
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
                            "Search your delivery address...",

                          isClearable: true,

                          styles: {
                            control: (
                              provided,
                              state
                            ) => ({
                              ...provided,
                              minHeight:
                                "50px",
                              borderRadius:
                                "14px",
                              borderColor:
                                state.isFocused
                                  ? "#B88961"
                                  : "#E9E0D8",
                              boxShadow:
                                state.isFocused
                                  ? "0 0 0 4px rgba(184,137,97,.10)"
                                  : "none",
                              background:
                                "#FFFDFC",
                            }),

                            input: (
                              provided
                            ) => ({
                              ...provided,
                              fontSize:
                                "14px",
                              color:
                                "#2D1B12",
                            }),

                            placeholder: (
                              provided
                            ) => ({
                              ...provided,
                              color:
                                "#B1A49C",
                              fontSize:
                                "14px",
                            }),

                            singleValue: (
                              provided
                            ) => ({
                              ...provided,
                              color:
                                "#2D1B12",
                              fontSize:
                                "14px",
                            }),

                            menu: (
                              provided
                            ) => ({
                              ...provided,
                              zIndex:9999,
                              borderRadius:
                                "14px",
                              overflow:
                                "hidden",
                              boxShadow:
                                "0 18px 40px rgba(45,27,18,.12)",
                            }),

                            option: (
                              provided,
                              state
                            ) => ({
                              ...provided,
                              backgroundColor:
                                state.isFocused
                                  ? "#F6EDE4"
                                  : "white",
                              color:
                                "#2D1B12",
                              fontSize:
                                "13px",
                              padding:
                                "12px 14px",
                            }),
                          },
                        }}
                      />
                    ) : (
                      <div className="error-message">
                        Google Maps address search
                        is not configured.
                      </div>
                    )}

                    <div className="field-note">
                      Search and select the exact
                      address from the suggestions.
                    </div>
                  </div>
                </div>
              </section>

              {/* =================================================
                  ALERTS
              ================================================= */}

              {message && (
                <div className="status-message success-message">
                  <Check
                    size={16}
                    style={{
                      flex:"none",
                      marginTop:2,
                    }}
                  />

                  <span>{message}</span>
                </div>
              )}

              {errorMessage && (
                <div className="status-message error-message">
                  <X
                    size={16}
                    style={{
                      flex:"none",
                      marginTop:2,
                    }}
                  />

                  <span>
                    {errorMessage}
                  </span>
                </div>
              )}

              {/* =================================================
                  ACTIONS
              ================================================= */}

              <div className="actions">
                <button
                  type="button"
                  className="action-button password-button"
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
                    : "Reset password"}
                </button>

                <button
                  type="submit"
                  className="action-button save-button"
                  disabled={
                    isProcessing ||
                    isPhoneProcessing ||
                    isEmailProcessing
                  }
                >
                  {isProcessing ? (
                    "Saving..."
                  ) : (
                    <>
                      Save changes
                      <Check size={15} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* =======================================================
          PHONE VERIFICATION MODAL
      ======================================================= */}

      {showPhoneModal && (
        <div
          className="verification-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="phone-verification-title"
        >
          <div className="verification-modal">
            <div className="verification-modal-top">
              <button
                type="button"
                className="verification-close"
                onClick={closePhoneModal}
                disabled={
                  isPhoneProcessing
                }
                aria-label="Close"
              >
                <X size={16} />
              </button>

              <div className="verification-icon">
                <Phone size={21} />
              </div>

              <h2
                id="phone-verification-title"
                className="verification-title"
              >
                Verify your phone
              </h2>

              <p className="verification-subtitle">
                Enter the 6-digit code we sent
                to your new phone number.
              </p>
            </div>

            <div className="verification-modal-body">
              <div className="verification-destination">
                {pendingPhone}
              </div>

              <input
                className="verification-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) =>
                  setOtp(
                    e.target.value.replace(
                      /\D/g,
                      ""
                    )
                  )
                }
                placeholder="000000"
                autoFocus
              />

              <button
                type="button"
                className="verification-primary"
                onClick={
                  handleVerifyPhoneOTP
                }
                disabled={
                  isPhoneProcessing ||
                  otp.length !== 6
                }
              >
                {isPhoneProcessing
                  ? "Verifying..."
                  : "Verify phone number"}
              </button>

              <button
                type="button"
                className="verification-secondary"
                onClick={
                  handleSendPhoneOTP
                }
                disabled={
                  isPhoneProcessing
                }
              >
                Resend verification code
              </button>

              <div className="verification-note">
                For your security, this code
                expires and can only be used
                once.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          EMAIL VERIFICATION MODAL
      ======================================================= */}

      {showEmailModal && (
        <div
          className="verification-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="email-verification-title"
        >
          <div className="verification-modal">
            <div className="verification-modal-top">
              <button
                type="button"
                className="verification-close"
                onClick={closeEmailModal}
                disabled={
                  isEmailProcessing
                }
                aria-label="Close"
              >
                <X size={16} />
              </button>

              <div className="verification-icon">
                <Mail size={21} />
              </div>

              <h2
                id="email-verification-title"
                className="verification-title"
              >
                Verify your email
              </h2>

              <p className="verification-subtitle">
                We've sent a verification link
                to your email address. Open it
                and then come back here.
              </p>
            </div>

            <div className="verification-modal-body">
              <div className="verification-destination">
                {email}
              </div>

              <div className="verification-success">
                <div className="verification-success-icon">
                  <ShieldCheck size={27} />
                </div>

                <h3 className="verification-success-title">
                  Check your inbox
                </h3>

                <p className="verification-success-copy">
                  Click the verification link
                  in the email we sent you.
                  Once you've done that, tap
                  the button below.
                </p>
              </div>

              <button
                type="button"
                className="verification-primary"
                onClick={
                  handleRefreshEmailVerification
                }
                disabled={
                  isEmailProcessing
                }
              >
                {isEmailProcessing
                  ? "Checking..."
                  : "I've verified my email"}
              </button>

              <button
                type="button"
                className="verification-secondary"
                onClick={
                  handleSendEmailVerification
                }
                disabled={
                  isEmailProcessing
                }
              >
                Resend verification email
              </button>

              <div className="verification-note">
                Didn't receive it? Check your
                spam or promotions folder.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
