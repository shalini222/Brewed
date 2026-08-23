import React, { useEffect, useRef, useState } from "react";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  PhoneAuthProvider,
  RecaptchaVerifier,
  linkWithCredential,
  reauthenticateWithCredential,
  signOut,
  deleteUser,
} from "firebase/auth";

import { auth, googleProvider, db } from "../firebase";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

import walletService from "../service/walletService";
import rewardService from "../service/rewardService";

import {
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  Coffee,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";

export default function Login({ setPage }) {
  // =========================================================
  // AUTH MODE
  // =========================================================

  const [isLogin, setIsLogin] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // =========================================================
  // GREETING
  // =========================================================

  const [showGreeting, setShowGreeting] = useState(false);
  const [userName, setUserName] = useState("");

  // =========================================================
  // PHONE VERIFICATION
  // =========================================================

  const [showPhoneVerification, setShowPhoneVerification] =
    useState(false);

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);

  const [verificationId, setVerificationId] = useState(null);

  const [pendingUser, setPendingUser] = useState(null);
  const [isNewAccount, setIsNewAccount] = useState(false);

  // =========================================================
  // OTP TIMERS
  // =========================================================

  const OTP_DURATION = 90;
  const RESEND_COOLDOWN = 90;

  const [otpTimer, setOtpTimer] = useState(0);
  const [resendTimer, setResendTimer] = useState(0);
  const [resendingOTP, setResendingOTP] = useState(false);

  // =========================================================
  // DUPLICATE PHONE
  // =========================================================

  const [showPhoneUsedModal, setShowPhoneUsedModal] =
    useState(false);

  const [phoneUsedMessage, setPhoneUsedMessage] = useState("");

  // =========================================================
  // REFS
  // =========================================================

  const greetingTimeoutRef = useRef(null);
  const recaptchaVerifierRef = useRef(null);
  const recaptchaContainerRef = useRef(null);

  const [recaptchaKey, setRecaptchaKey] = useState(0);

  // =========================================================
  // CLEANUP
  // =========================================================

  useEffect(() => {
    return () => {
      if (greetingTimeoutRef.current) {
        clearTimeout(greetingTimeoutRef.current);
      }

      destroyPhoneRecaptcha(false);
    };
  }, []);

  // =========================================================
  // OTP TIMER
  // =========================================================

  useEffect(() => {
    if (otpTimer <= 0) return undefined;

    const timer = setInterval(() => {
      setOtpTimer((previous) => {
        if (previous <= 1) {
          clearInterval(timer);

          setVerificationId(null);

          setMessage(
            "Your verification code has expired. Request a new code below."
          );

          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [otpTimer]);

  // =========================================================
  // RESEND TIMER
  // =========================================================

  useEffect(() => {
    if (resendTimer <= 0) return undefined;

    const timer = setInterval(() => {
      setResendTimer((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendTimer]);

  // =========================================================
  // FORMAT TIMER
  // =========================================================

  function formatTimer(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  // =========================================================
  // GREETING
  // =========================================================

  function getGreeting() {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";

    return "Good evening";
  }

  // =========================================================
  // NORMALIZE PHONE
  // =========================================================

  function normalizePhone(phoneNumber = "") {
    return phoneNumber
      .replace(/\s+/g, "")
      .replace(/-/g, "")
      .replace(/[()]/g, "")
      .trim();
  }

  // =========================================================
  // VALIDATE PHONE
  // =========================================================

  function isValidPhone(phoneNumber) {
    return /^\+[1-9]\d{7,14}$/.test(
      normalizePhone(phoneNumber)
    );
  }

  // =========================================================
  // DESTROY RECAPTCHA
  // =========================================================

  function destroyPhoneRecaptcha(forceNewContainer = true) {
    const verifier = recaptchaVerifierRef.current;

    if (verifier) {
      try {
        verifier.clear();
      } catch (error) {
        console.error("reCAPTCHA cleanup error:", error);
      }
    }

    recaptchaVerifierRef.current = null;

    if (forceNewContainer) {
      setRecaptchaKey((previous) => previous + 1);
    }
  }

  // =========================================================
  // CREATE / GET RECAPTCHA
  // =========================================================

  function getPhoneRecaptcha() {
    if (recaptchaVerifierRef.current) {
      return recaptchaVerifierRef.current;
    }

    const element = recaptchaContainerRef.current;

    if (!element) {
      throw new Error(
        "Phone verification could not be initialized. Please try again."
      );
    }

    const verifier = new RecaptchaVerifier(auth, element, {
      size: "invisible",

      callback: () => {
        console.log("Phone reCAPTCHA completed.");
      },

      "expired-callback": () => {
        console.log("Phone reCAPTCHA expired.");

        if (recaptchaVerifierRef.current) {
          try {
            recaptchaVerifierRef.current.clear();
          } catch (error) {
            console.error("reCAPTCHA cleanup error:", error);
          }
        }

        recaptchaVerifierRef.current = null;
      },

      "error-callback": () => {
        console.log("Phone reCAPTCHA error.");

        if (recaptchaVerifierRef.current) {
          try {
            recaptchaVerifierRef.current.clear();
          } catch (error) {
            console.error("reCAPTCHA cleanup error:", error);
          }
        }

        recaptchaVerifierRef.current = null;
      },
    });

    recaptchaVerifierRef.current = verifier;

    return verifier;
  }

  // =========================================================
  // CHECK CUSTOMER PHONE STATUS
  // =========================================================

  async function checkPhoneStatus(user) {
    if (!user) {
      return {
        exists: false,
        phoneVerified: false,
        phone: "",
      };
    }

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return {
        exists: false,
        phoneVerified: false,
        phone: "",
      };
    }

    const data = userSnap.data();

    return {
      exists: true,
      phoneVerified: data.phoneVerified === true,
      phone: data.phone || "",
    };
  }

  // =========================================================
  // CHECK DUPLICATE PHONE
  // =========================================================

  async function isPhoneAlreadyUsed(phoneNumber, currentUid) {
    const normalizedPhone = normalizePhone(phoneNumber);

    if (!normalizedPhone) return false;

    const usersQuery = query(
      collection(db, "users"),
      where("phone", "==", normalizedPhone)
    );

    const snapshot = await getDocs(usersQuery);

    if (snapshot.empty) return false;

    return snapshot.docs.some(
      (userDoc) => userDoc.id !== currentUid
    );
  }

  // =========================================================
  // DUPLICATE PHONE MODAL
  // =========================================================

  function showPhoneAlreadyUsed() {
    setPhoneUsedMessage(
      "This phone number is already associated with another Brewed account. Each phone number can only be used with one account."
    );

    setShowPhoneUsedModal(true);
  }

  // =========================================================
  // CLEANUP UNVERIFIED ACCOUNT
  // =========================================================

  async function cleanupUnverifiedAccount(user, newAccount) {
    if (!user || !newAccount) return false;

    try {
      await deleteUser(user);

      console.log("Unverified signup account deleted.");

      return true;
    } catch (error) {
      console.error(
        "Failed to delete unverified account:",
        error
      );

      try {
        await signOut(auth);
      } catch (signOutError) {
        console.error(
          "Fallback sign out failed:",
          signOutError
        );
      }

      return false;
    }
  }

  // =========================================================
  // START PHONE VERIFICATION
  // =========================================================

  async function startPhoneVerification(
    user,
    newAccount = false
  ) {
    if (!user) return;

    setPendingUser(user);
    setIsNewAccount(newAccount);

    const status = await checkPhoneStatus(user);

    if (status.phoneVerified === true) {
      await finishCustomerLogin(user, false);
      return;
    }

    if (status.phone) {
      setPhone(normalizePhone(status.phone));
    } else {
      setPhone("");
    }

    setOtp("");
    setOtpSent(false);
    setVerificationId(null);

    setOtpTimer(0);
    setResendTimer(0);

    setMessage("");

    destroyPhoneRecaptcha(true);

    setShowPhoneVerification(true);
  }

  // =========================================================
  // SEND FIRST OTP
  // =========================================================

  async function handleSendPhoneOTP() {
    if (phoneLoading) return;

    if (!pendingUser) {
      setMessage(
        "Your login session has expired. Please log in again."
      );
      return;
    }

    const cleanedPhone = normalizePhone(phone);

    if (!isValidPhone(cleanedPhone)) {
      setMessage(
        "Enter your phone number with country code, e.g. +919876543210."
      );
      return;
    }

    setPhoneLoading(true);
    setMessage("");

    try {
      const alreadyUsed = await isPhoneAlreadyUsed(
        cleanedPhone,
        pendingUser.uid
      );

      if (alreadyUsed) {
        showPhoneAlreadyUsed();
        return;
      }

      setPhone(cleanedPhone);

      const verifier = getPhoneRecaptcha();
      const provider = new PhoneAuthProvider(auth);

      const id = await provider.verifyPhoneNumber(
        cleanedPhone,
        verifier
      );

      setVerificationId(id);
      setOtpSent(true);
      setOtp("");

      setOtpTimer(OTP_DURATION);
      setResendTimer(RESEND_COOLDOWN);

      setMessage(
        "A verification code has been sent to your phone."
      );
    } catch (error) {
      console.error("Phone OTP send error:", error);

      destroyPhoneRecaptcha(true);

      const userToDelete = pendingUser;
      const shouldDelete = isNewAccount;

      if (shouldDelete && userToDelete) {
        await cleanupUnverifiedAccount(
          userToDelete,
          true
        );

        setShowPhoneVerification(false);
        setPendingUser(null);
        setIsNewAccount(false);

        setOtp("");
        setOtpSent(false);
        setVerificationId(null);

        setOtpTimer(0);
        setResendTimer(0);
      }

      if (error.code === "auth/too-many-requests") {
        setMessage(
          "Too many verification attempts. Please try again later."
        );
      } else if (
        error.code === "auth/invalid-phone-number"
      ) {
        setMessage("Please enter a valid phone number.");
      } else if (
        error.code === "auth/quota-exceeded"
      ) {
        setMessage(
          "SMS verification limit reached. Please try again later."
        );
      } else if (
        error.code === "auth/captcha-check-failed"
      ) {
        setMessage(
          "Security verification failed. Please try again."
        );
      } else {
        setMessage(
          error.message ||
            "Unable to send verification code."
        );
      }
    } finally {
      setPhoneLoading(false);
    }
  }

  // =========================================================
  // RESEND OTP
  // =========================================================

  async function handleResendPhoneOTP() {
    if (!pendingUser) {
      setMessage(
        "Your login session has expired. Please log in again."
      );
      return;
    }

    if (resendTimer > 0) return;

    if (resendingOTP || phoneLoading) return;

    const cleanedPhone = normalizePhone(phone);

    if (!isValidPhone(cleanedPhone)) {
      setMessage("Enter a valid phone number.");
      return;
    }

    setResendingOTP(true);
    setPhoneLoading(true);
    setMessage("");

    try {
      const alreadyUsed = await isPhoneAlreadyUsed(
        cleanedPhone,
        pendingUser.uid
      );

      if (alreadyUsed) {
        showPhoneAlreadyUsed();
        return;
      }

      const verifier = getPhoneRecaptcha();
      const provider = new PhoneAuthProvider(auth);

      const newVerificationId =
        await provider.verifyPhoneNumber(
          cleanedPhone,
          verifier
        );

      setVerificationId(newVerificationId);
      setOtp("");

      setOtpTimer(OTP_DURATION);
      setResendTimer(RESEND_COOLDOWN);

      setOtpSent(true);

      setMessage(
        "A new verification code has been sent."
      );
    } catch (error) {
      console.error("Resend OTP error:", error);

      destroyPhoneRecaptcha(true);

      if (error.code === "auth/too-many-requests") {
        setMessage(
          "Too many verification attempts. Please try again later."
        );
      } else if (
        error.code === "auth/quota-exceeded"
      ) {
        setMessage(
          "SMS verification limit reached. Please try again later."
        );
      } else if (
        error.code === "auth/captcha-check-failed"
      ) {
        setMessage(
          "Security verification failed. Please try again."
        );
      } else {
        setMessage(
          error.message ||
            "Unable to resend verification code."
        );
      }
    } finally {
      setResendingOTP(false);
      setPhoneLoading(false);
    }
  }

  // =========================================================
  // VERIFY OTP
  // =========================================================

  async function handleVerifyPhoneOTP() {
    if (
      phoneLoading ||
      !pendingUser ||
      !verificationId
    ) {
      setMessage(
        "Your verification session has expired. Please request a new code."
      );
      return;
    }

    if (otpTimer <= 0) {
      setVerificationId(null);

      setMessage(
        "Code expired. Request a new code below."
      );

      return;
    }

    const cleanOtp = otp.trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      setMessage(
        "Enter the 6-digit verification code."
      );
      return;
    }

    setPhoneLoading(true);
    setMessage("");

    try {
      const normalizedPhone = normalizePhone(phone);

      const alreadyUsed = await isPhoneAlreadyUsed(
        normalizedPhone,
        pendingUser.uid
      );

      if (alreadyUsed) {
        destroyPhoneRecaptcha(true);
        showPhoneAlreadyUsed();
        return;
      }

      const credential =
        PhoneAuthProvider.credential(
          verificationId,
          cleanOtp
        );

      const phoneProviderAlreadyLinked =
        pendingUser.providerData.some(
          (provider) =>
            provider.providerId === "phone"
        );

      if (phoneProviderAlreadyLinked) {
        await reauthenticateWithCredential(
          pendingUser,
          credential
        );
      } else {
        await linkWithCredential(
          pendingUser,
          credential
        );
      }

      await setDoc(
        doc(db, "users", pendingUser.uid),
        {
          phone: normalizedPhone,
          phoneVerified: true,
          phoneVerifiedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      const verifiedUser = pendingUser;
      const wasNewAccount = isNewAccount;

      destroyPhoneRecaptcha(true);

      setShowPhoneVerification(false);
      setOtp("");
      setOtpSent(false);
      setVerificationId(null);

      setOtpTimer(0);
      setResendTimer(0);

      setMessage("");

      setPendingUser(null);
      setIsNewAccount(false);

      await finishCustomerLogin(
        verifiedUser,
        wasNewAccount
      );
    } catch (error) {
      console.error(
        "Phone OTP verification error:",
        error
      );

      if (
        error.code ===
        "auth/invalid-verification-code"
      ) {
        setMessage("Incorrect verification code.");
        return;
      }

      if (error.code === "auth/code-expired") {
        setVerificationId(null);
        setOtpTimer(0);

        setMessage(
          "Code expired. Request a new code below."
        );

        return;
      }

      if (
        error.code ===
        "auth/credential-already-in-use"
      ) {
        showPhoneAlreadyUsed();
        return;
      }

      if (
        error.code ===
        "auth/provider-already-linked"
      ) {
        setMessage(
          "This phone number is already verified on your account."
        );
        return;
      }

      if (
        error.code ===
        "auth/requires-recent-login"
      ) {
        setMessage(
          "Please log in again and verify your phone."
        );
        return;
      }

      if (
        error.code ===
        "auth/invalid-credential"
      ) {
        setMessage(
          "The verification code is invalid or has expired. Request a new code."
        );
        return;
      }

      setMessage(
        error.message ||
          "Unable to verify your phone number."
      );
    } finally {
      setPhoneLoading(false);
    }
  }

  // =========================================================
  // FINISH CUSTOMER / RIDER LOGIN
  // =========================================================

  async function finishCustomerLogin(
    user,
    shouldGiveSignupReward = false
  ) {
    if (!user) return;

    const phoneStatus = await checkPhoneStatus(user);

    if (phoneStatus.phoneVerified !== true) {
      setMessage(
        "Phone verification is required before you can continue."
      );

      await signOut(auth);
      return;
    }

    // =======================================================
    // RIDER
    // =======================================================

    const riderQuery = query(
      collection(db, "riders"),
      where("email", "==", user.email)
    );

    const riderSnapshot = await getDocs(riderQuery);

    if (!riderSnapshot.empty) {
      const riderDoc = riderSnapshot.docs[0];
      const riderData = riderDoc.data();

      if (riderData.status !== "Active") {
        setMessage(
          "Your rider account is currently inactive. Please contact the administrator."
        );

        await signOut(auth);
        return;
      }

      setPage("rider");
      return;
    }

    // =======================================================
    // CUSTOMER
    // =======================================================

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    let userData;

    if (!userSnap.exists()) {
      userData = {
        name:
          user.displayName ||
          name.trim() ||
          user.email?.split("@")[0] ||
          "User",

        email: user.email || "",

        birthday: "",

        photoURL: user.photoURL || "",

        phone:
          phoneStatus.phone ||
          normalizePhone(phone),

        phoneVerified: true,

        phoneVerifiedAt: serverTimestamp(),

        createdAt: serverTimestamp(),

        updatedAt: serverTimestamp(),

        loyaltyPoints: 0,

        lifetimePoints: 0,

        signupRewardClaimed: false,

        birthdayRewardYear: null,

        referredBy: null,

        referralRewardClaimed: false,

        settings: {
          notifications: true,
          darkMode: false,
          reduceMotion: false,
        },

        rewards: {
          beans: 0,
          lifetimeBeans: 0,
          tier: "Bronze",
          memberSince: serverTimestamp(),
          birthdayRewardClaimed: false,
        },
      };

      await setDoc(userRef, userData);
    } else {
      userData = userSnap.data();
    }

    // =======================================================
    // WALLET
    // =======================================================

    try {
      await walletService.createWallet(user.uid);
    } catch (error) {
      console.error(
        "Wallet initialization failed:",
        error
      );
    }

    // =======================================================
    // SIGNUP REWARD
    // =======================================================

    if (
      shouldGiveSignupReward &&
      userData?.signupRewardClaimed !== true
    ) {
      try {
        await rewardService.giveSignupReward(user.uid);
      } catch (error) {
        console.error(
          "Signup reward failed:",
          error
        );
      }
    }

    // =======================================================
    // GREETING
    // =======================================================

    const displayName =
      user.displayName ||
      name.trim() ||
      userData?.name ||
      user.email?.split("@")[0] ||
      "User";

    setUserName(displayName);
    setShowGreeting(true);

    if (greetingTimeoutRef.current) {
      clearTimeout(greetingTimeoutRef.current);
    }

    greetingTimeoutRef.current = setTimeout(() => {
      setShowGreeting(false);
      setPage("menu");
    }, 2200);
  }

  // =========================================================
  // EMAIL / PASSWORD
  // =========================================================

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      if (isLogin) {
        const userCredential =
          await signInWithEmailAndPassword(
            auth,
            email.trim(),
            password
          );

        await startPhoneVerification(
          userCredential.user,
          false
        );

        return;
      }

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      await startPhoneVerification(
        userCredential.user,
        true
      );
    } catch (error) {
      console.error("Login error:", error);

      if (error.code === "auth/invalid-credential") {
        setMessage("Incorrect email or password.");
      } else if (error.code === "auth/user-not-found") {
        setMessage(
          "No account was found with this email."
        );
      } else if (error.code === "auth/wrong-password") {
        setMessage("Incorrect password.");
      } else if (
        error.code === "auth/email-already-in-use"
      ) {
        setMessage(
          "An account already exists with this email."
        );
      } else if (error.code === "auth/weak-password") {
        setMessage(
          "Password must be at least 6 characters."
        );
      } else if (error.code === "auth/invalid-email") {
        setMessage(
          "Please enter a valid email address."
        );
      } else if (
        error.code === "auth/too-many-requests"
      ) {
        setMessage(
          "Too many attempts. Please try again later."
        );
      } else {
        setMessage(
          error.message ||
            "Unable to complete login."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // GOOGLE LOGIN
  // =========================================================

  async function handleGoogleLogin() {
    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      const result = await signInWithPopup(
        auth,
        googleProvider
      );

      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      await startPhoneVerification(
        user,
        !userSnap.exists()
      );
    } catch (error) {
      console.error(
        "Google login error:",
        error
      );

      try {
        await signOut(auth);
      } catch (signOutError) {
        console.error(
          "Google fallback sign out failed:",
          signOutError
        );
      }

      if (
        error.code ===
        "auth/popup-closed-by-user"
      ) {
        setMessage(
          "Google sign-in was cancelled."
        );
      } else if (
        error.code === "auth/popup-blocked"
      ) {
        setMessage(
          "Google sign-in was blocked by your browser. Please allow popups and try again."
        );
      } else if (
        error.code ===
        "auth/account-exists-with-different-credential"
      ) {
        setMessage(
          "An account already exists with this email. Please use the original sign-in method."
        );
      } else {
        setMessage(
          error.message ||
            "Unable to sign in with Google."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // FORGOT PASSWORD
  // =========================================================

  async function forgotPassword() {
    if (loading) return;

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setMessage("Enter your email first.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      await sendPasswordResetEmail(
        auth,
        cleanEmail
      );

      setMessage(
        "If an account exists for this email, a password reset link has been sent."
      );
    } catch (error) {
      console.error(
        "Password reset error:",
        error
      );

      if (error.code === "auth/invalid-email") {
        setMessage(
          "Please enter a valid email address."
        );
      } else {
        setMessage(
          "If an account exists for this email, a password reset link has been sent."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // CANCEL PHONE VERIFICATION
  // =========================================================

  async function cancelPhoneVerification() {
    if (phoneLoading) return;

    const wasNewAccount = isNewAccount;
    const user = pendingUser;

    destroyPhoneRecaptcha(true);

    setShowPhoneVerification(false);

    setOtp("");
    setOtpSent(false);
    setVerificationId(null);

    setPendingUser(null);
    setPhone("");

    setIsNewAccount(false);

    setOtpTimer(0);
    setResendTimer(0);

    setMessage("");

    if (wasNewAccount && user) {
      await cleanupUnverifiedAccount(user, true);
      return;
    }

    try {
      await signOut(auth);
    } catch (error) {
      console.error(
        "Sign out after phone cancellation:",
        error
      );
    }
  }

  // =========================================================
  // CHANGE PHONE NUMBER
  // =========================================================

  function changePhoneNumber() {
    if (phoneLoading) return;

    destroyPhoneRecaptcha(true);

    setOtpSent(false);
    setOtp("");
    setVerificationId(null);

    setOtpTimer(0);
    setResendTimer(0);

    setMessage("");
  }

  // =========================================================
  // CLOSE DUPLICATE PHONE MODAL
  // =========================================================

  async function closePhoneUsedModal() {
    if (phoneLoading) return;

    const wasNewAccount = isNewAccount;
    const user = pendingUser;

    setShowPhoneUsedModal(false);
    setPhoneUsedMessage("");

    setOtp("");
    setOtpSent(false);
    setVerificationId(null);

    setOtpTimer(0);
    setResendTimer(0);

    destroyPhoneRecaptcha(true);

    setPhone("");
    setPendingUser(null);
    setIsNewAccount(false);

    if (wasNewAccount && user) {
      await cleanupUnverifiedAccount(user, true);
      return;
    }

    try {
      await signOut(auth);
    } catch (error) {
      console.error(
        "Duplicate phone sign out error:",
        error
      );
    }
  }

  // =========================================================
  // SWITCH AUTH MODE
  // =========================================================

  function switchAuthMode() {
    if (loading) return;

    setIsLogin((previous) => !previous);

    setMessage("");
    setPassword("");
    setShowPassword(false);
  }

  // =========================================================
  // GOOGLE MARK
  // =========================================================

  function GoogleMark() {
    return (
      <span className="google-mark" aria-hidden="true">
        G
      </span>
    );
  }

  // =========================================================
  // MESSAGE
  // =========================================================

  function Message({ children }) {
    if (!children) return null;

    return (
      <div className="message" role="status">
        <AlertCircle
          size={15}
          strokeWidth={1.8}
        />

        <span>{children}</span>
      </div>
    );
  }

  // =========================================================
  // MAIN UI
  // =========================================================

  return (
    <>
      <style>{`
        @import url(
          'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap'
        );

        :root {
          --espresso: #2B160B;
          --espresso-soft: #422516;
          --coffee: #67422A;
          --caramel: #B58A62;
          --caramel-light: #D5B997;

          --ivory: #F7F3EC;
          --paper: #FCFAF6;
          --white: #FFFFFF;

          --ink: #30251F;
          --muted: #88786C;
          --muted-light: #A99A8F;

          --line: #E7DED4;
          --line-dark: #D9CBBE;

          --danger: #A34B40;
          --success: #5B705E;

          --serif: "Playfair Display", Georgia, serif;
          --sans: "DM Sans", Arial, sans-serif;
        }

        * {
          box-sizing: border-box;
        }

        html,
        body,
        #root {
          min-height: 100%;
        }

        body {
          margin: 0;
          background: var(--ivory);
          color: var(--ink);
          font-family: var(--sans);
        }

        button,
        input {
          font: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        /* =====================================================
           PAGE
        ===================================================== */

        .auth-page {
          min-height: 100vh;
          min-height: 100dvh;
          padding: 24px;
          background:
            linear-gradient(
              120deg,
              #F5F0E8 0%,
              #FBF8F2 48%,
              #F0E9DE 100%
            );
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .auth-page::before {
          content: "";
          position: absolute;
          width: 700px;
          height: 700px;
          border-radius: 50%;
          border: 1px solid rgba(91, 57, 32, .055);
          top: -450px;
          left: -250px;
          pointer-events: none;
        }

        .auth-page::after {
          content: "";
          position: absolute;
          width: 620px;
          height: 620px;
          border-radius: 50%;
          border: 1px solid rgba(91, 57, 32, .045);
          right: -360px;
          bottom: -380px;
          pointer-events: none;
        }

        .auth-frame {
          width: 100%;
          max-width: 1240px;
          min-height: 720px;
          display: grid;
          grid-template-columns: 1.04fr .96fr;
          position: relative;
          z-index: 1;
          overflow: hidden;
          background: var(--paper);
          box-shadow:
            0 35px 90px rgba(47, 28, 16, .10),
            0 8px 30px rgba(47, 28, 16, .05);
        }

        /* =====================================================
           BRAND / EDITORIAL SIDE
        ===================================================== */

        .editorial-side {
          position: relative;
          min-height: 720px;
          overflow: hidden;
          background:
            linear-gradient(
              145deg,
              rgba(38, 18, 8, .96),
              rgba(76, 43, 23, .94)
            );
          color: white;
          isolation: isolate;
        }

        .editorial-texture {
          position: absolute;
          inset: 0;
          opacity: .23;
          background:
            radial-gradient(
              ellipse at 35% 25%,
              rgba(255,255,255,.12) 0,
              transparent 32%
            ),
            radial-gradient(
              ellipse at 72% 78%,
              rgba(220,181,139,.14) 0,
              transparent 34%
            );
        }

        /*
          Abstract coffee-inspired visual treatment.
          It intentionally avoids stock-image / generic SaaS imagery.
        */

        .coffee-orbit {
          position: absolute;
          width: 580px;
          height: 580px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,.10);
          right: -240px;
          top: 80px;
        }

        .coffee-orbit::before {
          content: "";
          position: absolute;
          inset: 65px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,.075);
        }

        .coffee-orbit::after {
          content: "";
          position: absolute;
          inset: 130px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,.055);
        }

        .coffee-cup-art {
          position: absolute;
          width: 260px;
          height: 260px;
          right: 90px;
          top: 205px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle at 50% 48%,
              #1E0D05 0 22%,
              #5A321C 23% 32%,
              #A06C43 33% 36%,
              rgba(255,255,255,.10) 37% 37.5%,
              transparent 38%
            ),
            radial-gradient(
              circle,
              #C7A27C 0%,
              #8C5D3C 43%,
              #40200F 72%,
              #1F0D05 100%
            );
          box-shadow:
            0 35px 60px rgba(0,0,0,.35),
            inset 0 8px 20px rgba(255,255,255,.10);
          transform: rotate(-8deg);
          opacity: .95;
        }

        .coffee-cup-art::before {
          content: "";
          position: absolute;
          width: 80px;
          height: 80px;
          border: 16px solid #8E6242;
          border-left-color: transparent;
          border-radius: 50%;
          right: -50px;
          top: 75px;
          opacity: .85;
        }

        .steam {
          position: absolute;
          width: 2px;
          height: 90px;
          background: linear-gradient(
            to top,
            rgba(255,255,255,.16),
            transparent
          );
          border-radius: 100%;
          top: 112px;
          left: 50%;
          transform: rotate(7deg);
          filter: blur(.5px);
        }

        .steam-two {
          left: 58%;
          height: 72px;
          top: 125px;
          transform: rotate(-10deg);
        }

        .editorial-content {
          position: relative;
          z-index: 3;
          min-height: 720px;
          padding: 52px 58px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .brand-lockup {
          display: flex;
          align-items: center;
          gap: 12px;
          color: rgba(255,255,255,.96);
        }

        .brand-mark {
          width: 38px;
          height: 38px;
          border: 1px solid rgba(255,255,255,.22);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(255,255,255,.055);
        }

        .brand-name {
          font-family: var(--serif);
          font-size: 27px;
          font-weight: 500;
          letter-spacing: -.8px;
        }

        .editorial-copy {
          max-width: 475px;
          margin-top: auto;
          margin-bottom: auto;
          padding-top: 70px;
        }

        .editorial-kicker {
          display: flex;
          align-items: center;
          gap: 12px;
          color: rgba(255,255,255,.62);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 2.2px;
          text-transform: uppercase;
          margin-bottom: 22px;
        }

        .editorial-kicker::before {
          content: "";
          width: 28px;
          height: 1px;
          background: var(--caramel-light);
          opacity: .7;
        }

        .editorial-title {
          margin: 0;
          font-family: var(--serif);
          font-weight: 500;
          font-size: clamp(50px, 5vw, 72px);
          line-height: .98;
          letter-spacing: -3px;
        }

        .editorial-title em {
          color: #D4AF8A;
          font-style: italic;
          font-weight: 400;
        }

        .editorial-description {
          max-width: 390px;
          margin: 26px 0 0;
          color: rgba(255,255,255,.58);
          font-size: 14px;
          line-height: 1.8;
        }

        .editorial-footer {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          color: rgba(255,255,255,.45);
          font-size: 10px;
          letter-spacing: 1.1px;
          text-transform: uppercase;
        }

        .editorial-footer-line {
          width: 45px;
          height: 1px;
          background: rgba(255,255,255,.25);
          margin-bottom: 6px;
        }

        /* =====================================================
           AUTH SIDE
        ===================================================== */

        .form-side {
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 66px clamp(44px, 6vw, 88px);
          background: rgba(252,250,246,.96);
        }

        .form-inner {
          width: 100%;
          max-width: 430px;
          margin: 0 auto;
        }

        .form-topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 48px;
        }

        .form-label {
          color: var(--caramel);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .form-count {
          color: #B5A69A;
          font-size: 10px;
          letter-spacing: 1px;
        }

        .auth-heading {
          margin: 0;
          color: var(--espresso);
          font-family: var(--serif);
          font-size: clamp(40px, 4vw, 52px);
          font-weight: 500;
          letter-spacing: -2px;
          line-height: 1;
        }

        .auth-intro {
          margin: 15px 0 38px;
          max-width: 370px;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.75;
        }

        /* =====================================================
           FIELDS
        ===================================================== */

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .field {
          position: relative;
        }

        .field-label {
          display: block;
          margin-bottom: 9px;
          color: #66564B;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .15px;
        }

        .field-control {
          position: relative;
        }

        .field-icon {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          color: #A7978B;
          pointer-events: none;
          transition: color .2s ease;
        }

        .auth-input {
          width: 100%;
          height: 48px;
          padding: 0 0 0 30px;
          border: 0;
          border-bottom: 1px solid var(--line-dark);
          border-radius: 0;
          outline: none;
          background: transparent;
          color: var(--espresso);
          font-size: 14px;
          transition:
            border-color .25s ease,
            box-shadow .25s ease;
        }

        .auth-input::placeholder {
          color: #B6A9A0;
        }

        .auth-input:hover:not(:disabled) {
          border-color: #BBA999;
        }

        .auth-input:focus {
          border-color: var(--coffee);
          box-shadow: 0 1px 0 var(--coffee);
        }

        .auth-input:focus ~ .field-icon {
          color: var(--coffee);
        }

        .password-control .auth-input {
          padding-right: 42px;
        }

        .password-toggle {
          position: absolute;
          right: 0;
          top: 50%;
          width: 32px;
          height: 32px;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          background: transparent;
          color: #9B8C81;
          cursor: pointer;
          border-radius: 50%;
        }

        .password-toggle:hover {
          color: var(--espresso);
          background: rgba(0,0,0,.035);
        }

        .form-utility {
          display: flex;
          justify-content: flex-end;
          margin-top: -10px;
        }

        .minimal-button {
          border: 0;
          padding: 0;
          background: transparent;
          color: var(--coffee);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .minimal-button:hover {
          color: var(--espresso);
        }

        /* =====================================================
           PRIMARY ACTION
        ===================================================== */

        .continue-button {
          width: 100%;
          min-height: 52px;
          margin-top: 3px;
          padding: 0 20px;
          border: 1px solid var(--espresso);
          border-radius: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          background: var(--espresso);
          color: white;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .35px;
          cursor: pointer;
          transition:
            background .25s ease,
            transform .25s ease,
            box-shadow .25s ease;
        }

        .continue-button:hover:not(:disabled) {
          background: #3A1E0F;
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(43,22,11,.14);
        }

        .continue-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .continue-arrow {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-left: 1px solid rgba(255,255,255,.2);
          padding-left: 12px;
          box-sizing: content-box;
        }

        .continue-button:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        /* =====================================================
           DIVIDER
        ===================================================== */

        .auth-divider {
          display: flex;
          align-items: center;
          gap: 14px;
          margin: 27px 0 21px;
          color: #B0A198;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.8px;
          text-transform: uppercase;
        }

        .auth-divider::before,
        .auth-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: var(--line);
        }

        /* =====================================================
           GOOGLE
        ===================================================== */

        .google-button {
          width: 100%;
          height: 48px;
          border: 1px solid var(--line-dark);
          border-radius: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: transparent;
          color: var(--ink);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition:
            background .2s ease,
            border-color .2s ease;
        }

        .google-button:hover:not(:disabled) {
          background: white;
          border-color: #C8B8A9;
        }

        .google-button:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .google-mark {
          width: 19px;
          height: 19px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: Arial, sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: #4285F4;
        }

        /* =====================================================
           SWITCH
        ===================================================== */

        .auth-switch {
          margin-top: 34px;
          text-align: center;
          color: var(--muted);
          font-size: 11px;
        }

        .auth-switch button {
          margin-left: 5px;
          border: 0;
          padding: 0;
          background: transparent;
          color: var(--espresso);
          font-weight: 700;
          cursor: pointer;
        }

        .auth-switch button:hover {
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        /* =====================================================
           MESSAGE
        ===================================================== */

        .message {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin-top: 18px;
          padding: 11px 13px;
          border-left: 2px solid var(--caramel);
          background: #F4EEE6;
          color: #765B47;
          font-size: 11px;
          line-height: 1.6;
        }

        .message svg {
          flex-shrink: 0;
          margin-top: 2px;
        }

        /* =====================================================
           PHONE VERIFICATION
        ===================================================== */

        .verification-back {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          width: fit-content;
          margin-bottom: 48px;
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--muted);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .verification-back:hover {
          color: var(--espresso);
        }

        .verification-heading {
          margin-bottom: 37px;
        }

        .verification-kicker {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 17px;
          color: var(--caramel);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.8px;
          text-transform: uppercase;
        }

        .verification-kicker::before {
          content: "";
          width: 25px;
          height: 1px;
          background: var(--caramel);
        }

        .verification-title {
          margin: 0;
          color: var(--espresso);
          font-family: var(--serif);
          font-size: 43px;
          font-weight: 500;
          line-height: 1;
          letter-spacing: -1.7px;
        }

        .verification-description {
          margin: 14px 0 0;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.75;
        }

        .phone-display {
          color: var(--espresso);
          font-weight: 700;
        }

        .phone-input {
          padding-left: 30px;
        }

        .otp-input {
          width: 100%;
          height: 68px;
          padding: 0;
          border: 0;
          border-bottom: 1px solid var(--line-dark);
          border-radius: 0;
          outline: none;
          background: transparent;
          color: var(--espresso);
          text-align: center;
          letter-spacing: 14px;
          font-size: 27px;
          font-weight: 600;
          transition:
            border-color .2s ease,
            box-shadow .2s ease;
        }

        .otp-input::placeholder {
          color: #D0C4BA;
          letter-spacing: 12px;
        }

        .otp-input:focus {
          border-color: var(--coffee);
          box-shadow: 0 1px 0 var(--coffee);
        }

        .timer-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 13px;
          color: var(--muted);
          font-size: 10px;
        }

        .timer-active {
          color: var(--coffee);
          font-weight: 700;
        }

        .timer-expired {
          color: var(--danger);
          font-weight: 700;
        }

        .verification-actions {
          display: grid;
          grid-template-columns: .7fr 1.3fr;
          gap: 10px;
          margin-top: 27px;
        }

        .secondary-button {
          min-height: 50px;
          border: 1px solid var(--line-dark);
          border-radius: 0;
          background: transparent;
          color: var(--ink);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition:
            background .2s ease,
            border-color .2s ease;
        }

        .secondary-button:hover:not(:disabled) {
          background: white;
          border-color: #C7B7A8;
        }

        .secondary-button:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .verification-primary {
          margin-top: 0;
        }

        .resend-area {
          margin-top: 23px;
          text-align: center;
          color: var(--muted);
          font-size: 10px;
          line-height: 1.7;
        }

        .resend-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 3px;
          border: 0;
          padding: 0;
          background: transparent;
          color: var(--coffee);
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .resend-button:hover:not(:disabled) {
          color: var(--espresso);
        }

        .resend-button:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .security-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin-top: 31px;
          color: #A3978E;
          font-size: 9px;
          letter-spacing: .2px;
        }

        .recaptcha-container {
          height: 0;
          overflow: hidden;
        }

        /* =====================================================
           MODAL
        ===================================================== */

        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 22px;
          background: rgba(28, 16, 9, .66);
          backdrop-filter: blur(10px);
          animation: fadeIn .2s ease;
        }

        .phone-modal {
          width: 100%;
          max-width: 410px;
          padding: 40px;
          background: var(--paper);
          box-shadow: 0 30px 80px rgba(0,0,0,.28);
          animation: modalIn .28s ease;
        }

        .modal-topline {
          width: 36px;
          height: 1px;
          margin-bottom: 25px;
          background: var(--caramel);
        }

        .modal-icon {
          width: 44px;
          height: 44px;
          margin-bottom: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--line);
          color: var(--coffee);
        }

        .phone-modal h2 {
          margin: 0;
          color: var(--espresso);
          font-family: var(--serif);
          font-size: 29px;
          font-weight: 500;
          letter-spacing: -.8px;
        }

        .phone-modal p {
          margin: 13px 0 27px;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.75;
        }

        .modal-button {
          margin-top: 0;
        }

        /* =====================================================
           GREETING
        ===================================================== */

        .greeting-screen {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          background: var(--espresso);
          color: white;
          animation: greetingIn .55s ease;
        }

        .greeting-screen::before {
          content: "";
          position: absolute;
          width: 620px;
          height: 620px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,.08);
        }

        .greeting-screen::after {
          content: "";
          position: absolute;
          width: 440px;
          height: 440px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,.055);
        }

        .greeting-content {
          position: relative;
          z-index: 2;
          text-align: center;
        }

        .greeting-brand {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 75px;
          color: rgba(255,255,255,.9);
          font-family: var(--serif);
          font-size: 30px;
          letter-spacing: -1px;
        }

        .greeting-mark {
          width: 38px;
          height: 38px;
          border: 1px solid rgba(255,255,255,.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #D2AB84;
        }

        .greeting-kicker {
          color: #C8A27E;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 2.2px;
          text-transform: uppercase;
        }

        .greeting-name {
          margin-top: 14px;
          color: white;
          font-family: var(--serif);
          font-size: clamp(45px, 7vw, 70px);
          font-weight: 400;
          letter-spacing: -2.5px;
        }

        .greeting-sub {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 11px;
          margin-top: 21px;
          color: rgba(255,255,255,.48);
          font-size: 11px;
        }

        .greeting-line {
          width: 30px;
          height: 1px;
          background: rgba(255,255,255,.2);
        }

        /* =====================================================
           LOADING
        ===================================================== */

        .spinner {
          width: 15px;
          height: 15px;
          border: 1.5px solid rgba(255,255,255,.28);
          border-top-color: white;
          border-radius: 50%;
          animation: spin .7s linear infinite;
        }

        .spinner-dark {
          border-color: rgba(43,22,11,.18);
          border-top-color: var(--espresso);
        }

        .spin-icon {
          animation: spin .7s linear infinite;
        }

        /* =====================================================
           ANIMATIONS
        ===================================================== */

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes modalIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes greetingIn {
          from {
            opacity: 0;
            transform: scale(.985);
          }

          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* =====================================================
           TABLET
        ===================================================== */

        @media (max-width: 950px) {
          .auth-page {
            padding: 18px;
          }

          .auth-frame {
            max-width: 650px;
            grid-template-columns: 1fr;
            min-height: 700px;
          }

          .editorial-side {
            display: none;
          }

          .form-side {
            min-height: 700px;
            padding: 60px clamp(36px, 9vw, 72px);
          }
        }

        /* =====================================================
           MOBILE
        ===================================================== */

        @media (max-width: 560px) {
          .auth-page {
            min-height: 100dvh;
            padding: 0;
            background: var(--paper);
          }

          .auth-frame {
            min-height: 100dvh;
            box-shadow: none;
            background: var(--paper);
          }

          .form-side {
            min-height: 100dvh;
            padding:
              34px 24px
              max(30px, env(safe-area-inset-bottom))
              24px;
            justify-content: center;
          }

          .form-topline {
            margin-bottom: 39px;
          }

          .auth-heading {
            font-size: 40px;
          }

          .auth-intro {
            margin-bottom: 32px;
          }

          .verification-back {
            margin-bottom: 39px;
          }

          .verification-title {
            font-size: 39px;
          }

          .verification-actions {
            grid-template-columns: 1fr;
          }

          .secondary-button {
            order: 2;
          }

          .verification-primary {
            order: 1;
          }

          .phone-modal {
            padding: 30px 25px;
          }

          .greeting-brand {
            margin-bottom: 58px;
          }
        }

        /* =====================================================
           REDUCED MOTION
        ===================================================== */

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      {/* =====================================================
          DUPLICATE PHONE MODAL
      ===================================================== */}

      {showPhoneUsedModal && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="phone-used-title"
        >
          <div className="phone-modal">
            <div className="modal-topline" />

            <div className="modal-icon">
              <AlertCircle
                size={21}
                strokeWidth={1.6}
              />
            </div>

            <h2 id="phone-used-title">
              Number already in use
            </h2>

            <p>{phoneUsedMessage}</p>

            <button
              type="button"
              className="continue-button modal-button"
              onClick={closePhoneUsedModal}
              disabled={phoneLoading}
            >
              <span>Choose another number</span>

              <span className="continue-arrow">
                <ArrowRight
                  size={16}
                  strokeWidth={1.7}
                />
              </span>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          GREETING
      ===================================================== */}

      {showGreeting && (
        <div className="greeting-screen">
          <div className="greeting-content">
            <div className="greeting-brand">
              <div className="greeting-mark">
                <Coffee
                  size={19}
                  strokeWidth={1.5}
                />
              </div>

              Brewed.
            </div>

            <div className="greeting-kicker">
              {getGreeting()}
            </div>

            <div className="greeting-name">
              {userName}
            </div>

            <div className="greeting-sub">
              <span className="greeting-line" />
              Your ritual awaits
              <Coffee
                size={13}
                strokeWidth={1.5}
              />
              <span className="greeting-line" />
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          AUTH PAGE
      ===================================================== */}

      <main className="auth-page">
        <section className="auth-frame">

          {/* =================================================
              EDITORIAL BRAND SIDE
          ================================================= */}

          <aside className="editorial-side">
            <div className="editorial-texture" />

            <div className="coffee-orbit" />

            <div className="coffee-cup-art">
              <div className="steam" />
              <div className="steam steam-two" />
            </div>

            <div className="editorial-content">

              <div className="brand-lockup">
                <div className="brand-mark">
                  <Coffee
                    size={18}
                    strokeWidth={1.5}
                  />
                </div>

                <div className="brand-name">
                  Brewed.
                </div>
              </div>

              <div className="editorial-copy">
                <div className="editorial-kicker">
                  The Brewed ritual
                </div>

                <h1 className="editorial-title">
                  Good coffee.
                  <br />
                  <em>Good moments.</em>
                </h1>

                <p className="editorial-description">
                  Your favourites, rewards and next
                  coffee — thoughtfully brought together
                  in one quiet place.
                </p>
              </div>

              <div className="editorial-footer">
                <div>
                  Crafted for coffee people
                </div>

                <div className="editorial-footer-line" />

                <div>
                  Est. Brewed
                </div>
              </div>

            </div>
          </aside>

          {/* =================================================
              FORM SIDE
          ================================================= */}

          <section className="form-side">
            <div className="form-inner">

              {showPhoneVerification ? (
                <>
                  {/* =========================================
                      PHONE BACK
                  ========================================= */}

                  <button
                    type="button"
                    className="verification-back"
                    onClick={
                      cancelPhoneVerification
                    }
                    disabled={phoneLoading}
                  >
                    <ArrowLeft
                      size={14}
                      strokeWidth={1.8}
                    />

                    Back
                  </button>

                  {/* =========================================
                      PHONE HEADING
                  ========================================= */}

                  <div className="verification-heading">
                    <div className="verification-kicker">
                      <ShieldCheck
                        size={13}
                        strokeWidth={1.7}
                      />

                      Account security
                    </div>

                    <h2 className="verification-title">
                      Verify your
                      <br />
                      phone.
                    </h2>

                    <p className="verification-description">
                      A quick verification keeps your
                      Brewed account, rewards and loyalty
                      points protected.
                    </p>
                  </div>

                  {/* =========================================
                      PHONE NUMBER
                  ========================================= */}

                  {!otpSent ? (
                    <>
                      <div className="field">
                        <label
                          className="field-label"
                          htmlFor="phone"
                        >
                          Mobile number
                        </label>

                        <div className="field-control">
                          <Phone
                            className="field-icon"
                            size={17}
                            strokeWidth={1.7}
                          />

                          <input
                            id="phone"
                            className="auth-input phone-input"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder="+919876543210"
                            value={phone}
                            onChange={(event) =>
                              setPhone(
                                event.target.value
                              )
                            }
                            autoFocus
                            disabled={phoneLoading}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        className="continue-button"
                        onClick={
                          handleSendPhoneOTP
                        }
                        disabled={
                          phoneLoading ||
                          !phone.trim()
                        }
                      >
                        <span>
                          {phoneLoading ? (
                            <>
                              <span
                                className="spinner"
                                style={{
                                  display:
                                    "inline-block",
                                  verticalAlign:
                                    "middle",
                                  marginRight: 8,
                                }}
                              />

                              Sending code
                            </>
                          ) : (
                            "Send verification code"
                          )}
                        </span>

                        {!phoneLoading && (
                          <span className="continue-arrow">
                            <ArrowRight
                              size={16}
                              strokeWidth={1.7}
                            />
                          </span>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      {/* =======================================
                          OTP
                      ======================================= */}

                      <div
                        className="verification-description"
                        style={{
                          marginTop: 0,
                          marginBottom: 18,
                        }}
                      >
                        Enter the six-digit code sent to
                        <br />

                        <span className="phone-display">
                          {phone}
                        </span>
                      </div>

                      <input
                        className="otp-input"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        placeholder="000000"
                        value={otp}
                        onChange={(event) =>
                          setOtp(
                            event.target.value
                              .replace(/\D/g, "")
                              .slice(0, 6)
                          )
                        }
                        autoFocus
                        disabled={phoneLoading}
                        aria-label="6-digit verification code"
                      />

                      {otpTimer > 0 ? (
                        <div className="timer-row">
                          <Clock3
                            size={13}
                            strokeWidth={1.7}
                          />

                          Code expires in

                          <span className="timer-active">
                            {formatTimer(otpTimer)}
                          </span>
                        </div>
                      ) : (
                        <div className="timer-row">
                          <AlertCircle
                            size={13}
                            strokeWidth={1.7}
                          />

                          <span className="timer-expired">
                            Code expired
                          </span>
                        </div>
                      )}

                      <div className="verification-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={
                            changePhoneNumber
                          }
                          disabled={phoneLoading}
                        >
                          Change number
                        </button>

                        <button
                          type="button"
                          className="continue-button verification-primary"
                          onClick={
                            handleVerifyPhoneOTP
                          }
                          disabled={
                            phoneLoading ||
                            otp.length !== 6 ||
                            !verificationId ||
                            otpTimer <= 0
                          }
                        >
                          <span>
                            {phoneLoading ? (
                              <>
                                <span
                                  className="spinner"
                                  style={{
                                    display:
                                      "inline-block",
                                    verticalAlign:
                                      "middle",
                                    marginRight: 8,
                                  }}
                                />

                                Verifying
                              </>
                            ) : (
                              "Verify & continue"
                            )}
                          </span>

                          {!phoneLoading && (
                            <span className="continue-arrow">
                              <Check
                                size={15}
                                strokeWidth={1.8}
                              />
                            </span>
                          )}
                        </button>
                      </div>

                      <div className="resend-area">
                        {resendTimer > 0 ? (
                          <>
                            You can request another
                            code in{" "}
                            <strong>
                              {formatTimer(
                                resendTimer
                              )}
                            </strong>
                          </>
                        ) : (
                          <>
                            Didn't receive the code?

                            <br />

                            <button
                              type="button"
                              className="resend-button"
                              onClick={
                                handleResendPhoneOTP
                              }
                              disabled={
                                phoneLoading ||
                                resendingOTP
                              }
                            >
                              <RefreshCw
                                size={12}
                                strokeWidth={1.8}
                                className={
                                  resendingOTP
                                    ? "spin-icon"
                                    : ""
                                }
                              />

                              {resendingOTP
                                ? "Sending new code..."
                                : "Resend OTP"}
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}

                  <div className="security-note">
                    <LockKeyhole
                      size={12}
                      strokeWidth={1.7}
                    />

                    Secured by Firebase
                  </div>

                  <div
                    key={recaptchaKey}
                    ref={recaptchaContainerRef}
                    className="recaptcha-container"
                  />

                  <Message>
                    {message}
                  </Message>
                </>
              ) : (
                <>
                  {/* =========================================
                      AUTH TOPLINE
                  ========================================= */}

                  <div className="form-topline">
                    <span className="form-label">
                      {isLogin
                        ? "Member access"
                        : "Join the ritual"}
                    </span>

                    <span className="form-count">
                      01 / 01
                    </span>
                  </div>

                  {/* =========================================
                      AUTH HEADING
                  ========================================= */}

                  <h2 className="auth-heading">
                    {isLogin
                      ? "Welcome back."
                      : "Make yourself at home."}
                  </h2>

                  <p className="auth-intro">
                    {isLogin
                      ? "Sign in to pick up where you left off."
                      : "Create your Brewed account and make every cup a little more rewarding."}
                  </p>

                  {/* =========================================
                      FORM
                  ========================================= */}

                  <form
                    className="auth-form"
                    onSubmit={handleSubmit}
                  >
                    {!isLogin && (
                      <div className="field">
                        <label
                          className="field-label"
                          htmlFor="name"
                        >
                          Your name
                        </label>

                        <div className="field-control">
                          <UserRound
                            className="field-icon"
                            size={17}
                            strokeWidth={1.7}
                          />

                          <input
                            id="name"
                            className="auth-input"
                            type="text"
                            placeholder="How should we call you?"
                            value={name}
                            onChange={(event) =>
                              setName(
                                event.target.value
                              )
                            }
                            autoComplete="name"
                            required
                            disabled={loading}
                          />
                        </div>
                      </div>
                    )}

                    <div className="field">
                      <label
                        className="field-label"
                        htmlFor="email"
                      >
                        Email address
                      </label>

                      <div className="field-control">
                        <Mail
                          className="field-icon"
                          size={17}
                          strokeWidth={1.7}
                        />

                        <input
                          id="email"
                          className="auth-input"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(event) =>
                            setEmail(
                              event.target.value
                            )
                          }
                          autoComplete="email"
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="field">
                      <label
                        className="field-label"
                        htmlFor="password"
                      >
                        Password
                      </label>

                      <div className="field-control password-control">
                        <LockKeyhole
                          className="field-icon"
                          size={17}
                          strokeWidth={1.7}
                        />

                        <input
                          id="password"
                          className="auth-input"
                          type={
                            showPassword
                              ? "text"
                              : "password"
                          }
                          placeholder="Enter your password"
                          value={password}
                          onChange={(event) =>
                            setPassword(
                              event.target.value
                            )
                          }
                          autoComplete={
                            isLogin
                              ? "current-password"
                              : "new-password"
                          }
                          required
                          disabled={loading}
                        />

                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() =>
                            setShowPassword(
                              (previous) =>
                                !previous
                            )
                          }
                          disabled={loading}
                          aria-label={
                            showPassword
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff
                              size={16}
                              strokeWidth={1.7}
                            />
                          ) : (
                            <Eye
                              size={16}
                              strokeWidth={1.7}
                            />
                          )}
                        </button>
                      </div>
                    </div>

                    {isLogin && (
                      <div className="form-utility">
                        <button
                          type="button"
                          className="minimal-button"
                          onClick={forgotPassword}
                          disabled={loading}
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}

                    {/* =======================================
                        PRIMARY
                    ======================================= */}

                    <button
                      type="submit"
                      className="continue-button"
                      disabled={loading}
                    >
                      <span>
                        {loading ? (
                          <>
                            <span
                              className="spinner"
                              style={{
                                display:
                                  "inline-block",
                                verticalAlign:
                                  "middle",
                                marginRight: 8,
                              }}
                            />

                            Please wait
                          </>
                        ) : isLogin ? (
                          "Continue"
                        ) : (
                          "Create my account"
                        )}
                      </span>

                      {!loading && (
                        <span className="continue-arrow">
                          <ArrowRight
                            size={16}
                            strokeWidth={1.7}
                          />
                        </span>
                      )}
                    </button>

                    {/* =======================================
                        GOOGLE
                    ======================================= */}

                    <div className="auth-divider">
                      <span>or continue with</span>
                    </div>

                    <button
                      type="button"
                      className="google-button"
                      onClick={
                        handleGoogleLogin
                      }
                      disabled={loading}
                    >
                      <GoogleMark />

                      Continue with Google
                    </button>
                  </form>

                  {/* =========================================
                      MESSAGE
                  ========================================= */}

                  <Message>
                    {message}
                  </Message>

                  {/* =========================================
                      SWITCH
                  ========================================= */}

                  <div className="auth-switch">
                    {isLogin ? (
                      <>
                        New to Brewed?

                        <button
                          type="button"
                          onClick={
                            switchAuthMode
                          }
                          disabled={loading}
                        >
                          Create an account
                        </button>
                      </>
                    ) : (
                      <>
                        Already a member?

                        <button
                          type="button"
                          onClick={
                            switchAuthMode
                          }
                          disabled={loading}
                        >
                          Sign in
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>
        </section>
      </main>
    </>
  );
}
