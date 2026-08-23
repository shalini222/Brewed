import React, { useState, useEffect } from "react";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  PhoneAuthProvider,
  RecaptchaVerifier,
  linkWithCredential,
  reauthenticateWithCredential,
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

export default function Login({ setPage }) {
  const [isLogin, setIsLogin] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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

  // 90 seconds before resend is available
  const [resendTimer, setResendTimer] = useState(0);

  // 3 minutes for the current OTP session
  const [otpSessionTimer, setOtpSessionTimer] = useState(0);

  const [resendingOTP, setResendingOTP] = useState(false);

  // =========================================================
  // DUPLICATE PHONE MODAL
  // =========================================================

  const [showPhoneUsedModal, setShowPhoneUsedModal] =
    useState(false);

  const [phoneUsedMessage, setPhoneUsedMessage] =
    useState("");

  // =========================================================
  // OTP RESEND COUNTDOWN
  // =========================================================

  useEffect(() => {
    if (resendTimer <= 0) return;

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
  // OTP SESSION COUNTDOWN
  // 3 MINUTES
  // =========================================================

  useEffect(() => {
    if (otpSessionTimer <= 0) return;

    const timer = setInterval(() => {
      setOtpSessionTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);

          // Expire the current local OTP session
          setVerificationId(null);
          setOtp("");

          setMessage(
            "This verification code has expired. Please request a new code."
          );

          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [otpSessionTimer]);

  // =========================================================
  // FORMAT TIMER
  // =========================================================

  function formatTimer(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
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

  function normalizePhone(phoneNumber) {
    return phoneNumber
      .replace(/\s+/g, "")
      .replace(/-/g, "")
      .replace(/[()]/g, "")
      .trim();
  }

  // =========================================================
  // CLEAR RECAPTCHA
  // =========================================================

  function clearPhoneRecaptcha() {
    try {
      if (window.loginPhoneRecaptcha) {
        window.loginPhoneRecaptcha.clear();
      }
    } catch (error) {
      console.log(
        "reCAPTCHA cleanup:",
        error
      );
    }

    window.loginPhoneRecaptcha = null;
  }

  // =========================================================
  // SETUP RECAPTCHA
  // =========================================================

  function setupPhoneRecaptcha() {
    clearPhoneRecaptcha();

    const element = document.getElementById(
      "login-phone-recaptcha"
    );

    if (!element) {
      throw new Error(
        "Phone verification could not be initialized. Please try again."
      );
    }

    element.innerHTML = "";

    const verifier = new RecaptchaVerifier(
      auth,
      "login-phone-recaptcha",
      {
        size: "invisible",

        callback: () => {
          console.log(
            "Phone reCAPTCHA completed."
          );
        },

        "expired-callback": () => {
          clearPhoneRecaptcha();
        },

        "error-callback": () => {
          clearPhoneRecaptcha();
        },
      }
    );

    window.loginPhoneRecaptcha = verifier;

    return verifier;
  }

  // =========================================================
  // CHECK PHONE STATUS
  // =========================================================

  async function checkPhoneStatus(user) {
    const userRef = doc(
      db,
      "users",
      user.uid
    );

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
      phoneVerified:
        data.phoneVerified === true,
      phone: data.phone || "",
    };
  }

  // =========================================================
  // CHECK DUPLICATE PHONE
  // =========================================================

  async function isPhoneAlreadyUsed(
    phoneNumber,
    currentUid
  ) {
    const normalizedPhone =
      normalizePhone(phoneNumber);

    const usersQuery = query(
      collection(db, "users"),
      where(
        "phone",
        "==",
        normalizedPhone
      )
    );

    const snapshot =
      await getDocs(usersQuery);

    if (snapshot.empty) {
      return false;
    }

    return snapshot.docs.some(
      (userDoc) =>
        userDoc.id !== currentUid
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
  // START PHONE VERIFICATION
  // =========================================================

  async function startPhoneVerification(
    user,
    newAccount = false
  ) {
    if (!user) return;

    setPendingUser(user);
    setIsNewAccount(newAccount);

    const status =
      await checkPhoneStatus(user);

    // Already verified
    if (status.phoneVerified) {
      await finishCustomerLogin(
        user,
        false
      );

      return;
    }

    setPhone(
      status.phone
        ? normalizePhone(status.phone)
        : ""
    );

    setOtp("");
    setOtpSent(false);
    setVerificationId(null);

    setResendTimer(0);
    setOtpSessionTimer(0);

    setMessage("");
    setShowPhoneVerification(true);
  }

  // =========================================================
  // SEND FIRST OTP
  // =========================================================

  async function handleSendPhoneOTP() {
    if (!pendingUser) {
      setMessage(
        "Your login session has expired. Please log in again."
      );

      return;
    }

    const cleanedPhone =
      normalizePhone(phone);

    if (
      !/^\+[1-9]\d{7,14}$/.test(
        cleanedPhone
      )
    ) {
      setMessage(
        "Enter your phone number with country code, e.g. +919876543210."
      );

      return;
    }

    setPhoneLoading(true);
    setMessage("");

    try {
      const alreadyUsed =
        await isPhoneAlreadyUsed(
          cleanedPhone,
          pendingUser.uid
        );

      if (alreadyUsed) {
        showPhoneAlreadyUsed();
        return;
      }

      setPhone(cleanedPhone);

      const verifier =
        setupPhoneRecaptcha();

      const provider =
        new PhoneAuthProvider(auth);

      const id =
        await provider.verifyPhoneNumber(
          cleanedPhone,
          verifier
        );

      setVerificationId(id);

      setOtpSent(true);

      // 90 seconds before resend
      setResendTimer(90);

      // 3 minute OTP session
      setOtpSessionTimer(180);

      setMessage(
        "A verification code has been sent to your phone."
      );
    } catch (error) {
      console.error(
        "Phone OTP send error:",
        error
      );

      clearPhoneRecaptcha();

      if (
        error.code ===
        "auth/too-many-requests"
      ) {
        setMessage(
          "Too many verification attempts. Please try again later."
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
  // AVAILABLE ONLY AFTER 90 SECONDS
  // =========================================================

  async function handleResendPhoneOTP() {
    if (!pendingUser) {
      setMessage(
        "Your login session has expired. Please log in again."
      );

      return;
    }

    if (resendTimer > 0) {
      return;
    }

    if (!phone) {
      setMessage(
        "Please enter your phone number first."
      );

      return;
    }

    setResendingOTP(true);
    setPhoneLoading(true);
    setMessage("");

    try {
      const cleanedPhone =
        normalizePhone(phone);

      const alreadyUsed =
        await isPhoneAlreadyUsed(
          cleanedPhone,
          pendingUser.uid
        );

      if (alreadyUsed) {
        showPhoneAlreadyUsed();
        return;
      }

      clearPhoneRecaptcha();

      const verifier =
        setupPhoneRecaptcha();

      const provider =
        new PhoneAuthProvider(auth);

      const id =
        await provider.verifyPhoneNumber(
          cleanedPhone,
          verifier
        );

      // Replace old verification session
      setVerificationId(id);

      setOtp("");

      setOtpSent(true);

      // New 90 second resend cooldown
      setResendTimer(90);

      // New 3 minute OTP session
      setOtpSessionTimer(180);

      setMessage(
        "A new verification code has been sent."
      );
    } catch (error) {
      console.error(
        "Resend OTP error:",
        error
      );

      clearPhoneRecaptcha();

      if (
        error.code ===
        "auth/too-many-requests"
      ) {
        setMessage(
          "Too many verification attempts. Please try again later."
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
    if (!pendingUser) {
      setMessage(
        "Your login session has expired. Please log in again."
      );

      return;
    }

    // Local 3-minute session expired
    if (
      !verificationId ||
      otpSessionTimer <= 0
    ) {
      setMessage(
        "This verification code has expired. Please request a new code."
      );

      return;
    }

    const cleanOtp =
      otp.trim();

    if (
      !/^\d{6}$/.test(cleanOtp)
    ) {
      setMessage(
        "Enter the 6-digit verification code."
      );

      return;
    }

    setPhoneLoading(true);
    setMessage("");

    try {
      const normalizedPhone =
        normalizePhone(phone);

      const alreadyUsed =
        await isPhoneAlreadyUsed(
          normalizedPhone,
          pendingUser.uid
        );

      if (alreadyUsed) {
        clearPhoneRecaptcha();

        showPhoneAlreadyUsed();

        return;
      }

      const credential =
        PhoneAuthProvider.credential(
          verificationId,
          cleanOtp
        );

      // =====================================================
      // CHECK WHETHER PHONE ALREADY LINKED
      // =====================================================

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

      // =====================================================
      // SAVE VERIFICATION
      // =====================================================

      await setDoc(
        doc(
          db,
          "users",
          pendingUser.uid
        ),
        {
          phone: normalizedPhone,

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

      // =====================================================
      // CLEANUP
      // =====================================================

      setShowPhoneVerification(false);

      setOtp("");

      setOtpSent(false);

      setVerificationId(null);

      setResendTimer(0);

      setOtpSessionTimer(0);

      clearPhoneRecaptcha();

      setMessage("");

      // =====================================================
      // FINISH LOGIN
      // =====================================================

      await finishCustomerLogin(
        pendingUser,
        isNewAccount
      );
    } catch (error) {
      console.error(
        "Phone OTP verification error:",
        error
      );

      clearPhoneRecaptcha();

      if (
        error.code ===
        "auth/invalid-verification-code"
      ) {
        setMessage(
          "Incorrect verification code."
        );
      } else if (
        error.code ===
        "auth/code-expired"
      ) {
        setVerificationId(null);
        setOtpSessionTimer(0);

        setMessage(
          "That code has expired. Please request a new code."
        );
      } else if (
        error.code ===
        "auth/credential-already-in-use"
      ) {
        showPhoneAlreadyUsed();
      } else if (
        error.code ===
        "auth/provider-already-linked"
      ) {
        setMessage(
          "This phone number is already verified on your account."
        );
      } else if (
        error.code ===
        "auth/requires-recent-login"
      ) {
        setMessage(
          "Please log in again and verify your phone."
        );
      } else {
        setMessage(
          error.message ||
            "Unable to verify your phone number."
        );
      }
    } finally {
      setPhoneLoading(false);
    }
  }

  // =========================================================
  // FINISH CUSTOMER LOGIN
  // =========================================================

  async function finishCustomerLogin(
    user,
    shouldGiveSignupReward = false
  ) {
    // =======================================================
    // RIDER CHECK
    // =======================================================

    const riderQuery = query(
      collection(db, "riders"),
      where(
        "email",
        "==",
        user.email
      )
    );

    const riderSnapshot =
      await getDocs(riderQuery);

    if (!riderSnapshot.empty) {
      const riderDoc =
        riderSnapshot.docs[0];

      const riderData =
        riderDoc.data();

      if (
        riderData.status !== "Active"
      ) {
        setMessage(
          "Your rider account is currently inactive. Please contact the administrator."
        );

        return;
      }

      setPage("rider");

      return;
    }

    // =======================================================
    // CUSTOMER
    // =======================================================

    const userRef =
      doc(
        db,
        "users",
        user.uid
      );

    const userSnap =
      await getDoc(userRef);

    let userData;

    if (!userSnap.exists()) {
      userData = {
        name:
          user.displayName ||
          user.email?.split("@")[0] ||
          "User",

        email: user.email,

        birthday: "",

        photoURL:
          user.photoURL || "",

        phone:
          normalizePhone(phone),

        phoneVerified: true,

        phoneVerifiedAt:
          serverTimestamp(),

        createdAt:
          serverTimestamp(),

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
          memberSince:
            serverTimestamp(),
          birthdayRewardClaimed: false,
        },
      };

      await setDoc(
        userRef,
        userData
      );
    } else {
      userData =
        userSnap.data();
    }

    // =======================================================
    // WALLET
    // =======================================================

    await walletService.createWallet(
      user.uid
    );

    // =======================================================
    // SIGNUP REWARD
    // =======================================================

    if (
      shouldGiveSignupReward &&
      userData?.signupRewardClaimed !== true
    ) {
      try {
        await rewardService.giveSignupReward(
          user.uid
        );
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
      name ||
      user.email?.split("@")[0] ||
      "User";

    setUserName(displayName);

    setShowGreeting(true);

    setTimeout(() => {
      setPage("menu");
    }, 2200);
  }

  // =========================================================
  // EMAIL / PASSWORD LOGIN
  // =========================================================

  async function handleSubmit(e) {
    e.preventDefault();

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

      // =====================================================
      // CREATE ACCOUNT
      // =====================================================

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      const user =
        userCredential.user;

      await setDoc(
        doc(
          db,
          "users",
          user.uid
        ),
        {
          name:
            name.trim() ||
            email.split("@")[0],

          email: user.email,

          birthday: "",

          photoURL:
            user.photoURL || "",

          phone: "",

          phoneVerified: false,

          createdAt:
            serverTimestamp(),

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
            memberSince:
              serverTimestamp(),
            birthdayRewardClaimed: false,
          },
        }
      );

      await startPhoneVerification(
        user,
        true
      );
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      if (
        error.code ===
        "auth/invalid-credential"
      ) {
        setMessage(
          "Incorrect email or password."
        );
      } else if (
        error.code ===
        "auth/user-not-found"
      ) {
        setMessage(
          "No account was found with this email."
        );
      } else if (
        error.code ===
        "auth/wrong-password"
      ) {
        setMessage(
          "Incorrect password."
        );
      } else if (
        error.code ===
        "auth/email-already-in-use"
      ) {
        setMessage(
          "An account already exists with this email."
        );
      } else if (
        error.code ===
        "auth/too-many-requests"
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
    setLoading(true);
    setMessage("");

    try {
      const result =
        await signInWithPopup(
          auth,
          googleProvider
        );

      const user = result.user;

      // =====================================================
      // RIDER CHECK
      // =====================================================

      const riderQuery = query(
        collection(db, "riders"),
        where(
          "email",
          "==",
          user.email
        )
      );

      const riderSnapshot =
        await getDocs(riderQuery);

      if (!riderSnapshot.empty) {
        const riderDoc =
          riderSnapshot.docs[0];

        const riderData =
          riderDoc.data();

        if (
          riderData.status !== "Active"
        ) {
          setMessage(
            "Your rider account is currently inactive. Please contact the administrator."
          );

          return;
        }

        setPage("rider");

        return;
      }

      // =====================================================
      // CUSTOMER
      // =====================================================

      const userRef =
        doc(
          db,
          "users",
          user.uid
        );

      const userSnap =
        await getDoc(userRef);

      // =====================================================
      // NEW GOOGLE ACCOUNT
      // =====================================================

      if (!userSnap.exists()) {
        await setDoc(
          userRef,
          {
            name:
              user.displayName ||
              user.email?.split("@")[0] ||
              "User",

            email: user.email,

            birthday: "",

            photoURL:
              user.photoURL || "",

            phone: "",

            phoneVerified: false,

            createdAt:
              serverTimestamp(),

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
              memberSince:
                serverTimestamp(),
              birthdayRewardClaimed: false,
            },
          }
        );

        await startPhoneVerification(
          user,
          true
        );

        return;
      }

      // =====================================================
      // EXISTING GOOGLE ACCOUNT
      // =====================================================

      await startPhoneVerification(
        user,
        false
      );
    } catch (error) {
      console.error(
        "Google login error:",
        error
      );

      setMessage(
        error.message ||
          "Unable to sign in with Google."
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // FORGOT PASSWORD
  // =========================================================

  async function forgotPassword() {
    if (!email) {
      setMessage(
        "Enter your email first."
      );

      return;
    }

    try {
      await sendPasswordResetEmail(
        auth,
        email.trim()
      );

      setMessage(
        "Password reset email sent!"
      );
    } catch (error) {
      setMessage(error.message);
    }
  }

  // =========================================================
  // CANCEL PHONE VERIFICATION
  // =========================================================

  function cancelPhoneVerification() {
    setShowPhoneVerification(false);

    setOtp("");

    setOtpSent(false);

    setVerificationId(null);

    setResendTimer(0);

    setOtpSessionTimer(0);

    setPendingUser(null);

    setPhone("");

    setIsNewAccount(false);

    clearPhoneRecaptcha();

    setMessage("");

    auth.signOut();
  }

  // =========================================================
  // CHANGE PHONE NUMBER
  // =========================================================

  function changePhoneNumber() {
    setOtpSent(false);

    setOtp("");

    setVerificationId(null);

    setResendTimer(0);

    setOtpSessionTimer(0);

    clearPhoneRecaptcha();

    setMessage("");
  }

  // =========================================================
  // CLOSE DUPLICATE PHONE MODAL
  // =========================================================

  function closePhoneUsedModal() {
    setShowPhoneUsedModal(false);

    setPhoneUsedMessage("");

    setOtp("");

    setOtpSent(false);

    setVerificationId(null);

    setResendTimer(0);

    setOtpSessionTimer(0);

    clearPhoneRecaptcha();

    setPhone("");
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <>
      <style>{`
        @import url(
          'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap'
        );

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #FDFAF5;
          font-family: 'Inter', sans-serif;
        }

        .login-page {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 40px 20px;

          background:
            linear-gradient(
              rgba(26,10,0,.45),
              rgba(26,10,0,.45)
            ),
            url(
              "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1500&q=80"
            );

          background-size: cover;
          background-position: center;
        }

        .login-card {
          width: 100%;
          max-width: 430px;

          background:
            rgba(253,250,245,.95);

          backdrop-filter: blur(12px);

          border-radius: 22px;

          padding: 45px;

          box-shadow:
            0 25px 60px rgba(0,0,0,.25);
        }

        .logo {
          font-family:
            'Playfair Display', serif;

          font-size: 2.2rem;

          color: #3B1A08;

          text-align: center;

          margin-bottom: 10px;
        }

        .subtitle {
          text-align: center;
          color: #6B5C53;
          margin-bottom: 30px;
        }

        form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        input {
          width: 100%;
          padding: 15px;

          border-radius: 12px;

          border:
            1px solid #DDD;

          font-size: 15px;
          outline: none;
        }

        input:focus {
          border-color: #C4956A;
        }

        button {
          padding: 15px;
          border: none;
          border-radius: 12px;

          cursor: pointer;

          font-weight: 600;

          transition: .3s;
        }

        button:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .primary {
          background: #3B1A08;
          color: white;
        }

        .primary:hover {
          background: #C4956A;
          color: #3B1A08;
        }

        .google {
          background: white;
          border:
            1px solid #DDD;
        }

        .message {
          margin-top: 15px;

          text-align: center;

          color: #8A5A32;

          line-height: 1.5;
        }

        .switch {
          margin-top: 25px;
          text-align: center;
        }

        .switch span {
          color: #8A5A32;
          cursor: pointer;
          font-weight: 600;
        }

        .forgot {
          text-align: right;
          font-size: 14px;
          color: #8A5A32;
          cursor: pointer;
        }

        .phone-title {
          font-family:
            'Playfair Display', serif;

          font-size: 1.8rem;

          color: #3B1A08;

          text-align: center;

          margin-bottom: 10px;
        }

        .phone-description {
          text-align: center;

          color: #6B5C53;

          font-size: 14px;

          line-height: 1.6;

          margin-bottom: 25px;
        }

        .phone-label {
          display: block;

          color: #5A453A;

          font-size: 14px;

          font-weight: 600;

          margin-bottom: 8px;
        }

        .phone-input {
          margin-bottom: 14px;
        }

        .otp-input {
          text-align: center;

          letter-spacing: 8px;

          font-size: 22px;

          font-weight: 600;

          margin-top: 12px;
        }

        .otp-session {
          text-align: center;

          margin-top: 12px;

          color: #8A7A70;

          font-size: 13px;
        }

        .otp-session strong {
          color: #8A5A32;
        }

        .resend-area {
          text-align: center;

          margin-top: 14px;

          margin-bottom: 4px;
        }

        .resend-countdown {
          color: #8A7A70;
          font-size: 14px;
        }

        .resend-button {
          background: none;

          border: none;

          padding: 0;

          color: #8A5A32;

          font-size: 14px;

          font-weight: 600;
        }

        .phone-actions {
          display: flex;

          gap: 10px;

          margin-top: 12px;
        }

        .phone-actions button {
          flex: 1;
        }

        .secondary {
          background: #F8F4EE;
          color: #3B1A08;
        }

        .recaptcha-container {
          height: 0;
          overflow: hidden;
        }

        .phone-used-overlay {
          position: fixed;

          inset: 0;

          background:
            rgba(20, 10, 5, 0.68);

          backdrop-filter: blur(6px);

          display: flex;

          justify-content: center;

          align-items: center;

          padding: 20px;

          z-index: 10000;
        }

        .phone-used-modal {
          width: 100%;

          max-width: 390px;

          background: #FDFAF5;

          border-radius: 22px;

          padding: 32px;

          text-align: center;

          box-shadow:
            0 25px 70px rgba(0,0,0,.3);

          animation:
            modalPop .2s ease;
        }

        .phone-used-icon {
          width: 54px;
          height: 54px;

          margin:
            0 auto 18px;

          border-radius: 50%;

          background: #F3E4D5;

          color: #8A5A32;

          display: flex;

          justify-content: center;

          align-items: center;

          font-size: 28px;

          font-weight: 700;
        }

        .phone-used-modal h2 {
          margin:
            0 0 12px;

          font-family:
            'Playfair Display', serif;

          color: #3B1A08;

          font-size: 1.6rem;
        }

        .phone-used-modal p {
          color: #6B5C53;

          font-size: 14px;

          line-height: 1.6;

          margin:
            0 0 24px;
        }

        .phone-used-modal button {
          width: 100%;
        }

        .greeting-screen {
          position: fixed;

          inset: 0;

          background: #FDFAF5;

          display: flex;

          justify-content: center;

          align-items: center;

          flex-direction: column;

          z-index: 9999;

          animation:
            fadeIn .7s ease;
        }

        .greeting-logo {
          font-family:
            'Playfair Display', serif;

          font-size: 3rem;

          color: #3B1A08;

          margin-bottom: 40px;
        }

        .greeting-title {
          font-size: 2.4rem;

          color: #3B1A08;

          font-weight: 600;
        }

        .greeting-name {
          margin-top: 12px;

          font-size: 3rem;

          color: #C4956A;

          font-family:
            'Playfair Display', serif;
        }

        .greeting-sub {
          margin-top: 18px;

          color: #6B5C53;

          font-size: 1.2rem;
        }

        @keyframes modalPop {
          from {
            opacity: 0;
            transform: scale(.94);
          }

          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(.98);
          }

          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media(max-width: 500px) {
          .login-card {
            padding:
              30px 22px;
          }

          .phone-actions {
            flex-direction:
              column;
          }
        }
      `}</style>

      {/* =====================================================
          DUPLICATE PHONE MODAL
      ===================================================== */}

      {showPhoneUsedModal && (
        <div className="phone-used-overlay">
          <div className="phone-used-modal">

            <div className="phone-used-icon">
              !
            </div>

            <h2>
              Phone Number Already Used
            </h2>

            <p>
              {phoneUsedMessage}
            </p>

            <button
              type="button"
              className="primary"
              onClick={
                closePhoneUsedModal
              }
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
            Brewed.
          </div>

          <div className="greeting-title">
            {getGreeting()},
          </div>

          <div className="greeting-name">
            {userName} ☕
          </div>

          <div className="greeting-sub">
            Ready for your next coffee?
          </div>

        </div>
      )}

      {/* =====================================================
          LOGIN PAGE
      ===================================================== */}

      <div className="login-page">

        <div className="login-card">

          <div className="logo">
            Brewed.
          </div>

          {showPhoneVerification ? (
            <>
              <div className="phone-title">
                Verify your phone
              </div>

              <div className="phone-description">
                Phone verification is required
                to access your Brewed account.

                <br />

                This helps keep accounts,
                rewards and loyalty points secure.
              </div>

              {!otpSent ? (
                <>
                  <label className="phone-label">
                    Phone Number
                  </label>

                  <input
                    className="phone-input"
                    type="tel"
                    placeholder="+919876543210"
                    value={phone}
                    onChange={(e) =>
                      setPhone(
                        e.target.value
                      )
                    }
                    autoFocus
                  />

                  <button
                    type="button"
                    className="primary"
                    onClick={
                      handleSendPhoneOTP
                    }
                    disabled={
                      phoneLoading ||
                      !phone
                    }
                  >
                    {phoneLoading
                      ? "Sending..."
                      : "Send Verification Code"}
                  </button>
                </>
              ) : (
                <>
                  <div className="phone-description">
                    Enter the 6-digit code
                    sent to:

                    <br />

                    <strong>
                      {phone}
                    </strong>
                  </div>

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
                      )
                    }
                    autoFocus
                  />

                  {/* =================================================
                      3 MINUTE OTP SESSION
                  ================================================= */}

                  {otpSessionTimer > 0 ? (
                    <div className="otp-session">
                      Code expires in{" "}
                      <strong>
                        {formatTimer(
                          otpSessionTimer
                        )}
                      </strong>
                    </div>
                  ) : (
                    <div className="otp-session">
                      <strong>
                        Code expired
                      </strong>
                    </div>
                  )}

                  {/* =================================================
                      RESEND AFTER 90 SECONDS
                  ================================================= */}

                  <div className="resend-area">

                    {resendTimer > 0 ? (
                      <span className="resend-countdown">
                        Resend code in{" "}
                        <strong>
                          {resendTimer}s
                        </strong>
                      </span>
                    ) : (
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
                        {resendingOTP
                          ? "Sending..."
                          : "Resend Verification Code"}
                      </button>
                    )}

                  </div>

                  <div className="phone-actions">

                    <button
                      type="button"
                      className="secondary"
                      onClick={
                        changePhoneNumber
                      }
                      disabled={
                        phoneLoading
                      }
                    >
                      Change Number
                    </button>

                    <button
                      type="button"
                      className="primary"
                      onClick={
                        handleVerifyPhoneOTP
                      }
                      disabled={
                        phoneLoading ||
                        otp.length !== 6 ||
                        otpSessionTimer <= 0
                      }
                    >
                      {phoneLoading
                        ? "Verifying..."
                        : "Verify & Continue"}
                    </button>

                  </div>
                </>
              )}

              <div
                id="login-phone-recaptcha"
                className="recaptcha-container"
              />

              {message && (
                <div className="message">
                  {message}
                </div>
              )}

              <button
                type="button"
                className="secondary"
                onClick={
                  cancelPhoneVerification
                }
                disabled={
                  phoneLoading
                }
                style={{
                  width: "100%",
                  marginTop: "12px",
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <div className="subtitle">
                {isLogin
                  ? "Welcome back."
                  : "Create your Brewed account"}
              </div>

              <form
                onSubmit={
                  handleSubmit
                }
              >

                {!isLogin && (
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) =>
                      setName(
                        e.target.value
                      )
                    }
                    required
                  />
                )}

                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) =>
                    setEmail(
                      e.target.value
                    )
                  }
                  required
                />

                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  required
                />

                {isLogin && (
                  <div
                    className="forgot"
                    onClick={
                      forgotPassword
                    }
                  >
                    Forgot Password?
                  </div>
                )}

                <button
                  className="primary"
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? "Please wait..."
                    : isLogin
                    ? "Login"
                    : "Create Account"}
                </button>

                <button
                  type="button"
                  className="google"
                  onClick={
                    handleGoogleLogin
                  }
                  disabled={loading}
                >
                  Continue with Google
                </button>

              </form>

              {message && (
                <div className="message">
                  {message}
                </div>
              )}

              <div className="switch">

                {isLogin ? (
                  <>
                    Don't have an account?{" "}

                    <span
                      onClick={() => {
                        setIsLogin(false);
                        setMessage("");
                      }}
                    >
                      Sign Up
                    </span>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}

                    <span
                      onClick={() => {
                        setIsLogin(true);
                        setMessage("");
                      }}
                    >
                      Login
                    </span>
                  </>
                )}

              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}

 
