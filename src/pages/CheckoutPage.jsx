import { useState, useEffect, useMemo } from "react";
import { useCart } from "../context/CartContext";

// --- Premium Coffee Theme Configurations ---
const THEME = {
  colors: {
    bgGrad: "linear-gradient(135deg, #150A06 0%, #1F110B 50%, #2D1A10 100%)",
    cardBg: "rgba(43, 27, 19, 0.45)",
    cardBorder: "rgba(196, 149, 106, 0.2)",
    primary: "#C4956A",      // Warm Latte Gold
    primaryHover: "#E5B88F", // Light Cappuccino
    textMain: "#FDF9F5",     // Pure Foam White
    textMuted: "#B59F8F",    // Roasted Bean Cream
    textDark: "#150A06",     // Dark Espresso
    success: "#5CA374",      // Mint Matcha Green
    accentRed: "#D96B66"
  },
  fonts: {
    serif: "'Playfair Display', serif",
    sans: "'Inter', sans-serif"
  },
  glass: {
    background: "rgba(43, 27, 19, 0.45)",
    backdropFilter: "blur(20px) saturate(140%)",
    WebkitBackdropFilter: "blur(20px) saturate(140%)",
    border: "1px solid rgba(196, 149, 106, 0.2)",
    boxShadow: "0 12px 40px 0 rgba(0, 0, 0, 0.5)"
  }
};

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

// --- UI Sub-Component: Processing Loader Animation ---
function ProcessingOverlay({ message }) {
  return (
    <div style={styles.loaderOverlay}>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
        .spinner { border: 4px solid rgba(196,149,106,0.1); border-left-color: #C4956A; border-radius: 50%; width: 50px; height: 50px; animation: spin 0.8s linear infinite; }
        .pulse-text { color: #C4956A; font-family: ${THEME.fonts.sans}; font-weight: 500; margin-top: 1.25rem; animation: pulse 1.5s ease-in-out infinite; }
      `}</style>
      <div className="spinner" />
      <p className="pulse-text">{message}</p>
    </div>
  );
}

// --- UI Sub-Component: Empty State ---
function EmptyCartView({ onNavigate }) {
  return (
    <div style={styles.confirmPage}>
      <div style={{ ...styles.confirmCard, ...THEME.glass }}>
        <div style={styles.confirmIcon}>🛒</div>
        <h2 style={styles.confirmTitle}>Your Cart is Empty</h2>
        <p style={styles.confirmSub}>Add some premium fresh roasts before opening checkout.</p>
        <button className="hover-btn" style={styles.confirmBtn} onClick={onNavigate}>Browse Menu</button>
      </div>
    </div>
  );
}

// --- UI Sub-Component: Beautiful Order Confirmation Page ---
function SuccessView({ form, snapshot, onNavigate }) {
  return (
    <div style={styles.confirmPage}>
      <div style={{ ...styles.confirmCard, ...THEME.glass, maxWidth: "550px" }}>
        <div style={{ animation: "spin 2s ease-out 1", display: "inline-block" }}>
          <span style={{ fontSize: "4rem" }}>🎉</span>
        </div>
        <h2 style={styles.confirmTitle}>Order Placed!</h2>
        <p style={styles.confirmSub}>
          Thank you, <strong style={{ color: THEME.colors.primary }}>{form.name}</strong>! {snapshot.method === "cod" ? "Please have cash/UPI ready upon arrival." : "Your artisanal brew order has been paid and dispatched to the baristas."}
        </p>

        <div style={styles.orderDetails}>
          <h3 style={{ ...styles.sectionTitle, fontSize: "1rem", borderBottom: `1px solid ${THEME.colors.cardBorder}`, paddingBottom: "0.5rem" }}>
            📦 Premium Delivery Receipt
          </h3>
          <div style={{ padding: "0.25rem 0 0.75rem 0", fontSize: "0.82rem", color: THEME.colors.textMuted, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <div><strong>Contact:</strong> {form.phone} | {form.email}</div>
            <div><strong>Address:</strong> {form.address}</div>
            {form.instructions && <div><strong>Rider Note:</strong> <span style={{ fontStyle: "italic", color: THEME.colors.primary }}>"{form.instructions}"</span></div>}
          </div>

          <div style={{ borderTop: `1px solid ${THEME.colors.cardBorder}`, margin: "0.5rem 0" }} />

          {snapshot.cart.map((item) => (
            <div key={item.id} style={styles.summaryRow}>
              <span style={{ color: THEME.colors.textMain }}>{item.emoji} {item.name} <small style={{ color: THEME.colors.textMuted }}>×{item.qty}</small></span>
              <span style={{ color: THEME.colors.textMain }}>₹{Math.round(item.price * item.qty)}</span>
            </div>
          ))}

          <div style={{ borderTop: `1px dashed ${THEME.colors.cardBorder}`, margin: "0.75rem 0" }} />
          
          <div style={styles.summaryRow}><span>Items Subtotal</span><span>₹{snapshot.calculations.subtotal}</span></div>
          <div style={styles.summaryRow}><span>Tax & Barista Fees (8%)</span><span>₹{snapshot.calculations.tax}</span></div>
          <div style={styles.summaryRow}><span>Delivery Charge</span><span>{snapshot.calculations.delivery === 0 ? "FREE" : `₹${snapshot.calculations.delivery}`}</span></div>
          {snapshot.method === "cod" && <div style={styles.summaryRow}><span>COD Handling Fee</span><span>₹{snapshot.calculations.cod}</span></div>}
          {snapshot.calculations.discount > 0 && <div style={{ ...styles.summaryRow, color: THEME.colors.success }}><span>Coupon Saved</span><span>-₹{snapshot.calculations.discount}</span></div>}
          
          <div style={{ borderTop: `1px solid ${THEME.colors.cardBorder}`, margin: "0.75rem 0" }} />
          <div style={{ ...styles.summaryRow, fontWeight: 700, fontSize: "1.1rem", color: THEME.colors.primary }}>
            <span>{snapshot.method === "cod" ? "Total Due on Delivery" : "Total Paid Securely"}</span>
            <span>₹{snapshot.calculations.grandTotal}</span>
          </div>
        </div>

        <p style={styles.confirmEmail}>A digital invoice track link was sent to <strong>{form.email}</strong></p>
        <button className="hover-btn" style={styles.confirmBtn} onClick={onNavigate}>Return to Cafe Menu</button>
      </div>
    </div>
  );
}

// --- UI Sub-Component: Enhanced Interactive Payment Card ---
function PaymentCard({ id, currentMethod, onSelect, icon, title, subtitle }) {
  const isActive = currentMethod === id;
  return (
    <div
      className="clickable-card"
      style={{ 
        ...styles.paymentOption, 
        ...THEME.glass,
        ...(isActive ? { borderColor: THEME.colors.primary, backgroundColor: "rgba(196,149,106,0.07)", transform: "scale(1.01)" } : {}) 
      }}
      onClick={() => onSelect(id)}
    >
      <div style={{ ...styles.paymentIconWrapper, background: isActive ? THEME.colors.primary : "rgba(255,255,255,0.05)" }}>
        <span style={{ fontSize: "1.35rem", color: isActive ? THEME.colors.textDark : THEME.colors.primary }}>{icon}</span>
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ ...styles.paymentTitle, color: isActive ? THEME.colors.primary : THEME.colors.textMain }}>{title}</p>
        <p style={styles.paymentSub}>{subtitle}</p>
      </div>
      <div style={{ ...styles.radio, ...(isActive ? styles.radioActive : {}) }} />
    </div>
  );
}

// --- Core Checkout Module Component ---
export default function CheckoutPage({ setPage }) {
  const { cart = [], total = 0, clearCart } = useCart();
  
  // Component States
  const [status, setStatus] = useState("idle"); 
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", instructions: "" });
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null); 
  const [couponError, setCouponError] = useState("");
  const [orderSnapshot, setOrderSnapshot] = useState(null);

  // App Configurations
  const CONFIG = { taxRate: 0.08, codFee: 30, deliveryFee: 40, freeDeliveryThreshold: 499 };

  // Centralized Calculation Core Pipeline (No Duplications)
  const calculations = useMemo(() => {
    const subtotal = Number.isFinite(total) ? total : 0;
    const tax = Math.round(subtotal * CONFIG.taxRate);
    const delivery = subtotal >= CONFIG.freeDeliveryThreshold || subtotal === 0 ? 0 : CONFIG.deliveryFee;
    const cod = paymentMethod === "cod" ? CONFIG.codFee : 0;
    const discount = appliedCoupon ? appliedCoupon.discount : 0;
    const grandTotal = Math.max(0, Math.round(subtotal + tax + delivery + cod - discount));

    const progressToFreeDelivery = Math.min(100, (subtotal / CONFIG.freeDeliveryThreshold) * 100);
    const amountNeededForFreeDelivery = Math.max(0, CONFIG.freeDeliveryThreshold - subtotal);

    return { subtotal, tax, delivery, cod, discount, grandTotal, progressToFreeDelivery, amountNeededForFreeDelivery };
  }, [total, paymentMethod, appliedCoupon]);

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  const handleInputChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // Promo Validation Engine
  const applyCouponCode = (e) => {
    e.preventDefault();
    setCouponError("");
    const sanitized = coupon.trim().toUpperCase();

    if (sanitized === "BREW100") {
      if (calculations.subtotal < 200) {
        setCouponError("Minimum spend for BREW100 is ₹200");
        return;
      }
      setAppliedCoupon({ code: "BREW100", discount: 100 });
    } else if (sanitized === "COFFEE20") {
      const computedDiscount = Math.round(calculations.subtotal * 0.20);
      setAppliedCoupon({ code: "COFFEE20", discount: computedDiscount });
    } else {
      setCouponError("Try valid codes: 'COFFEE20' or 'BREW100'");
    }
  };

  const removeCouponCode = () => {
    setAppliedCoupon(null);
    setCoupon("");
  };

  const checkoutPipelineFinished = () => {
    setOrderSnapshot({
      cart: [...cart],
      calculations: { ...calculations },
      method: paymentMethod
    });
    clearCart();
    setStatus("success");
  };

  const handleFormSubmission = async (e) => {
    e.preventDefault();
    setStatus("processing");

    if (paymentMethod === "cod") {
      setTimeout(() => {
        checkoutPipelineFinished();
      }, 1500);
      return;
    }

    const scriptInitialized = await loadRazorpayScript();
    if (!scriptInitialized) {
      setStatus("idle");
      alert("Razorpay gateway failed to load. Check your internet connection.");
      return;
    }

    const options = {
      key: "YOUR_RAZORPAY_KEY_ID", // Raw string hardcoded hook drop-in point
      amount: calculations.grandTotal * 100, 
      currency: "INR",
      name: "Brewed Cafe",
      description: "Artisanal Premium Coffee Order",
      handler: function () {
        checkoutPipelineFinished();
      },
      prefill: {
        name: form.name,
        email: form.email,
        contact: form.phone,
      },
      theme: { color: THEME.colors.primary },
      modal: {
        ondismiss: function () {
          setStatus("idle");
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  if (cart.length === 0 && status !== "success") {
    return <EmptyCartView onNavigate={() => setPage("menu")} />;
  }

  if (status === "success" && orderSnapshot) {
    return <SuccessView form={form} snapshot={orderSnapshot} onNavigate={() => setPage("menu")} />;
  }

  return (
    <div style={styles.page}>
      {status === "processing" && <ProcessingOverlay message="Securing connection checkout terminal..." />}
      
      {/* Global CSS Injector for Layout Control and Transitions */}
      <style>{`
        body { background: ${THEME.colors.bgGrad}; margin: 0; min-height: 100vh; -webkit-font-smoothing: antialiased; }
        .checkout-layout { display: flex; flex-direction: row; gap: 2rem; align-items: start; }
        .checkout-main-panel { flex: 1; min-width: 0; }
        .checkout-side-panel { width: 380px; flex-shrink: 0; position: sticky; top: 30px; }
        .clickable-card { transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), border-color 0.25s ease, box-shadow 0.25s ease; }
        .clickable-card:hover { transform: translateY(-3px) scale(1.005); border-color: rgba(196, 149, 106, 0.4); box-shadow: 0 16px 36px rgba(0,0,0,0.6); }
        .hover-btn { transition: background-color 0.25s ease, transform 0.1s ease, box-shadow 0.25s ease; }
        .hover-btn:hover { background-color: ${THEME.colors.primaryHover} !important; color: ${THEME.colors.textDark} !important; box-shadow: 0 0 15px rgba(196,149,106,0.4); }
        .hover-btn:active { transform: scale(0.97); }
        .input-focus-mod { transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease; }
        .input-focus-mod:focus { border-color: ${THEME.colors.primary} !important; background: rgba(30, 18, 12, 0.8) !important; box-shadow: 0 0 8px rgba(196,149,106,0.2); }
        @media (max-width: 960px) {
          .checkout-layout { flex-direction: column; }
          .checkout-side-panel { width: 100%; position: static; order: -1; }
        }
      `}</style>

      <div style={styles.container}>
        <button style={styles.backLink} onClick={() => setPage("cart")}>← Return to Shopping Cart</button>
        <h1 style={styles.heading}>Artisanal Checkout</h1>

        <form onSubmit={handleFormSubmission} className="checkout-layout">
          {/* Main Delivery Panel Form */}
          <div className="checkout-main-panel">
            <div style={{ ...styles.sectionCard, ...THEME.glass }}>
              <h2 style={styles.sectionTitle}>📍 Delivery Coordinates</h2>
              
              <div style={styles.formRowSplit}>
                <div style={styles.field}>
                  <label style={styles.label}>Full Name</label>
                  <input className="input-focus-mod" style={styles.input} name="name" value={form.name} onChange={handleInputChange} placeholder="Jane Doe" required />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Mobile Phone Number</label>
                  <input className="input-focus-mod" style={styles.input} type="tel" name="phone" value={form.phone} onChange={handleInputChange} placeholder="+91 XXXXX XXXXX" required />
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Email Address</label>
                <input className="input-focus-mod" style={styles.input} type="email" name="email" value={form.email} onChange={handleInputChange} placeholder="jane@example.com" required />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Physical Delivery Address</label>
                <input className="input-focus-mod" style={styles.input} name="address" value={form.address} onChange={handleInputChange} placeholder="Flat/House, Apartment/Street, Landmark, City" required />
              </div>

              <div style={{ ...styles.field, marginBottom: 0 }}>
                <label style={styles.label}>Special Delivery Instructions</label>
                <textarea className="input-focus-mod" style={{ ...styles.input, height: "75px", resize: "none" }} name="instructions" value={form.instructions} onChange={handleInputChange} placeholder="e.g., Leave with gatekeeper, Drop off at front desk, Call upon arrival..." />
              </div>
            </div>

            <div style={{ ...styles.sectionCard, ...THEME.glass }}>
              <h2 style={styles.sectionTitle}>💳 Payment Terminal Settlement</h2>
              
              <PaymentCard 
                id="online"
                currentMethod={paymentMethod}
                onSelect={setPaymentMethod}
                icon="💳"
                title="Instant Digital Checkout (UPI / Card / Wallet)"
                subtitle="Securely routes transactions instantly via Razorpay routing core. Fast checks for GPay, PhonePe, and major credit tokens."
              />

              <PaymentCard 
                id="cod"
                currentMethod={paymentMethod}
                onSelect={setPaymentMethod}
                icon="💵"
                title="Cash / UPI on Delivery (COD)"
                subtitle={`Settle directly with your dispatch rider via paper cash or scan QR. Adds dynamic handling fee surcharge of +₹${CONFIG.codFee}.`}
              />

              <div style={styles.lockNotice}>
                <span style={{ fontSize: "1.1rem" }}>🔒</span>
                <p style={{ margin: 0, fontSize: "0.78rem", lineHeight: "1.4" }}>
                  <strong>Secure Payment Encryption Guarantee:</strong> Your connection parameters are fortified. Financial tokens are fully processed inside merchant sandboxes and never touch local records.
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar Summary & Promotional Engines */}
          <div className="checkout-side-panel">
            {/* Free Delivery Dynamic Progress Meter Tracker */}
            <div style={{ ...styles.sidebarCard, ...THEME.glass, marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontFamily: THEME.fonts.sans, fontSize: "0.82rem", fontWeight: 600, color: THEME.colors.textMain }}>
                  {calculations.amountNeededForFreeDelivery === 0 ? "🎉 Free Shipping Unlocked!" : "🚚 Delivery Threshold Status"}
                </span>
                <span style={{ fontFamily: THEME.fonts.sans, fontSize: "0.8rem", color: THEME.colors.primary, fontWeight: 700 }}>
                  {calculations.amountNeededForFreeDelivery === 0 ? "₹0" : `₹${calculations.subtotal} / ₹${CONFIG.freeDeliveryThreshold}`}
                </span>
              </div>
              <div style={styles.progressTrackBar}>
                <div style={{ ...styles.progressFillIndicator, width: `${calculations.progressToFreeDelivery}%` }} />
              </div>
              {calculations.amountNeededForFreeDelivery > 0 && (
                <p style={{ ...styles.thresholdTip, marginTop: "0.5rem", marginBottom: 0 }}>
                  Add just <strong>₹{calculations.amountNeededForFreeDelivery}</strong> more to get completely free shipping!
                </p>
              )}
            </div>

            {/* Coupons Section */}
            <div style={{ ...styles.sidebarCard, ...THEME.glass, marginBottom: "1.25rem" }}>
              <h3 style={{ ...styles.summaryTitle, fontSize: "0.95rem", marginBottom: "0.5rem" }}>🎟️ Apply Active Store Promo Voucher</h3>
              {!appliedCoupon ? (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input 
                    className="input-focus-mod" 
                    style={{ ...styles.input, padding: "0.5rem 0.75rem", fontSize: "0.85rem" }} 
                    placeholder="e.g., COFFEE20" 
                    value={coupon} 
                    onChange={(e) => setCoupon(e.target.value)}
                  />
                  <button type="button" onClick={applyCouponCode} className="hover-btn" style={styles.couponBtn}>Apply</button>
                </div>
              ) : (
                <div style={styles.couponPill}>
                  <span>🎉 Code <strong>{appliedCoupon.code}</strong> Applied!</span>
                  <button type="button" onClick={removeCouponCode} style={styles.couponRemove}>×</button>
                </div>
              )}
              {couponError && <p style={styles.errorText}>{couponError}</p>}
            </div>

            {/* Item Summary Grid Display Panel */}
            <div style={{ ...styles.sidebarCard, ...THEME.glass }}>
              <h3 style={styles.summaryTitle}>📦 Premium Barista Basket Summary</h3>
              
              <div style={styles.itemScrollArea}>
                {cart.map((item) => (
                  <div key={item.id} style={styles.summaryRow}>
                    <span style={{ color: THEME.colors.textMain }}>{item.emoji} {item.name} <small style={{ color: THEME.colors.textMuted }}>×{item.qty}</small></span>
                    <span style={{ color: THEME.colors.textMain }}>₹{Math.round(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>

              <div style={styles.divider} />

              <div style={styles.summaryRow}><span>Cart Items Subtotal</span><span>₹{calculations.subtotal}</span></div>
              <div style={styles.summaryRow}><span>Tax & Barista Fees (8%)</span><span>₹{calculations.tax}</span></div>
              <div style={styles.summaryRow}>
                <span>Standard Delivery Fee</span>
                <span>{calculations.delivery === 0 ? <span style={{ color: THEME.colors.success, fontWeight: 600 }}>FREE</span> : `₹${calculations.delivery}`}</span>
              </div>
              {paymentMethod === "cod" && <div style={styles.summaryRow}><span>COD Handling Fee</span><span>₹{calculations.cod}</span></div>}
              {calculations.discount > 0 && <div style={{ ...styles.summaryRow, color: THEME.colors.success }}><span>Promo Coupon Savings</span><span>-₹{calculations.discount}</span></div>}

              <div style={styles.divider} />

              <div style={{ ...styles.summaryRow, ...styles.summaryTotal }}>
                <span>Grand Aggregate Total</span>
                <span>₹{calculations.grandTotal}</span>
              </div>

              <button type="submit" className="hover-btn" style={styles.payBtn}>
                {paymentMethod === "cod" ? `Place Cash Order · ₹${calculations.grandTotal}` : `Authorize Secure Gateway · ₹${calculations.grandTotal}`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- High-Performance Style Manifest Sheet ---
const styles = {
  page: { minHeight: "100vh", padding: "3rem 1.25rem" },
  container: { maxWidth: "1100px", margin: "0 auto" },
  backLink: { background: "none", border: "none", cursor: "pointer", color: THEME.colors.primary, fontFamily: THEME.fonts.sans, fontSize: "0.85rem", padding: 0, marginBottom: "0.75rem", display: "inline-block", letterSpacing: "0.2px" },
  heading: { fontFamily: THEME.fonts.serif, fontSize: "2.65rem", color: THEME.colors.textMain, margin: "0 0 2.25rem 0", fontWeight: 400, letterSpacing: "-0.5px" },
  sectionCard: { borderRadius: "20px", padding: "2rem", marginBottom: "1.75rem" },
  sidebarCard: { borderRadius: "20px", padding: "1.5rem" },
  sectionTitle: { fontFamily: THEME.fonts.serif, fontSize: "1.3rem", color: THEME.colors.primary, margin: "0 0 1.5rem 0", fontWeight: 500 },
  formRowSplit: { display: "flex", gap: "1.25rem", flexWrap: "wrap" },
  field: { marginBottom: "1.25rem", flex: "1 1 220px" },
  label: { display: "block", fontFamily: THEME.fonts.sans, fontSize: "0.82rem", color: THEME.colors.textMuted, marginBottom: "0.5rem", fontWeight: 500, letterSpacing: "0.3px" },
  input: { width: "100%", padding: "0.85rem 1.1rem", border: "1.5px solid rgba(196,149,106,0.15)", borderRadius: "12px", fontFamily: THEME.fonts.sans, fontSize: "0.92rem", color: THEME.colors.textMain, background: "rgba(21, 10, 6, 0.5)", boxSizing: "border-box", outline: "none" },
  paymentOption: { display: "flex", alignItems: "center", gap: "1.1rem", borderRadius: "14px", padding: "1.25rem", marginBottom: "1rem", cursor: "pointer", border: "1px solid transparent" },
  paymentIconWrapper: { width: "42px", height: "42px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContext: "center", justifyContent: "center", flexShrink: 0, transition: "background-color 0.2s ease" },
  paymentTitle: { fontFamily: THEME.fonts.sans, fontWeight: 600, fontSize: "0.95rem", margin: 0, letterSpacing: "0.1px" },
  paymentSub: { fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, fontSize: "0.8rem", margin: "0.3rem 0 0", lineHeight: 1.45 },
  radio: { width: "18px", height: "18px", borderRadius: "50%", border: "2px solid rgba(196,149,106,0.35)", flexShrink: 0, boxSizing: "border-box", transition: "all 0.2s ease" },
  radioActive: { border: `5px solid ${THEME.colors.primary}`, background: THEME.colors.textDark },
  lockNotice: { display: "flex", gap: "0.75rem", alignItems: "start", color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, marginTop: "1.5rem" },
  summaryTitle: { fontFamily: THEME.fonts.serif, fontSize: "1.15rem", color: THEME.colors.primary, margin: "0 0 1.25rem 0" },
  itemScrollArea: { maxHeight: "180px", overflowY: "auto", paddingRight: "0.35rem" },
  summaryRow: { display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: THEME.fonts.sans, fontSize: "0.88rem", color: THEME.colors.textMuted, marginBottom: "0.75rem" },
  progressTrackBar: { width: "100%", height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "10px", overflow: "hidden" },
  progressFillIndicator: { height: "100%", background: "linear-gradient(90deg, #A27650, #C4956A)", borderRadius: "10px", transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)" },
  thresholdTip: { fontFamily: THEME.fonts.sans, fontSize: "0.76rem", color: THEME.colors.textMuted, fontStyle: "italic", lineHeight: "1.4" },
  summaryTotal: { color: THEME.colors.textMain, fontWeight: 700, fontSize: "1.15rem" },
  divider: { borderTop: `1px solid ${THEME.colors.cardBorder}`, margin: "1.25rem 0" },
  payBtn: { width: "100%", padding: "1.1rem", background: THEME.colors.primary, color: THEME.colors.textDark, border: "none", borderRadius: "12px", fontFamily: THEME.fonts.sans, fontWeight: 700, fontSize: "1rem", cursor: "pointer", marginTop: "1rem" },
  couponBtn: { background: "rgba(196,149,106,0.12)", border: `1px solid ${THEME.colors.primary}`, color: THEME.colors.primary, borderRadius: "10px", padding: "0 1.25rem", fontFamily: THEME.fonts.sans, fontSize: "0.85rem", cursor: "pointer", fontWeight: 500 },
  couponPill: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(92,163,116,0.12)", border: `1px solid ${THEME.colors.success}`, color: THEME.colors.textMain, padding: "0.6rem 0.85rem", borderRadius: "10px", fontFamily: THEME.fonts.sans, fontSize: "0.85rem", width: "100%", boxSizing: "border-box" },
  couponRemove: { background: "none", border: "none", color: THEME.colors.textMuted, fontSize: "1.25rem", cursor: "pointer", lineHeight: 1, padding: 0 },
  errorText: { color: THEME.colors.accentRed, fontSize: "0.78rem", fontFamily: THEME.fonts.sans, margin: "0.5rem 0 0 0" },
  confirmPage: { minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" },
  confirmCard: { borderRadius: "28px", padding: "3rem 2.25rem", width: "100%", maxWidth: "480px", textAlign: "center" },
  confirmIcon: { fontSize: "3.75rem", marginBottom: "1rem" },
  confirmTitle: { fontFamily: THEME.fonts.serif, fontSize: "2.15rem", color: THEME.colors.textMain, margin: "0 0 0.5rem 0" },
  confirmSub: { fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: "2rem", lineHeight: 1.55, fontSize: "0.92rem" },
  orderDetails: { background: "rgba(0,0,0,0.25)", borderRadius: "16px", padding: "1.5rem", marginBottom: "1.5rem", textAlign: "left", border: `1px solid ${THEME.colors.cardBorder}` },
  confirmEmail: { fontFamily: THEME.fonts.sans, fontSize: "0.82rem", color: THEME.colors.textMuted, marginBottom: "1.75rem" },
  confirmBtn: { width: "100%", padding: "1rem", background: THEME.colors.primary, color: THEME.colors.textDark, border: "none", borderRadius: "12px", fontFamily: THEME.fonts.sans, fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" },
  loaderOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10, 5, 3, 0.9)", backdropFilter: "blur(8px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 9999 }
};
