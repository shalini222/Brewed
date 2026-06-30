import { useState, useEffect, useMemo } from "react";
import { useCart } from "../context/CartContext";

// --- Razorpay Script Loader Utility ---
const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

// --- Sub-Component: Empty Cart View ---
function EmptyCartView({ onNavigate }) {
  return (
    <div style={styles.confirmPage}>
      <div style={styles.confirmCard}>
        <div style={styles.confirmIcon}>🛒</div>
        <h2 style={styles.confirmTitle}>Nothing to checkout</h2>
        <p style={styles.confirmSub}>Add some items to your cart first.</p>
        <button style={styles.confirmBtn} onClick={onNavigate}>Go to Menu</button>
      </div>
    </div>
  );
}

// --- Sub-Component: Order Success View ---
function SuccessView({ form, savedCart, savedMethod, savedTotal, codFee, onNavigate }) {
  const tax = Math.round(savedTotal * 0.08);
  const grandTotal = savedMethod === "cod" 
    ? Math.round(savedTotal + tax + codFee) 
    : Math.round(savedTotal + tax);

  return (
    <div style={styles.confirmPage}>
      <div style={styles.confirmCard}>
        <div style={styles.confirmIcon}>{savedMethod === "cod" ? "💵" : "☕"}</div>
        <h2 style={styles.confirmTitle}>Order Confirmed!</h2>
        <p style={styles.confirmSub}>
          Thanks, {form.name}! {savedMethod === "cod" ? "Pay on delivery." : "Your order is being prepared with love."}
        </p>
        <div style={styles.orderDetails}>
          <h3 style={styles.orderDetailsTitle}>Order Summary</h3>
          {savedCart.map((item) => (
            <div key={item.id} style={styles.confirmRow}>
              <span>{item.emoji} {item.name} ×{item.qty}</span>
              <span>₹{Math.round(item.price * item.qty)}</span>
            </div>
          ))}
          {savedMethod === "cod" && (
            <div style={styles.confirmRow}>
              <span>COD Charge</span>
              <span>₹{codFee}</span>
            </div>
          )}
          <div style={styles.confirmDivider} />
          <div style={{ ...styles.confirmRow, ...styles.confirmTotal }}>
            <span>{savedMethod === "cod" ? "Total to Pay" : "Total Paid"}</span>
            <span>₹{grandTotal}</span>
          </div>
        </div>
        <p style={styles.confirmEmail}>Confirmation sent to <strong>{form.email}</strong></p>
        <button style={styles.confirmBtn} onClick={onNavigate}>Back to Menu</button>
      </div>
    </div>
  );
}

// --- Sub-Component: Payment Method Selector Option ---
function PaymentOption({ id, currentMethod, onSelect, icon, title, subtitle }) {
  const isActive = currentMethod === id;
  return (
    <div
      style={{ ...styles.paymentOption, ...(isActive ? styles.paymentOptionActive : {}) }}
      onClick={() => onSelect(id)}
    >
      <span style={{ fontSize: "1.5rem" }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <p style={styles.paymentTitle}>{title}</p>
        <p style={styles.paymentSub}>{subtitle}</p>
      </div>
      <div style={{ ...styles.radio, ...(isActive ? styles.radioActive : {}) }} />
    </div>
  );
}

// --- Main Checkout Form Component ---
function CheckoutForm({ setPage }) {
  const { cart = [], total = 0, clearCart } = useCart();
  const [status, setStatus] = useState("idle");
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [form, setForm] = useState({ name: "", email: "", address: "" });

  // Order summary snapshots for the success window
  const [orderSnapshot, setOrderSnapshot] = useState({ cart: [], total: 0, method: "online" });

  const codFee = 30;
  const safeTotal = Number.isFinite(total) ? total : 0;
  const taxAmount = Math.round(safeTotal * 0.08);
  
  // Dynamically calculate live totals for the checkout screen sidebar
  const liveGrandTotal = useMemo(() => {
    return paymentMethod === "cod" 
      ? Math.round(safeTotal + taxAmount + codFee) 
      : Math.round(safeTotal + taxAmount);
  }, [safeTotal, taxAmount, paymentMethod, codFee]);

  useEffect(() => { 
    loadRazorpayScript(); 
  }, []);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const executeOrderClearance = (chosenMethod, finalTotal) => {
    setOrderSnapshot({
      cart: [...cart],
      total: finalTotal,
      method: chosenMethod
    });
    clearCart();
    setStatus("success");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (paymentMethod === "cod") {
      executeOrderClearance("cod", safeTotal);
      return;
    }

    const isScriptLoaded = await loadRazorpayScript();
    if (!isScriptLoaded) {
      alert("Payment gateway failed to initialize. Please check your internet connection.");
      return;
    }

    // Convert live grand total (including tax) to Indian Paise for Razorpay API 
    const amountInPaise = liveGrandTotal * 100;

    const options = {
      key: "YOUR_RAZORPAY_KEY_ID", // Replace this hardcoded string with your actual Key ID when testing
      amount: amountInPaise,
      currency: "INR",
      name: "Brewed Cafe",
      description: "Cafe Order Payment",
      handler: function () {
        executeOrderClearance("online", safeTotal);
      },
      prefill: {
        name: form.name,
        email: form.email,
      },
      theme: { color: "#C4956A" },
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

  if (status === "success") {
    return (
      <SuccessView 
        form={form}
        savedCart={orderSnapshot.cart}
        savedMethod={orderSnapshot.method}
        savedTotal={orderSnapshot.total}
        codFee={codFee}
        onNavigate={() => setPage("menu")}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <style>{`
        .checkout-layout { display: flex; flex-direction: row; gap: 2rem; align-items: start; }
        .checkout-summary { width: 320px; flex-shrink: 0; position: sticky; top: 80px; }
        @media (max-width: 768px) {
          .checkout-layout { flex-direction: column; }
          .checkout-summary { width: 100%; position: static; order: -1; }
        }
      `}</style>

      <div className="checkout-layout">
        {/* Left Side: Forms and Payment Selection */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={styles.sectionTitle}>Your Details</h2>
          <div style={styles.field}>
            <label style={styles.label}>Full Name</label>
            <input style={styles.input} name="name" value={form.name} onChange={handleChange} placeholder="Jane Doe" required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input style={styles.input} name="email" type="email" value={form.email} onChange={handleChange} placeholder="jane@example.com" required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Delivery Address</label>
            <input style={styles.input} name="address" value={form.address} onChange={handleChange} placeholder="123 Coffee Lane, Kolkata" required />
          </div>

          <h2 style={styles.sectionTitle}>Payment Method</h2>

          <PaymentOption 
            id="online"
            currentMethod={paymentMethod}
            onSelect={setPaymentMethod}
            icon="💳"
            title="Card / UPI / Wallet"
            subtitle="Pay securely via Razorpay — cards, GPay, PhonePe, Paytm & more"
          />

          <PaymentOption 
            id="cod"
            currentMethod={paymentMethod}
            onSelect={setPaymentMethod}
            icon="💵"
            title="Cash on Delivery"
            subtitle={`Pay when your order arrives · +₹${codFee} charge`}
          />

          <button type="submit" style={styles.payBtn}>
            {paymentMethod === "cod" ? `Place Order · ₹${liveGrandTotal}` : `Proceed to Pay ₹${liveGrandTotal}`}
          </button>
        </div>

        {/* Right Side: Sticky Live Summary */}
        <div className="checkout-summary" style={styles.orderSummary}>
          <h2 style={styles.summaryTitle}>Order Summary</h2>
          {cart.map((item) => (
            <div key={item.id} style={styles.summaryRow}>
              <span>{item.emoji} {item.name} ×{item.qty}</span>
              <span>₹{Math.round(item.price * item.qty)}</span>
            </div>
          ))}
          <div style={styles.divider} />
          <div style={styles.summaryRow}><span>Subtotal</span><span>₹{Math.round(safeTotal)}</span></div>
          <div style={styles.summaryRow}><span>Tax (8%)</span><span>₹{taxAmount}</span></div>
          {paymentMethod === "cod" && (
            <div style={styles.summaryRow}><span>COD Charge</span><span>₹{codFee}</span></div>
          )}
          <div style={{ ...styles.summaryRow, ...styles.summaryTotal }}>
            <span>Total</span>
            <span>₹{liveGrandTotal}</span>
          </div>
        </div>
      </div>
    </form>
  );
}

// --- Main Container Wrap ---
export default function CheckoutPage({ setPage }) {
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <button style={styles.backLink} onClick={() => setPage("cart")}>← Back to Cart</button>
        <h1 style={styles.heading}>Checkout</h1>
        <CheckoutForm setPage={setPage} />
      </div>
    </div>
  );
}

// --- Stylesheet Configuration ---
const styles = {
  page: { background: "#FDFAF5", minHeight: "100vh", padding: "2rem 1.5rem" },
  container: { maxWidth: "960px", margin: "0 auto" },
  backLink: { background: "none", border: "none", cursor: "pointer", color: "#C4956A", fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", padding: 0, marginBottom: "1rem", display: "inline-block" },
  heading: { fontFamily: "'Playfair Display', serif", fontSize: "2rem", color: "#1A0A00", marginBottom: "1.5rem" },
  sectionTitle: { fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", color: "#1A0A00", marginBottom: "1rem", marginTop: "1.5rem" },
  field: { marginBottom: "1rem" },
  label: { display: "block", fontFamily: "'Inter', sans-serif", fontSize: "0.82rem", color: "#7A6658", marginBottom: "0.35rem", fontWeight: 500 },
  input: { width: "100%", padding: "0.7rem 0.9rem", border: "1.5px solid #D8CDBF", borderRadius: "10px", fontFamily: "'Inter', sans-serif", fontSize: "0.95rem", color: "#1A0A00", background: "#fff", boxSizing: "border-box", outline: "none" },
  paymentOption: { display: "flex", alignItems: "center", gap: "1rem", background: "#fff", border: "1.5px solid #E8E0D5", borderRadius: "12px", padding: "1rem", marginBottom: "0.75rem", cursor: "pointer", transition: "all 0.2s ease" },
  paymentOptionActive: { borderColor: "#C4956A", background: "#FDF6EE" },
  paymentTitle: { fontFamily: "'Inter', sans-serif", fontWeight: 600, color: "#1A0A00", fontSize: "0.9rem", margin: 0 },
  paymentSub: { fontFamily: "'Inter', sans-serif", color: "#7A6658", fontSize: "0.78rem", margin: "0.15rem 0 0" },
  radio: { width: "18px", height: "18px", borderRadius: "50%", border: "2px solid #D8CDBF", flexShrink: 0 },
  radioActive: { border: "5px solid #C4956A" },
  payBtn: { width: "100%", padding: "0.9rem", background: "#1A0A00", color: "#C4956A", border: "none", borderRadius: "10px", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "1rem", cursor: "pointer", marginTop: "0.75rem" },
  orderSummary: { background: "#1A0A00", borderRadius: "16px", padding: "1.5rem", color: "#F5F0E8" },
  summaryTitle: { fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", color: "#C4956A", marginBottom: "1rem" },
  summaryRow: { display: "flex", justifyContent: "space-between", fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", color: "#C4A882", marginBottom: "0.6rem" },
  summaryTotal: { color: "#FDFAF5", fontWeight: 700, fontSize: "1rem", marginTop: "0.5rem" },
  divider: { borderTop: "1px solid #3B1A08", margin: "0.75rem 0" },
  confirmPage: { minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" },
  confirmCard: { background: "#fff", borderRadius: "20px", border: "1px solid #E8E0D5", padding: "2.5rem", maxWidth: "420px", width: "100%", textAlign: "center", boxShadow: "0 4px 24px rgba(26,10,0,0.08)" },
  confirmIcon: { fontSize: "3rem", marginBottom: "1rem" },
  confirmTitle: { fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", color: "#1A0A00", marginBottom: "0.5rem" },
  confirmSub: { fontFamily: "'Inter', sans-serif", color: "#7A6658", marginBottom: "1.5rem", lineHeight: 1.6, fontSize: "0.92rem" },
  orderDetails: { background: "#FDFAF5", borderRadius: "12px", padding: "1.1rem", marginBottom: "1.1rem", textAlign: "left" },
  orderDetailsTitle: { fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", color: "#1A0A00", marginBottom: "0.65rem" },
  confirmRow: { display: "flex", justifyContent: "space-between", fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", color: "#7A6658", marginBottom: "0.45rem" },
  confirmTotal: { color: "#1A0A00", fontWeight: 700, fontSize: "0.95rem", marginBottom: 0 },
  confirmDivider: { borderTop: "1px solid #E8E0D5", margin: "0.65rem 0" },
  confirmEmail: { fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: "#9A8880", marginBottom: "1.25rem" },
  confirmBtn: { display: "block", width: "100%", padding: "0.85rem", background: "#1A0A00", color: "#C4956A", border: "none", borderRadius: "10px", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", marginTop: "0.75rem" },
};
