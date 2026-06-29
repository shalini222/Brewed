import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useCart } from "../context/CartContext";

const stripePromise = loadStripe("pk_test_51TnL3hRpIrYBOe6qbiPfhKOrKD3zIldTV3813Hf3OXmVMg9fugneL4EZDiYzueKWvf9ZhASgeoXXycmzduTf4dCH0OGtZDAHve");

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontFamily: "'Inter', sans-serif", fontSize: "15px", color: "#1A0A00",
      "::placeholder": { color: "#B0A090" },
    },
    invalid: { color: "#e53e3e" },
  },
};

function CheckoutForm({ setPage }) {
  const stripe = useStripe();
  const elements = useElements();
  const { cart, total, clearCart } = useCart();
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({ name: "", email: "", address: "" });
  const [savedCart, setSavedCart] = useState([]);
  const [savedTotal, setSavedTotal] = useState(0);

  const grandTotal = ((savedTotal || total) * 1.08).toFixed(2);
  const displayCart = savedCart.length > 0 ? savedCart : cart;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  if (cart.length === 0 && status !== "success" && status !== "processing" && status !== "error") {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSavedCart([...cart]);
    setSavedTotal(total);
    setStatus("processing");
    setErrorMsg("");

    try {
      const res = await fetch("https://brewed-self.vercel.app/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Math.round(total * 1.08 * 100) }),
      });

      const data = await res.json();

      if (!data.clientSecret) {
        throw new Error("Backend returned: " + JSON.stringify(data));
      }

      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: { name: form.name, email: form.email }
        }
      });

      if (result.error) throw new Error(result.error.message);

      setStatus("success");
      clearCart();
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div style={styles.confirmPage}>
        <div style={styles.confirmCard}>
          <div style={styles.confirmIcon}>☕</div>
          <h2 style={styles.confirmTitle}>Order Confirmed!</h2>
          <p style={styles.confirmSub}>Thanks, {form.name}! Your order is being prepared with love.</p>
          <div style={styles.orderDetails}>
            <h3 style={styles.orderDetailsTitle}>Order Summary</h3>
            {displayCart.map((item) => (
              <div key={item.id} style={styles.confirmRow}>
                <span>{item.emoji} {item.name} ×{item.qty}</span>
                <span>${(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
            <div style={styles.confirmDivider} />
            <div style={{ ...styles.confirmRow, ...styles.confirmTotal }}>
              <span>Total Paid</span><span>${grandTotal}</span>
            </div>
          </div>
          <p style={styles.confirmEmail}>Confirmation sent to <strong>{form.email}</strong></p>
          <button style={styles.confirmBtn} onClick={() => setPage("menu")}>Back to Menu</button>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={styles.confirmPage}>
        <div style={styles.confirmCard}>
          <div style={{ ...styles.confirmIcon, background: "#7A1A1A" }}>✕</div>
          <h2 style={{ ...styles.confirmTitle, color: "#7A1A1A" }}>Payment Failed</h2>
          <p style={styles.confirmSub}>Something went wrong. Please try again.</p>
          {errorMsg && <p style={styles.errorDetail}>{errorMsg}</p>}
          <button style={styles.retryBtn} onClick={() => setStatus("idle")}>Try Again</button>
          <button style={styles.confirmBtn} onClick={() => setPage("cart")}>Back to Cart</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <style>{`
        .checkout-layout {
          display: flex;
          flex-direction: row;
          gap: 2rem;
          align-items: start;
        }
        .checkout-summary {
          width: 300px;
          flex-shrink: 0;
          position: sticky;
          top: 80px;
        }
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

          <h2 style={{ ...styles.sectionTitle, marginTop: "1.5rem" }}>Payment</h2>
          <div style={styles.stripeBox}>
            <CardElement options={CARD_ELEMENT_OPTIONS} />
          </div>
          <div style={styles.stripeBadge}>🔒 Secured by <strong>Stripe</strong> · SSL encrypted</div>

          <button
            type="submit"
            style={{ ...styles.payBtn, opacity: status === "processing" ? 0.7 : 1 }}
            disabled={status === "processing" || !stripe}
          >
            {status === "processing" ? "Processing…" : `Pay $${(total * 1.08).toFixed(2)}`}
          </button>
        </div>

        <div className="checkout-summary" style={styles.orderSummary}>
          <h2 style={styles.summaryTitle}>Order Summary</h2>
          {displayCart.map((item) => (
            <div key={item.id} style={styles.summaryRow}>
              <span>{item.emoji} {item.name} ×{item.qty}</span>
              <span>${(item.price * item.qty).toFixed(2)}</span>
            </div>
          ))}
          <div style={styles.divider} />
          <div style={styles.summaryRow}><span>Subtotal</span><span>${(savedTotal || total).toFixed(2)}</span></div>
          <div style={styles.summaryRow}><span>Tax (8%)</span><span>${((savedTotal || total) * 0.08).toFixed(2)}</span></div>
          <div style={{ ...styles.summaryRow, ...styles.summaryTotal }}>
            <span>Total</span><span>${(total * 1.08).toFixed(2)}</span>
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
        <Elements stripe={stripePromise}>
          <CheckoutForm setPage={setPage} />
        </Elements>
      </div>
    </div>
  );
}

const styles = {
  page: { background: "#FDFAF5", minHeight: "100vh", padding: "2rem 1.5rem" },
  container: { maxWidth: "960px", margin: "0 auto" },
  backLink: { background: "none", border: "none", cursor: "pointer", color: "#C4956A", fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", padding: 0, marginBottom: "1rem", display: "inline-block" },
  heading: { fontFamily: "'Playfair Display', serif", fontSize: "2rem", color: "#1A0A00", marginBottom: "1.5rem" },
  sectionTitle: { fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", color: "#1A0A00", marginBottom: "1rem" },
  field: { marginBottom: "1rem" },
  label: { display: "block", fontFamily: "'Inter', sans-serif", fontSize: "0.82rem", color: "#7A6658", marginBottom: "0.35rem", fontWeight: 500 },
  input: { width: "100%", padding: "0.7rem 0.9rem", border: "1.5px solid #D8CDBF", borderRadius: "10px", fontFamily: "'Inter', sans-serif", fontSize: "0.95rem", color: "#1A0A00", background: "#fff", boxSizing: "border-box", outline: "none" },
  stripeBox: { border: "1.5px solid #D8CDBF", borderRadius: "10px", padding: "0.85rem 1rem", background: "#fff" },
  stripeBadge: { fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", color: "#9A8880", margin: "0.75rem 0 1.25rem" },
  payBtn: { width: "100%", padding: "0.9rem", background: "#1A0A00", color: "#C4956A", border: "none", borderRadius: "10px", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "1rem", cursor: "pointer" },
  orderSummary: { background: "#1A0A00", borderRadius: "16px", padding: "1.5rem", color: "#F5F0E8" },
  summaryTitle: { fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", color: "#C4956A", marginBottom: "1rem" },
  summaryRow: { display: "flex", justifyContent: "space-between", fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", color: "#C4A882", marginBottom: "0.6rem" },
  summaryTotal: { color: "#FDFAF5", fontWeight: 700, fontSize: "1rem", marginTop: "0.5rem" },
  divider: { borderTop: "1px solid #3B1A08", margin: "0.75rem 0" },
  confirmPage: { minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" },
  confirmCard: { background: "#fff", borderRadius: "20px", border: "1px solid #E8E0D5", padding: "2.5rem", maxWidth: "480px", width: "100%", textAlign: "center", boxShadow: "0 4px 24px rgba(26,10,0,0.08)" },
  confirmIcon: { width: "75px", height: "75px", borderRadius: "50%", background: "#C4956A", color: "#1A0A00", fontSize: "2.2rem", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" },
  confirmTitle: { fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", color: "#1A0A00", marginBottom: "0.5rem" },
  confirmSub: { fontFamily: "'Inter', sans-serif", color: "#7A6658", marginBottom: "1.5rem", lineHeight: 1.6, fontSize: "0.92rem" },
  orderDetails: { background: "#FDFAF5", borderRadius: "12px", padding: "1.1rem", marginBottom: "1.1rem", textAlign: "left" },
  orderDetailsTitle: { fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", color: "#1A0A00", marginBottom: "0.65rem" },
  confirmRow: { display: "flex", justifyContent: "space-between", fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", color: "#7A6658", marginBottom: "0.45rem" },
  confirmTotal: { color: "#1A0A00", fontWeight: 700, fontSize: "0.95rem", marginBottom: 0 },
  confirmDivider: { borderTop: "1px solid #E8E0D5", margin: "0.65rem 0" },
  confirmEmail: { fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: "#9A8880", marginBottom: "1.25rem" },
  confirmBtn: { display: "block", width: "100%", padding: "0.85rem", background: "#1A0A00", color: "#C4956A", border: "none", borderRadius: "10px", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", marginTop: "0.75rem" },
  retryBtn: { display: "block", width: "100%", padding: "0.85rem", background: "#C4956A", color: "#1A0A00", border: "none", borderRadius: "10px", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", marginBottom: "0.75rem" },
  errorDetail: { fontFamily: "'Inter', sans-serif", fontSize: "0.82rem", color: "#e53e3e", marginBottom: "1.25rem", wordBreak: "break-all" },
};
