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

  const [phoneUsedMessage, setPhoneUsedMessage] =
    useState("");

  // =========================================================
  // OTP TIMER
  // =========================================================

  useEffect(() => {
    if (otpTimer <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);

          setVerificationId(null);

          setMessage(
            "Code expired. Request a new code below."
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

  function normalizePhone(phoneNumber = "") {
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

    const element = document.getElementById(
      "login-phone-recaptcha"
    );

    if (element) {
      element.innerHTML = "";
    }
  }

  // =========================================================
  // GET / CREATE RECAPTCHA
  // =========================================================

  function getPhoneRecaptcha() {
    if (window.loginPhoneRecaptcha) {
      return window.loginPhoneRecaptcha;
    }

    const element = document.getElementById(
      "login-phone-recaptcha"
    );

    if (!element) {
      throw new Error(
        "Phone verification could not be initialized. Please try again."
      );
    }

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
          console.log(
            "Phone reCAPTCHA expired."
          );

          clearPhoneRecaptcha();
        },

        "error-callback": () => {
          console.log(
            "Phone reCAPTCHA error."
          );

          clearPhoneRecaptcha();
        },
      }
    );

    window.loginPhoneRecaptcha = verifier;

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

    const userSnap = await getDoc(
      userRef
    );

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
  // CLEAN UP NEW UNVERIFIED ACCOUNT
  // =========================================================

  async function cleanupUnverifiedAccount(user = pendingUser) {
    if (!user || !isNewAccount) {
      return false;
    }

    try {
      /*
       * The user was created in Firebase Auth during signup
       * but never successfully completed phone verification.
       *
       * Delete that Auth account so an abandoned signup does
       * not remain as an unusable orphan account.
       */
      await deleteUser(user);

      console.log(
        "Unverified signup account deleted."
      );

      return true;
    } catch (error) {
      console.error(
        "Failed to delete unverified account:",
        error
      );

      /*
       * If deletion fails because the auth state changed,
       * make sure the user is still signed out.
       */
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

    if (status.phoneVerified === true) {
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

    setOtpTimer(0);
    setResendTimer(0);

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
      // ===================================================
      // DUPLICATE PHONE CHECK
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

      setPhone(cleanedPhone);

      // ===================================================
      // GET RECAPTCHA
      // ===================================================

      const verifier =
        getPhoneRecaptcha();

      // ===================================================
      // SEND OTP
      // ===================================================

      const provider =
        new PhoneAuthProvider(auth);

      const id =
        await provider.verifyPhoneNumber(
          cleanedPhone,
          verifier
        );

      // ===================================================
      // NEW OTP SESSION
      // ===================================================

      setVerificationId(id);

      setOtpSent(true);

      setOtp("");

      setOtpTimer(
        OTP_DURATION
      );

      setResendTimer(
        RESEND_COOLDOWN
      );

      setMessage(
        "A verification code has been sent to your phone."
      );

    } catch (error) {
      console.error(
        "Phone OTP send error:",
        error
      );

      clearPhoneRecaptcha();

      /*
       * IMPORTANT:
       *
       * If this was a NEW signup and the initial SMS
       * could not be sent, remove the unverified Auth
       * account.
       *
       * Existing accounts are NOT deleted.
       */
      if (isNewAccount && pendingUser) {
        const userToDelete =
          pendingUser;

        await cleanupUnverifiedAccount(
          userToDelete
        );

        setShowPhoneVerification(
          false
        );

        setPendingUser(null);
        setIsNewAccount(false);

        setOtp("");
        setOtpSent(false);
        setVerificationId(null);

        setOtpTimer(0);
        setResendTimer(0);
      }

      if (
        error.code ===
        "auth/too-many-requests"
      ) {
        setMessage(
          "Too many verification attempts. Please try again later."
        );

      } else if (
        error.code ===
        "auth/invalid-phone-number"
      ) {
        setMessage(
          "Please enter a valid phone number."
        );

      } else if (
        error.code ===
        "auth/quota-exceeded"
      ) {
        setMessage(
          "SMS verification limit reached. Please try again later."
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

    // HARD BLOCK BEFORE 90 SECONDS
    if (resendTimer > 0) {
      return;
    }

    if (
      resendingOTP ||
      phoneLoading
    ) {
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
        "Enter a valid phone number."
      );

      return;
    }

    setResendingOTP(true);
    setPhoneLoading(true);
    setMessage("");

    try {
      // ===================================================
      // DUPLICATE PHONE CHECK
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
      // REUSE EXISTING RECAPTCHA
      // ===================================================

      const verifier =
        getPhoneRecaptcha();

      // ===================================================
      // SEND NEW OTP
      // ===================================================

      const provider =
        new PhoneAuthProvider(auth);

      const newVerificationId =
        await provider.verifyPhoneNumber(
          cleanedPhone,
          verifier
        );

      // ===================================================
      // OLD OTP SESSION REPLACED
      // ===================================================

      setVerificationId(
        newVerificationId
      );

      setOtp("");

      setOtpTimer(
        OTP_DURATION
      );

      setResendTimer(
        RESEND_COOLDOWN
      );

      setOtpSent(true);

      setMessage(
        "A new verification code has been sent."
      );

    } catch (error) {
      console.error(
        "Resend OTP error:",
        error
      );

      clearPhoneRecaptcha();

      /*
       * IMPORTANT:
       *
       * Do NOT delete the account here.
       *
       * A resend failure should not destroy an existing
       * account or an account that is already in an OTP
       * session.
       */

      if (
        error.code ===
        "auth/too-many-requests"
      ) {
        setMessage(
          "Too many verification attempts. Please try again later."
        );

      } else if (
        error.code ===
        "auth/quota-exceeded"
      ) {
        setMessage(
          "SMS verification limit reached. Please try again later."
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
    // =====================================================
    // ABSOLUTE REQUIREMENT
    // =====================================================

    if (
      !pendingUser ||
      !verificationId
    ) {
      setMessage(
        "Your verification session has expired. Please request a new code."
      );

      return;
    }

    // =====================================================
    // 90 SECOND SESSION EXPIRED
    // =====================================================

    if (otpTimer <= 0) {
      setVerificationId(null);

      setMessage(
        "Code expired. Request a new code below."
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
      // DUPLICATE PHONE CHECK
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
      // CREATE CREDENTIAL
      // ===================================================

      const credential =
        PhoneAuthProvider.credential(
          verificationId,
          cleanOtp
        );

      // ===================================================
      // CHECK PHONE PROVIDER
      // ===================================================

      const phoneProviderAlreadyLinked =
        pendingUser.providerData.some(
          (provider) =>
            provider.providerId ===
            "phone"
        );

      // ===================================================
      // VERIFY
      // ===================================================

      if (
        phoneProviderAlreadyLinked
      ) {
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

      // ===================================================
      // OTP SUCCESSFUL
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

      const verifiedUser =
        pendingUser;

      const wasNewAccount =
        isNewAccount;

      setShowPhoneVerification(
        false
      );

      setOtp("");

      setOtpSent(false);

      setVerificationId(null);

      setOtpTimer(0);
      setResendTimer(0);

      clearPhoneRecaptcha();

      setMessage("");

      setPendingUser(null);
      setIsNewAccount(false);

      // ===================================================
      // ONLY SUCCESSFUL OTP REACHES LOGIN
      // ===================================================

      await finishCustomerLogin(
        verifiedUser,
        wasNewAccount
      );

    } catch (error) {
      console.error(
        "Phone OTP verification error:",
        error
      );

      // ===================================================
      // INCORRECT OTP
      // ===================================================

      if (
        error.code ===
        "auth/invalid-verification-code"
      ) {
        setMessage(
          "Incorrect verification code."
        );

        return;
      }

      // ===================================================
      // EXPIRED OTP
      // ===================================================

      if (
        error.code ===
        "auth/code-expired"
      ) {
        setVerificationId(null);

        setOtpTimer(0);

        setMessage(
          "Code expired. Request a new code below."
        );

        return;
      }

      // ===================================================
      // PHONE ALREADY USED
      // ===================================================

      if (
        error.code ===
        "auth/credential-already-in-use"
      ) {
        showPhoneAlreadyUsed();

        return;
      }

      // ===================================================
      // PROVIDER ALREADY LINKED
      // ===================================================

      if (
        error.code ===
        "auth/provider-already-linked"
      ) {
        setMessage(
          "This phone number is already verified on your account."
        );

        return;
      }

      // ===================================================
      // RECENT LOGIN REQUIRED
      // ===================================================

      if (
        error.code ===
        "auth/requires-recent-login"
      ) {
        setMessage(
          "Please log in again and verify your phone."
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
    if (!user) {
      return;
    }

    // =======================================================
    // FINAL PHONE SECURITY CHECK
    // =======================================================

    const phoneStatus =
      await checkPhoneStatus(user);

    if (
      phoneStatus.phoneVerified !== true
    ) {
      setMessage(
        "Phone verification is required before you can continue."
      );

      await signOut(auth);

      return;
    }

    // =======================================================
    // CHECK RIDER
    //
    // IMPORTANT:
    // This happens AFTER phone verification.
    // Therefore Google Rider login cannot bypass OTP.
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

        await signOut(auth);

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
    // CREATE CUSTOMER DATA ONLY AFTER VERIFIED LOGIN
    // =======================================================

    if (!userSnap.exists()) {
      userData = {
        name:
          user.displayName ||
          name ||
          user.email?.split("@")[0] ||
          "User",

        email:
          user.email,

        birthday: "",

        photoURL:
          user.photoURL || "",

        phone:
          phoneStatus.phone ||
          normalizePhone(phone),

        phoneVerified:
          true,

        phoneVerifiedAt:
          serverTimestamp(),

        createdAt:
          serverTimestamp(),

        loyaltyPoints: 0,

        lifetimePoints: 0,

        signupRewardClaimed:
          false,

        birthdayRewardYear:
          null,

        referredBy:
          null,

        referralRewardClaimed:
          false,

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
          birthdayRewardClaimed:
            false,
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

    setUserName(
      displayName
    );

    setShowGreeting(true);

    setTimeout(() => {
      setPage("menu");
    }, 2200);
  }

  // =========================================================
  // EMAIL / PASSWORD
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

        /*
         * IMPORTANT:
         *
         * Do NOT setPage here.
         *
         * Phone verification MUST happen first.
         */

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

      /*
       * IMPORTANT:
       *
       * We intentionally DO NOT:
       *
       * - setPage()
       * - create customer Firestore data
       * - create wallet
       * - give signup reward
       *
       * Everything waits for successful phone verification.
       */

      await startPhoneVerification(
        user,
        true
      );

    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      /*
       * If createUserWithEmailAndPassword succeeded
       * but something after it failed, make sure the
       * newly-created unverified account doesn't remain.
       */

      if (
        !isLogin &&
        pendingUser &&
        isNewAccount
      ) {
        const userToDelete =
          pendingUser;

        await cleanupUnverifiedAccount(
          userToDelete
        );

        setPendingUser(null);
        setIsNewAccount(false);
      }

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
      // CHECK CUSTOMER DOCUMENT
      // =====================================================

      const userRef =
        doc(
          db,
          "users",
          user.uid
        );

      const userSnap =
        await getDoc(userRef);

      /*
       * IMPORTANT:
       *
       * Do NOT check riders here.
       *
       * Do NOT setPage("rider") here.
       *
       * Google authentication must pass through the
       * same phone-verification gate as email/password.
       *
       * finishCustomerLogin() handles rider/customer
       * routing AFTER phone verification succeeds.
       */

      await startPhoneVerification(
        user,
        !userSnap.exists()
      );

    } catch (error) {
      console.error(
        "Google login error:",
        error
      );

      /*
       * Only clean up a NEW account if this is an actual
       * Google authentication / initialization failure.
       *
       * Normal OTP waiting/cancellation is handled by
       * cancelPhoneVerification().
       */

      if (
        isNewAccount &&
        pendingUser
      ) {
        const userToDelete =
          pendingUser;

        try {
          await deleteUser(
            userToDelete
          );

          console.log(
            "Unverified Google account deleted."
          );
        } catch (deleteError) {
          console.error(
            "Failed to delete unverified Google account:",
            deleteError
          );
        }

        setPendingUser(null);
        setIsNewAccount(false);
      }

      try {
        await signOut(auth);
      } catch (signOutError) {
        console.error(
          "Google fallback sign out failed:",
          signOutError
        );
      }

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

  async function cancelPhoneVerification() {
    const wasNewAccount =
      isNewAccount;

    const user =
      pendingUser;

    setShowPhoneVerification(false);

    setOtp("");

    setOtpSent(false);

    setVerificationId(null);

    setPendingUser(null);

    setPhone("");

    setIsNewAccount(false);

    setOtpTimer(0);

    setResendTimer(0);

    clearPhoneRecaptcha();

    setMessage("");

    /*
     * CRITICAL:
     *
     * NEW ACCOUNT:
     * Delete the Firebase Auth account.
     *
     * EXISTING ACCOUNT:
     * Only sign out.
     *
     * This prevents an unverified signup from
     * remaining in Firebase Auth.
     */

    try {
      if (
        wasNewAccount &&
        user
      ) {
        try {
          await deleteUser(
            user
          );

          console.log(
            "Unverified signup account deleted after cancellation."
          );
        } catch (deleteError) {
          console.error(
            "Failed to delete account during cancellation:",
            deleteError
          );

          try {
            await signOut(auth);
          } catch (signOutError) {
            console.error(
              "Fallback sign out failed:",
              signOutError
            );
          }
        }
      } else {
        await signOut(auth);
      }

    } catch (error) {
      console.error(
        "Sign out after phone cancellation:",
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
    }
  }

  // =========================================================
  // CHANGE PHONE NUMBER
  // =========================================================

  function changePhoneNumber() {
    setOtpSent(false);

    setOtp("");

    setVerificationId(null);

    setOtpTimer(0);

    setResendTimer(0);

    clearPhoneRecaptcha();

    setMessage("");
  }

  // =========================================================
  // CLOSE DUPLICATE PHONE MODAL
  // =========================================================

  async function closePhoneUsedModal() {
    const wasNewAccount =
      isNewAccount;

    const user =
      pendingUser;

    setShowPhoneUsedModal(false);

    setPhoneUsedMessage("");

    setOtp("");

    setOtpSent(false);

    setVerificationId(null);

    setOtpTimer(0);

    setResendTimer(0);

    clearPhoneRecaptcha();

    setPhone("");

    setPendingUser(null);

    setIsNewAccount(false);

    /*
     * If this was a new signup, delete the unverified
     * Firebase Auth account.
     *
     * Existing accounts are simply signed out.
     */

    try {
      if (
        wasNewAccount &&
        user
      ) {
        try {
          await deleteUser(
            user
          );

          console.log(
            "Unverified account deleted after duplicate phone."
          );
        } catch (deleteError) {
          console.error(
            "Duplicate phone account deletion failed:",
            deleteError
          );

          await signOut(auth);
        }
      } else {
        await signOut(auth);
      }

    } catch (error) {
      console.error(
        "Duplicate phone cleanup error:",
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
    }
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
          background: rgba(253,250,245,.95);
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
          border: 1px solid #DDD;
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
          border: 1px solid #DDD;
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

        .resend-section {
          text-align: center;
          margin-top: 18px;
          font-size: 14px;
          color: #6B5C53;
        }

        .resend-button {
          background: transparent;
          padding: 5px;
          margin-top: 4px;
          color: #8A5A32;
          font-weight: 600;
        }

        .resend-button:hover {
          background: transparent;
          color: #C4956A;
        }

        .otp-expiry {
          text-align: center;
          margin-top: 10px;
          font-size: 13px;
          color: #8A5A32;
        }

        .otp-expired {
          text-align: center;
          margin-top: 10px;
          font-size: 13px;
          color: #A13A2A;
          font-weight: 600;
        }

        .recaptcha-container {
          height: 0;
          overflow: hidden;
        }

        .phone-used-overlay {
          position: fixed;
          inset: 0;
          background: rgba(20, 10, 5, 0.68);
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
          margin: 0 auto 18px;
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
          margin: 0 0 12px;
          font-family:
            'Playfair Display', serif;
          color: #3B1A08;
          font-size: 1.6rem;
        }

        .phone-used-modal p {
          color: #6B5C53;
          font-size: 14px;
          line-height: 1.6;
          margin: 0 0 24px;
        }

        .phone-used-modal button {
          width: 100%;
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
            transform: scale(.98);
          }

          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media(max-width: 500px) {
          .login-card {
            padding: 30px 22px;
          }

          .phone-actions {
            flex-direction: column;
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
          LOGIN
      ===================================================== */}

      <div className="login-page">

        <div className="login-card">

          <div className="logo">
            Brewed.
          </div>

          {/* =================================================
              PHONE VERIFICATION
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
                          .replace(/\D/g, "")
                      )
                    }
                    autoFocus
                  />

                  {/* =================================================
                      OTP SESSION TIMER
                  ================================================= */}

                  {otpTimer > 0 ? (
                    <div className="otp-expiry">
                      Code expires in{" "}
                      <strong>
                        {formatTimer(
                          otpTimer
                        )}
                      </strong>
                    </div>
                  ) : (
                    <div className="otp-expired">
                      Code expired. Request
                      a new code below.
                    </div>
                  )}

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
                        !verificationId ||
                        otpTimer <= 0
                      }
                    >
                      {phoneLoading
                        ? "Verifying..."
                        : "Verify & Continue"}
                    </button>

                  </div>

                  {/* =================================================
                      RESEND
                  ================================================= */}

                  <div className="resend-section">

                    {resendTimer > 0 ? (
                      <>
                        Resend code available
                        in{" "}

                        <strong>
                          {formatTimer(
                            resendTimer
                          )}
                        </strong>
                      </>
                    ) : (
                      <>
                        Didn't receive the
                        code?

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
                          {resendingOTP
                            ? "Sending new code..."
                            : "Resend OTP"}
                        </button>
                      </>
                    )}

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
