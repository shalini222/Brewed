import { useState, useEffect, useMemo } from "react";
import { useCart } from "../context/CartContext";

// --- Color Scheme Matched directly to 1000013780.jpg ---
const THEME = {
  colors: {
    bgPage: "#FAF6F0",       // Cream background from the menu body
    headerBg: "#1A0B05",     // Deep espresso brown from the top banner
    cardBg: "#FFFFFF",       // Clean crisp white for form cards
    cardBorder: "#E6DFD5",   // Subtle tan outline matching the category pills
    primary: "#C4956A",      // Warm artisanal gold accent
    textDark: "#1A0B05",     // Deep brown for highly readable text
    textMuted: "#70645C",    // Soft charcoal brown for labels
    success: "#4A7A5B"       // Matcha green for confirmed items
  },
  fonts: {
    serif: "'Playfair Display', serif",
    sans: "'Inter', sans-serif"
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

export default function CheckoutPage({ setPage }) {
  const { cart = [], total = 0, clearCart } = useCart();
  
  const [status, setStatus] = useState("idle"); 
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", instructions: "" });
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null); 
  const [couponError, setCouponError] = useState("");
  const [orderSnapshot, setOrderSnapshot] = useState(null);

  const CONFIG = { taxRate: 0.08, codFee: 30, deliveryFee: 40 };

  // Simplified calculations pipeline (No threshold checks)
  const calculations = useMemo(() => {
    const subtotal = Number.isFinite(total) ? total : 0;
    const tax = Math.round(subtotal * CONFIG.taxRate);
    const delivery = subtotal > 0 ? CONFIG.deliveryFee : 0;
    const cod = paymentMethod === "cod" ? CONFIG.codFee : 0;
    const discount = appliedCoupon ? appliedCoupon.discount : 0;
    const grandTotal = Math.max(0, Math.round(subtotal + tax + delivery + cod - discount));

    return { subtotal, tax, delivery, cod, discount, grandTotal };
  }, [total, paymentMethod, appliedCoupon]);

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  const handleInputChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

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
      setAppliedCoupon({ code: "COFFEE20", discount: Math.round(calculations.subtotal * 0.20) });
    } else {
      setCouponError("Invalid coupon code.");
    }
  };

  const handleFormSubmission = async (e) => {
    e.preventDefault();
    setStatus("processing");

    if (paymentMethod === "cod") {
      setTimeout(() => {
        setOrderSnapshot({ cart: [...cart], calculations, method: "cod" });
        clearCart();
        setStatus("success");
      }, 1200);
      return;
    }

    const scriptInitialized = await loadRazorpayScript();
    if (!scriptInitialized) {
      setStatus("idle");
      alert("Payment gateway failed to load.");
      return;
    }

    const options = {
      key: "YOUR_RAZORPAY_KEY_ID",
      amount: calculations.grandTotal * 100, 
      currency: "INR",
      name: "Brewed Cafe",
      description: "Artisanal Coffee Order",
      handler: function () {
        setOrderSnapshot({ cart: [...cart], calculations, method: "online" });
        clearCart();
        setStatus("success");
      },
      prefill: { name: form.name, email: form.email, contact: form.phone },
      theme: { color: THEME.colors.headerBg },
      modal: { ondismiss: () => setStatus("idle") }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  if (status === "success" && orderSnapshot) {
    return (
      <div style={styles.confirmPage}>
        <div style={styles.confirmCard}>
          <span style={{ fontSize: "3.5rem" }}>🎉</span>
          <h2 style={styles.confirmTitle}>Order Confirmed</h2>
          <p style={styles.confirmSub}>Thank you for ordering from <strong>Brewed</strong>, {form.name}!</p>
          <button style={styles.payBtn} onClick={() => setPage("menu")}>Return to Menu</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{`
        body { background-color: ${THEME.colors.bgPage}; margin: 0; font-family: ${THEME.fonts.sans}; color: ${THEME.colors.textDark}; }
        .checkout-layout { display: flex; gap: 2rem; align-items: start; max-width: 1100px; margin: 0 auto; }
        .main-panel { flex: 1; }
        .side-panel { width: 360px; position: sticky; top: 20px; }
        .input-box { width: 100%; padding: 0.8rem 1rem; border: 1.5px solid ${THEME.colors.cardBorder}; border-radius: 8px; font-size: 0.95rem; background: #FFF; outline: none; box-sizing: border-box; transition: border-color 0.2s; }
        .input-box:focus { border-color: ${THEME.colors.primary}; }
        @media (max-width: 880px) {
          .checkout-layout { flex-direction: column; }
          .side-panel { width: 100%; position: static; }
        }
      `}</style>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1rem" }}>
        <button style={styles.backLink} onClick={() => setPage("cart")}>← Back to Cart</button>
        <h1 style={styles.heading}>Checkout</h1>

        <form onSubmit={handleFormSubmission} className="checkout-layout">
          <div className="main-panel">
            {/* Delivery Form */}
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>📍 Delivery Information</h2>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <label style={styles.label}>Name</label>
                  <input className="input-box" name="name" value={form.name} onChange={handleInputChange} required />
                </div>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <label style={styles.label}>Phone Number</label>
                  <input className="input-box" type="tel" name="phone" value={form.phone} onChange={handleInputChange} required />
                </div>
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={styles.label}>Email Address</label>
                <input className="input-box" type="email" name="email" value={form.email} onChange={handleInputChange} required />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={styles.label}>Complete Address</label>
                <input className="input-box" name="address" value={form.address} onChange={handleInputChange} required />
              </div>
              <div>
                <label style={styles.label}>Rider Delivery Instructions</label>
                <textarea className="input-box" style={{ height: "65px", resize: "none" }} name="instructions" value={form.instructions} onChange={handleInputChange} placeholder="Drop off instructions..." />
              </div>
            </div>

            {/* Payment Selector */}
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>💳 Select Settlement Method</h2>
              <div 
                style={{ ...styles.paymentSelector, borderColor: paymentMethod === "online" ? THEME.colors.primary : THEME.colors.cardBorder }}
                onClick={() => setPaymentMethod("online")}
              >
                <span style={{ fontSize: "1.2rem" }}>💳</span>
                <div style={{ flex: 1 }}>
                  <strong>Pay Online Now</strong>
                  <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: THEME.colors.textMuted }}>UPI, Cards, Netbanking</p>
                </div>
                <input type="radio" checked={paymentMethod === "online"} readOnly />
              </div>

              <div 
                style={{ ...styles.paymentSelector, borderColor: paymentMethod === "cod" ? THEME.colors.primary : THEME.colors.cardBorder }}
                onClick={() => setPaymentMethod("cod")}
              >
                <span style={{ fontSize: "1.2rem" }}>💵</span>
                <div style={{ flex: 1 }}>
                  <strong>Cash / QR on Delivery</strong>
                  <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: THEME.colors.textMuted }}>Extra handling charge of +₹{CONFIG.codFee}</p>
                </div>
                <input type="radio" checked={paymentMethod === "cod"} readOnly />
              </div>
            </div>
          </div>

          {/* Sidebar Summary */}
          <div className="side-panel">
            {/* Simple Coupon Input */}
            <div style={{ ...styles.card, padding: "1.25rem" }}>
              <label style={{ ...styles.label, marginBottom: "0.4rem" }}>Have a Promo Voucher?</label>
              {!appliedCoupon ? (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input className="input-box" style={{ padding: "0.5rem" }} placeholder="COFFEE20" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
                  <button type="button" onClick={applyCouponCode} style={styles.couponBtn}>Apply</button>
                </div>
              ) : (
                <div style={styles.couponPill}>
                  <span>Voucher <strong>{appliedCoupon.code}</strong> Active!</span>
                  <button type="button" onClick={() => setAppliedCoupon(null)} style={styles.removeBtn}>×</button>
                </div>
              )}
              {couponError && <p style={{ color: "red", fontSize: "0.8rem", margin: "0.3rem 0 0" }}>{couponError}</p>}
            </div>

            {/* Price Calculations Sheet */}
            <div style={styles.card}>
              <h3 style={{ margin: "0 0 1rem 0", fontFamily: THEME.fonts.serif }}>Order Summary</h3>
              <div style={styles.calcRow}><span>Subtotal</span><span>₹{calculations.subtotal}</span></div>
              <div style={styles.calcRow}><span>Tax / Fees (8%)</span><span>₹{calculations.tax}</span></div>
              <div style={styles.calcRow}><span>Delivery Fee</span><span>₹{calculations.delivery}</span></div>
              {paymentMethod === "cod" && <div style={styles.calcRow}><span>COD Surcharge</span><span>₹{calculations.cod}</span></div>}
              {calculations.discount > 0 && <div style={{ ...styles.calcRow, color: THEME.colors.success }}><span>Discounts</span><span>-₹{calculations.discount}</span></div>}
              
              <div style={{ borderTop: `1px solid ${THEME.colors.cardBorder}`, margin: "1rem 0" }} />
              <div style={{ ...styles.calcRow, fontWeight: "bold", fontSize: "1.1rem" }}>
                <span>Grand Total</span>
                <span>₹{calculations.grandTotal}</span>
              </div>

              <button type="submit" disabled={status === "processing"} style={styles.payBtn}>
                {status === "processing" ? "Processing Order..." : `Place Order · ₹${calculations.grandTotal}`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: "2rem 0" },
  backLink: { background: "none", border: "none", color: THEME.colors.textMuted, cursor: "pointer", fontSize: "0.9rem", padding: 0, marginBottom: "0.5rem" },
  heading: { fontFamily: THEME.fonts.serif, fontSize: "2.2rem", color: THEME.colors.textDark, margin: "0 0 1.5rem 0" },
  card: { background: THEME.colors.cardBg, borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem", border: `1px solid ${THEME.colors.cardBorder}` },
  sectionTitle: { fontFamily: THEME.fonts.serif, fontSize: "1.2rem", margin: "0 0 1.2rem 0", color: THEME.colors.textDark },
  label: { display: "block", fontSize: "0.85rem", fontWeight: "600", color: THEME.colors.textMuted, marginBottom: "0.3rem" },
  paymentSelector: { display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", border: "1.5px solid", borderRadius: "8px", cursor: "pointer", marginBottom: "0.75rem" },
  calcRow: { display: "flex", justifyContent: "space-between", fontSize: "0.9rem", marginBottom: "0.5rem", color: THEME.colors.textDark },
  payBtn: { width: "100%", padding: "1rem", backgroundColor: THEME.colors.headerBg, color: "#FFF", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "1rem", cursor: "pointer", marginTop: "1rem" },
  couponBtn: { backgroundColor: "transparent", border: `1px solid ${THEME.colors.textDark}`, borderRadius: "6px", padding: "0 1rem", cursor: "pointer" },
  couponPill: { display: "flex", justifyContent: "space-between", background: "#E8F5E9", color: THEME.colors.success, padding: "0.5rem", borderRadius: "6px", fontSize: "0.85rem" },
  removeBtn: { background: "none", border: "none", color: "red", cursor: "pointer", fontWeight: "bold" },
  confirmPage: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" },
  confirmCard: { textAlign: "center", padding: "2rem", background: "#FFF", borderRadius: "12px", border: `1px solid ${THEME.colors.cardBorder}`, maxWidth: "400px", width: "100%" },
  confirmTitle: { fontFamily: THEME.fonts.serif, margin: "1rem 0 0.5rem" },
  confirmSub: { fontSize: "0.9rem", color: THEME.colors.textMuted }
};
