import { useState, useEffect, useMemo, useRef } from "react";
import { useCart } from "../context/CartContext";
import { auth } from "../firebase";
import { serverTimestamp } from "firebase/firestore";

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
    danger: "#DE6B48"       
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
  const { cart = [], total = 0, placeOrder } = useCart();
  
  const [status, setStatus] = useState("idle"); 
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", instructions: "" });
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null); 
  const [couponError, setCouponError] = useState("");
  const [orderSnapshot, setOrderSnapshot] = useState(null);

  const canvasRef = useRef(null);
  const CONFIG = { taxRate: 0.08, codFee: 30, deliveryFee: 40 };

  const calculations = useMemo(() => {
    const subtotal = Number.isFinite(total) ? total : 0;
    const tax = Math.round(subtotal * CONFIG.taxRate);
    const delivery = subtotal > 0 ? CONFIG.deliveryFee : 0;
    const cod = paymentMethod === "cod" ? CONFIG.codFee : 0;
    const discount = appliedCoupon ? appliedCoupon.discount : 0;
    const grandTotal = Math.max(0, Math.round(subtotal + tax + delivery + cod - discount));
    return { subtotal, tax, delivery, cod, discount, grandTotal };
  }, [total, paymentMethod, appliedCoupon]);

  useEffect(() => { loadRazorpayScript(); }, []);

  // --- Particle Simulation Effect ---
  useEffect(() => {
    if ((status !== "success" && status !== "failure") || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationFrameId, active = true;

    const resizeCanvas = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    const successColors = ["#C4956A", "#4A7A5B", "#E6DFD5", "#E5B181"];
    const failureColors = ["#DE6B48", "#1A0B05", "#E6DFD5", "#70645C"];
    const colors = status === "success" ? successColors : failureColors;
    const particles = [];

    for (let i = 0; i < 140; i++) {
      particles.push({
        x: canvas.width / 2, y: canvas.height * 0.5, radius: Math.random() * 4 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 16, vy: (Math.random() * -14) - 4,
        gravity: 0.28, rotation: Math.random() * 360, rotationSpeed: (Math.random() - 0.5) * 10, opacity: 1
      });
    }

    const updateAndRender = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.vy += p.gravity; p.x += p.vx; p.y += p.vy; p.rotation += p.rotationSpeed;
        if (!active) p.opacity -= 0.02;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.radius, -p.radius / 1.5, p.radius * 2, p.radius * 1.3);
        ctx.restore();
      });
      if (active || particles.some(p => p.opacity > 0)) animationFrameId = requestAnimationFrame(updateAndRender);
    };
    updateAndRender();
    const timer = setTimeout(() => { active = false; }, 5000);
    return () => { cancelAnimationFrame(animationFrameId); clearTimeout(timer); window.removeEventListener("resize", resizeCanvas); };
  }, [status]);

  const handleInputChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const applyCouponCode = (e) => {
    e.preventDefault();
    setCouponError("");
    const sanitized = coupon.trim().toUpperCase();
    if (sanitized === "BREW100") {
      if (calculations.subtotal < 200) { setCouponError("Minimum spend for BREW100 is ₹200"); return; }
      setAppliedCoupon({ code: "BREW100", discount: 100 });
    } else if (sanitized === "COFFEE20") {
      setAppliedCoupon({ code: "COFFEE20", discount: Math.round(calculations.subtotal * 0.20) });
    } else {
      setCouponError("Invalid coupon code.");
    }
  };

  const triggerRazorpayPayment = async () => {
    setStatus("processing");
    const scriptInitialized = await loadRazorpayScript();
    if (!scriptInitialized) { setStatus("idle"); alert("Payment gateway failed to load."); return; }

    const options = {
      key: "YOUR_RAZORPAY_KEY_ID",
      amount: calculations.grandTotal * 100, 
      currency: "INR",
      name: "Brewed Cafe",
      description: "Artisanal Coffee Order",
      handler: async function (response) {
        try {
          const orderId = await placeOrder({ ...form, paymentId: response.razorpay_payment_id, paymentMethod: "online" });
          setOrderSnapshot({ id: orderId, customer: form, cart, calculations, method: "online" });
          setStatus("success");
        } catch (err) { setStatus("failure"); }
      },
      prefill: { name: form.name, email: form.email, contact: form.phone },
      theme: { color: THEME.colors.headerBg },
      modal: { ondismiss: () => setStatus("failure") }
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", () => setStatus("failure"));
    rzp.open();
  };

  
const handleFormSubmission = async (e) => {
    e.preventDefault();

    // 1. SECURITY GATE: Block non-authenticated users immediately
    if (!auth.currentUser) {
      alert("Please log in to your Brewed account to place an order.");
      setPage("login");
      return;
    }

    setStatus("processing");

    try {
      // 2. Prepare the order data

      const orderData = {
  customer: form,
  userId: auth.currentUser.uid,

  items: cart,

  subtotal: calculations.subtotal,
  tax: calculations.tax,
  delivery: calculations.delivery,
  total: calculations.grandTotal,

  paymentMethod: paymentMethod === "cod" ? "COD" : "Online",

  status: "Preparing",

  createdAt: serverTimestamp(),
};




      
      // 3. Await the result
      const orderId = await placeOrder(orderData);

      // 4. Update UI only after success
      setOrderSnapshot({ 
        id: orderId, 
        customer: form, 
        cart, 
        calculations, 
        method: paymentMethod 
      });
      setStatus("success");
      
    } catch (err) {
      console.error("Critical submission failure:", err);
      setStatus("failure");
    }
  };
  

  // --- RENDER FALLBACK: PAYMENT FAILED PAGE ---
  if (status === "failure") {
    return (
      <div style={styles.confirmPage}>
        <canvas ref={canvasRef} style={styles.confettiCanvas} />
        
        <style>{`
          @keyframes fluidRevealCard {
            0% { opacity: 0; transform: scale(0.96) translateY(30px); filter: blur(4px); }
            100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
          }
          @keyframes drawCross {
            0% { stroke-dashoffset: 40; opacity: 0; }
            100% { stroke-dashoffset: 0; opacity: 1; }
          }
          @keyframes scaleErrorCircle {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
          }
          .fluid-card { 
            animation: fluidRevealCard 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
            position: relative;
            z-index: 10;
          }
          .error-svg-wrapper {
            width: 80px;
            height: 80px;
            margin: 0 auto 1.5rem;
            display: block;
          }
          .error-circle {
            fill: none;
            stroke: ${THEME.colors.danger};
            stroke-width: 3;
            stroke-linecap: round;
            transform-origin: center;
            animation: scaleErrorCircle 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          }
          .cross-path-1, .cross-path-2 {
            fill: none;
            stroke: ${THEME.colors.danger};
            stroke-width: 4;
            stroke-linecap: round;
            stroke-dasharray: 40;
            stroke-dashoffset: 40;
          }
          .cross-path-1 {
            animation: drawCross 0.3s ease-out 0.4s both;
          }
          .cross-path-2 {
            animation: drawCross 0.3s ease-out 0.65s both;
          }
          .btn-interactive { 
            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s, box-shadow 0.3s; 
            cursor: pointer; 
          }
          .btn-interactive:hover { 
            transform: translateY(-3px); 
            background-color: #2D140A !important;
            box-shadow: 0 8px 20px rgba(26, 11, 5, 0.12);
          }
          .btn-interactive:active { 
            transform: translateY(-1px); 
          }
        `}</style>

        <div className="fluid-card" style={styles.confirmCard}>
          <div className="error-svg-wrapper">
            <svg viewBox="0 0 52 52" style={{ width: "100%", height: "100%" }}>
              <circle className="error-circle" cx="26" cy="26" r="23" />
              <path className="cross-path-1" d="M16 16l20 20" />
              <path className="cross-path-2" d="M36 16L16 36" />
            </svg>
          </div>

          <h2 style={{ ...styles.confirmTitle, color: THEME.colors.danger }}>Payment Failed</h2>
          <p style={styles.confirmSub}>
            We couldn't process your transaction. Don't worry, if any money was deducted, it will be refunded automatically.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <button className="btn-interactive" style={styles.payBtn} onClick={triggerRazorpayPayment}>
              Retry Payment
            </button>
            <button className="btn-interactive" style={styles.payBtn} onClick={() => { setStatus("idle"); setPage("menu"); }}>
              Return to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER SUCCESS: ORDER CONFIRMED PAGE ---
  if (status === "success" && orderSnapshot) {
    return (
      <div style={styles.confirmPage}>
        <canvas ref={canvasRef} style={styles.confettiCanvas} />

        <style>{`
          @keyframes fluidRevealCard {
            0% { opacity: 0; transform: scale(0.96) translateY(30px); filter: blur(4px); }
            100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
          }
          @keyframes drawCheckmark {
            0% { stroke-dashoffset: 50; }
            100% { stroke-dashoffset: 0; }
          }
          @keyframes scaleCircle {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
          }
          .fluid-card { 
            animation: fluidRevealCard 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
            position: relative;
            z-index: 10;
          }
          .success-checkmark-wrapper {
            width: 80px;
            height: 80px;
            margin: 0 auto 1.5rem;
            display: block;
          }
          .success-circle {
            fill: none;
            stroke: ${THEME.colors.success};
            stroke-width: 3;
            stroke-linecap: round;
            transform-origin: center;
            animation: scaleCircle 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          }
          .checkmark-path {
            fill: none;
            stroke: ${THEME.colors.success};
            stroke-width: 4;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-dasharray: 50;
            stroke-dashoffset: 50;
            animation: drawCheckmark 0.45s cubic-bezier(0.4, 0, 0.2, 1) 0.4s both;
          }
          .btn-interactive { 
            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s, box-shadow 0.3s; 
            cursor: pointer; 
          }
          .btn-interactive:hover { 
            transform: translateY(-3px); 
            background-color: #2D140A !important;
            box-shadow: 0 8px 20px rgba(26, 11, 5, 0.12);
          }
          .btn-interactive:active { 
            transform: translateY(-1px); 
          }
        `}</style>
        
        <div className="fluid-card" style={styles.confirmCard}>
          <div className="success-checkmark-wrapper">
            <svg viewBox="0 0 52 52" style={{ width: "100%", height: "100%" }}>
              <circle className="success-circle" cx="26" cy="26" r="23" />
              <path className="checkmark-path" d="M14 27l7.5 7.5L38 18" />
            </svg>
          </div>

          <h2 style={styles.confirmTitle}>Order Confirmed</h2>
          <p style={styles.confirmSub}>
            Thank you for ordering from <strong style={{ color: THEME.colors.headerBg }}>Brewed</strong>, {form.name}!
          </p>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {/* UPDATED: Emits orderSnapshot data along with route parameter */}
            <button className="btn-interactive" style={styles.payBtn} onClick={() => setPage("tracking", orderSnapshot)}>
              Track Order
            </button>
            <button className="btn-interactive" style={styles.payBtn} onClick={() => setPage("menu")}>
              Return to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN CHECKOUT VIEW PANEL ---
  return (
    <div style={styles.page}>
      <style>{`
        body { background-color: ${THEME.colors.bgPage}; margin: 0; font-family: ${THEME.fonts.sans}; color: ${THEME.colors.textDark}; }
        .checkout-layout { display: flex; gap: 2rem; align-items: start; max-width: 1100px; margin: 0 auto; }
        .main-panel { flex: 1; }
        .side-panel { width: 360px; position: sticky; top: 20px; }
        .input-box { width: 100%; padding: 0.8rem 1rem; border: 1.5px solid ${THEME.colors.cardBorder}; border-radius: 8px; font-size: 0.95rem; background: #FFF; outline: none; box-sizing: border-box; transition: border-color 0.2s; }
        .input-box:focus { border-color: ${THEME.colors.primary}; }
        .clickable-row { transition: border-color 0.2s, background-color 0.2s; cursor: pointer; }
        .clickable-row:hover { border-color: ${THEME.colors.primary} !important; background-color: #FAF9F6; }
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

            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>💳 Select Settlement Method</h2>
              <div 
                className="clickable-row"
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
                className="clickable-row"
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

          <div className="side-panel">
            <div style={{ ...styles.card, padding: "1.25rem" }}>
              <label style={{ ...styles.label, marginBottom: "0.4rem" }}>Have a Promo Voucher?</label>
              {!appliedCoupon ? (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input className="input-box" style={{ padding: "0.5rem" }} placeholder="COFFEE20" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
                  <input type="button" onClick={applyCouponCode} style={styles.couponBtn} value="Apply" />
                </div>
              ) : (
                <div style={styles.couponPill}>
                  <span>Voucher <strong>{appliedCoupon.code}</strong> Active!</span>
                  <button type="button" onClick={() => setAppliedCoupon(null)} style={styles.removeBtn}>×</button>
                </div>
              )}
              {couponError && <p style={{ color: "red", fontSize: "0.8rem", margin: "0.3rem 0 0" }}>{couponError}</p>}
            </div>

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
  paymentSelector: { display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", border: "1.5px solid", borderRadius: "8px", marginBottom: "0.75rem" },
  calcRow: { display: "flex", justifyContent: "space-between", fontSize: "0.9rem", marginBottom: "0.5rem", color: THEME.colors.textDark },
  payBtn: { width: "100%", padding: "1rem", backgroundColor: THEME.colors.headerBg, color: "#FFF", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "1rem", outline: "none" },
  couponBtn: { backgroundColor: "transparent", border: `1px solid ${THEME.colors.textDark}`, borderRadius: "6px", padding: "0 1rem", cursor: "pointer" },
  couponPill: { display: "flex", justifyContent: "space-between", background: "#E8F5E9", color: THEME.colors.success, padding: "0.5rem", borderRadius: "6px", fontSize: "0.85rem" },
  removeBtn: { background: "none", border: "none", color: "red", cursor: "pointer", fontWeight: "bold" },
  confirmPage: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "75vh", backgroundColor: "#FAF6F0", padding: "0 1rem", position: "relative", overflow: "hidden" },
  confettiCanvas: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 9999 },
  confirmCard: { textAlign: "center", padding: "3rem 2rem", background: "#FFF", borderRadius: "16px", border: `1px solid ${THEME.colors.cardBorder}`, maxWidth: "460px", width: "100%", boxShadow: "0 10px 30px rgba(26, 11, 5, 0.05)" },
  confirmTitle: { fontFamily: THEME.fonts.serif, fontSize: "2.2rem", color: THEME.colors.textDark, margin: "0 0 0.5rem", fontWeight: "normal" },
  confirmSub: { fontSize: "0.95rem", color: THEME.colors.textMuted, lineHeight: "1.5", margin: "0 0 2rem 0" }
};
