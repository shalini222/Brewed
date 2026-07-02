import React, { useState } from "react";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);

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
          text-align:center;
          color:#3B1A08;
          margin-bottom:8px;
        }

        .subtitle{
          text-align:center;
          color:#6b5c53;
          margin-bottom:35px;
        }

        .input-group{
          margin-bottom:18px;
        }

        .input-group label{
          display:block;
          margin-bottom:8px;
          color:#3B1A08;
          font-weight:600;
        }

        .input-group input{
          width:100%;
          padding:15px;
          border:1px solid #D7C6B7;
          border-radius:12px;
          font-size:15px;
          background:white;
          outline:none;
          transition:.3s;
        }

        .input-group input:focus{
          border-color:#C4956A;
          box-shadow:0 0 0 3px rgba(196,149,106,.18);
        }

        .forgot{
          text-align:right;
          margin-bottom:25px;
        }

        .forgot a{
          color:#8A5A32;
          text-decoration:none;
          font-size:14px;
        }

        .submit-btn{
          width:100%;
          padding:16px;
          border:none;
          border-radius:14px;
          background:#3B1A08;
          color:white;
          font-size:16px;
          font-weight:600;
          cursor:pointer;
          transition:.3s;
        }

        .submit-btn:hover{
          background:#C4956A;
          color:#3B1A08;
        }

        .divider{
          text-align:center;
          margin:25px 0;
          color:#888;
        }

        .google-btn{
          width:100%;
          padding:14px;
          border-radius:14px;
          border:1px solid #ddd;
          background:white;
          cursor:pointer;
          font-weight:600;
          transition:.3s;
        }

        .google-btn:hover{
          background:#f8f8f8;
        }

        .switch{
          text-align:center;
          margin-top:25px;
          color:#666;
        }

        .switch span{
          color:#8A5A32;
          font-weight:600;
          cursor:pointer;
        }
      `}</style>

      <div className="login-page">

        <div className="login-card">

          <div className="logo">
            Brewed.
          </div>

          <div className="subtitle">
            {isLogin
              ? "Welcome back. Sign in to continue."
              : "Create your Brewed account."}
          </div>

          {!isLogin && (
            <div className="input-group">
              <label>Full Name</label>
              <input type="text" placeholder="John Doe" />
            </div>
          )}

          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
            />
          </div>

          {isLogin && (
            <div className="forgot">
              <a href="#">Forgot Password?</a>
            </div>
          )}

          <button className="submit-btn">
            {isLogin ? "Login" : "Create Account"}
          </button>

          <div className="divider">
            OR
          </div>

          <button className="google-btn">
            Continue with Google
          </button>

          <div className="switch">
            {isLogin ? (
              <>
                Don't have an account?{" "}
                <span onClick={() => setIsLogin(false)}>
                  Sign Up
                </span>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <span onClick={() => setIsLogin(true)}>
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
