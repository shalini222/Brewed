      import React, { useState } from "react";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  getMultiFactorResolver,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
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
  // MFA STATE
  // =========================================================

  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  const [mfaResolver, setMfaResolver] = useState(null);
  const [mfaVerificationId, setMfaVerificationId] =
    useState(null);

  const [mfaPhone, setMfaPhone] = useState("");

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
  // RECAPTCHA
  // =========================================================

  function setupMfaRecaptcha() {
    if (window.loginRecaptchaVerifier) {
      return window.loginRecaptchaVerifier;
    }

    window.loginRecaptchaVerifier =
      new RecaptchaVerifier(
        auth,
        "login-phone-recaptcha",
        {
          size: "invisible",

          callback: () => {
            console.log("Login reCAPTCHA completed.");
          },

          "expired-callback": () => {
            window.loginRecaptchaVerifier?.clear();
            window.loginRecaptchaVerifier = null;
          },
        }
      );

    return window.loginRecaptchaVerifier;
  }

  // =========================================================
  // SEND MFA OTP
  // =========================================================

  async function sendMfaOTP(resolver) {
    try {
      const hint = resolver.hints?.[0];

      if (!hint) {
        throw new Error(
          "No phone verification method is available for this account."
        );
      }

      if (
        hint.factorId !==
        PhoneMultiFactorGenerator.FACTOR_ID
      ) {
        throw new Error(
          "This account does not have SMS verification configured."
        );
      }

      const verifier = setupMfaRecaptcha();

      const phoneInfoOptions = {
        multiFactorHint: hint,
        session: resolver.session,
      };

      const phoneAuthProvider =
        new PhoneAuthProvider(auth);

      const verificationId =
        await phoneAuthProvider.verifyPhoneNumber(
          phoneInfoOptions,
          verifier
        );

      setMfaVerificationId(verificationId);

      // Firebase provides a masked phone number.
      setMfaPhone(
        hint.phoneNumber ||
          hint.displayName ||
          "your phone"
      );

      setMfaResolver(resolver);
      setShowOtp(true);

      setMessage(
        "A verification code has been sent to your phone."
      );
    } catch (error) {
      console.error(
        "MFA OTP send error:",
        error
      );

      window.loginRecaptchaVerifier?.clear();
      window.loginRecaptchaVerifier = null;

      setMessage(
        error.message ||
          "Unable to send verification code."
      );
    }
  }

  // =========================================================
  // VERIFY MFA OTP
  // =========================================================

  async function handleVerifyMfaOTP() {
    if (!mfaResolver || !mfaVerificationId) {
      setMessage(
        "Your verification session has expired. Please log in again."
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

    setOtpLoading(true);
    setMessage("");

    try {
      const credential =
        PhoneAuthProvider.credential(
          mfaVerificationId,
          cleanOtp
        );

      const assertion =
        PhoneMultiFactorGenerator.assertion(
          credential
        );

      // THIS COMPLETES THE LOGIN
      const userCredential =
        await mfaResolver.resolveSignIn(
          assertion
        );

      const user = userCredential.user;

      console.log(
        "MFA login successful:",
        user.uid
      );

      // Clean MFA state
      setShowOtp(false);
      setOtp("");
      setMfaResolver(null);
      setMfaVerificationId(null);

      window.loginRecaptchaVerifier?.clear();
      window.loginRecaptchaVerifier = null;

      // Continue with normal Brewed login flow
      await finishLogin(user);

    } catch (error) {
      console.error(
        "MFA OTP verification error:",
        error
      );

      if (
        error.code ===
        "auth/invalid-verification-code"
      ) {
        setMessage(
          "Incorrect verification code. Please try again."
        );
      } else if (
        error.code === "auth/code-expired"
      ) {
        setMessage(
          "That verification code has expired. Please log in again."
        );
      } else {
        setMessage(
          error.message ||
            "Unable to verify the code."
        );
      }
    } finally {
      setOtpLoading(false);
    }
  }

  // =========================================================
  // FINISH NORMAL BREWED LOGIN
  // =========================================================

  async function finishLogin(user) {
    // ==========================================
    // CHECK IF THIS ACCOUNT IS A RIDER
    // ==========================================

    const riderQuery = query(
      collection(db, "riders"),
      where("email", "==", user.email)
    );

    const riderSnapshot =
      await getDocs(riderQuery);

    if (!riderSnapshot.empty) {
      const riderDoc =
        riderSnapshot.docs[0];

      const riderData =
        riderDoc.data();

      if (riderData.status !== "Active") {
        setMessage(
          "Your rider account is currently inactive. Please contact the administrator."
        );

        setLoading(false);

        return;
      }

      // Rider account
      setPage("rider");

      return;
    }

    // ==========================================
    // CUSTOMER ACCOUNT
    // ==========================================

    const userRef = doc(
      db,
      "users",
      user.uid
    );

    const userSnap =
      await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        name:
          user.displayName ||
          user.email?.split("@")[0] ||
          "User",

        email: user.email,

        birthday: "",

        photoURL:
          user.photoURL || "",

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
      });
    }

    // Wallet
    await walletService.createWallet(
      user.uid
    );

    // Signup reward
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

    // ==========================================
    // GREETING
    // ==========================================

    const displayName =
      user.displayName ||
      user.email?.split("@")[0] ||
      "User";

    setUserName(displayName);
    setShowGreeting(true);

    setTimeout(() => {
      setPage("menu");
    }, 2200);
  }

  // =========================================================
  // EMAIL / PASSWORD LOGIN + MFA
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
        try {
          const userCredential =
            await signInWithEmailAndPassword(
              auth,
              email.trim(),
              password
            );

          // No MFA required
          const user =
            userCredential.user;

          await finishLogin(user);

          return;

        } catch (error) {

          // =================================================
          // MFA REQUIRED
          // =================================================

          if (
            error.code ===
            "auth/multi-factor-auth-required"
          ) {
            console.log(
              "MFA required for login."
            );

            const resolver =
              getMultiFactorResolver(
                auth,
                error
              );

            await sendMfaOTP(
              resolver
            );

            return;
          }

          // Normal login error
          throw error;
        }
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

      // Create customer document
      const userRef = doc(
        db,
        "users",
        user.uid
      );

      await setDoc(userRef, {
        name:
          name ||
          user.email?.split("@")[0] ||
          "User",

        email: user.email,

        birthday: "",

        photoURL:
          user.photoURL || "",

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
      });

      // Wallet
      await walletService.createWallet(
        user.uid
      );

      // Signup reward
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
      // CHECK RIDER
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

      const userRef = doc(
        db,
        "users",
        user.uid
      );

      const userSnap =
        await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          name:
            user.displayName ||
            user.email?.split("@")[0] ||
            "User",

          email: user.email,

          birthday: "",

          photoURL:
            user.photoURL || "",

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
        });
      }

      await walletService.createWallet(
        user.uid
      );

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

      setUserName(
        user.displayName ||
          user.email?.split("@")[0] ||
          "User"
      );

      setShowGreeting(true);

      setTimeout(() => {
        setPage("menu");
      }, 2200);

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
  // CANCEL OTP
  // =========================================================

  function cancelOtp() {
    setShowOtp(false);
    setOtp("");
    setMfaResolver(null);
    setMfaVerificationId(null);
    setMfaPhone("");

    window.loginRecaptchaVerifier?.clear();
    window.loginRecaptchaVerifier = null;

    setMessage("");

    setLoading(false);
  }

  // =========================================================
  // UI
  // =========================================================

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
            url("https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1500&q=80");
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
          box-shadow: 0 25px 60px rgba(0,0,0,.25);
        }

        .logo {
          font-family: 'Playfair Display', serif;
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

        /* =========================
           OTP SCREEN
        ========================= */

        .otp-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.8rem;
          color: #3B1A08;
          text-align: center;
          margin-bottom: 10px;
        }

        .otp-description {
          text-align: center;
          color: #6B5C53;
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 25px;
        }

        .otp-input {
          width: 100%;
          text-align: center;
          letter-spacing: 8px;
          font-size: 22px;
          font-weight: 600;
        }

        .otp-actions {
          display: flex;
          gap: 10px;
          margin-top: 5px;
        }

        .otp-actions button {
          flex: 1;
        }

        .cancel-otp {
          background: #F8F4EE;
          color: #3B1A08;
        }

        .recaptcha-container {
          height: 0;
          overflow: hidden;
        }

        /* =========================
           GREETING
        ========================= */

        .greeting-screen {
          position: fixed;
          inset: 0;
          background: #FDFAF5;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
          z-index: 9999;
          animation: fadeIn .7s ease;
        }

        .greeting-logo {
          font-family: 'Playfair Display', serif;
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
          font-family: 'Playfair Display', serif;
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
        }
      `}</style>

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
              MFA OTP SCREEN
          ================================================= */}

          {showOtp ? (
            <>
              <div className="otp-title">
                Verify your phone
              </div>

              <div className="otp-description">
                We sent a 6-digit verification
                code to{" "}
                <strong>
                  {mfaPhone}
                </strong>
                .
                <br />
                Enter the code to complete
                your login.
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

              <div className="otp-actions">

                <button
                  type="button"
                  className="cancel-otp"
                  onClick={cancelOtp}
                  disabled={otpLoading}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="primary"
                  onClick={handleVerifyMfaOTP}
                  disabled={
                    otpLoading ||
                    otp.length !== 6
                  }
                >
                  {otpLoading
                    ? "Verifying..."
                    : "Verify & Login"}
                </button>

              </div>

              {message && (
                <div className="message">
                  {message}
                </div>
              )}

              <div
                id="login-phone-recaptcha"
                className="recaptcha-container"
              />

            </>

          ) : (

            /* =================================================
               NORMAL LOGIN / SIGNUP
            ================================================= */

            <>
              <div className="subtitle">
                {isLogin
                  ? "Welcome back."
                  : "Create your Brewed account"}
              </div>

              <form
                onSubmit={handleSubmit}
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
