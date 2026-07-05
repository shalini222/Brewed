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
  { id: 4, label: "Delivered", desc: "Enjoy your fresh artisanal brew!", icon: "✨" }
];

export default function TrackingPage({ setPage, orderSnapshot }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [estimatedTime, setEstimatedTime] = useState(25);
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1100);

  // Guard clause: If there's no successful order session snapshot, boot them back to safety
  useEffect(() => {
    if (!orderSnapshot) {
      setPage("menu");
    }
  }, [orderSnapshot, setPage]);

  // Track window resizing for strict responsive layout adjustments
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Simulate timeline progression for testing staging flows
  useEffect(() => {
    if (!orderSnapshot || currentStep >= STEPS.length) return;
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        setEstimatedTime((time) => Math.max(0, time - 7));
        return prev + 1;
      });
    }, 15000); // Advances step every 15 seconds

    return () => clearInterval(interval);
  }, [currentStep, orderSnapshot]);

  if (!orderSnapshot) return null;

  const isMobile = windowWidth <= 880;

  return (
    // Replaced body selector targeting with an explicit background color wrapper container
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
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s;
          cursor: pointer;
        }
        .btn-action:hover {
          transform: translateY(-2px);
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
                  <p style={styles.etaLabel}>Estimated Arrival</p>
                  <h2 style={styles.etaTime}>{estimatedTime > 0 ? `${estimatedTime} mins` : "Arrived!"}</h2>
                </div>
                <div className="pulse-container" style={{ width: 50, height: 50 }}>
                  {currentStep < 4 && <div className="pulse-ring" />}
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
                  
                  return (
                    <div key={step.id} style={styles.stepRow}>
                      <div style={styles.iconColumn}>
                        <div style={{
                          ...styles.dot,
                          backgroundColor: isCompleted || isActive ? THEME.colors.success : THEME.colors.cardBorder,
                          border: isActive ? `3px solid ${THEME.colors.primary}` : "none",
                          boxShadow: isActive ? `0 0 10px ${THEME.colors.primary}` : "none"
                        }}>
                          {isCompleted && <span style={{ color: "#FFF", fontSize: "0.65rem", fontWeight: "bold" }}>✓</span>}
                        </div>
                        {index < STEPS.length - 1 && (
                          <div style={{
                            ...styles.connector,
                            backgroundColor: isCompleted ? THEME.colors.success : THEME.colors.cardBorder
                          }} />
                        )}
                      </div>
                      
                      <div style={{ ...styles.stepContent, opacity: isActive || isCompleted ? 1 : 0.4 }}>
                        <h4 style={{ ...styles.stepTitle, fontWeight: isActive ? "700" : "500", color: isActive ? THEME.colors.primary : THEME.colors.textDark }}>
                          {step.label} {isActive && "• Processing"}
                        </h4>
                        <p style={styles.stepDesc}>{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar Metadata Panel */}
          <div className="side-panel">
            <div className="interactive-card">
              <h3 style={styles.sectionTitle}>Delivery Valet</h3>
              <div style={styles.riderProfile}>
                <div style={styles.avatar}>🛵</div>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: "0.95rem" }}>Rahul Kumar</strong>
                  <p style={{ margin: "0.15rem 0 0", fontSize: "0.8rem", color: THEME.colors.textMuted }}>Brewed Dispatch Fleet</p>
                </div>
              </div>
              <a href="tel:#" className="btn-action" style={styles.callBtn}>📞 Call Rider</a>
            </div>

            <div className="interactive-card" style={{ backgroundColor: THEME.colors.accentLight }}>
              <h3 style={styles.sectionTitle}>Order Information</h3>
              <p style={styles.orderId}>
                ID: #BRW-{orderSnapshot?.id ? orderSnapshot.id.toString().slice(-6) : "938402"}
              </p>
              
              <div style={{ borderTop: `1px solid ${THEME.colors.cardBorder}`, margin: "0.75rem 0" }} />
              
              <div style={styles.summarySummary}>
                <span>Settlement:</span>
                <span style={{ fontWeight: "600" }}>{orderSnapshot?.method === "cod" ? "COD (Cash/QR)" : "Paid Online"}</span>
              </div>
              <div style={styles.summarySummary}>
                <span>Amount Paid:</span>
                <span style={{ fontWeight: "600" }}>₹{orderSnapshot?.calculations?.grandTotal || 0}</span>
              </div>

              {currentStep === 4 && (
                <button className="btn-action" style={styles.completeBtn} onClick={() => setPage("menu")}>
                  Order Received ✓
                </button>
              )}
            </div>
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
  etaTime: { margin: "0.2rem 0 0 0", fontFamily: THEME.fonts.serif, fontSize: "2rem", color: THEME.colors.textDark },
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
  callBtn: { display: "block", textAlign: "center", width: "100%", padding: "0.75rem", border: `1.5px solid ${THEME.colors.headerBg}`, color: THEME.colors.headerBg, borderRadius: "8px", fontWeight: "600", fontSize: "0.85rem", textDecoration: "none", boxSizing: "border-box", backgroundColor: "transparent" },
  orderId: { margin: 0, fontSize: "0.9rem", fontWeight: "700", color: THEME.colors.textDark, letterSpacing: "0.02em" },
  summarySummary: { display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: THEME.colors.textMuted, marginTop: "0.5rem" },
  completeBtn: { width: "100%", padding: "0.8rem", backgroundColor: THEME.colors.headerBg, color: "#FFF", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "0.9rem", marginTop: "1.25rem" }
};
