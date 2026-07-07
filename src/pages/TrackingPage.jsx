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
  { id: 1, label: "Order Confirmed", desc: "We have received your coffee order.", icon: "📝" },
  { id: 2, label: "Brewing", desc: "Our barista is crafting your beverage.", icon: "☕" },
  { id: 3, label: "Out for Delivery", desc: "Your rider is heading your way.", icon: "🛵" },
  { id: 4, label: "Delivered", desc: "Enjoy your freshly brewed coffee!", icon: "🏠" },
  { id: 5, label: "Delivery Failed", desc: "We encountered an issue with your delivery.", icon: "❌" }
];

const FEEDBACK_OPTIONS = [
  "Fast Delivery",
  "Great Coffee",
  "Friendly Rider",
  "Perfect Temp",
  "Good Packaging"
];

const CURATED_RECOMMENDATIONS = [
  { id: "p1", name: "Almond Croissant", price: 140, icon: "🥐", desc: "Flaky, buttery layers filled with rich sweet almond paste." },
  { id: "p2", name: "Choco Chip Cookie", price: 90, icon: "🍪", desc: "Warm, gooey core baked with fine dark Belgian chocolate chunks." },
  { id: "p3", name: "Blueberry Muffin", price: 120, icon: "🧁", desc: "Bursting with fresh blueberries and topped with a sugar crumble." },
  { id: "p4", name: "Fudgy Walnut Brownie", price: 150, icon: "🍫", desc: "Dense, intensely rich chocolate cake slice embedded with crunchy walnuts." },
  { id: "p5", name: "Classic French Macarons", price: 180, icon: "🍬", desc: "An elegant trio of salted caramel, vanilla, and pistachio shells." }
];

export default function TrackingPage({ setPage, orderSnapshot, setSideOrderItem }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [estimatedTime, setEstimatedTime] = useState(25);
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1100);
  const [copied, setCopied] = useState(false);
  const [selectedTip, setSelectedTip] = useState(null);
  
  // Controls overlay for pairing menu
  const [showPairMenuOverlay, setShowPairMenuOverlay] = useState(false);

  // Feedback states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [typedReview, setTypedReview] = useState("");

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
    if (!orderSnapshot || currentStep >= 4) return;
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        const nextStep = prev + 1;
        setEstimatedTime((time) => Math.max(0, time - 8));
        
        if (nextStep === 4) {
          setShowFeedbackModal(true);
        }
        return nextStep;
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [currentStep, orderSnapshot]);

  if (!orderSnapshot) return null;

  const isMobile = windowWidth <= 880;
  const isDelivered = currentStep === 4;
  const isFailed = currentStep === 5;
  const rawId = orderSnapshot?.id ? orderSnapshot.id.toString() : "938402";
  const displayId = rawId.startsWith("BRW-") ? rawId : `#BRW-${rawId.slice(-6)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(displayId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelOrder = () => {
    if (currentStep === 1) {
      if (confirm("Are you sure you want to cancel your order?")) {
        alert("Order canceled successfully. Refund initialized.");
        setPage("menu");
      }
    }
  };

  // Triggers checkout redirect logic
  const handleProceedToCartWithItem = (item) => {
    if (typeof setSideOrderItem === "function") {
      setSideOrderItem(item); 
    }
    setPage("cart"); 
  };

  const toggleFeedbackTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const submitFeedback = () => {
    alert(`Thank you for your ${rating}-star review!`);
    setShowFeedbackModal(false);
  };

  const OrderInformationCard = () => (
    <div className="interactive-card" style={{ backgroundColor: THEME.colors.accentLight }}>
      <h3 style={{ ...styles.sectionTitle, marginBottom: "0.5rem" }}>Order Information</h3>
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

      {isFailed ? (
        <div style={styles.failedStatusIndicatorFull}>
          <span style={styles.failedStatusDot} />
          Delivery Failed
        </div>
      ) : (
        <>
          <div style={{ borderTop: `1px solid ${THEME.colors.cardBorder}`, margin: "0.75rem 0" }} />
          
          <div style={styles.summarySummary}>
            <span>Payment Mode:</span>
            <span style={{ fontWeight: "600" }}>{orderSnapshot?.method === "cod" ? "COD (Cash/QR)" : "Paid Online"}</span>
          </div>
          
          <div style={styles.summarySummary}>
            <span>Amount Paid:</span>
            <span style={{ fontWeight: "600" }}>₹{(orderSnapshot?.calculations?.grandTotal || 0) + (selectedTip || 0)}</span>
          </div>

          <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={styles.actionSplitRow}>
              {isDelivered ? (
                <>
                  <div style={styles.successStatusIndicatorHalf}>
                    <span style={styles.successStatusDot} />
                    Delivered
                  </div>
                  <button className="btn-action" style={styles.reorderHalfBtn} onClick={() => setPage("menu")}>
                    <span className="reorder-btn-inner">
                      Reorder
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                      </svg>
                    </span>
                  </button>
                </>
              ) : (
                <div style={{ width: "100%", textAlign: "center" }}>
                  <p style={styles.curatedPromptText}>
                    Want the perfect pairing while you wait?
                  </p>
                  
                  <button className="btn-action" style={styles.pairSolidBtn} onClick={() => setShowPairMenuOverlay(true)}>
                    <span className="reorder-btn-inner" style={{ color: "#FFFFFF" }}>
                      Pair Fresh Sides
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </span>
                  </button>
                </div>
              )}
            </div>

            {!isDelivered && (
              <div style={{ width: "100%", marginTop: "0.25rem" }}>
                {currentStep === 1 ? (
                  <button onClick={handleCancelOrder} className="btn-action" style={styles.cancelActiveBtn}>
                    Cancel Order
                  </button>
                ) : (
                  <div style={styles.cancelDisabledWrapper}>
                    <button disabled style={styles.cancelDisabledBtn}>
                      Cancel Order
                    </button>
                    <p style={styles.cancelWarningTextMuted}>Cannot cancel once brewing begins.</p>
                  </div>
                )}
              </div>
            )}

            <button className="receipt-link" onClick={() => alert("Downloading your receipt...")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download Receipt
            </button>
          </div>
        </>
      )}
    </div>
  );

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
          opacity: 0.95;
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
          margin: 0.25rem auto 0 auto;
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
        .feedback-chip {
          padding: 0.4rem 0.75rem;
          border: 1px solid ${THEME.colors.cardBorder};
          background-color: ${THEME.colors.accentLight};
          color: ${THEME.colors.textDark};
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .feedback-chip.active {
          background-color: ${THEME.colors.primary};
          border-color: ${THEME.colors.primary};
          color: #FFF;
        }
        .star-palette-btn {
          background: none;
          border: none;
          padding: 0.2rem;
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        .star-palette-btn:hover {
          transform: scale(1.15);
        }
        
        /* PURE FLOATING GRID OVERLAY OVER DARKENED BG */
        .pairing-modal-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
          gap: 1.5rem;
          max-width: 960px;
          width: 100%;
          max-height: 85vh;
          overflow-y: auto;
          padding: 1.5rem;
          box-sizing: border-box;
          position: relative;
        }
        .pairing-card-naked {
          background: #FFFFFF;
          border: 1px solid ${THEME.colors.cardBorder};
          border-radius: 18px;
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          box-sizing: border-box;
        }
        .pairing-btn-naked {
          width: 100%;
          padding: 0.85rem;
          background-color: #1A0B05;
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.85rem;
          margin-top: 1.5rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .pairing-btn-naked:hover {
          background-color: #2E150B;
        }
        .close-floating-btn {
          position: fixed;
          top: 1.5rem;
          right: 2rem;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: 50%;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          font-weight: bold;
          cursor: pointer;
          color: ${THEME.colors.textDark};
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 110;
        }
      `}</style>

      {/* FLOATING CARDS SYSTEM OVER DARK BACKDROP */}
      {showPairMenuOverlay && (
        <div style={styles.modalOverlay}>
          <button className="close-floating-btn" onClick={() => setShowPairMenuOverlay(false)}>✕</button>
          
          <div className="pairing-modal-container">
            {CURATED_RECOMMENDATIONS.map((item) => (
              <div key={item.id} className="pairing-card-naked">
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%", marginBottom: "1.25rem" }}>
                    <span style={{ fontSize: "2.8rem", lineHeight: 1 }}>{item.icon}</span>
                    <span style={{ fontWeight: "700", color: THEME.colors.primary, fontSize: "1.2rem" }}>
                      ₹{item.price}
                    </span>
                  </div>
                  <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.15rem", fontWeight: "700", color: THEME.colors.textDark }}>
                    {item.name}
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: THEME.colors.textMuted, lineHeight: "1.45" }}>
                    {item.desc}
                  </p>
                </div>
                
                <button className="pairing-btn-naked" onClick={() => handleProceedToCartWithItem(item)}>
                  Add & Proceed to Checkout
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FEEDBACK MODAL */}
      {showFeedbackModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <button style={styles.modalCloseBtn} onClick={() => setShowFeedbackModal(false)}>✕</button>
            <h2 style={styles.modalTitle}>Share Your Experience</h2>
            <p style={styles.modalText}>How was your experience with Brewed today?</p>
            
            <div style={{ display: "flex", gap: "0.35rem", justifyContent: "center", margin: "0.75rem 0" }}>
              {[1, 2, 3, 4, 5].map((index) => {
                const isSelected = index <= (hoveredRating || rating);
                return (
                  <button
                    key={index}
                    className="star-palette-btn"
                    onMouseEnter={() => setHoveredRating(index)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => setRating(index)}
                    aria-label={`Rate ${index} out of 5 stars`}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" style={{ transition: "fill 0.15s, stroke 0.15s" }}>
                      <path
                        d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                        fill={isSelected ? THEME.colors.primary : "transparent"}
                        stroke={isSelected ? THEME.colors.primary : THEME.colors.cardBorder}
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                );
              })}
            </div>

            <p style={{ ...styles.modalText, fontSize: "0.8rem", margin: "0.25rem 0 1rem" }}>
              What went exceptionally well?
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "center", marginBottom: "1rem" }}>
              {FEEDBACK_OPTIONS.map((tag) => (
                <button 
                  key={tag} 
                  onClick={() => toggleFeedbackTag(tag)}
                  className={`feedback-chip ${selectedTags.includes(tag) ? "active" : ""}`}
                >
                  {tag}
                </button>
              ))}
            </div>

            <textarea 
              placeholder="Tell us more about your order (optional)..."
              value={typedReview}
              onChange={(e) => setTypedReview(e.target.value)}
              style={styles.modalTextArea}
            />

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem" }}>
              <button onClick={() => setShowFeedbackModal(false)} style={styles.modalCancelActionBtn}>
                Close
              </button>
              <button 
                onClick={submitFeedback} 
                disabled={rating === 0 && selectedTags.length === 0 && !typedReview.trim()}
                style={{ 
                  ...styles.modalSubmitActionBtn, 
                  opacity: (rating === 0 && selectedTags.length === 0 && !typedReview.trim()) ? 0.5 : 1, 
                  cursor: (rating === 0 && selectedTags.length === 0 && !typedReview.trim()) ? "not-allowed" : "pointer" 
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN TRACKING PAGE LAYOUT */}
      <div style={{ maxWidth: "940px", margin: "0 auto" }}>
        <button style={styles.backLink} onClick={() => setPage("menu")}>← Return to Menu</button>
        <h1 style={styles.heading}>Track Your Order</h1>

        <div className="layout-grid">
          <div className="main-panel">
            <div className="interactive-card">
              <div style={styles.etaHeader}>
                <div>
                  <p style={styles.etaLabel}>Status Update</p>
                  <h2 style={{
                    ...styles.etaTime, 
                    color: isFailed ? THEME.colors.error : (isDelivered ? THEME.colors.success : THEME.colors.textDark) 
                  }}>
                    {isFailed ? "Delivery Failed" : (isDelivered ? "Delivered" : `${estimatedTime} mins`)}
                  </h2>
                </div>
                <div className="pulse-container" style={{ width: 50, height: 50 }}>
                  {(!isFailed && !isDelivered) && <div className="pulse-ring" />}
                  <span style={{ fontSize: "2rem", zIndex: 2 }}>
                    {STEPS[currentStep - 1]?.icon || "☕"}
                  </span>
                </div>
              </div>

              <div style={styles.timeline}>
                {STEPS.map((step, index) => {
                  if (step.id === 5 && isDelivered) return null;

                  const isCompleted = currentStep > step.id;
                  const isActive = currentStep === step.id;
                  const isFailedStep = step.id === 5 && isActive;
                  const isDeliveredStep = step.id === 4 && (isActive || isCompleted);
                  
                  return (
                    <div key={step.id} style={styles.stepRow}>
                      <div style={styles.iconColumn}>
                        <div style={{
                          ...styles.dot,
                          backgroundColor: isFailedStep ? THEME.colors.error : (isCompleted || isActive ? THEME.colors.success : THEME.colors.cardBorder),
                          border: isActive && !isFailedStep && !isDeliveredStep ? `3px solid ${THEME.colors.primary}` : "none",
                          boxShadow: isActive && !isFailedStep && !isDeliveredStep ? `0 0 10px ${THEME.colors.primary}` : "none"
                        }}>
                          {isCompleted && <span style={{ color: "#FFF", fontSize: "0.65rem", fontWeight: "bold" }}>✓</span>}
                          {isDeliveredStep && <span style={{ color: "#FFF", fontSize: "0.65rem", fontWeight: "bold" }}>✓</span>}
                          {isFailedStep && <span style={{ color: "#FFF", fontSize: "0.65rem", fontWeight: "bold" }}>✕</span>}
                        </div>
                        {index < (isDelivered ? 3 : STEPS.length - 1) && (
                          <div style={{
                            ...styles.connector,
                            backgroundColor: isCompleted || (isDelivered && step.id < 4) ? THEME.colors.success : THEME.colors.cardBorder
                          }} />
                        )}
                      </div>
                      
                      <div style={{ ...styles.stepContent, opacity: isActive || isCompleted ? 1 : 0.4 }}>
                        <h4 style={{ 
                          ...styles.stepTitle, 
                          fontWeight: isActive ? "700" : "500", 
                          color: isFailedStep ? THEME.colors.error : (isDeliveredStep ? THEME.colors.success : (isActive ? THEME.colors.primary : THEME.colors.textDark)) 
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

          <div className="side-panel">
            {isFailed ? (
              <>
                <OrderInformationCard />
                <div className="interactive-card">
                  <h3 style={styles.apologyHeading}>We Are Sorry</h3>
                  <p style={styles.failureMessage}>Your order ran into an issue. We're on it.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1.25rem" }}>
                    <button className="btn-action" style={styles.tryAgainBtn} onClick={() => setPage("menu")}>
                      Try Again: 10% Off
                    </button>
                    <button className="btn-action" style={styles.supportBtn} onClick={() => alert("Connecting you with support...")}>
                      Contact Support
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="interactive-card">
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
                </div>

                <OrderInformationCard />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "85vh", boxSizing: "border-box", fontFamily: THEME.fonts.sans, color: THEME.colors.textDark },
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
  apologyHeading: { fontFamily: THEME.fonts.serif, fontSize: "1.45rem", margin: "0 0 0.8rem 0", color: THEME.colors.textDark, fontWeight: "700" },
  riderProfile: { display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" },
  avatar: { width: "42px", height: "42px", borderRadius: "50%", backgroundColor: THEME.colors.accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", border: `1px solid ${THEME.colors.cardBorder}` },
  commsBtn: { flex: 1, display: "block", textAlign: "center", padding: "0.65rem", backgroundColor: THEME.colors.headerBg, color: "#FFF", borderRadius: "8px", fontWeight: "600", fontSize: "0.85rem", textDecoration: "none", boxSizing: "border-box", border: "none" },
  orderId: { margin: 0, fontSize: "0.9rem", fontWeight: "700", color: THEME.colors.textDark, letterSpacing: "0.02em" },
  summarySummary: { display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: THEME.colors.textMuted, marginTop: "0.5rem" },
  actionSplitRow: { display: "flex", width: "100%", gap: "0.5rem", alignItems: "center" },
  failedStatusIndicatorFull: { display: "flex", width: "100%", alignItems: "center", justifyContent: "center", gap: "0.6rem", padding: "0.75rem", backgroundColor: "rgba(186, 60, 60, 0.08)", color: THEME.colors.error, border: `1px solid rgba(186, 60, 60, 0.15)`, borderRadius: "8px", fontWeight: "700", fontSize: "0.85rem", boxSizing: "border-box" },
  failedStatusDot: { width: "8px", height: "8px", borderRadius: "50%", backgroundColor: THEME.colors.error },
  successStatusIndicatorHalf: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "0.75rem 0.5rem", backgroundColor: "rgba(74, 122, 91, 0.08)", color: THEME.colors.success, border: `1px solid rgba(74, 122, 91, 0.15)`, borderRadius: "8px", fontWeight: "700", fontSize: "0.85rem", boxSizing: "border-box" },
  successStatusDot: { width: "7px", height: "7px", borderRadius: "50%", backgroundColor: THEME.colors.success },
  failureMessage: { margin: "0 0 1.25rem 0", fontSize: "0.95rem", color: THEME.colors.textDark, lineHeight: "1.5" },
  tryAgainBtn: { width: "100%", padding: "0.8rem", backgroundColor: THEME.colors.headerBg, color: "#FFF", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "0.9rem", textAlign: "center" },
  supportBtn: { width: "100%", padding: "0.8rem", backgroundColor: "transparent", color: THEME.colors.textDark, border: `1.5px solid ${THEME.colors.cardBorder}`, borderRadius: "8px", fontWeight: "600", fontSize: "0.9rem", textAlign: "center" },
  
  pairSolidBtn: { width: "100%", padding: "0.85rem", backgroundColor: THEME.colors.headerBg, color: "#FFFFFF", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.06em", boxShadow: "0 4px 12px rgba(26, 11, 5, 0.15)" },
  reorderHalfBtn: { flex: 1, padding: "0.75rem 0.5rem", backgroundColor: "transparent", color: THEME.colors.textDark, border: `1.5px solid ${THEME.colors.cardBorder}`, borderRadius: "8px", fontWeight: "600", fontSize: "0.85rem" },
  curatedPromptText: { margin: "0 0 0.6rem 0", fontSize: "0.8rem", color: THEME.colors.textMuted, fontStyle: "italic", lineHeight: "1.4" },
  
  cancelActiveBtn: { width: "100%", padding: "0.65rem", backgroundColor: "transparent", color: THEME.colors.error, border: `1px solid ${THEME.colors.error}`, borderRadius: "8px", fontWeight: "600", fontSize: "0.85rem", textAlign: "center" },
  cancelDisabledWrapper: { display: "flex", flexDirection: "column", gap: "0.35rem" },
  cancelDisabledBtn: { width: "100%", padding: "0.65rem", backgroundColor: "#F0ECE6", color: "#A89F95", border: "1px solid #E0D9D0", borderRadius: "8px", fontWeight: "600", fontSize: "0.85rem", textAlign: "center", cursor: "not-allowed" },
  cancelWarningTextMuted: { margin: 0, fontSize: "0.78rem", color: THEME.colors.textMuted, fontWeight: "500", textAlign: "center", lineHeight: "1.3" },

  // DARKENED BACKGROUND LAYER SPECIFICS
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "2rem" },
  modalContent: { backgroundColor: "#FFFFFF", borderRadius: "16px", padding: "2rem", maxWidth: "380px", width: "100%", boxSizing: "border-box", textAlign: "center", position: "relative", boxShadow: "0 10px 40px rgba(0,0,0,0.12)" },
  modalCloseBtn: { position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", fontSize: "1.1rem", color: THEME.colors.textMuted, cursor: "pointer" },
  modalTitle: { fontFamily: THEME.fonts.serif, fontSize: "1.45rem", margin: "0 0 0.25rem 0", color: THEME.colors.textDark },
  modalText: { margin: "0 0 1rem 0", fontSize: "0.9rem", color: THEME.colors.textMuted },
  modalTextArea: { width: "100%", height: "80px", padding: "0.6rem", border: `1px solid ${THEME.colors.cardBorder}`, borderRadius: "8px", backgroundColor: "#FAF9F6", fontFamily: THEME.fonts.sans, fontSize: "0.85rem", resize: "none", boxSizing: "border-box", color: THEME.colors.textDark, outline: "none", marginTop: "0.5rem" },
  modalCancelActionBtn: { flex: 1, padding: "0.75rem", backgroundColor: "transparent", border: `1px solid ${THEME.colors.cardBorder}`, borderRadius: "8px", fontWeight: "600", color: THEME.colors.textDark, cursor: "pointer" },
  modalSubmitActionBtn: { flex: 2, padding: "0.75rem", backgroundColor: THEME.colors.headerBg, border: "none", borderRadius: "8px", fontWeight: "600", color: "#FFF" }
};
