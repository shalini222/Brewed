export default function Footer() {
  return (
    <>
      <style>{`
        .footer {
          /* Fades from absolute velvet black into your rich espresso tone */
          background: linear-gradient(to bottom, #0A0400 0%, #1A0A00 100%);
          border-top: 1px solid rgba(196, 149, 106, 0.12);
          padding: 6rem 2.5rem 3rem 2.5rem;
          font-family: 'Inter', sans-serif;
          letter-spacing: -0.01em;
        }
        
        .footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1.2fr 1.2fr;
          gap: 4rem;
          max-width: 1200px;
          margin: 0 auto 5rem;
        }
        
        .footer-brand-name {
          font-family: 'Playfair Display', serif;
          font-size: 1.75rem;
          color: #FDFAF5; /* Crisp cream white */
          font-weight: 700;
          margin-bottom: 1rem;
          letter-spacing: -0.02em;
        }

        .footer-brand-name span {
          color: #C4956A; /* Caramel punctuation accent */
        }
        
        .footer-tagline {
          font-size: 0.88rem;
          color: rgba(253, 250, 245, 0.55); /* Sophisticated low-opacity text */
          line-height: 1.75;
          margin-bottom: 2rem;
          max-width: 340px;
        }
        
        .footer-socials {
          display: flex;
          gap: 1rem;
        }
        
        .social-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(253, 250, 245, 0.02);
          border: 1px solid rgba(196, 149, 106, 0.15);
          color: rgba(253, 250, 245, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        .social-btn:hover { 
          background: #FDFAF5; 
          color: #1A0A00;
          border-color: #FDFAF5;
          transform: translateY(-3px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4);
        }
        
        .footer-col-title {
          font-family: 'Inter', sans-serif;
          font-size: 0.72rem;
          color: #C4956A; /* Elegant caramel label colors */
          margin-bottom: 1.5rem;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }
        
        .footer-link {
          display: block;
          font-size: 0.85rem;
          color: rgba(253, 250, 245, 0.5);
          text-decoration: none;
          margin-bottom: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .footer-link:hover { 
          color: #FDFAF5;
          transform: translateX(3px);
        }
        
        .footer-info-row {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 1.1rem;
        }
        
        .footer-info-text {
          font-size: 0.85rem;
          color: rgba(253, 250, 245, 0.5);
          line-height: 1.7;
        }
        
        .footer-divider {
          border: none;
          border-top: 1px solid rgba(253, 250, 245, 0.05);
          max-width: 1200px;
          margin: 0 auto 2.5rem;
        }
        
        .footer-bottom {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 2rem;
        }
        
        .footer-copyright {
          font-size: 0.8rem;
          color: rgba(253, 250, 245, 0.3);
        }
        
        .footer-payment-icons {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }
        
        .payment-badge {
          font-family: 'Inter', sans-serif;
          font-size: 0.62rem;
          color: rgba(253, 250, 245, 0.35);
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          border: 1px solid rgba(253, 250, 245, 0.08);
          padding: 0.25rem 0.6rem;
          border-radius: 4px;
          background: rgba(253, 250, 245, 0.01);
        }
        
        .footer-legal {
          display: flex;
          gap: 2rem;
        }
        
        .footer-legal a {
          font-size: 0.8rem;
          color: rgba(253, 250, 245, 0.3);
          text-decoration: none;
          transition: color 0.2s ease;
        }
        
        .footer-legal a:hover { 
          color: #C4956A; 
        }
        
        @media (max-width: 992px) {
          .footer-grid {
            grid-template-columns: 1.2fr 1fr;
            gap: 3.5rem;
          }
        }
        
        @media (max-width: 576px) {
          .footer {
            padding: 5rem 1.5rem 2.5rem;
          }
          .footer-grid {
            grid-template-columns: 1fr;
            gap: 2.5rem;
          }
          .footer-bottom {
            flex-direction: column-reverse;
            align-items: flex-start;
            gap: 1.5rem;
          }
          .footer-legal {
            width: 100%;
            justify-content: flex-start;
            gap: 1.5rem;
          }
        }
      `}</style>

      <footer className="footer">
        <div className="footer-grid">

          {/* Brand Column */}
          <div>
            <div className="footer-brand-name">Brewed<span>.</span></div>
            <p className="footer-tagline">
              Specialty coffee, fresh bakes, and curated architectural café environments served daily with soul in Kolkata.
            </p>
            <div className="footer-socials">
              <a className="social-btn" href="https://instagram.com" target="_blank" rel="noreferrer" title="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
              </a>
              <a className="social-btn" href="https://facebook.com" target="_blank" rel="noreferrer" title="Facebook">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a className="social-btn" href="https://twitter.com" target="_blank" rel="noreferrer" title="Twitter/X">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/></svg>
              </a>
            </div>
          </div>

          {/* Navigation Column */}
          <div>
            <div className="footer-col-title">Explore</div>
            <a className="footer-link">Menu</a>
            <a className="footer-link">Our Story</a>
            <a className="footer-link">Cafés</a>
            <a className="footer-link">Journal</a>
          </div>

          {/* Hours Column */}
          <div>
            <div className="footer-col-title">Opening Hours</div>
            <div className="footer-info-row">
              <div className="footer-info-text">
                Weekday<br />
                <span style={{ color: '#FDFAF5' }}>7:00 AM – 10:00 PM</span>
              </div>
            </div>
            <div className="footer-info-row">
              <div className="footer-info-text">
                Weekend<br />
                <span style={{ color: '#FDFAF5' }}>8:00 AM – 11:00 PM</span>
              </div>
            </div>
          </div>

          {/* Contact/Location Column */}
          <div>
            <div className="footer-col-title">Location</div>
            <div className="footer-info-row">
              <div className="footer-info-text">
                123 Park Street,<br />Kolkata, WB 700016
              </div>
            </div>
            <div className="footer-info-row" style={{ marginTop: '0.4rem' }}>
              <a className="footer-info-text" href="https://maps.google.com" target="_blank" rel="noreferrer" style={{ color: "#C4956A", textDecoration: "none", fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.04em' }}>
                View Map Layout →
              </a>
            </div>
          </div>

        </div>

        <hr className="footer-divider" />

        <div className="footer-bottom">
          <p className="footer-copyright">© 2026 Brewed. Crafted with absolute intention.</p>
          
          <div className="footer-payment-icons">
            <span className="payment-badge">Visa</span>
            <span className="payment-badge">MC</span>
            <span className="payment-badge">UPI</span>
            <span className="payment-badge">Stripe</span>
          </div>
          
          <div className="footer-legal">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Refunds</a>
          </div>
        </div>

      </footer>
    </>
  );
}
