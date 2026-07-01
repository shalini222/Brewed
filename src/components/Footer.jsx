export default function Footer() {
  return (
    <>
      <style>{`
        .footer {
          /* Smooth velvet transitions into rich espresso */
          background: linear-gradient(to bottom, #070300 0%, #160900 100%);
          border-top: 1px solid rgba(196, 149, 106, 0.08);
          padding: 7rem 3rem 3rem;
          font-family: 'Inter', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .footer-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        /* Hero Header inside the footer */
        .footer-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-bottom: 1px solid rgba(253, 250, 245, 0.05);
          padding-bottom: 3.5rem;
          margin-bottom: 4rem;
        }

        .footer-brand-name {
          font-family: 'Playfair Display', serif;
          font-size: 2.2rem;
          color: #FDFAF5;
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1;
        }

        .footer-brand-name span {
          color: #C4956A;
        }

        .footer-hero-tagline {
          font-size: 0.9rem;
          color: rgba(253, 250, 245, 0.4);
          max-width: 320px;
          line-height: 1.6;
          text-align: right;
        }

        /* Editorial column breakdown */
        .footer-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1fr;
          gap: 4rem;
          margin-bottom: 6rem;
        }

        .footer-col-num {
          font-size: 0.65rem;
          font-weight: 600;
          color: #C4956A;
          display: block;
          margin-bottom: 1.25rem;
          letter-spacing: 0.05em;
          opacity: 0.7;
        }

        .footer-col-title {
          font-size: 0.72rem;
          color: #FDFAF5;
          margin-bottom: 2rem;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .footer-link {
          display: block;
          font-size: 0.85rem;
          color: rgba(253, 250, 245, 0.45);
          text-decoration: none;
          margin-bottom: 1rem;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .footer-link:hover {
          color: #C4956A;
          transform: translateX(4px);
        }

        .footer-info-block {
          margin-bottom: 1.25rem;
        }

        .footer-info-label {
          font-size: 0.68rem;
          color: rgba(253, 250, 245, 0.3);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 0.25rem;
          display: block;
        }

        .footer-info-value {
          font-size: 0.88rem;
          color: rgba(253, 250, 245, 0.6);
          line-height: 1.6;
        }

        .footer-social-row {
          display: flex;
          gap: 1.5rem;
          margin-top: 1.5rem;
        }

        .social-link-minimal {
          font-size: 0.75rem;
          color: rgba(253, 250, 245, 0.4);
          text-decoration: none;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-weight: 600;
          transition: color 0.2s ease;
        }

        .social-link-minimal:hover {
          color: #FDFAF5;
        }

        /* Fine-line base layer */
        .footer-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid rgba(253, 250, 245, 0.03);
          padding-top: 2.5rem;
          flex-wrap: wrap;
          gap: 2rem;
        }

        .footer-copyright {
          font-size: 0.78rem;
          color: rgba(253, 250, 245, 0.25);
          letter-spacing: 0.02em;
        }

        .footer-legal {
          display: flex;
          gap: 2.5rem;
        }

        .footer-legal a {
          font-size: 0.78rem;
          color: rgba(253, 250, 245, 0.25);
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .footer-legal a:hover {
          color: #C4956A;
        }

        @media (max-width: 992px) {
          .footer-hero {
            flex-direction: column;
            align-items: flex-start;
            gap: 1.5rem;
          }
          .footer-hero-tagline {
            text-align: left;
          }
          .footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 3rem;
          }
        }

        @media (max-width: 576px) {
          .footer {
            padding: 5rem 2rem 3rem;
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
            gap: 1.5rem;
          }
        }
      `}</style>

      <footer className="footer">
        <div className="footer-container">
          
          {/* Typographic Identity Section */}
          <div className="footer-hero">
            <div className="footer-brand-name">Brewed<span>.</span></div>
            <p className="footer-hero-tagline">
              Architectural coffee environments, meticulously extracted origins, and baked goods created with deliberate intention.
            </p>
          </div>

          {/* Master Grid Setup */}
          <div className="footer-grid">

            {/* Column 01: Dialogue */}
            <div>
              <span className="footer-col-num">01 / CONNECTION</span>
              <div className="footer-col-title">Dialogue</div>
              <div className="footer-info-block">
                <span className="footer-info-label">Inquiries</span>
                <div className="footer-info-value">hello@brewed.in</div>
              </div>
              <div className="footer-info-block">
                <span className="footer-info-label">Telephone</span>
                <div className="footer-info-value">+91 98300 00000</div>
              </div>
              <div className="footer-social-row">
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="social-link-minimal">IG</a>
                <a href="https://facebook.com" target="_blank" rel="noreferrer" className="social-link-minimal">FB</a>
                <a href="https://twitter.com" target="_blank" rel="noreferrer" className="social-link-minimal">X</a>
              </div>
            </div>

            {/* Column 02: Index */}
            <div>
              <span className="footer-col-num">02 / INDEX</span>
              <div className="footer-col-title">Navigation</div>
              <a className="footer-link">The Espresso Menu</a>
              <a className="footer-link">Our Heritage Story</a>
              <a className="footer-link">Roastery Locations</a>
              <a className="footer-link">The Coffee Journal</a>
            </div>

            {/* Column 03: Presence */}
            <div>
              <span className="footer-col-num">03 / PRESENCE</span>
              <div className="footer-col-title">Location</div>
              <div className="footer-info-block">
                <span className="footer-info-label">Address</span>
                <div className="footer-info-value">
                  123 Park Street,<br />
                  Kolkata, WB 700016
                </div>
              </div>
              <a href="https://maps.google.com" target="_blank" rel="noreferrer" className="footer-link" style={{ color: '#C4956A', marginTop: '1rem', display: 'inline-block' }}>
                Open Digital Map →
              </a>
            </div>

            {/* Column 04: Operating Availability */}
            <div>
              <span className="footer-col-num">04 / CHRONOLOGY</span>
              <div className="footer-col-title">Availability</div>
              <div className="footer-info-block">
                <span className="footer-info-label">Monday through Friday</span>
                <div className="footer-info-value">07:00 – 22:00</div>
              </div>
              <div className="footer-info-block">
                <span className="footer-info-label">Saturday & Sunday</span>
                <div className="footer-info-value">08:00 – 23:00</div>
              </div>
            </div>

          </div>

          {/* Micro Footer Base */}
          <div className="footer-bottom">
            <p className="footer-copyright">
              © 2026 Brewed International. All privileges reserved. Crafted with absolute devotion.
            </p>
            <div className="footer-legal">
              <a href="#">Privacy Framework</a>
              <a href="#">Terms of Service</a>
              <a href="#">Fulfillment & Refunds</a>
            </div>
          </div>

        </div>
      </footer>
    </>
  );
}
