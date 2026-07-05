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

// Mock cart items if none are passed via props for local standalone testing
const MOCK_CART = [
  { id: 101, name: "Artisanal Espresso", qty: 2, price: 180 },
  { id: 102, name: "Cold Brew Bold", qty: 1, price: 240 }
];

export default function CheckoutPage({ setPage, cartItems = MOCK_CART }) {
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1100);
  const [address, setAddress] = useState({ street: "", city: "", zip: "" });

  // Handle dynamic responsive layouts
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Financial Calculations
  const itemTotal = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const deliveryFee = itemTotal > 400 ? 0 : 40;
  const taxes = Math.round(itemTotal * 0.05); // 5% cafe cess
  const grandTotal = itemTotal + deliveryFee + taxes;

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    setIsProcessing(true);

    // Mock an elegant API authorization delay
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
    }, 2000);
  };

  const handleGoToTracking = () => {
    // Generate the exact data structure required by TrackingPage
    const orderSnapshot = {
      id: "BRW-" + Math.floor(100000 + Math.random() * 900000),
      method: paymentMethod,
      calculations: {
        itemTotal,
        deliveryFee,
        grandTotal
      },
      shippingAddress: address
    };

    // Transition smoothly to the tracking page with the payload
    setPage("tracking", orderSnapshot);
  };

  const isMobile = windowWidth <= 880;

  // View 1: Order Confirmed Screen
  if (isSuccess) {
    return (
      <div style={styles.successContainer}>
        <div style={styles.successCard}>
          <div style={styles.successBadge}>✓</div>
          <h1 style={styles.successTitle}>Order Confirmed!</h1>
          <p style={styles.successMsg}>Your order has been sent to our roastery floor. The master baristas are prepping your extraction profiles right now.</p>
          <button className="btn-primary" style={styles.primaryActionBtn} onClick={handleGoToTracking}>
            Track Realtime Order →
          </button>
        </div>
      </div>
    );
  }

  // View 2: Main Interactive Checkout Form Layout
  return (
    <div style={{ ...styles.page, padding: isMobile ? "1.5rem 1rem" : "3rem 0" }}>
      <style>{`
        body { background-color: ${THEME.colors.bgPage}; margin: 0; font-family: ${THEME.fonts.sans}; color: ${THEME.colors.textDark}; }
        .checkout-grid { display: flex; gap: 2rem; flex-direction: ${isMobile ? "column" : "row"}; max-width: 940px; margin: 0 auto; }
        .checkout-card { background: ${THEME.colors.cardBg}; border-radius: 16px; padding: ${isMobile ? "1.25rem" : "2rem"}; border: 1px solid ${THEME.colors.cardBorder}; box-shadow: 0 4px 24px rgba(26, 11, 5, 0.01); box-sizing: border-box; }
        .form-group { margin-bottom: 1.25rem; display: flex; flex-direction: column; gap: 0.4rem; }
        .form-input { padding: 0.8rem; border-radius: 8px; border: 1px solid ${THEME.colors.cardBorder}; font-family: ${THEME.fonts.sans}; font-size: 0.95rem; color: ${THEME.colors.textDark}; background: ${THEME.colors.accentLight}; outline: none; }
        .form-input:focus { border-color: ${THEME.colors.primary}; background: #FFF; }
        .radio-box { display: flex; align-items: center; gap: 1rem; padding: 1rem; border: 1px solid ${THEME.colors.cardBorder}; border-radius: 10px; cursor: pointer; margin-bottom: 0.75rem; transition: background 0.2s; }
        .radio-box.active { border-color: ${THEME.colors.primary}; background: ${THEME.colors.accentLight}; }
        .btn-primary { transition: transform 0.2s, background-color 0.2s; cursor: pointer; }
        .btn-primary:hover:not(:disabled) { transform: translateY(-2px); background-color: #2D140A; }
      `}</style>

      <div style={{ maxWidth: "940px", margin: "0 auto" }}>
        <button style={styles.backLink} onClick={() => setPage("menu")}>← Modify Selection</button>
        <h1 style={styles.heading}>Secure Checkout</h1>

        <form onSubmit={handlePlaceOrder} className="checkout-grid">
          {/* Left Column: Shipping & Payment Details */}
          <div style={{ flex: 1, width: "100%" }}>
            <div className="checkout-card">
              <h3 style={styles.sectionTitle}>Delivery Address</h3>
              
              <div className="form-group">
                <label style={styles.label}>Street Address</label>
                <input required className="form-input" type="text" placeholder="House/Flat No, Building, Street Name" value={address.street} onChange={(e) => setAddress({...address, street: e.target.value})} />
              </div>

              <div style={{ display: "flex", gap: "1rem" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={styles.label}>City</label>
                  <input required className="form-input" type="text" placeholder="Kolkata" value={address.city} onChange={(e) => setAddress({...address, city: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={styles.label}>PIN Code</label>
                  <input required className="form-input" type="text" pattern="[0-9]{6}" placeholder="700001" value={address.zip} onChange={(e) => setAddress({...address, zip: e.target.value})} />
                </div>
              </div>

              <div style={{ margin: "2.5rem 0 1.5rem" }} />

              <h3 style={styles.sectionTitle}>Payment Protocol</h3>
              
              <div className={`radio-box ${paymentMethod === "online" ? "active" : ""}`} onClick={() => setPaymentMethod("online")}>
                <input type="radio" checked={paymentMethod === "online"} readOnly name="payment" />
                <div>
                  <strong style={{ display: "block", fontSize: "0.95rem" }}>Instant Online Settlement</strong>
                  <span style={{ fontSize: "0.8rem", color: THEME.colors.textMuted }}>Credit/Debit Cards, UPI, Netbanking</span>
                </div>
              </div>

              <div className={`radio-box ${paymentMethod === "cod" ? "active" : ""}`} onClick={() => setPaymentMethod("cod")}>
                <input type="radio" checked={paymentMethod === "cod"} readOnly name="payment" />
                <div>
                  <strong style={{ display: "block", fontSize: "0.95rem" }}>Cash / Digital QR on Delivery</strong>
                  <span style={{ fontSize: "0.8rem", color: THEME.colors.textMuted }}>Settle with courier via scan or cash</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Recapitulation Summary */}
          <div style={{ width: isMobile ? "100%" : "340px" }}>
            <div className="checkout-card" style={{ background: THEME.colors.accentLight }}>
              <h3 style={styles.sectionTitle}>Order Summary</h3>
              
              <div style={styles.cartList}>
                {cartItems.map((item) => (
                  <div key={item.id} style={styles.cartItem}>
                    <div>
                      <p style={styles.itemName}>{item.name}</p>
                      <span style={styles.itemQty}>Qty: {item.qty}</span>
                    </div>
                    <span style={styles.itemPrice}>₹{item.price * item.qty}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: `1px solid ${THEME.colors.cardBorder}`, margin: "1rem 0" }} />

              <div style={styles.billRow}>
                <span>Basket Subtotal</span>
                <span>₹{itemTotal}</span>
              </div>
              <div style={styles.billRow}>
                <span>Aroma & Thermal Logistics</span>
                <span>{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
              </div>
              <div style={styles.billRow}>
                <span>State Cafe Taxes (5%)</span>
                <span>₹{taxes}</span>
              </div>

              <div style={{ borderTop: `1px solid ${THEME.colors.cardBorder}`, margin: "1rem 0" }} />

              <div style={{ ...styles.billRow, fontSize: "1.1rem", fontWeight: "700", color: THEME.colors.textDark }}>
                <span>Grand Total</span>
                <span>₹{grandTotal}</span>
              </div>

              <button type="submit" disabled={isProcessing} className="btn-primary" style={styles.payBtn}>
                {isProcessing ? "Authorizing Security..." : `Confirm & Pay ₹${grandTotal}`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "85vh", boxSizing: "border-box" },
  backLink: { background: "none", border: "none", color: THEME.colors.textMuted, cursor: "pointer", fontSize: "0.9rem", padding: 0, marginBottom: "0.5rem" },
  heading: { fontFamily: THEME.fonts.serif, fontSize: "2.2rem", color: THEME.colors.textDark, margin: "0 0 2rem 0", fontWeight: "normal" },
  sectionTitle: { fontFamily: THEME.fonts.serif, fontSize: "1.2rem", margin: "0 0 1.25rem 0", color: THEME.colors.textDark, fontWeight: "normal" },
  label: { fontSize: "0.85rem", fontWeight: "600", color: THEME.colors.textMuted },
  cartList: { display: "flex", flexDirection: "column", gap: "1rem" },
  cartItem: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  itemName: { margin: 0, fontSize: "0.95rem", fontWeight: "600" },
  itemQty: { fontSize: "0.8rem", color: THEME.colors.textMuted },
  itemPrice: { fontSize: "0.95rem", fontWeight: "600" },
  billRow: { display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: THEME.colors.textMuted, marginBottom: "0.6rem" },
  payBtn: { width: "100%", padding: "0.9rem", backgroundColor: THEME.colors.headerBg, color: "#FFF", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "1rem", marginTop: "1.5rem" },
  
  // Success state styling elements
  successContainer: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "75vh", padding: "1rem" },
  successCard: { background: "#FFF", maxWidth: "460px", padding: "3rem 2rem", borderRadius: "20px", textAlign: "center", border: `1px solid ${THEME.colors.cardBorder}`, boxShadow: "0 10px 40px rgba(26,11,5,0.04)" },
  successBadge: { width: "64px", height: "64px", background: THEME.colors.success, color: "#FFF", fontSize: "2rem", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" },
  successTitle: { fontFamily: THEME.fonts.serif, fontSize: "2rem", color: THEME.colors.textDark, margin: "0 0 1rem 0", fontWeight: "normal" },
  successMsg: { fontSize: "0.95rem", color: THEME.colors.textMuted, lineHeight: "1.6", margin: "0 0 2rem 0" },
  primaryActionBtn: { width: "100%", padding: "0.9rem", backgroundColor: THEME.colors.headerBg, color: "#FFF", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "0.95rem" }
};
