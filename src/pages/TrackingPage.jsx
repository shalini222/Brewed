import React, { useState, useEffect } from "react";

const THEME = {
  colors: {
    bgPage: "#FAF6F0",       
    headerBg: "#1A0B05",     
    cardBg: "#FFFFFF",       
    cardBorder: "#E6DFD5",   
    primary: "#C4956A",      
    textDark: "#1A0B05",     
    textMuted: "#70645C",    
    success: "#4A7A5B",
    error: "#BA3C3C", 
    accentLight: "#FAF9F6"
  },
  fonts: {
    serif: "'Playfair Display', serif",
    sans: "'Inter', sans-serif"
  }
};

const STEPS = [
  { id: 1, label: "Order Placed", desc: "We have received your coffee order.", icon: "📝" },
  { id: 2, label: "Brewing", desc: "Our barista is crafting your beverage.", icon: "☕" },
  { id: 3, label: "Out for Delivery", desc: "Your rider is heading your way.", icon: "🛵" },
  { id: 4, label: "Delivery Failed", desc: "We encountered an issue with your delivery.", icon: "❌" }
];

export default function TrackingPage({ setPage, orderSnapshot }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [estimatedTime, setEstimatedTime] = useState(25);
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1100);
  const [copied, setCopied] = useState(false);
  const [selectedTip, setSelectedTip] = useState(null);

  useEffect(() => {
    if (!orderSnapshot) {
      setPage("menu");
    }
  }, [orderSnapshot, setPage]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!orderSnapshot || currentStep >= STEPS.length) return;
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        setEstimatedTime((time) => Math.max(0, time - 7));
        return prev + 1;
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [currentStep, orderSnapshot]);

  if (!orderSnapshot) return null;

  const isMobile = windowWidth <= 880;
  const isFailed = currentStep === 4;
  const rawId = orderSnapshot?.id ? orderSnapshot.id.toString() : "938402";
  const displayId = rawId.startsWith("BRW-") ? rawId : `#BRW-${rawId.slice(-6)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(displayId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadReceipt = () => {
    alert("Downloading your receipt...");
  };

  const handleReorder = () => {
    setPage("menu");
  };

  const handleContactSupport = () => {
    alert("Connecting you with support...");
  };

  const handleTryAgain = () => {
    alert("Applying 10% discount and redirecting to checkout...");
    setPage("menu");
  };

  return (
    <div style={{ ...styles.page, backgroundColor: THEME.colors.bgPage, padding: isMobile ? "1.5rem 1rem" : "3rem 0" }}>
      <style>{`
        .pulse-container { position: relative; display: flex; align-items: center; justify-content: center; }
        .pulse-ring {
          position: absolute;
          width: 45px;
          height: 45px;
          border: 2px solid ${THEME.colors.primary};
          border-radius: 50%;
          animation: pulseExpand 2s infinite ease-out;
          opacity: 0;
        }
        @keyframes pulseExpand {
          0% { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        .layout-grid { 
          display: flex; 
          gap: 2rem; 
          flex-direction: ${isMobile ? "column" : "row"}; 
          max-width: 940px; 
          margin: 0 auto; 
        }
        .main-panel { flex: 1; width: 100%; }
        .side-panel { width: ${isMobile ? "100%" : "320px"}; display: flex; flex-direction: column; gap: 1.5rem; }
        .interactive-card { 
          background: ${THEME.colors.cardBg}; 
          border-radius: 16px; 
          padding: ${isMobile ? "1.25rem" : "1.75rem"}; 
          border: 1px solid ${THEME.colors.cardBorder}; 
          box-shadow: 0 4px 24px rgba(26, 11, 5, 0.02);
          box-sizing: border-box;
        }
        .btn-action {
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s;
          cursor: pointer;
        }
        .btn-action:hover {
          transform: translateY(-2px);
          opacity: 0.9;
        }
        .copy-btn {
          background: none;
          border: none;
          cursor: pointer;
          margin-left: 0.75rem; 
          padding: 0.25rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: ${THEME.colors.textMuted};
          transition: transform 0.1s, color 0.2s;
        }
        .copy-btn:hover {
          color: ${THEME.colors.primary};
        }
        .copy-btn:active {
          transform: scale(0.9);
        }
        .tip-pill {
          flex: 1;
          padding: 0.5rem;
          border: 1.5px solid ${THEME.colors.cardBorder};
          border-radius: 8px;
          background: transparent;
          color: ${THEME.colors.textDark};
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          text-align: center;
        }
        .tip-pill:hover {
          transform: translateY(-2px);
          border-color: ${THEME.colors.primary};
          background-color: ${THEME.colors.accentLight};
        }
        .tip-pill.active {
          background-color: ${THEME.colors.headerBg} !important;
          border-color: ${THEME.colors.headerBg};
          color: #FFF;
        }
        .receipt-link {
          background: none;
          border: none;
          color: ${THEME.colors.primary};
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          margin: 1rem auto 0 auto;
          transition: opacity 0.2s;
        }
        .receipt-link:hover {
          opacity: 0.8;
          text-decoration: underline;
        }
        .reorder-btn-inner {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
      `}</style>

      <div style={{ maxWidth: "940px", margin: "0 auto" }}>
        <button style={styles.backLink} onClick={() => setPage("menu")}>← Return to Menu</button>
        <h1 style={styles.heading}>Track Your Order</h1>

        <div className="layout-grid">
          {/* Main Status Panel */}
          <div className="main-panel">
            <div className="interactive-card">
              <div style={styles.etaHeader}>
                <div>
                  <p style={styles.etaLabel}>Status Updates</p>
                  <h2 style={{...styles.etaTime, color: isFailed ? THEME.colors.error : THEME.colors.textDark }}>
                    {isFailed ? "Delivery Failed" : `${estimatedTime} mins`}
                  </h2>
                </div>
                <div className="pulse-container" style={{ width: 50, height: 50 }}>
                  {!isFailed && <div className="pulse-ring" />}
                  <span style={{ fontSize: "2rem", zIndex: 2 }}>
                    {STEPS[currentStep - 1]?.icon || "☕"}
                  </span>
                </div>
              </div>

              {/* Progress Line Tracker */}
              <div style={styles.timeline}>
                {STEPS.map((step, index) => {
                  const isCompleted = currentStep > step.id;
                  const isActive = currentStep === step.id;
                  const isFailedStep = step.id === 4 && isActive;
                  
                  return (
                    <div key={step.id} style={styles.stepRow}>
                      <div style={styles.iconColumn}>
                        <div style={{
                          ...styles.dot,
                          backgroundColor: isFailedStep ? THEME.colors.error : (isCompleted || isActive ? THEME.colors.success : THEME.colors.cardBorder),
                          border: isActive && !isFailedStep ? `3px solid ${THEME.colors.primary}` : "none",
                          boxShadow: isActive && !isFailedStep ? `0 0 10px ${THEME.colors.primary}` : "none"
                        }}>
                          {isCompleted && <span style={{ color: "#FFF", fontSize: "0.65rem", fontWeight: "bold" }}>✓</span>}
                          {isFailedStep && <span style={{ color: "#FFF", fontSize: "0.65rem", fontWeight: "bold" }}>✕</span>}
                        </div>
                        {index < STEPS.length - 1 && (
                          <div style={{
                            ...styles.connector,
                            backgroundColor: isCompleted ? THEME.colors.success : THEME.colors.cardBorder
                          }} />
                        )}
                      </div>
                      
                      <div style={{ ...styles.stepContent, opacity: isActive || isCompleted ? 1 : 0.4 }}>
                        <h4 style={{ 
                          ...styles.stepTitle, 
                          fontWeight: isActive ? "700" : "500", 
                          color: isFailedStep ? THEME.colors.error : (isActive ? THEME.colors.primary : THEME.colors.textDark) 
                        }}>
                          {step.label}
                        </h4>
                        <p style={styles.stepDesc}>{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar Panel */}
          <div className="side-panel">
            
            {/* Box A: Moves to top on failure, now tracking Order ID context */}
            {isFailed && (
              <div className="interactive-card" style={{ backgroundColor: THEME.colors.accentLight }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: "0.75rem" }}>
                  <p style={styles.orderId}>ID: {displayId}</p>
                  
                  <button onClick={handleCopy} className="copy-btn" title="Copy Order ID">
                    {copied ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: THEME.colors.success }}>
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    )}
                  </button>
                </div>
                <div style={styles.failedBadgeFull}>Delivery Failed</div>
              </div>
            )}

            {/* Box B: Actionable context box (Support/Try again vs Partner info) */}
            <div className="interactive-card">
              {isFailed ? (
                <>
                  <h3 style={styles.sectionTitle}>Order Update</h3>
                  <p style={styles.failureMessage}>Your order ran into an issue. We're on it.</p>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1.25rem" }}>
                    <button className="btn-action" style={styles.tryAgainBtn} onClick={handleTryAgain}>
                      Try Again: 10% Off
                    </button>
                    <button className="btn-action" style={styles.supportBtn} onClick={handleContactSupport}>
                      Contact Support
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 style={styles.sectionTitle}>Delivery Partner</h3>
                  <div style={styles.riderProfile}>
                    <div style={styles.avatar}>🛵</div>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: "0.95rem" }}>Rahul Kumar</strong>
                      <p style={{ margin: "0.15rem 0 0", fontSize: "0.8rem", color: THEME.colors.textMuted }}>Brewed Delivery Partner</p>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem" }}>
                    <a href="tel:#" className="btn-action" style={styles.commsBtn}>📞 Call</a>
                    <a href="sms:#" className="btn-action" style={styles.commsBtn}>💬 Text</a>
                  </div>

                  <div style={{ borderTop: `1px solid ${THEME.colors.cardBorder}`, paddingTop: "1rem" }}>
                    <p style={{ ...styles.etaLabel, marginBottom: "0.5rem", fontWeight: "600" }}>Thank your partner with a tip</p>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {[20, 30, 50].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => setSelectedTip(selectedTip === amount ? null : amount)}
                          className={`tip-pill ${selectedTip === amount ? "active" : ""}`}
                        >
                          ₹{amount}
                        </button>
                      ))}
                    </div>
                    {selectedTip && (
                      <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: THEME.colors.success, fontWeight: "500" }}>
                        ₹{selectedTip} will be added to your delivery partner's profile!
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Box A Alternative: Standard view container */}
            {!isFailed && (
              <div className="interactive-card" style={{ backgroundColor: THEME.colors.accentLight }}>
                <h3 style={styles.sectionTitle}>Order Information</h3>
                <div style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem" }}>
                  <p style={styles.orderId}>ID: {displayId}</p>
                  
                  <button onClick={handleCopy} className="copy-btn" title="Copy Order ID">
                    {copied ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: THEME.colors.success }}>
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    )}
                  </button>
                </div>
                
                <div style={{ borderTop: `1px solid ${THEME.colors.cardBorder}`, margin: "0.75rem 0" }} />
                
                <div style={styles.summarySummary}>
                  <span>Payment Mode:</span>
                  <span style={{ fontWeight: "600" }}>{orderSnapshot?.method === "cod" ? "COD (Cash/QR)" : "Paid Online"}</span>
                </div>
                
                <div style={styles.summarySummary}>
                  <span>Amount Paid:</span>
                  <span style={{ fontWeight: "600" }}>₹{(orderSnapshot?.calculations?.grandTotal || 0) + (selectedTip || 0)}</span>
                </div>

                <div style={{ marginTop: "1.25rem" }}>
                  <button className="btn-action" style={styles.reorderSecondaryBtn} onClick={handleReorder}>
                    <span className="reorder-btn-inner">
                      Order Something Else
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                      </svg>
                    </span>
                  </button>

                  <button className="receipt-link" onClick={handleDownloadReceipt}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download Receipt
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "85vh", boxSizing: "border-box", fontFamily: THEME.fonts.sans, color: THEME.colors.textDark },
  container: { maxWidth: "940px", margin: "0 auto" },
  backLink: { background: "none", border: "none", color: THEME.colors.textMuted, cursor: "pointer", fontSize: "0.9rem", padding: 0, marginBottom: "0.5rem" },
  heading: { fontFamily: THEME.fonts.serif, fontSize: "2.2rem", color: THEME.colors.textDark, margin: "0 0 2rem 0", fontWeight: "normal" },
  etaHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", borderBottom: `1px solid ${THEME.colors.cardBorder}`, paddingBottom: "1.25rem" },
  etaLabel: { margin: 0, fontSize: "0.85rem", color: THEME.colors.textMuted, fontWeight: "500" },
  etaTime: { margin: "0.2rem 0 0 0", fontFamily: THEME.fonts.serif, fontSize: "2rem", color: THEME.colors.textDark, transition: "color 0.3s ease" },
  timeline: { display: "flex", flexDirection: "column" },
  stepRow: { display: "flex", gap: "1.25rem", minHeight: "75px" },
  iconColumn: { display: "flex", flexDirection: "column", alignItems: "center" },
  dot: { width: "16px", height: "16px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2, boxSizing: "border-box" },
  connector: { width: "2px", flex: 1, margin: "4px 0", zIndex: 1 },
  stepContent: { paddingTop: "0rem", paddingBottom: "1.25rem" },
  stepTitle: { margin: 0, fontSize: "1rem", fontFamily: THEME.fonts.sans },
  stepDesc: { margin: "0.2rem 0 0 0", fontSize: "0.85rem", color: THEME.colors.textMuted, lineHeight: "1.4" },
  sectionTitle: { fontFamily: THEME.fonts.serif, fontSize: "1.15rem", margin: "0 0 1rem 0", color: THEME.colors.textDark, fontWeight: "normal" },
  riderProfile: { display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" },
  avatar: { width: "42px", height: "42px", borderRadius: "50%", backgroundColor: THEME.colors.accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", border: `1px solid ${THEME.colors.cardBorder}` },
  commsBtn: { flex: 1, display: "block", textAlign: "center", padding: "0.65rem", backgroundColor: THEME.colors.headerBg, color: "#FFF", borderRadius: "8px", fontWeight: "600", fontSize: "0.85rem", textDecoration: "none", boxSizing: "border-box", border: "none" },
  orderId: { margin: 0, fontSize: "0.9rem", fontWeight: "700", color: THEME.colors.textDark, letterSpacing: "0.02em" },
  summarySummary: { display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: THEME.colors.textMuted, marginTop: "0.5rem" },
  
  failedBadgeFull: { width: "100%", padding: "0.8rem", backgroundColor: THEME.colors.error, color: "#FFF", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "0.9rem", textAlign: "center", boxSizing: "border-box", pointerEvents: "none", userSelect: "none" },
  failureMessage: { margin: "0 0 1.25rem 0", fontSize: "0.95rem", color: THEME.colors.textDark, lineHeight: "1.5" },
  
  tryAgainBtn: { width: "100%", padding: "0.8rem", backgroundColor: THEME.colors.headerBg, color: "#FFF", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "0.9rem", textAlign: "center" },
  supportBtn: { width: "100%", padding: "0.8rem", backgroundColor: "transparent", color: THEME.colors.textDark, border: `1.5px solid ${THEME.colors.cardBorder}`, borderRadius: "8px", fontWeight: "600", fontSize: "0.9rem", textAlign: "center" },
  reorderSecondaryBtn: { width: "100%", padding: "0.75rem", backgroundColor: "transparent", color: THEME.colors.textDark, border: `1.5px solid ${THEME.colors.cardBorder}`, borderRadius: "8px", fontWeight: "600", fontSize: "0.85rem" }
};
