import React, { useState } from "react";
const [showGreeting, setShowGreeting] = useState(false);
const [userName, setUserName] = useState("");
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";

export default function Login({setPage}) {
  const [isLogin, setIsLogin] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}
  
 
  async function handleSubmit(e) {
  e.preventDefault();
  setLoading(true);
  setMessage("");

  try {
    let userCredential;

    if (isLogin) {
      userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
    } else {
      userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
    }

    const user = userCredential.user;

    const displayName =
      user.displayName ||
      email.split("@")[0];

    setUserName(displayName);
    setShowGreeting(true);

    setTimeout(() => {
      setPage("menu");
    }, 2200);

  } catch (error) {
    setMessage(error.message);
  }

  setLoading(false);
}
    

async function handleGoogleLogin() {
  try {
    const result = await signInWithPopup(
      auth,
      googleProvider
    );

    const user = result.user;

    setUserName(user.displayName);
    setShowGreeting(true);

    setTimeout(() => {
      setPage("menu");
    }, 2200);

  } catch (error) {
    setMessage(error.message);
  }
}

  async function forgotPassword() {
    if (!email) {
      setMessage("Enter your email first.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent!");
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');

        *{
          box-sizing:border-box;
        }

        body{
          margin:0;
          background:#FDFAF5;
          font-family:'Inter',sans-serif;
        }

        .login-page{
          min-height:100vh;
          display:flex;
          justify-content:center;
          align-items:center;
          padding:40px 20px;
          background:
          linear-gradient(rgba(26,10,0,.45),rgba(26,10,0,.45)),
          url("https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1500&q=80");
          background-size:cover;
          background-position:center;
        }

        .login-card{
          width:100%;
          max-width:430px;
          background:rgba(253,250,245,.95);
          backdrop-filter:blur(12px);
          border-radius:22px;
          padding:45px;
          box-shadow:0 25px 60px rgba(0,0,0,.25);
        }

        .logo{
          font-family:'Playfair Display',serif;
          font-size:2.2rem;
          color:#3B1A08;
          text-align:center;
          margin-bottom:10px;
        }

        .subtitle{
          text-align:center;
          color:#6B5C53;
          margin-bottom:30px;
        }

        form{
          display:flex;
          flex-direction:column;
          gap:16px;
        }

        input{
          padding:15px;
          border-radius:12px;
          border:1px solid #DDD;
          font-size:15px;
          outline:none;
        }

        input:focus{
          border-color:#C4956A;
        }

        button{
          padding:15px;
          border:none;
          border-radius:12px;
          cursor:pointer;
          font-weight:600;
          transition:.3s;
        }

        .primary{
          background:#3B1A08;
          color:white;
        }

        .primary:hover{
          background:#C4956A;
          color:#3B1A08;
        }

        .google{
          background:white;
          border:1px solid #DDD;
        }

        .message{
          margin-top:15px;
          text-align:center;
          color:#8A5A32;
        }

        .switch{
          margin-top:25px;
          text-align:center;
        }

        .switch span{
          color:#8A5A32;
          cursor:pointer;
          font-weight:600;
        }

        .forgot{
          text-align:right;
          font-size:14px;
          color:#8A5A32;
          cursor:pointer;
        }
        .greeting-screen{
  position:fixed;
  inset:0;
  background:#FDFAF5;
  display:flex;
  justify-content:center;
  align-items:center;
  flex-direction:column;
  z-index:9999;
  animation:fadeIn .7s ease;
}

.greeting-logo{
  font-family:'Playfair Display',serif;
  font-size:3rem;
  color:#3B1A08;
  margin-bottom:40px;
}

.greeting-title{
  font-size:2.4rem;
  color:#3B1A08;
  font-weight:600;
}

.greeting-name{
  margin-top:12px;
  font-size:3rem;
  color:#C4956A;
  font-family:'Playfair Display',serif;
}

.greeting-sub{
  margin-top:18px;
  color:#6B5C53;
  font-size:1.2rem;
}

@keyframes fadeIn{
  from{
    opacity:0;
    transform:scale(.98);
  }
  to{
    opacity:1;
    transform:scale(1);
  }
}
      `}</style>

      <div className="login-page">
        <div className="login-card">

          <div className="logo">Brewed.</div>

          <div className="subtitle">
            {isLogin
              ? "Welcome back."
              : "Create your Brewed account"}
          </div>

          <form onSubmit={handleSubmit}>

            {!isLogin && (
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {isLogin && (
              <div
                className="forgot"
                onClick={forgotPassword}
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
              onClick={handleGoogleLogin}
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

        </div>
      </div>
    </>
  );
}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         
