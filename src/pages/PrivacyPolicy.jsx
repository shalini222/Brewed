import React from "react";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage({ setPage }) {
  return (
    <>
      <style>{`
        .privacy-page{
          min-height:100vh;
          background:#FDFAF5;
          padding:32px 18px 80px;
          font-family:'Inter',sans-serif;
        }

        .privacy-container{
          max-width:850px;
          margin:auto;
        }

        .back-btn{
          display:flex;
          align-items:center;
          gap:8px;
          background:none;
          border:none;
          color:#3B1A08;
          cursor:pointer;
          font-weight:600;
          margin-bottom:28px;
        }

        .title{
          font-family:'Playfair Display',serif;
          color:#1A0A00;
          font-size:2.4rem;
          margin-bottom:10px;
        }

        .updated{
          color:#7A6658;
          margin-bottom:35px;
        }

        .card{
          background:#fff;
          border:1px solid rgba(196,149,106,.15);
          border-radius:22px;
          padding:28px;
          margin-bottom:22px;
        }

        .section-title{
          font-family:'Playfair Display',serif;
          color:#1A0A00;
          font-size:1.3rem;
          margin-bottom:14px;
        }

        .text{
          color:#5D4B3E;
          line-height:1.8;
          font-size:.95rem;
        }

        ul{
          padding-left:18px;
          color:#5D4B3E;
          line-height:1.8;
        }

        @media(max-width:600px){

          .title{
            font-size:2rem;
          }

          .card{
            padding:22px;
          }

        }
      `}</style>

      <div className="privacy-page">
        <div className="privacy-container">

          <button
            className="back-btn"
            onClick={() => setPage("settings")}
          >
            <ArrowLeft size={18}/>
            Back
          </button>

          <h1 className="title">
            Privacy Policy
          </h1>

          <p className="updated">
            Last updated: July 2026
          </p>

          <div className="card">
            <h2 className="section-title">Overview</h2>

            <p className="text">
              Brewed values your privacy. We collect only the information
              necessary to process your orders, manage your account,
              personalize your experience and improve our services.
            </p>
          </div>

          <div className="card">
            <h2 className="section-title">
              Information We Collect
            </h2>

            <ul>
              <li>Name and email address</li>
              <li>Phone number</li>
              <li>Delivery addresses</li>
              <li>Order history</li>
              <li>Rewards & loyalty information</li>
              <li>Device information used to improve app performance</li>
            </ul>
          </div>

          <div className="card">
            <h2 className="section-title">
              How We Use Your Information
            </h2>

            <ul>
              <li>Deliver your orders</li>
              <li>Process secure payments</li>
              <li>Send order updates</li>
              <li>Provide customer support</li>
              <li>Improve Brewed's experience</li>
            </ul>
          </div>

          <div className="card">
            <h2 className="section-title">
              Data Security
            </h2>

            <p className="text">
              Your information is stored securely using trusted cloud
              infrastructure. We never sell your personal information to
              third parties.
            </p>
          </div>

          <div className="card">
            <h2 className="section-title">
              Your Rights
            </h2>

            <ul>
              <li>Access your personal information</li>
              <li>Request corrections</li>
              <li>Delete your account</li>
              <li>Manage notification preferences</li>
            </ul>
          </div>

          <div className="card">
            <h2 className="section-title">
              Contact Us
            </h2>

            <p className="text">
              Questions regarding this Privacy Policy can be sent to:
              <br /><br />
              privacy@brewedcoffee.in
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
