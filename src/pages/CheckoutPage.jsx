import { useState } from "react";
import { useCart } from "../context/CartContext";

function CheckoutForm({ setPage }) {
  const { cart, total, clearCart } = useCart();
  const [status, setStatus] = useState("idle");
  const [paymentMethod, setPaymentMethod] = useState("upi"); // "upi" | "cod"
  const [form, setForm] = useState({ name: "", email: "", address: "" });
  const [savedCart, setSavedCart] = useState([]);
  const [savedTotal, setSavedTotal] = useState(0);
  const [savedMethod, setSavedMethod] = useState("upi");

  const codFee = 30;
  const baseTotal = (savedTotal || total) * 1.08;
  const grandTotal = savedMethod === "cod" ? (baseTotal * 83 + codFee).toFixed(0) : (baseTotal * 83).toFixed(0);

  const displayCart = savedCart.length > 0 ? savedCart : cart;
  const upiId = "yourname@upi"; // 👈 Replace with your UPI ID
  const upiAmount = (baseTotal * 83).toFixed(0);
  const upiLink = `upi://pay?pa=${upiId}&pn=Brewed%20Cafe&am=${upiAmount}&cu=INR&tn=Brewed%20Order`;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  if (cart.length === 0 && status !== "success") {
    return (
      <div style={styles.confirmPage}>
        <div style={styles.confirmCard}>
          <div style={styles.confirmIcon}>🛒</div>
          <h2 style={styles.confirmTitle}>Nothing to checkout</h2>
          <p style={styles.confirmSub}>Add some items to your cart first.</p>
          <button style={styles.confirmBtn} onClick={() => setPage("menu")}>Go to Menu</button>
        </div>
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    setSavedCart([...cart]);
    setSavedTotal(total);
    setSavedMethod(paymentMethod);
    setStatus(paymentMethod === "upi" ? "pay" : "success");
    if (paymentMethod === "cod") clearCart();
  };

  const handlePaid = () => {
    clearCart();
    setStatus("success");
  };

  // ✅ Success
  if (status === "success") {
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
            {displayCart.map((item) => (
              <div key={item.id} style={styles.confirmRow}>
                <span>{item.emoji} {item.name} ×{item.qty}</span>
                <span>₹{(item.price * item.qty * 83).toFixed(0)}</span>
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
          <button style={styles.confirmBtn} onClick={() => setPage("menu")}>Back to Menu</button>
        </div>
      </div>
    );
  }

  // 💳 UPI Payment Screen
  if (status === "pay") {
    return (
      <div style={styles.confirmPage}>
        <div style={styles.confirmCard}>
          <div style={styles.upiIcon}>📱</div>
          <h2 style={styles.confirmTitle}>Pay via UPI</h2>
          <p style={styles.confirmSub}>Scan the QR or tap the button to pay</p>

          <div style={styles.qrBox}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiLink)}`}
              alt="UPI QR Code"
              style={{ width: "180px", height: "180px", borderRadius: "8px" }}
            />
          </div>

          <p style={styles.upiAmount}>₹{upiAmount}</p>
          <p style={styles.upiId}>UPI ID: <strong>{upiId}</strong></p>

          <a href={upiLink} style={styles.upiBtn}>
            Open UPI App →
          </a>

          <p style={styles.upiNote}>After paying, tap the button below</p>

          <button style={styles.confirmBtn} onClick={handlePaid}>
            ✓ I have paid
          </button>
          <button style={{ ...styles.confirmBtn, background: "transparent", color: "#7A6658", border: "1px solid #E8E0D5", marginTop: "0.5rem" }} onClick={() => setStatus("idle")}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // 📝 Details Form
  return (
    <form onSubmit={handleSubmit}>
      <style>{`
        .checkout-layout { display: flex; flex-direction: row; gap: 2rem; align-items: start; }
        .checkout-summary { width: 300px; flex-shrink: 0; position: sticky; top: 80px; }
        @media (max-width: 768px) {
          .checkout-layout { flex-direction: column; }
          .checkout-summary { width: 100%; position: static; order: -1; }
        }
      `}</style>

      <div className="checkout-layout">
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

          <div
            style={{ ...styles.paymentOption, ...(paymentMethod === "upi" ? styles.paymentOptionActive : {}) }}
            onClick={() => setPaymentMethod("upi")}
          >
            <span style={{ fontSize: "1.5rem" }}>📱</span>
            <div style={{ flex: 1 }}>
              <p style={styles.paymentTitle}>Pay via UPI</p>
              <p style={styles.paymentSub}>GPay, PhonePe, Paytm & all UPI apps</p>
            </div>
            <div style={{ ...styles.radio, ...(paymentMethod === "upi" ? styles.radioActive : {}) }} />
          </div>

          <div
            style={{ ...styles.paymentOption, ...(paymentMethod === "cod" ? styles.paymentOptionActive : {}) }}
            onClick={() => setPaymentMethod("cod")}
          >
            <span style={{ fontSize: "1.5rem" }}>💵</span>
            <div style={{ flex: 1 }}>
              <p style={styles.paymentTitle}>Cash on Delivery</p>
              <p style={styles.paymentSub}>Pay when your order arrives · +₹{codFee} charge</p>
            </div>
            <div style={{ ...styles.radio, ...(paymentMethod === "cod" ? styles.radioActive : {}) }} />
          </div>

          <button type="submit" style={styles.payBtn}>
            {paymentMethod === "cod"
              ? `Place Order · ₹${(total * 1.08 * 83 + codFee).toFixed(0)}`
              : `Proceed to Pay ₹${(total * 1.08 * 83).toFixed(0)}`}
          </button>
        </div>

        <div className="checkout-summary" style={styles.orderSummary}>
          <h2 style={styles.summaryTitle}>Order Summary</h2>
          {cart.map((item) => (
            <div key={item.id} style={styles.summaryRow}>
              <span>{item.emoji} {item.name} ×{item.qty}</span>
              <span>₹{(item.price * item.qty * 83).toFixed(0)}</span>
            </div>
          ))}
          <div style={styles.divider} />
          <div style={styles.summaryRow}><span>Subtotal</span><span>₹{(total * 83).toFixed(0)}</span></div>
          <div style={styles.summaryRow}><span>Tax (8%)</span><span>₹{(total * 0.08 * 83).toFixed(0)}</span></div>
          {paymentMethod === "cod" && (
            <div style={styles.summaryRow}><span>COD Charge</span><span>₹{codFee}</span></div>
          )}
          <div style={{ ...styles.summaryRow, ...styles.summaryTotal }}>
            <span>Total</span>
            <span>₹{paymentMethod === "cod" ? (total * 1.08 * 83 + codFee).toFixed(0) : (total * 1.08 * 83).toFixed(0)}</span>
          </div>
        </div>
      </div>
    </form>
  );
}

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

const styles = {
  page: { background: "#FDFAF5", minHeight: "100vh", padding: "2rem 1.5rem" },
  container: { maxWidth: "960px", margin: "0 auto" },
  backLink: { background: "none", border: "none", cursor: "pointer", color: "#C4956A", fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", padding: 0, marginBottom: "1rem", display: "inline-block" },
  heading: { fontFamily: "'Playfair Display', serif", fontSize: "2rem", color: "#1A0A00", marginBottom: "1.5rem" },
  sectionTitle: { fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", color: "#1A0A00", marginBottom: "1rem", marginTop: "1.5rem" },
  field: { marginBottom: "1rem" },
  label: { display: "block", fontFamily: "'Inter', sans-serif", fontSize: "0.82rem", color: "#7A6658", marginBottom: "0.35rem", fontWeight: 500 },
  input: { width: "100%", padding: "0.7rem 0.9rem", border: "1.5px solid #D8CDBF", borderRadius: "10px", fontFamily: "'Inter', sans-serif", fontSize: "0.95rem", color: "#1A0A00", background: "#fff", boxSizing: "border-box", outline: "none" },
  paymentOption: { display: "flex", alignItems: "center", gap: "1rem", background: "#fff", border: "1.5px solid #E8E0D5", borderRadius: "12px", padding: "1rem", marginBottom: "0.75rem", cursor: "pointer", transition: "border-color 0.2s" },
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
  upiIcon: { fontSize: "3rem", marginBottom: "1rem" },
  confirmTitle: { fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", color: "#1A0A00", marginBottom: "0.5rem" },
  confirmSub: { fontFamily: "'Inter', sans-serif", color: "#7A6658", marginBottom: "1.5rem", lineHeight: 1.6, fontSize: "0.92rem" },
  qrBox: { background: "#FDFAF5", borderRadius: "12px", padding: "1rem", display: "inline-block", marginBottom: "1rem" },
  upiAmount: { fontFamily: "'Playfair Display', serif", fontSize: "2rem", color: "#1A0A00", fontWeight: 700, marginBottom: "0.25rem" },
  upiId: { fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", color: "#7A6658", marginBottom: "1.25rem" },
  upiBtn: { display: "block", width: "100%", padding: "0.85rem", background: "#C4956A", color: "#1A0A00", border: "none", borderRadius: "10px", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", marginBottom: "0.75rem", textDecoration: "none" },
  upiNote: { fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", color: "#9A8880", margin: "0.75rem 0 0.5rem" },
  orderDetails: { background: "#FDFAF5", borderRadius: "12px", padding: "1.1rem", marginBottom: "1.1rem", textAlign: "left" },
  orderDetailsTitle: { fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", color: "#1A0A00", marginBottom: "0.65rem" },
  confirmRow: { display: "flex", justifyContent: "space-between", fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", color: "#7A6658", marginBottom: "0.45rem" },
  confirmTotal: { color: "#1A0A00", fontWeight: 700, fontSize: "0.95rem", marginBottom: 0 },
  confirmDivider: { borderTop: "1px solid #E8E0D5", margin: "0.65rem 0" },
  confirmEmail: { fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: "#9A8880", marginBottom: "1.25rem" },
  confirmBtn: { display: "block", width: "100%", padding: "0.85rem", background: "#1A0A00", color: "#C4956A", border: "none", borderRadius: "10px", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", marginTop: "0.75rem" },
};
