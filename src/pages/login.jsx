import React, { useEffect, useState } from "react";

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
  // PHONE VERIFICATION STATE
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
  // OTP RESEND / SESSION TIMERS
  // =========================================================

  // Resend becomes available after 90 seconds.
  const [resendTimer, setResendTimer] = useState(0);

  // Each OTP session lasts 3 minutes.
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
    if (resendTimer <= 0) {
      return;
    }

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
  // =========================================================

  useEffect(() => {
    if (otpSessionTimer <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setOtpSessionTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);

          setVerificationId(null);

          setMessage(
            "Your verification code has expired. Please request a new code."
          );

          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [otpSessionTimer]);

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
  // NORMALIZE PHONE NUMBER
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
        window.loginPhoneRecaptcha = null;
      }
    } catch (error) {
      console.log(
        "reCAPTCHA cleanup:",
        error
      );

      window.loginPhoneRecaptcha = null;
    }

    const container = document.getElementById(
      "login-phone-recaptcha"
    );

    if (container) {
      container.innerHTML = "";
    }
  }

  // =========================================================
  // SETUP RECAPTCHA
  // =========================================================

  async function setupPhoneRecaptcha() {
    // Always destroy the previous verifier first.
    clearPhoneRecaptcha();

    const container = document.getElementById(
      "login-phone-recaptcha"
    );

    if (!container) {
      throw new Error(
        "Phone verification could not be initialized. Please try again."
      );
    }

    // Make absolutely sure the container is empty.
    container.innerHTML = "";

    const verifier = new RecaptchaVerifier(
      auth,
      container,
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

    await verifier.render();

    return verifier;
  }

  // =========================================================
  // CHECK CUSTOMER PHONE STATUS
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

      phone:
        data.phone || "",
    };
  }

  // =========================================================
  // CHECK IF PHONE BELONGS TO ANOTHER USER
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

    const belongsToAnotherUser =
      snapshot.docs.some(
        (userDoc) =>
          userDoc.id !== currentUid
      );

    return belongsToAnotherUser;
  }

  // =========================================================
  // SHOW DUPLICATE PHONE MODAL
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
    if (!user) {
      return;
    }

    setPendingUser(user);

    setIsNewAccount(newAccount);

    const status =
      await checkPhoneStatus(user);

    // =====================================================
    // ALREADY VERIFIED
    // =====================================================

    if (status.phoneVerified) {
      await finishCustomerLogin(
        user,
        false
      );

      return;
    }

    // =====================================================
    // EXISTING PHONE
    // =====================================================

    if (status.phone) {
      setPhone(
        normalizePhone(status.phone)
      );
    } else {
      setPhone("");
    }

    setOtp("");

    setOtpSent(false);

    setVerificationId(null);

    setResendTimer(0);

    setOtpSessionTimer(0);

    setMessage("");

    setShowPhoneVerification(true);
  }

  // =========================================================
  // SEND PHONE OTP
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
      // ===================================================
      // CHECK DUPLICATE PHONE
      // ===================================================

      const alreadyUsed =
        await isPhoneAlreadyUsed(
          cleanedPhone,
          pendingUser.uid
        );

      if (alreadyUsed) {
        showPhoneAlreadyUsed();
        return;
      }

      // ===================================================
      // SET NORMALIZED PHONE
      // ===================================================

      setPhone(cleanedPhone);

      // ===================================================
      // CREATE RECAPTCHA
      // ===================================================

      const verifier =
        await setupPhoneRecaptcha();

      // ===================================================
      // SEND FIREBASE SMS
      // ===================================================

      const provider =
        new PhoneAuthProvider(auth);

      const id =
        await provider.verifyPhoneNumber(
          cleanedPhone,
          verifier
        );

      // ===================================================
      // SAVE NEW VERIFICATION SESSION
      // ===================================================

      setVerificationId(id);

      setOtpSent(true);

      // Resend available after 90 seconds.
      setResendTimer(90);

      // OTP session expires after 3 minutes.
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
  // RESEND PHONE OTP
  // =========================================================

  async function handleResendPhoneOTP() {
    if (!pendingUser) {
      setMessage(
        "Your login session has expired. Please log in again."
      );

      return;
    }

    // Absolutely prevent resend before 90 seconds.
    if (resendTimer > 0) {
      return;
    }

    if (resendingOTP) {
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
        "Enter a valid phone number with country code."
      );

      return;
    }

    setResendingOTP(true);

    setMessage("");

    try {
      // ===================================================
      // CHECK DUPLICATE PHONE
      // ===================================================

      const alreadyUsed =
        await isPhoneAlreadyUsed(
          cleanedPhone,
          pendingUser.uid
        );

      if (alreadyUsed) {
        showPhoneAlreadyUsed();
        return;
      }

      // ===================================================
      // DESTROY OLD RECAPTCHA
      // ===================================================

      clearPhoneRecaptcha();

      // Give Firebase/browser a moment to remove
      // the previous rendered verifier.
      await new Promise((resolve) =>
        setTimeout(resolve, 100)
      );

      // ===================================================
      // CREATE FRESH RECAPTCHA
      // ===================================================

      const verifier =
        await setupPhoneRecaptcha();

      // ===================================================
      // SEND NEW OTP
      // ===================================================

      const provider =
        new PhoneAuthProvider(auth);

      const id =
        await provider.verifyPhoneNumber(
          cleanedPhone,
          verifier
        );

      // ===================================================
      // REPLACE OLD VERIFICATION SESSION
      // ===================================================

      setVerificationId(id);

      setOtp("");

      // New 90-second resend cooldown.
      setResendTimer(90);

      // New 3-minute OTP session.
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
    }
  }

  // =========================================================
  // VERIFY PHONE OTP
  // =========================================================

  async function handleVerifyPhoneOTP() {
    if (
      !pendingUser ||
      !verificationId
    ) {
      setMessage(
        "Your verification code has expired. Please request a new code."
      );

      return;
    }

    // =====================================================
    // CHECK 3-MINUTE SESSION
    // =====================================================

    if (otpSessionTimer <= 0) {
      setMessage(
        "Your verification code has expired. Please request a new code."
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

      // ===================================================
      // CHECK DUPLICATE PHONE
      // ===================================================

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

      // ===================================================
      // CREATE PHONE CREDENTIAL
      // ===================================================

      const credential =
        PhoneAuthProvider.credential(
          verificationId,
          cleanOtp
        );

      // ===================================================
      // CHECK WHETHER PHONE IS ALREADY LINKED
      // TO THIS SAME FIREBASE ACCOUNT
      // ===================================================

      const phoneProviderAlreadyLinked =
        pendingUser.providerData.some(
          (provider) =>
            provider.providerId ===
            "phone"
        );

      // ===================================================
      // EXISTING PHONE LINK
      // =====================================================

      if (phoneProviderAlreadyLinked) {
        // The phone is already linked to
        // this Firebase account.
        //
        // Do NOT call linkWithCredential()
        // because that causes:
        //
        // auth/provider-already-linked
        //
        // Instead authenticate the account
        // using the phone credential.

        await reauthenticateWithCredential(
          pendingUser,
          credential
        );

      } else {
        // =================================================
        // NEW PHONE LINK
        // =================================================

        await linkWithCredential(
          pendingUser,
          credential
        );
      }

      // ===================================================
      // SAVE PHONE VERIFICATION
      // ===================================================

      await setDoc(
        doc(
          db,
          "users",
          pendingUser.uid
        ),
        {
          phone:
            normalizedPhone,

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

      // ===================================================
      // CLEANUP
      // ===================================================

      setShowPhoneVerification(false);

      setOtp("");

      setOtpSent(false);

      setVerificationId(null);

      setResendTimer(0);

      setOtpSessionTimer(0);

      clearPhoneRecaptcha();

      setMessage("");

      // ===================================================
      // FINISH LOGIN
      // ===================================================

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

      // ===================================================
      // WRONG OTP
      // ===================================================

      if (
        error.code ===
        "auth/invalid-verification-code"
      ) {
        setMessage(
          "Incorrect verification code."
        );

      // ===================================================
      // EXPIRED OTP
      // ===================================================

      } else if (
        error.code ===
        "auth/code-expired"
      ) {
        setVerificationId(null);

        setOtpSessionTimer(0);

        setMessage(
          "That code has expired. Please request a new code."
        );

      // ===================================================
      // PHONE ALREADY BELONGS TO ANOTHER ACCOUNT
      // ===================================================

      } else if (
        error.code ===
        "auth/credential-already-in-use"
      ) {
        showPhoneAlreadyUsed();

      // ===================================================
      // PHONE ALREADY LINKED TO SAME ACCOUNT
      // ===================================================

      } else if (
        error.code ===
        "auth/provider-already-linked"
      ) {
        setMessage(
          "This phone number is already verified on your account."
        );

      // ===================================================
      // REAUTHENTICATION REQUIRED
      // ===================================================

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
    // CHECK RIDER
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
        riderData.status !==
        "Active"
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

    // =======================================================
    // CREATE CUSTOMER DOCUMENT IF MISSING
    // =======================================================

    if (!userSnap.exists()) {
      userData = {
        name:
          user.displayName ||
          user.email?.split("@")[0] ||
          "User",

        email:
          user.email,

        birthday: "",

        photoURL:
          user.photoURL || "",

        phone:
          normalizePhone(phone),

        phoneVerified:
          true,

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
    // ONLY AFTER PHONE VERIFICATION
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

    setUserName(
      displayName
    );

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
      // =====================================================
      // LOGIN
      // =====================================================

      if (isLogin) {
        const userCredential =
          await signInWithEmailAndPassword(
            auth,
            email.trim(),
            password
          );

        const user =
          userCredential.user;

        await startPhoneVerification(
          user,
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

      // =====================================================
      // CREATE BASIC CUSTOMER DOCUMENT
      // =====================================================

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

          email:
            user.email,

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

      // =====================================================
      // FORCE PHONE VERIFICATION
      // =====================================================

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

      const user =
        result.user;

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
          riderData.status !==
          "Active"
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

            email:
              user.email,

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

        // ===================================================
        // FORCE PHONE VERIFICATION
        // ===================================================

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
      setMessage(
        error.message
      );
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

    setPendingUser(null);

    setPhone("");

    setIsNewAccount(false);

    setResendTimer(0);

    setOtpSessionTimer(0);

    clearPhoneRecaptcha();

    setMessage("");

    // Prevent bypassing phone verification.
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
  // FORMAT TIMER
  // =========================================================

  function formatTimer(seconds) {
    const minutes = Math.floor(
      seconds / 60
    );

    const remainingSeconds =
      seconds % 60;

    return `${minutes}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
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

        /* =================================================
           PHONE VERIFICATION
        ================================================= */

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

        .secondary:hover {
          background: #EEE4D7;
        }

        .recaptcha-container {
          height: 0;

          overflow: hidden;
        }

        /* =================================================
           OTP TIMER
        ================================================= */

        .otp-timer {
          text-align: center;

          margin-top: 12px;

          color: #6B5C53;

          font-size: 13px;
        }

        .resend-button {
          width: 100%;

          margin-top: 10px;
        }

        /* =================================================
           DUPLICATE PHONE MODAL
        ================================================= */

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

        @keyframes modalPop {
          from {
            opacity: 0;

            transform:
              scale(.94);
          }

          to {
            opacity: 1;

            transform:
              scale(1);
          }
        }

        /* =================================================
           GREETING
        ================================================= */

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

        @keyframes fadeIn {
          from {
            opacity: 0;

            transform:
              scale(.98);
          }

          to {
            opacity: 1;

            transform:
              scale(1);
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

          .greeting-title {
            font-size: 2rem;
          }

          .greeting-name {
            font-size: 2.4rem;
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

          {/* =================================================
              PHONE VERIFICATION SCREEN
          ================================================= */}

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
                          .replace(
                            /\D/g,
                            ""
                          )
                      )
                    }
                    autoFocus
                  />

                  <div className="phone-actions">

                    <button
                      type="button"
                      className="secondary"
                      onClick={
                        changePhoneNumber
                      }
                      disabled={
                        phoneLoading ||
                        resendingOTP
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
                        resendingOTP ||
                        otp.length !== 6 ||
                        otpSessionTimer <= 0
                      }
                    >
                      {phoneLoading
                        ? "Verifying..."
                        : "Verify & Continue"}
                    </button>

                  </div>

                  {/* =================================================
                      RESEND OTP
                  ================================================= */}

                  <button
                    type="button"
                    className="secondary resend-button"
                    onClick={
                      handleResendPhoneOTP
                    }
                    disabled={
                      phoneLoading ||
                      resendingOTP ||
                      resendTimer > 0
                    }
                  >
                    {resendingOTP
                      ? "Sending..."
                      : resendTimer > 0
                      ? `Resend code in ${resendTimer}s`
                      : "Resend Verification Code"}
                  </button>

                  {/* =================================================
                      OTP SESSION TIMER
                  ================================================= */}

                  <div className="otp-timer">

                    {otpSessionTimer > 0 ? (
                      <>
                        Code expires in{" "}
                        <strong>
                          {formatTimer(
                            otpSessionTimer
                          )}
                        </strong>
                      </>
                    ) : (
                      <strong>
                        Verification code expired.
                      </strong>
                    )}

                  </div>

                </>
              )}

              {/* =================================================
                  RECAPTCHA CONTAINER
              ================================================= */}

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
                  phoneLoading ||
                  resendingOTP
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

            /* =================================================
               NORMAL LOGIN
            ================================================= */

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
