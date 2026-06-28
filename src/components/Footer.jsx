export default function Footer() {
  return (
    <>
      <style>{`
        .footer {
          background: #1A0A00;
          border-top: 1px solid #3B1A08;
          padding: 3rem 2rem 1.5rem;
          font-family: 'Inter', sans-serif;
        }
        .footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 2.5rem;
          max-width: 1200px;
          margin: 0 auto 2.5rem;
        }
        .footer-brand-name {
          font-family: 'Playfair Display', serif;
          font-size: 1.5rem;
          color: #C4956A;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }
        .footer-tagline {
          font-size: 0.85rem;
          color: #7A6658;
          line-height: 1.6;
          margin-bottom: 1.25rem;
        }
        .footer-socials {
          display: flex;
          gap: 0.65rem;
        }
        .social-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: #2C1205;
          border: 1px solid #3B1A08;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.2s;
        }
        .social-btn:hover { background: #3B1A08; }
        .footer-col-title {
          font-family: 'Playfair Display', serif;
          font-size: 0.95rem;
          color: #C4956A;
          margin-bottom: 1rem;
          font-weight: 600;
        }
        .footer-link {
          display: block;
          font-size: 0.83rem;
          color: #7A6658;
          text-decoration: none;
          margin-bottom: 0.6rem;
          cursor: pointer;
          transition: color 0.2s;
        }
        .footer-link:hover { color: #C4956A; }
        .footer-info-row {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          margin-bottom: 0.65rem;
        }
        .footer-info-icon { font-size: 0.9rem; margin-top: 1px; }
        .footer-info-text {
          font-size: 0.83rem;
          color: #7A6658;
          line-height: 1.5;
        }
        .footer-divider {
          border: none;
          border-top: 1px solid #2C1205;
          max-width: 1200px;
          margin: 0 auto 1.5rem;
        }
        .footer-bottom {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .footer-copyright {
          font-size: 0.78rem;
          color: #4A3428;
        }
        .footer-payment-icons {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
        .payment-badge {
          background: #2C1205;
          border: 1px solid #3B1A08;
          border-radius: 6px;
          padding: 0.25rem 0.6rem;
          font-size: 0.72rem;
          color: #7A6658;
          font-weight: 600;
          letter-spacing: 0.03em;
        }
        .footer-legal {
          display: flex;
          gap: 1.25rem;
        }
        .footer-legal a {
          font-size: 0.75rem;
          color: #4A3428;
          text-decoration: none;
        }
        .footer-legal a:hover { color: #7A6658; }
        @media (max-width: 900px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
          }
        }
        @media (max-width: 540px) {
          .footer {
            padding: 2rem 1.25rem 1.25rem;
          }
          .footer-grid {
            grid-template-columns: 1fr;
            gap: 1.75rem;
          }
          .footer-bottom {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
          .footer-legal {
            gap: 1rem;
          }
        }
      `}</style>

      <footer className="footer">
        <div className="footer-grid">

          {/* Brand */}
          <div>
            <div className="footer-brand-name">☕ Brewed</div>
            <p className="footer-tagline">
              Every cup brewed with love and intention.<br />
              Specialty coffee, fresh bakes, served with soul — right here in Kolkata.
            </p>
            <div className="footer-socials">
              <a className="social-btn" href="https://instagram.com" target="_blank" rel="noreferrer" title="Instagram">📸</a>
              <a className="social-btn" href="https://facebook.com" target="_blank" rel="noreferrer" title="Facebook">👤</a>
              <a className="social-btn" href="https://twitter.com" target="_blank" rel="noreferrer" title="Twitter/X">🐦</a>
              <a className="social-btn" href="https://wa.me/" target="_blank" rel="noreferrer" title="WhatsApp">💬</a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <div className="footer-col-title">Quick Links</div>
            <a className="footer-link">Menu</a>
            <a className="footer-link">Cart</a>
            <a className="footer-link">Our Story</a>
            <a className="footer-link">Loyalty Program ⭐</a>
            <a className="footer-link">Catering</a>
          </div>

          {/* Hours */}
          <div>
            <div className="footer-col-title">Opening Hours</div>
            <div className="footer-info-row">
              <span className="footer-info-icon">🕐</span>
              <span className="footer-info-text">Mon – Fri<br />7:00 AM – 10:00 PM</span>
            </div>
            <div className="footer-info-row">
              <span className="footer-info-icon">🕐</span>
              <span className="footer-info-text">Sat – Sun<br />8:00 AM – 11:00 PM</span>
            </div>
            <div className="footer-info-row">
              <span className="footer-info-icon">⭐</span>
              <span className="footer-info-text">Buy 9 coffees,<br />get 1 free!</span>
            </div>
          </div>

          {/* Contact */}
          <div>
            <div className="footer-col-title">Find Us</div>
            <div className="footer-info-row">
              <span className="footer-info-icon">📍</span>
              <span className="footer-info-text">123 Park Street,<br />Kolkata, WB 700016</span>
            </div>
            <div className="footer-info-row">
              <span className="footer-info-icon">📞</span>
              <span className="footer-info-text">+91 98300 00000</span>
            </div>
            <div className="footer-info-row">
              <span className="footer-info-icon">📧</span>
              <span className="footer-info-text">hello@brewed.in</span>
            </div>
            <div className="footer-info-row">
              <span className="footer-info-icon">🗺️</span>
              <a className="footer-info-text" href="https://maps.google.com" target="_blank" rel="noreferrer" style={{ color: "#C4956A", textDecoration: "none" }}>
                Get Directions →
              </a>
            </div>
          </div>

        </div>

        <hr className="footer-divider" />

        <div className="footer-bottom">
          <p className="footer-copyright">© 2024 Brewed. All rights reserved.</p>
          <div className="footer-payment-icons">
            <span className="payment-badge">VISA</span>
            <span className="payment-badge">Mastercard</span>
            <span className="payment-badge">UPI</span>
            <span className="payment-badge">🔒 Stripe</span>
          </div>
          <div className="footer-legal">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Use</a>
            <a href="#">Refunds</a>
          </div>
        </div>

      </footer>
    </>
  );
}