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
  Award,
  Crown,
  Gem,
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

  // Loyalty
  const [loyaltyTier, setLoyaltyTier] =
    useState("Bronze");

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPasswordProcessing, setIsPasswordProcessing] =
    useState(false);

  const [isBirthdayLocked, setIsBirthdayLocked] =
    useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // =========================================================
  // PHONE VERIFICATION
  // =========================================================

  const [phoneVerified, setPhoneVerified] =
    useState(false);

  const [originalPhone, setOriginalPhone] =
    useState("");

  const [pendingPhone, setPendingPhone] =
    useState("");

  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [verificationId, setVerificationId] =
    useState(null);

  const [isPhoneProcessing, setIsPhoneProcessing] =
    useState(false);

  const [showPhoneModal, setShowPhoneModal] =
    useState(false);

  // =========================================================
  // EMAIL VERIFICATION
  // =========================================================

  const [emailVerified, setEmailVerified] =
    useState(false);

  const [isEmailProcessing, setIsEmailProcessing] =
    useState(false);

  const [showEmailModal, setShowEmailModal] =
    useState(false);

  const [emailVerificationSent, setEmailVerificationSent] =
    useState(false);

  // =========================================================
  // CONFIG
  // =========================================================

  const googleApiKey = "AIzaSyAZXXMZOvmUviZqgDoljAhSllaQLxelvfY";

  // =========================================================
  // HELPERS
  // =========================================================

  const clearMessages = () => {
    setMessage("");
    setErrorMessage("");
  };

  const normalizePhone = (value) =>
    value.trim().replace(/\s+/g, "");

  const phoneChanged = useMemo(() => {
    return (
      normalizePhone(phone) !==
      normalizePhone(originalPhone)
    );
  }, [phone, originalPhone]);

  // =========================================================
  // LOYALTY TIER
  // =========================================================

  const normalizedTier =
    typeof loyaltyTier === "string"
      ? loyaltyTier.trim().toLowerCase()
      : "bronze";

  const tierConfig = {
    bronze: {
      label: "Bronze Member",
      icon: Award,
      className: "tier-bronze",
    },

    silver: {
      label: "Silver Member",
      icon: ShieldCheck,
      className: "tier-silver",
    },

    gold: {
      label: "Gold Member",
      icon: Crown,
      className: "tier-gold",
    },

    platinum: {
      label: "Platinum Member",
      icon: Gem,
      className: "tier-platinum",
    },
  };

  const currentTier =
    tierConfig[normalizedTier] ||
    tierConfig.bronze;

  const TierIcon = currentTier.icon;

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

        setFullName(
          currentUser.displayName || ""
        );

        setEmail(
          currentUser.email || ""
        );

        setEmailVerified(
          currentUser.emailVerified === true
        );

        if (currentUser.photoURL) {
          setAvatarUrl(
            currentUser.photoURL
          );
        }

        if (
          currentUser.metadata?.creationTime
        ) {
          const joined = new Date(
            currentUser.metadata.creationTime
          );

          setMemberSince(
            joined.toLocaleDateString(
              "en-US",
              {
                month: "long",
                year: "numeric",
              }
            )
          );
        }

        const userRef = doc(
          db,
          "users",
          currentUser.uid
        );

        const snapshot =
          await getDoc(userRef);

        if (!mounted) return;

        if (!snapshot.exists()) {
          setIsLoading(false);
          return;
        }

        const data = snapshot.data();

        // -----------------------------------------------------
        // LOYALTY TIER
        // -----------------------------------------------------

        setLoyaltyTier(
          typeof data.tier === "string" &&
            data.tier.trim()
            ? data.tier
            : "Bronze"
        );

        // -----------------------------------------------------
        // PHONE
        // -----------------------------------------------------

        const storedPhone =
          data.phone || "";

        setPhone(storedPhone);
        setOriginalPhone(
          storedPhone
        );

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
          if (
            typeof data.address ===
            "string"
          ) {
            setAddress({
              formatted:
                data.address,
              placeId: "",
              lat: null,
              lng: null,
            });
          } else {
            setAddress({
              formatted:
                data.address.formatted ||
                "",
              placeId:
                data.address.placeId ||
                "",
              lat:
                data.address.lat ??
                null,
              lng:
                data.address.lng ??
                null,
            });
          }
        }

        // -----------------------------------------------------
        // BIRTHDAY
        // -----------------------------------------------------

        if (data.birthday) {
          setBirthday(
            data.birthday
          );

          setIsBirthdayLocked(true);
        }

        // -----------------------------------------------------
        // PHOTO
        // -----------------------------------------------------

        if (data.photoURL) {
          setAvatarUrl(
            data.photoURL
          );
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

  const handleImageUpload = async (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file || !currentUser)
      return;

    clearMessages();

    if (
      !file.type.startsWith("image/")
    ) {
      setErrorMessage(
        "Please choose a valid image file."
      );

      event.target.value = "";
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
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

      await uploadBytes(
        storageRef,
        file,
        {
          contentType:
            file.type,
        }
      );

      const downloadURL =
        await getDownloadURL(
          storageRef
        );

      await updateProfile(
        currentUser,
        {
          photoURL:
            downloadURL,
        }
      );

      await setDoc(
        doc(
          db,
          "users",
          currentUser.uid
        ),
        {
          photoURL:
            downloadURL,
          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      setAvatarUrl(
        downloadURL
      );

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

  const getPlaceCoordinates = (
    placeId
  ) => {
    return new Promise(
      (resolve) => {
        if (
          !placeId ||
          !window.google?.maps
            ?.Geocoder
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
          (
            results,
            status
          ) => {
            if (
              status === "OK" &&
              results?.[0]
                ?.geometry
                ?.location
            ) {
              const location =
                results[0]
                  .geometry
                  .location;

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
      }
    );
  };

  // =========================================================
  // ADDRESS
  // =========================================================

  const handleAddressChange =
    async (selected) => {
      if (!selected) {
        setAddress(null);
        return;
      }

      const placeId =
        selected.value
          ?.place_id || "";

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
          await getPlaceCoordinates(
            placeId
          );

        setAddress(
          (previous) => {
            if (!previous)
              return previous;

            return {
              ...previous,
              lat:
                coordinates.lat,
              lng:
                coordinates.lng,
            };
          }
        );
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
    if (
      window.recaptchaVerifier
    ) {
      return window.recaptchaVerifier;
    }

    const verifier =
      new RecaptchaVerifier(
        auth,
        "phone-recaptcha",
        {
          size: "invisible",

          callback: () => {
            console.log(
              "Phone reCAPTCHA completed."
            );
          },

          "expired-callback":
            () => {
              try {
                window
                  .recaptchaVerifier
                  ?.clear();
              } catch {}

              window.recaptchaVerifier =
                null;
            },
        }
      );

    window.recaptchaVerifier =
      verifier;

    return verifier;
  };

  const clearRecaptcha = () => {
    try {
      window
        .recaptchaVerifier
        ?.clear();
    } catch {}

    window.recaptchaVerifier =
      null;
  };

  // =========================================================
  // PHONE INPUT
  // =========================================================

  const handlePhoneChange = (
    event
  ) => {
    const newPhone =
      event.target.value;

    setPhone(newPhone);

    if (
      normalizePhone(
        newPhone
      ) !==
      normalizePhone(
        originalPhone
      )
    ) {
      setPhoneVerified(false);
      setOtpSent(false);
      setOtp("");
      setVerificationId(null);
      setPendingPhone("");
    }
  };

  // =========================================================
  // OPEN PHONE VERIFICATION
  // =========================================================

  const handleOpenPhoneVerification =
    () => {
      clearMessages();

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

      if (
        normalizePhone(
          cleanedPhone
        ) ===
        normalizePhone(
          originalPhone
        )
      ) {
        setPhoneVerified(true);

        setMessage(
          "This phone number is already verified."
        );

        return;
      }

      setOtp("");
      setOtpSent(false);
      setVerificationId(null);
      setPendingPhone(
        cleanedPhone
      );

      setShowPhoneModal(true);

      handleSendPhoneOTP(
        cleanedPhone
      );
    };

  // =========================================================
  // SEND PHONE OTP
  // =========================================================

  const handleSendPhoneOTP =
    async (
      phoneOverride = null
    ) => {
      if (!currentUser)
        return;

      const cleanedPhone =
        normalizePhone(
          phoneOverride ||
            phone
        );

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

      if (
        normalizePhone(
          cleanedPhone
        ) ===
        normalizePhone(
          originalPhone
        )
      ) {
        setPhoneVerified(true);

        setShowPhoneModal(false);

        setMessage(
          "This phone number is already verified."
        );

        return;
      }

      setIsPhoneProcessing(true);
      clearMessages();

      try {
        const verifier =
          setupRecaptcha();

        const provider =
          new PhoneAuthProvider(
            auth
          );

        const id =
          await provider.verifyPhoneNumber(
            cleanedPhone,
            verifier
          );

        setVerificationId(id);
        setPendingPhone(
          cleanedPhone
        );
        setOtpSent(true);

        setMessage("");

      } catch (error) {
        console.error(
          "Phone OTP sending failed:",
          error
        );

        clearRecaptcha();

        switch (
          error.code
        ) {
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
        setIsPhoneProcessing(
          false
        );
      }
    };

  // =========================================================
  // VERIFY PHONE OTP
  // =========================================================

  const handleVerifyPhoneOTP =
    async () => {
      if (
        !currentUser ||
        !verificationId
      ) {
        setErrorMessage(
          "Please request a new verification code."
        );

        return;
      }

      const cleanOTP =
        otp.trim();

      if (
        !/^\d{6}$/.test(
          cleanOTP
        )
      ) {
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

        setPhone(
          verifiedPhone
        );

        setOriginalPhone(
          verifiedPhone
        );

        setPhoneVerified(true);

        await setDoc(
          doc(
            db,
            "users",
            currentUser.uid
          ),
          {
            phone:
              verifiedPhone,

            phoneVerified:
              true,

            phoneVerifiedAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp(),
          },
          {
            merge: true,
          }
        );

        setOtp("");
        setOtpSent(false);
        setVerificationId(null);
        setPendingPhone("");

        clearRecaptcha();

        setShowPhoneModal(
          false
        );

        setMessage(
          "Your new phone number has been verified."
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

          setOtpSent(false);
          setVerificationId(null);
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
          setPhoneVerified(
            false
          );

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
        setIsPhoneProcessing(
          false
        );
      }
    };

  // =========================================================
  // EMAIL VERIFICATION MODAL
  // =========================================================

  const handleOpenEmailVerification =
    async () => {
      if (!currentUser?.email) {
        setErrorMessage(
          "No email address is associated with this account."
        );

        return;
      }

      clearMessages();

      setShowEmailModal(true);

      if (
        currentUser.emailVerified
      ) {
        setEmailVerified(true);
        return;
      }

      await handleSendEmailVerification();
    };

  // =========================================================
  // SEND EMAIL VERIFICATION
  // =========================================================

  const handleSendEmailVerification =
    async () => {
      if (!currentUser?.email) {
        setErrorMessage(
          "No email address is associated with this account."
        );

        return;
      }

      setIsEmailProcessing(true);
      clearMessages();

      try {
        await sendEmailVerification(
          currentUser
        );

        setEmailVerificationSent(
          true
        );
      } catch (error) {
        console.error(
          "Email verification failed:",
          error
        );

        if (
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
        setIsEmailProcessing(
          false
        );
      }
    };

  // =========================================================
  // REFRESH EMAIL VERIFICATION
  // =========================================================

  const handleRefreshEmailVerification =
    async () => {
      if (!currentUser)
        return;

      setIsEmailProcessing(true);
      clearMessages();

      try {
        await reload(
          currentUser
        );

        const verified =
          currentUser.emailVerified ===
          true;

        setEmailVerified(
          verified
        );

        if (verified) {
          setShowEmailModal(
            false
          );

          setMessage(
            "Your email address is verified."
          );
        } else {
          setErrorMessage(
            "Your email is not verified yet. Please click the verification link in your inbox."
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
        setIsEmailProcessing(
          false
        );
      }
    };

  // =========================================================
  // SAVE PROFILE
  // =========================================================

  const handleSave = async (
    event
  ) => {
    event.preventDefault();

    if (!currentUser)
      return;

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

    if (
      phoneChanged &&
      !phoneVerified
    ) {
      setErrorMessage(
        "Please verify your new phone number before saving."
      );

      setShowPhoneModal(
        true
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
        (currentUser.displayName ||
          "")
      ) {
        await updateProfile(
          currentUser,
          {
            displayName:
              fullName.trim(),
          }
        );
      }

      // -----------------------------------------------------
      // EMAIL
      // -----------------------------------------------------

      const newEmail =
        email
          .trim()
          .toLowerCase();

      const oldEmail =
        (
          currentUser.email ||
          ""
        )
          .trim()
          .toLowerCase();

      if (
        newEmail !==
        oldEmail
      ) {
        try {
          await updateEmail(
            currentUser,
            newEmail
          );

          await sendEmailVerification(
            currentUser
          );

          setEmailVerified(
            false
          );

          setEmailVerificationSent(
            true
          );

          setShowEmailModal(
            true
          );
        } catch (
          emailError
        ) {
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

        email:
          newEmail,

        phone:
          normalizePhone(
            phone
          ),

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
        setIsBirthdayLocked(
          true
        );
      }

      if (
        newEmail === oldEmail
      ) {
        await reload(
          currentUser
        );

        setEmailVerified(
          currentUser.emailVerified ===
            true
        );
      }

      setOriginalPhone(
        normalizePhone(
          phone
        )
      );

      setMessage(
        "Your profile has been saved."
      );
    } catch (error) {
      console.error(
        "Profile save failed:",
        error
      );

      switch (
        error.code
      ) {
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
      setIsProcessing(
        false
      );
    }
  };

  // =========================================================
  // PASSWORD RESET
  // =========================================================

  const handleChangePassword =
    async () => {
      if (!currentUser?.email) {
        setErrorMessage(
          "No email address is associated with this account."
        );

        return;
      }

      setIsPasswordProcessing(
        true
      );

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
        setIsPasswordProcessing(
          false
        );
      }
    };

  // =========================================================
  // AVATAR
  // =========================================================

  const avatar =
    avatarUrl ||
    `https://ui-avatars.com/api/?background=E8D8C8&color=3A2418&name=${encodeURIComponent(
      fullName ||
        "Brewed Member"
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
            font-family:Inter,sans-serif;
            color:#6F625A;
          }

          .profile-loader {
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:14px;
            font-size:13px;
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
          --brew-espresso:#2D1B12;
          --brew-coffee:#493126;
          --brew-muted:#76685F;
          --brew-tan:#B88961;
          --brew-sand:#EAD8C7;
          --brew-cream:#FBF8F4;
          --brew-white:#FFFFFF;
          --brew-border:#E9E0D8;
          --brew-soft:#F5EEE7;
          --brew-green:#39704A;
          --brew-green-bg:#EEF7F0;
          --brew-red:#A04444;
          --brew-red-bg:#FBEEEE;
        }

        * {
          box-sizing:border-box;
        }

        body {
          margin:0;
          background:var(--brew-cream);
          color:var(--brew-espresso);
          font-family:"DM Sans",sans-serif;
        }

        button,
        input {
          font:inherit;
        }

        button {
          -webkit-tap-highlight-color:transparent;
        }

        .profile-page {
          min-height:100vh;
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
          padding:104px 24px 70px;
        }

        .profile-shell {
          width:100%;
          max-width:1040px;
          margin:0 auto;
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
          font-family:"Playfair Display",serif;
          font-size:clamp(2.2rem,5vw,3.5rem);
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

        .hero-pills {
          display:flex;
          align-items:center;
          gap:9px;
          flex-wrap:wrap;
          margin-top:20px;
        }

        .member-pill,
        .tier-pill {
          display:inline-flex;
          align-items:center;
          gap:7px;
          padding:9px 13px;
          border-radius:999px;
          font-size:12px;
          font-weight:600;
          backdrop-filter:blur(8px);
        }

        .member-pill {
          border:1px solid rgba(255,255,255,.12);
          background:rgba(255,255,255,.07);
          color:#E8DCD4;
        }

        .tier-pill {
          border:1px solid rgba(255,255,255,.14);
        }

        .tier-bronze {
          background:rgba(184,137,97,.16);
          color:#E8C3A4;
        }

        .tier-silver {
          background:rgba(205,210,215,.14);
          color:#DDE2E6;
        }

        .tier-gold {
          background:rgba(214,174,70,.15);
          color:#F0D58A;
        }

        .tier-platinum {
          background:rgba(175,195,211,.15);
          color:#D9E8F2;
        }

        /* =====================================================
           CONTENT
        ===================================================== */

        .profile-content {
          margin-top:18px;
          display:block;
        }

        .profile-card {
          width:100%;
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
          font-family:"Playfair Display",serif;
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
          grid-column:1/-1;
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
          box-shadow:0 0 0 4px rgba(184,137,97,.10);
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
           VERIFICATION TRIGGERS
        ===================================================== */

        .verification-trigger {
          width:100%;
          margin-top:10px;
          min-height:44px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:9px 12px;
          border-radius:14px;
          border:1px solid #EDE2D8;
          background:#F8F3EE;
          cursor:pointer;
          text-align:left;
          transition:.2s ease;
        }

        .verification-trigger:hover {
          border-color:#DCC8B8;
          background:#F5EDE5;
          transform:translateY(-1px);
        }

        .verification-trigger-left {
          display:flex;
          align-items:center;
          gap:9px;
          min-width:0;
        }

        .verification-trigger-icon {
          width:30px;
          height:30px;
          border-radius:10px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:#EEE6DE;
          color:#806B5D;
          flex:none;
        }

        .verification-trigger-title {
          font-size:12px;
          font-weight:700;
          color:var(--brew-coffee);
        }

        .verification-trigger-copy {
          margin-top:2px;
          font-size:10px;
          color:#9B8B81;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }

        .verification-trigger-action {
          color:#9A6640;
          font-size:11px;
          font-weight:700;
          white-space:nowrap;
        }

        .verification-trigger.verified {
          background:#F2F8F3;
          border-color:#D9EBDD;
        }

        .verification-trigger.verified
        .verification-trigger-icon {
          background:#E2F0E5;
          color:#39704A;
        }

        .verification-trigger.verified
        .verification-trigger-title {
          color:#39704A;
        }

        .verification-trigger.verified
        .verification-trigger-action {
          color:#39704A;
        }

        /* =====================================================
           PHONE
        ===================================================== */

        .phone-row {
          display:flex;
          gap:9px;
        }

        .phone-row .field-input {
          min-width:0;
        }

        .phone-verify-inline {
          margin-top:10px;
          width:100%;
          min-height:44px;
          border:1px solid #EDE2D8;
          border-radius:14px;
          background:#F8F3EE;
          color:#9A6640;
          font-size:12px;
          font-weight:700;
          cursor:pointer;
          transition:.2s ease;
        }

        .phone-verify-inline:hover {
          background:#F5EDE5;
          border-color:#DCC8B8;
        }

        .phone-verified-note {
          display:flex;
          align-items:center;
          gap:6px;
          margin-top:9px;
          color:var(--brew-green);
          font-size:11px;
          font-weight:600;
        }

        /* =====================================================
           OTP MODAL
        ===================================================== */

        .modal-backdrop {
          position:fixed;
          inset:0;
          z-index:10000;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:20px;
          background:rgba(35,23,17,.52);
          backdrop-filter:blur(8px);
          animation:modalFade .18s ease;
        }

        .verification-modal {
          width:100%;
          max-width:430px;
          background:#FFFDFC;
          border:1px solid rgba(255,255,255,.5);
          border-radius:27px;
          padding:28px;
          box-shadow:
            0 30px 80px rgba(25,15,10,.24);
          animation:modalUp .22s ease;
        }

        .modal-top {
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:15px;
        }

        .modal-icon {
          width:48px;
          height:48px;
          border-radius:16px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:#F5EEE7;
          color:#74533F;
        }

        .modal-close {
          width:36px;
          height:36px;
          border:0;
          border-radius:12px;
          background:#F7F1EC;
          color:#806E63;
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
          transition:.2s ease;
        }

        .modal-close:hover {
          background:#EEE3D9;
          color:#2D1B12;
        }

        .modal-title {
          margin:20px 0 7px;
          font-family:"Playfair Display",serif;
          color:#2D1B12;
          font-size:25px;
          line-height:1.1;
        }

        .modal-description {
          margin:0;
          color:#806F65;
          font-size:13px;
          line-height:1.65;
        }

        .modal-destination {
          margin-top:15px;
          padding:12px 14px;
          border-radius:14px;
          background:#F8F3EE;
          border:1px solid #EDE2D8;
          color:#493126;
          font-size:12px;
          font-weight:700;
          word-break:break-word;
        }

        .modal-input {
          margin-top:17px;
        }

        .modal-actions {
          display:flex;
          gap:9px;
          margin-top:18px;
        }

        .modal-button {
          min-height:47px;
          border-radius:14px;
          border:1px solid #E6DCD4;
          padding:0 16px;
          cursor:pointer;
          font-size:12px;
          font-weight:700;
          transition:.2s ease;
        }

        .modal-button.secondary {
          background:#FFFDFC;
          color:#6F625A;
        }

        .modal-button.primary {
          flex:1;
          background:#2D1B12;
          border-color:#2D1B12;
          color:white;
        }

        .modal-button.primary:hover:not(:disabled) {
          background:#493126;
        }

        .modal-button.secondary:hover:not(:disabled) {
          background:#F7F0EA;
        }

        .modal-button:disabled {
          opacity:.5;
          cursor:not-allowed;
        }

        .resend-button {
          width:100%;
          margin-top:12px;
          min-height:42px;
          border:0;
          background:transparent;
          color:#9A6640;
          font-size:11px;
          font-weight:700;
          cursor:pointer;
        }

        .resend-button:hover:not(:disabled) {
          text-decoration:underline;
        }

        .resend-button:disabled {
          opacity:.5;
          cursor:not-allowed;
        }

        .modal-status {
          margin-top:14px;
          padding:11px 12px;
          border-radius:13px;
          background:#F2F8F3;
          color:#39704A;
          font-size:11px;
          line-height:1.5;
        }

        .modal-error {
          margin-top:14px;
          padding:11px 12px;
          border-radius:13px;
          background:#FBEEEE;
          color:#923D3D;
          font-size:11px;
          line-height:1.5;
        }

        /* =====================================================
           EMAIL MODAL
        ===================================================== */

        .email-step {
          margin-top:20px;
          padding:17px;
          border-radius:17px;
          background:#F8F3EE;
          border:1px solid #EDE2D8;
        }

        .email-step-row {
          display:flex;
          align-items:flex-start;
          gap:11px;
        }

        .email-step-number {
          width:27px;
          height:27px;
          border-radius:9px;
          display:flex;
          align-items:center;
          justify-content:center;
          flex:none;
          background:#EAD8C7;
          color:#493126;
          font-size:11px;
          font-weight:800;
        }

        .email-step-title {
          font-size:12px;
          font-weight:700;
          color:#493126;
        }

        .email-step-copy {
          margin-top:3px;
          color:#8D7D73;
          font-size:11px;
          line-height:1.5;
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

        .address-option input:checked +
        .address-label {
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
           RESPONSIVE
        ===================================================== */

        @media(max-width:680px) {
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

          .phone-row {
            flex-direction:column;
          }

          .hero-pills {
            align-items:flex-start;
          }

          .modal-backdrop {
            align-items:flex-end;
            padding:10px;
          }

          .verification-modal {
            border-radius:25px;
            padding:24px 19px;
          }

          .modal-actions {
            flex-direction:column-reverse;
          }

          .modal-button {
            width:100%;
          }

          .actions {
            flex-direction:column-reverse;
          }

          .action-button {
            width:100%;
          }
        }

        @media(max-width:420px) {
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
        }

        @keyframes modalFade {
          from {
            opacity:0;
          }
          to {
            opacity:1;
          }
        }

        @keyframes modalUp {
          from {
            opacity:0;
            transform:translateY(12px) scale(.98);
          }
          to {
            opacity:1;
            transform:translateY(0) scale(1);
          }
        }

        @media(prefers-reduced-motion:reduce) {
          *,
          *::before,
          *::after {
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
                  disabled={
                    isProcessing
                  }
                  style={{
                    display:"none",
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
                {fullName?.split(
                  " "
                )[0] ||
                  "there"}.
              </h1>

              <p className="hero-subtitle">
                Keep your details up to date
                so every Brewed experience
                feels a little more personal.
              </p>

              <div className="hero-pills">
                <div className="member-pill">
                  <Check size={13} />
                  Member since{" "}
                  {memberSince ||
                    "Today"}
                </div>

                <div
                  className={`tier-pill ${currentTier.className}`}
                >
                  <TierIcon
                    size={13}
                  />

                  {currentTier.label}
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
                      onChange={(e) =>
                        setEmail(
                          e.target.value
                        )
                      }
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />

                    <button
                      type="button"
                      className={`verification-trigger ${
                        emailVerified
                          ? "verified"
                          : ""
                      }`}
                      onClick={
                        handleOpenEmailVerification
                      }
                    >
                      <div className="verification-trigger-left">
                        <div className="verification-trigger-icon">
                          {emailVerified ? (
                            <ShieldCheck
                              size={15}
                            />
                          ) : (
                            <Mail
                              size={15}
                            />
                          )}
                        </div>

                        <div>
                          <div className="verification-trigger-title">
                            {emailVerified
                              ? "Email verified"
                              : "Email not verified"}
                          </div>

                          <div className="verification-trigger-copy">
                            {emailVerified
                              ? "Your email is secured."
                              : "Tap to verify your email."}
                          </div>
                        </div>
                      </div>

                      <span className="verification-trigger-action">
                        {emailVerified
                          ? "Verified"
                          : "Verify"}
                      </span>
                    </button>
                  </div>

                  {/* PHONE */}

                  <div className="form-group">
                    <label className="field-label">
                      Phone number
                      <span className="required">
                        *
                      </span>
                    </label>

                    <div className="phone-row">
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
                    </div>

                    {phoneVerified &&
                    !phoneChanged ? (
                      <div className="phone-verified-note">
                        <Check size={13} />
                        Your phone number is verified.
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="phone-verify-inline"
                        onClick={
                          handleOpenPhoneVerification
                        }
                        disabled={
                          isPhoneProcessing ||
                          !phone.trim()
                        }
                      >
                        {isPhoneProcessing
                          ? "Sending verification code..."
                          : "Verify phone number"}
                      </button>
                    )}

                    <div className="field-note">
                      Changing your number requires
                      a new SMS verification.
                    </div>
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
                      ].map(
                        (type) => (
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
                              onChange={(
                                e
                              ) =>
                                setAddressType(
                                  e.target
                                    .value
                                )
                              }
                            />

                            <span className="address-label">
                              {type
                                .charAt(
                                  0
                                )
                                .toUpperCase() +
                                type.slice(
                                  1
                                )}
                            </span>
                          </label>
                        )
                      )}
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
                          value:
                            address
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

                          isClearable:
                            true,

                          styles: {
                            control:
                              (
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

                            input:
                              (
                                provided
                              ) => ({
                                ...provided,
                                fontSize:
                                  "14px",
                                color:
                                  "#2D1B12",
                              }),

                            placeholder:
                              (
                                provided
                              ) => ({
                                ...provided,
                                color:
                                  "#B1A49C",
                                fontSize:
                                  "14px",
                              }),

                            singleValue:
                              (
                                provided
                              ) => ({
                                ...provided,
                                color:
                                  "#2D1B12",
                                fontSize:
                                  "14px",
                              }),

                            menu:
                              (
                                provided
                              ) => ({
                                ...provided,
                                zIndex:
                                  9999,
                                borderRadius:
                                  "14px",
                                overflow:
                                  "hidden",
                                boxShadow:
                                  "0 18px 40px rgba(45,27,18,.12)",
                              }),

                            option:
                              (
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

                  <span>
                    {message}
                  </span>
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
                    isPhoneProcessing
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
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              if (
                !isPhoneProcessing
              ) {
                setShowPhoneModal(
                  false
                );
              }
            }
          }}
        >
          <div
            className="verification-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="phone-verification-title"
          >
            <div className="modal-top">
              <div className="modal-icon">
                <Phone size={21} />
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  if (
                    !isPhoneProcessing
                  ) {
                    setShowPhoneModal(
                      false
                    );
                  }
                }}
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            <h2
              id="phone-verification-title"
              className="modal-title"
            >
              Verify your phone
            </h2>

            <p className="modal-description">
              We'll send a one-time verification
              code to your new phone number.
            </p>

            <div className="modal-destination">
              {pendingPhone ||
                normalizePhone(
                  phone
                )}
            </div>

            {otpSent && (
              <input
                className="field-input modal-input"
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
                placeholder="Enter 6-digit code"
                autoFocus
              />
            )}

            {!otpSent && (
              <div className="modal-status">
                Preparing your verification code...
              </div>
            )}

            {errorMessage && (
              <div className="modal-error">
                {errorMessage}
              </div>
            )}

            {message && (
              <div className="modal-status">
                {message}
              </div>
            )}

            {otpSent && (
              <>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="modal-button secondary"
                    onClick={() =>
                      handleSendPhoneOTP()
                    }
                    disabled={
                      isPhoneProcessing
                    }
                  >
                    Resend code
                  </button>

                  <button
                    type="button"
                    className="modal-button primary"
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
                      : "Verify phone"}
                  </button>
                </div>
              </>
            )}

            <div id="phone-recaptcha" />
          </div>
        </div>
      )}

      {/* =======================================================
          EMAIL VERIFICATION MODAL
      ======================================================= */}

      {showEmailModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              if (
                !isEmailProcessing
              ) {
                setShowEmailModal(
                  false
                );
              }
            }
          }}
        >
          <div
            className="verification-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="email-verification-title"
          >
            <div className="modal-top">
              <div className="modal-icon">
                {emailVerified ? (
                  <ShieldCheck
                    size={21}
                  />
                ) : (
                  <Mail size={21} />
                )}
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  if (
                    !isEmailProcessing
                  ) {
                    setShowEmailModal(
                      false
                    );
                  }
                }}
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            <h2
              id="email-verification-title"
              className="modal-title"
            >
              {emailVerified
                ? "Email verified"
                : "Verify your email"}
            </h2>

            {emailVerified ? (
              <>
                <p className="modal-description">
                  Your email address has been
                  successfully verified and is
                  now secured to your Brewed
                  account.
                </p>

                <div className="modal-status">
                  <Check
                    size={13}
                    style={{
                      verticalAlign:"-2px",
                      marginRight:6,
                    }}
                  />
                  {currentUser?.email}
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="modal-button primary"
                    onClick={() =>
                      setShowEmailModal(
                        false
                      )
                    }
                  >
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="modal-description">
                  We've sent a verification link
                  to your email. Open the email,
                  tap the verification link, then
                  come back here and confirm.
                </p>

                <div className="modal-destination">
                  {currentUser?.email ||
                    email}
                </div>

                <div className="email-step">
                  <div className="email-step-row">
                    <div className="email-step-number">
                      1
                    </div>

                    <div>
                      <div className="email-step-title">
                        Check your inbox
                      </div>

                      <div className="email-step-copy">
                        Look for the Brewed Firebase
                        verification email.
                      </div>
                    </div>
                  </div>

                  <div
                    className="email-step-row"
                    style={{
                      marginTop:14,
                    }}
                  >
                    <div className="email-step-number">
                      2
                    </div>

                    <div>
                      <div className="email-step-title">
                        Tap the verification link
                      </div>

                      <div className="email-step-copy">
                        The link will confirm ownership
                        of your email address.
                      </div>
                    </div>
                  </div>

                  <div
                    className="email-step-row"
                    style={{
                      marginTop:14,
                    }}
                  >
                    <div className="email-step-number">
                      3
                    </div>

                    <div>
                      <div className="email-step-title">
                        Come back to Brewed
                      </div>

                      <div className="email-step-copy">
                        Tap the button below and we'll
                        check your verification status.
                      </div>
                    </div>
                  </div>
                </div>

                {emailVerificationSent && (
                  <div className="modal-status">
                    Verification email sent. Check
                    your inbox and spam folder if you
                    don't see it.
                  </div>
                )}

                {errorMessage && (
                  <div className="modal-error">
                    {errorMessage}
                  </div>
                )}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="modal-button secondary"
                    onClick={
                      handleSendEmailVerification
                    }
                    disabled={
                      isEmailProcessing
                    }
                  >
                    {isEmailProcessing
                      ? "Sending..."
                      : "Resend email"}
                  </button>

                  <button
                    type="button"
                    className="modal-button primary"
                    onClick={
                      handleRefreshEmailVerification
                    }
                    disabled={
                      isEmailProcessing
                    }
                  >
                    {isEmailProcessing
                      ? "Checking..."
                      : "I've verified"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
