import React from "react";
import { ArrowLeft } from "lucide-react";

export default function TermsPage({ setPage }) {
  return (
    <>
      <style>{`
        .terms-page{
          min-height:100vh;
          background:#FDFAF5;
          padding:32px 18px 80px;
          font-family:'Inter',sans-serif;
        }

        .terms-container{
          max-width:850px;
          margin:auto;
        }

        .back-btn{
          display:flex;
          align-items:center;
          gap:8px;
          border:none;
          background:none;
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

      <div className="terms-page">
        <div className="terms-container">

          <button
            className="back-btn"
            onClick={() => setPage("settings")}
          >
            <ArrowLeft size={18}/>
            Back
          </button>

          <h1 className="title">Terms & Conditions</h1>

          <p className="updated">
            Last updated: July 2026
          </p>

          <div className="card">
            <h2 className="section-title">Acceptance of Terms</h2>

            <p className="text">
              By creating an account or placing an order through Brewed,
              you agree to these Terms & Conditions.
            </p>
          </div>

          <div className="card">
            <h2 className="section-title">Orders</h2>

            <ul>
              <li>Orders are subject to product availability.</li>
              <li>Please review your order before confirming payment.</li>
              <li>Once preparation begins, modifications may not be possible.</li>
            </ul>
          </div>

          <div className="card">
            <h2 className="section-title">Payments</h2>

            <ul>
              <li>All payments are processed securely.</li>
              <li>Prices include applicable taxes unless stated otherwise.</li>
              <li>Refunds follow Brewed's refund policy.</li>
            </ul>
          </div>

          <div className="card">
            <h2 className="section-title">Delivery</h2>

            <ul>
              <li>Delivery times are estimates only.</li>
              <li>Unexpected delays may occur due to weather or traffic.</li>
              <li>Please provide accurate delivery information.</li>
            </ul>
          </div>

          <div className="card">
            <h2 className="section-title">User Responsibilities</h2>

            <ul>
              <li>Keep your account information accurate.</li>
              <li>Do not misuse or interfere with the app.</li>
              <li>Protect your login credentials.</li>
            </ul>
          </div>

          <div className="card">
            <h2 className="section-title">Limitation of Liability</h2>

            <p className="text">
              Brewed is not liable for indirect losses, delays beyond our
              reasonable control, or issues caused by incorrect customer
              information.
            </p>
          </div>

          <div className="card">
            <h2 className="section-title">Contact</h2>

            <p className="text">
              For questions regarding these Terms & Conditions:
              <br /><br />
              legal@brewedcoffee.in
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
