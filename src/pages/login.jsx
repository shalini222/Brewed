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
  ArrowLeft,
  CheckCircle2,
  Chrome,
  Clock3,
  Coffee,
  Eye,
  EyeOff,
  KeyRound,
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
  // DUPLICATE PHONE MODAL
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
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);

          setVerificationId(null);

          setMessage(
            "Your verification code has expired. Request a new code below."
          );

          return 0;
        }

        return prev - 1;
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
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }

        return prev - 1;
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

    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";

    return "Good Evening";
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
      setRecaptchaKey((prev) => prev + 1);
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
  // CLEAN UP UNVERIFIED ACCOUNT
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

  async function startPhoneVerification(user, newAccount = false) {
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
      } else if (error.code === "auth/quota-exceeded") {
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
      } else if (error.code === "auth/quota-exceeded") {
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

  async function handleSubmit(e) {
    e.preventDefault();

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

        const user = userCredential.user;

        await startPhoneVerification(user, false);

        return;
      }

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      const user = userCredential.user;

      await startPhoneVerification(user, true);
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

    setIsLogin((prev) => !prev);

    setMessage("");
    setPassword("");
    setShowPassword(false);
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <>
      <style>{`
        @import url(
          'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap'
        );

        :root {
          --brew-espresso: #3B1A08;
          --brew-dark: #291207;
          --brew-caramel: #C4956A;
          --brew-caramel-dark: #9A6B43;
          --brew-cream: #FDFAF5;
          --brew-surface: #FFFFFF;
          --brew-soft: #F7F0E7;
          --brew-border: #E7DCD0;
          --brew-text: #2D211B;
          --brew-muted: #7C6D62;
          --brew-danger: #A33D32;
          --brew-success: #58715C;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: var(--brew-cream);
          color: var(--brew-text);
          font-family: "DM Sans", sans-serif;
        }

        button,
        input {
          font: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        .login-page {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 18px;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 10% 10%,
              rgba(196,149,106,.18),
              transparent 30%
            ),
            radial-gradient(
              circle at 90% 90%,
              rgba(59,26,8,.08),
              transparent 34%
            ),
            var(--brew-cream);
        }

        .login-page::before {
          content: "";
          position: absolute;
          width: 520px;
          height: 520px;
          border-radius: 50%;
          border: 1px solid rgba(196,149,106,.16);
          top: -300px;
          right: -170px;
          pointer-events: none;
        }

        .login-page::after {
          content: "";
          position: absolute;
          width: 420px;
          height: 420px;
          border-radius: 50%;
          border: 1px solid rgba(59,26,8,.08);
          bottom: -260px;
          left: -180px;
          pointer-events: none;
        }

        .login-shell {
          width: 100%;
          max-width: 1060px;
          min-height: 650px;
          display: grid;
          grid-template-columns: .92fr 1.08fr;
          background: rgba(255,255,255,.72);
          border: 1px solid rgba(231,220,208,.9);
          border-radius: 30px;
          overflow: hidden;
          box-shadow:
            0 30px 90px rgba(59,26,8,.12),
            0 8px 30px rgba(59,26,8,.06);
          backdrop-filter: blur(20px);
          position: relative;
          z-index: 1;
        }

        .login-brand-panel {
          position: relative;
          padding: 54px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background:
            linear-gradient(
              145deg,
              #3B1A08 0%,
              #4A2410 58%,
              #6B3D20 100%
            );
          color: white;
          overflow: hidden;
        }

        .login-brand-panel::before {
          content: "";
          position: absolute;
          width: 420px;
          height: 420px;
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 50%;
          top: -210px;
          right: -190px;
        }

        .login-brand-panel::after {
          content: "";
          position: absolute;
          width: 300px;
          height: 300px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 50%;
          bottom: -190px;
          left: -160px;
        }

        .brand-content,
        .brand-footer {
          position: relative;
          z-index: 1;
        }

        .brand-logo {
          display: flex;
          align-items: center;
          gap: 11px;
          font-family: "Playfair Display", serif;
          font-size: 32px;
          letter-spacing: -.8px;
        }

        .brand-logo-icon {
          width: 40px;
          height: 40px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,.12);
          border: 1px solid rgba(255,255,255,.12);
        }

        .brand-heading {
          margin: 80px 0 18px;
          max-width: 390px;
          font-family: "Playfair Display", serif;
          font-size: clamp(38px, 4vw, 58px);
          line-height: 1.02;
          letter-spacing: -1.8px;
          font-weight: 600;
        }

        .brand-description {
          max-width: 380px;
          color: rgba(255,255,255,.68);
          line-height: 1.75;
          font-size: 15px;
        }

        .brand-feature {
          display: flex;
          align-items: center;
          gap: 12px;
          color: rgba(255,255,255,.8);
          font-size: 13px;
        }

        .brand-feature-icon {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(196,149,106,.2);
          color: #E4BD96;
        }

        .brand-footer {
          color: rgba(255,255,255,.42);
          font-size: 12px;
          letter-spacing: .3px;
        }

        .login-content {
          padding: 56px clamp(30px, 5vw, 70px);
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: rgba(255,255,255,.82);
        }

        .auth-header {
          margin-bottom: 30px;
        }

        .auth-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: var(--brew-caramel-dark);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .auth-title {
          margin: 0;
          color: var(--brew-espresso);
          font-family: "Playfair Display", serif;
          font-size: 36px;
          line-height: 1.1;
          letter-spacing: -1px;
        }

        .auth-subtitle {
          margin: 10px 0 0;
          color: var(--brew-muted);
          font-size: 14px;
          line-height: 1.6;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .field-label {
          color: #5B4A3E;
          font-size: 12px;
          font-weight: 700;
          margin-left: 2px;
        }

        .input-wrapper {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: #A38E7D;
          pointer-events: none;
          transition: color .2s ease;
        }

        .auth-input {
          width: 100%;
          height: 52px;
          padding: 0 16px 0 45px;
          border: 1px solid var(--brew-border);
          border-radius: 14px;
          background: #FFFEFC;
          color: var(--brew-text);
          outline: none;
          font-size: 14px;
          transition:
            border-color .2s ease,
            box-shadow .2s ease,
            background .2s ease;
        }

        .auth-input::placeholder {
          color: #B0A39A;
        }

        .auth-input:hover:not(:disabled) {
          border-color: #D7C7B8;
        }

        .auth-input:focus {
          border-color: var(--brew-caramel);
          background: white;
          box-shadow:
            0 0 0 4px rgba(196,149,106,.12);
        }

        .auth-input:focus + .input-focus-helper {
          color: var(--brew-caramel-dark);
        }

        .password-button {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 10px;
          background: transparent;
          color: #927F70;
          cursor: pointer;
        }

        .password-button:hover {
          background: var(--brew-soft);
          color: var(--brew-espresso);
        }

        .password-input {
          padding-right: 52px;
        }

        .forgot-row {
          display: flex;
          justify-content: flex-end;
          margin-top: -4px;
        }

        .text-button {
          border: 0;
          background: transparent;
          color: var(--brew-caramel-dark);
          font-size: 12px;
          font-weight: 700;
          padding: 3px 0;
          cursor: pointer;
        }

        .text-button:hover {
          color: var(--brew-espresso);
        }

        .primary-button {
          width: 100%;
          min-height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border: 0;
          border-radius: 14px;
          background: var(--brew-espresso);
          color: white;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow:
            0 9px 22px rgba(59,26,8,.15);
          transition:
            transform .2s ease,
            background .2s ease,
            box-shadow .2s ease;
        }

        .primary-button:hover:not(:disabled) {
          background: #4B220D;
          transform: translateY(-1px);
          box-shadow:
            0 12px 26px rgba(59,26,8,.2);
        }

        .primary-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .primary-button:disabled,
        .secondary-button:disabled,
        .google-button:disabled {
          opacity: .58;
          cursor: not-allowed;
        }

        .google-button {
          width: 100%;
          min-height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: 1px solid var(--brew-border);
          border-radius: 14px;
          background: white;
          color: var(--brew-text);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition:
            background .2s ease,
            border-color .2s ease,
            transform .2s ease;
        }

        .google-button:hover:not(:disabled) {
          background: #FBF8F3;
          border-color: #D7C7B8;
          transform: translateY(-1px);
        }

        .google-icon {
          color: #4285F4;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 4px 0;
          color: #A8998D;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 700;
        }

        .divider::before,
        .divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: var(--brew-border);
        }

        .auth-switch {
          margin-top: 24px;
          text-align: center;
          color: var(--brew-muted);
          font-size: 13px;
        }

        .auth-switch button {
          border: 0;
          background: transparent;
          color: var(--brew-caramel-dark);
          font-weight: 700;
          cursor: pointer;
          padding: 0 0 0 3px;
        }

        .auth-switch button:hover {
          color: var(--brew-espresso);
        }

        .message {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin-top: 16px;
          padding: 12px 13px;
          border-radius: 12px;
          background: #F9F2E9;
          color: #77553B;
          border: 1px solid #EADAC9;
          font-size: 12px;
          line-height: 1.55;
        }

        .message-icon {
          flex-shrink: 0;
          margin-top: 1px;
        }

        /* PHONE VERIFICATION */

        .verification-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 24px;
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--brew-muted);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .verification-back:hover {
          color: var(--brew-espresso);
        }

        .verification-header {
          text-align: center;
          margin-bottom: 28px;
        }

        .verification-icon {
          width: 62px;
          height: 62px;
          margin: 0 auto 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 20px;
          background: var(--brew-soft);
          color: var(--brew-caramel-dark);
          border: 1px solid #EBDDCF;
        }

        .verification-title {
          margin: 0;
          color: var(--brew-espresso);
          font-family: "Playfair Display", serif;
          font-size: 30px;
          letter-spacing: -.6px;
        }

        .verification-description {
          margin: 9px auto 0;
          max-width: 390px;
          color: var(--brew-muted);
          font-size: 13px;
          line-height: 1.65;
        }

        .phone-display {
          color: var(--brew-espresso);
          font-weight: 700;
          word-break: break-word;
        }

        .otp-input {
          width: 100%;
          height: 66px;
          border: 1px solid var(--brew-border);
          border-radius: 16px;
          background: #FFFEFC;
          color: var(--brew-espresso);
          text-align: center;
          letter-spacing: 12px;
          padding-left: 12px;
          font-size: 25px;
          font-weight: 700;
          outline: none;
          transition: .2s ease;
        }

        .otp-input::placeholder {
          color: #D2C5BA;
          letter-spacing: 9px;
        }

        .otp-input:focus {
          border-color: var(--brew-caramel);
          box-shadow:
            0 0 0 4px rgba(196,149,106,.12);
        }

        .timer-row {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 7px;
          margin-top: 12px;
          color: var(--brew-muted);
          font-size: 12px;
        }

        .timer-active {
          color: var(--brew-caramel-dark);
          font-weight: 700;
        }

        .timer-expired {
          color: var(--brew-danger);
          font-weight: 700;
        }

        .verification-actions {
          display: grid;
          grid-template-columns: .8fr 1.2fr;
          gap: 10px;
          margin-top: 18px;
        }

        .secondary-button {
          min-height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 1px solid var(--brew-border);
          border-radius: 14px;
          background: var(--brew-soft);
          color: var(--brew-espresso);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: .2s ease;
        }

        .secondary-button:hover:not(:disabled) {
          background: #EFE4D7;
          border-color: #D8C6B5;
        }

        .resend-area {
          margin-top: 20px;
          text-align: center;
          color: var(--brew-muted);
          font-size: 12px;
          line-height: 1.6;
        }

        .resend-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
          padding: 4px;
          border: 0;
          background: transparent;
          color: var(--brew-caramel-dark);
          font-weight: 700;
          cursor: pointer;
        }

        .resend-button:hover:not(:disabled) {
          color: var(--brew-espresso);
        }

        .resend-button:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .security-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin-top: 22px;
          color: #9A8A7D;
          font-size: 11px;
          text-align: center;
        }

        .recaptcha-container {
          height: 0;
          overflow: hidden;
        }

        /* MODAL */

        .phone-used-overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(30,15,7,.68);
          backdrop-filter: blur(8px);
          animation: overlayIn .2s ease;
        }

        .phone-used-modal {
          width: 100%;
          max-width: 410px;
          padding: 34px;
          border-radius: 24px;
          background: var(--brew-cream);
          box-shadow:
            0 30px 90px rgba(0,0,0,.3);
          text-align: center;
          animation: modalPop .25s ease;
        }

        .modal-icon {
          width: 56px;
          height: 56px;
          margin: 0 auto 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          background: #F4E7DA;
          color: var(--brew-caramel-dark);
        }

        .phone-used-modal h2 {
          margin: 0;
          color: var(--brew-espresso);
          font-family: "Playfair Display", serif;
          font-size: 25px;
        }

        .phone-used-modal p {
          margin: 12px 0 24px;
          color: var(--brew-muted);
          font-size: 13px;
          line-height: 1.65;
        }

        /* GREETING */

        .greeting-screen {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          background:
            radial-gradient(
              circle at 50% 20%,
              rgba(196,149,106,.14),
              transparent 30%
            ),
            var(--brew-cream);
          animation: greetingIn .55s ease;
        }

        .greeting-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--brew-espresso);
          font-family: "Playfair Display", serif;
          font-size: 42px;
          letter-spacing: -1.5px;
          margin-bottom: 52px;
        }

        .greeting-logo-icon {
          width: 46px;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          background: var(--brew-soft);
          color: var(--brew-caramel-dark);
        }

        .greeting-title {
          color: var(--brew-espresso);
          font-size: 23px;
          font-weight: 600;
        }

        .greeting-name {
          margin-top: 8px;
          color: var(--brew-caramel-dark);
          font-family: "Playfair Display", serif;
          font-size: clamp(38px, 7vw, 58px);
          text-align: center;
          letter-spacing: -1.5px;
        }

        .greeting-sub {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 18px;
          color: var(--brew-muted);
          font-size: 14px;
        }

        .greeting-line {
          width: 28px;
          height: 1px;
          background: var(--brew-caramel);
          opacity: .6;
        }

        @keyframes modalPop {
          from {
            opacity: 0;
            transform: translateY(8px) scale(.97);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes overlayIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes greetingIn {
          from {
            opacity: 0;
            transform: scale(.98);
          }

          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .spinner {
          width: 17px;
          height: 17px;
          border: 2px solid rgba(255,255,255,.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin .7s linear infinite;
        }

        .spinner-dark {
          border-color: rgba(59,26,8,.2);
          border-top-color: var(--brew-espresso);
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 850px) {
          .login-shell {
            max-width: 620px;
            min-height: auto;
            grid-template-columns: 1fr;
          }

          .login-brand-panel {
            display: none;
          }

          .login-content {
            min-height: 650px;
            padding: 48px clamp(26px, 7vw, 60px);
          }
        }

        @media (max-width: 520px) {
          .login-page {
            padding: 0;
            align-items: stretch;
          }

          .login-shell {
            min-height: 100dvh;
            border: 0;
            border-radius: 0;
            box-shadow: none;
            background: var(--brew-cream);
          }

          .login-content {
            min-height: 100dvh;
            padding:
              38px 22px
              max(28px, env(safe-area-inset-bottom))
              22px;
            background: var(--brew-cream);
          }

          .auth-title {
            font-size: 32px;
          }

          .verification-title {
            font-size: 28px;
          }

          .verification-actions {
            grid-template-columns: 1fr;
          }

          .greeting-logo {
            font-size: 36px;
          }

          .greeting-title {
            font-size: 20px;
          }

          .greeting-name {
            padding: 0 20px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      {/* =====================================================
          DUPLICATE PHONE MODAL
      ===================================================== */}

      {showPhoneUsedModal && (
        <div
          className="phone-used-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="phone-used-title"
        >
          <div className="phone-used-modal">
            <div className="modal-icon">
              <AlertCircle size={27} strokeWidth={1.8} />
            </div>

            <h2 id="phone-used-title">
              Phone Number Already Used
            </h2>

            <p>{phoneUsedMessage}</p>

            <button
              type="button"
              className="primary-button"
              onClick={closePhoneUsedModal}
              disabled={phoneLoading}
            >
              Choose Another Number
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          GREETING
      ===================================================== */}

      {showGreeting && (
        <div className="greeting-screen">
          <div className="greeting-logo">
            <div className="greeting-logo-icon">
              <Coffee size={24} strokeWidth={1.8} />
            </div>

            Brewed.
          </div>

          <div className="greeting-title">
            {getGreeting()},
          </div>

          <div className="greeting-name">
            {userName}
          </div>

          <div className="greeting-sub">
            <span className="greeting-line" />
            Ready for your next coffee?
            <Coffee size={15} strokeWidth={1.8} />
            <span className="greeting-line" />
          </div>
        </div>
      )}

      {/* =====================================================
          LOGIN PAGE
      ===================================================== */}

      <div className="login-page">
        <div className="login-shell">

          {/* =================================================
              BRAND PANEL
          ================================================= */}

          <aside className="login-brand-panel">
            <div className="brand-content">
              <div className="brand-logo">
                <div className="brand-logo-icon">
                  <Coffee size={21} strokeWidth={1.8} />
                </div>

                Brewed.
              </div>

              <h1 className="brand-heading">
                Your coffee,
                <br />
                your ritual.
              </h1>

              <p className="brand-description">
                A better way to order, earn rewards,
                manage your favourites and make every
                Brewed visit feel a little more personal.
              </p>
            </div>

            <div className="brand-footer">
              <div className="brand-feature">
                <div className="brand-feature-icon">
                  <ShieldCheck
                    size={16}
                    strokeWidth={1.8}
                  />
                </div>

                Secure account & phone verification
              </div>

              <div style={{ marginTop: 18 }}>
                Brewed · Crafted for coffee people
              </div>
            </div>
          </aside>

          {/* =================================================
              AUTH CONTENT
          ================================================= */}

          <main className="login-content">

            {showPhoneVerification ? (
              <>
                <button
                  type="button"
                  className="verification-back"
                  onClick={cancelPhoneVerification}
                  disabled={phoneLoading}
                >
                  <ArrowLeft size={15} />
                  Back to sign in
                </button>

                <div className="verification-header">
                  <div className="verification-icon">
                    <ShieldCheck
                      size={29}
                      strokeWidth={1.6}
                    />
                  </div>

                  <h2 className="verification-title">
                    Verify your phone
                  </h2>

                  <p className="verification-description">
                    Phone verification is required
                    before accessing your Brewed account.
                    <br />
                    This helps protect your account,
                    rewards and loyalty points.
                  </p>
                </div>

                {!otpSent ? (
                  <>
                    <div className="field-group">
                      <label
                        className="field-label"
                        htmlFor="phone"
                      >
                        Phone number
                      </label>

                      <div className="input-wrapper">
                        <Phone
                          className="input-icon"
                          size={18}
                          strokeWidth={1.8}
                        />

                        <input
                          id="phone"
                          className="auth-input"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="+919876543210"
                          value={phone}
                          onChange={(e) =>
                            setPhone(e.target.value)
                          }
                          autoFocus
                          disabled={phoneLoading}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="primary-button"
                      onClick={handleSendPhoneOTP}
                      disabled={
                        phoneLoading ||
                        !phone.trim()
                      }
                    >
                      {phoneLoading ? (
                        <>
                          <span className="spinner" />
                          Sending code...
                        </>
                      ) : (
                        <>
                          Send verification code
                          <ArrowLeft
                            size={16}
                            style={{
                              transform: "rotate(180deg)",
                            }}
                          />
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <p
                      className="verification-description"
                      style={{ marginBottom: 16 }}
                    >
                      Enter the 6-digit code sent to
                      <br />
                      <span className="phone-display">
                        {phone}
                      </span>
                    </p>

                    <input
                      className="otp-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="000000"
                      value={otp}
                      onChange={(e) =>
                        setOtp(
                          e.target.value
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
                          size={14}
                          strokeWidth={1.8}
                        />

                        Code expires in

                        <span className="timer-active">
                          {formatTimer(otpTimer)}
                        </span>
                      </div>
                    ) : (
                      <div className="timer-row">
                        <AlertCircle
                          size={14}
                          strokeWidth={1.8}
                        />

                        <span className="timer-expired">
                          Code expired. Request a
                          new code below.
                        </span>
                      </div>
                    )}

                    <div className="verification-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={changePhoneNumber}
                        disabled={phoneLoading}
                      >
                        <Phone size={15} />
                        Change number
                      </button>

                      <button
                        type="button"
                        className="primary-button"
                        onClick={handleVerifyPhoneOTP}
                        disabled={
                          phoneLoading ||
                          otp.length !== 6 ||
                          !verificationId ||
                          otpTimer <= 0
                        }
                      >
                        {phoneLoading ? (
                          <>
                            <span className="spinner" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={17} />
                            Verify & continue
                          </>
                        )}
                      </button>
                    </div>

                    <div className="resend-area">
                      {resendTimer > 0 ? (
                        <>
                          You can request another code
                          in{" "}
                          <strong>
                            {formatTimer(resendTimer)}
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
                              size={14}
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
                    size={13}
                    strokeWidth={1.8}
                  />

                  Your verification is securely
                  handled by Firebase.
                </div>

                <div
                  key={recaptchaKey}
                  ref={recaptchaContainerRef}
                  className="recaptcha-container"
                />

                {message && (
                  <div className="message">
                    <AlertCircle
                      className="message-icon"
                      size={16}
                      strokeWidth={1.8}
                    />

                    <span>{message}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* =============================================
                    AUTH HEADER
                ============================================= */}

                <div className="auth-header">
                  <div className="auth-eyebrow">
                    <Coffee
                      size={13}
                      strokeWidth={2}
                    />

                    Brewed
                  </div>

                  <h2 className="auth-title">
                    {isLogin
                      ? "Welcome back."
                      : "Join Brewed."}
                  </h2>

                  <p className="auth-subtitle">
                    {isLogin
                      ? "Sign in to continue your coffee ritual."
                      : "Create your account and start earning rewards."}
                  </p>
                </div>

                {/* =============================================
                    FORM
                ============================================= */}

                <form
                  className="auth-form"
                  onSubmit={handleSubmit}
                >
                  {!isLogin && (
                    <div className="field-group">
                      <label
                        className="field-label"
                        htmlFor="name"
                      >
                        Full name
                      </label>

                      <div className="input-wrapper">
                        <UserRound
                          className="input-icon"
                          size={18}
                          strokeWidth={1.8}
                        />

                        <input
                          id="name"
                          className="auth-input"
                          type="text"
                          placeholder="Your name"
                          value={name}
                          onChange={(e) =>
                            setName(e.target.value)
                          }
                          autoComplete="name"
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                  )}

                  <div className="field-group">
                    <label
                      className="field-label"
                      htmlFor="email"
                    >
                      Email address
                    </label>

                    <div className="input-wrapper">
                      <Mail
                        className="input-icon"
                        size={18}
                        strokeWidth={1.8}
                      />

                      <input
                        id="email"
                        className="auth-input"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) =>
                          setEmail(e.target.value)
                        }
                        autoComplete="email"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="field-group">
                    <label
                      className="field-label"
                      htmlFor="password"
                    >
                      Password
                    </label>

                    <div className="input-wrapper">
                      <LockKeyhole
                        className="input-icon"
                        size={18}
                        strokeWidth={1.8}
                      />

                      <input
                        id="password"
                        className="auth-input password-input"
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) =>
                          setPassword(e.target.value)
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
                        className="password-button"
                        onClick={() =>
                          setShowPassword(
                            (prev) => !prev
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
                            size={18}
                            strokeWidth={1.8}
                          />
                        ) : (
                          <Eye
                            size={18}
                            strokeWidth={1.8}
                          />
                        )}
                      </button>
                    </div>
                  </div>

                  {isLogin && (
                    <div className="forgot-row">
                      <button
                        type="button"
                        className="text-button"
                        onClick={forgotPassword}
                        disabled={loading}
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <button
                    className="primary-button"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner" />
                        Please wait...
                      </>
                    ) : (
                      <>
                        {isLogin
                          ? "Sign in"
                          : "Create account"}

                        <ArrowLeft
                          size={16}
                          style={{
                            transform: "rotate(180deg)",
                          }}
                        />
                      </>
                    )}
                  </button>

                  <div className="divider">
                    <span>or</span>
                  </div>

                  <button
                    type="button"
                    className="google-button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                  >
                    <Chrome
                      className="google-icon"
                      size={18}
                      strokeWidth={2}
                    />

                    Continue with Google
                  </button>
                </form>

                {/* =============================================
                    MESSAGE
                ============================================= */}

                {message && (
                  <div className="message">
                    <AlertCircle
                      className="message-icon"
                      size={16}
                      strokeWidth={1.8}
                    />

                    <span>{message}</span>
                  </div>
                )}

                {/* =============================================
                    SWITCH LOGIN / SIGNUP
                ============================================= */}

                <div className="auth-switch">
                  {isLogin ? (
                    <>
                      Don't have an account?
                      <button
                        type="button"
                        onClick={switchAuthMode}
                        disabled={loading}
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?
                      <button
                        type="button"
                        onClick={switchAuthMode}
                        disabled={loading}
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
