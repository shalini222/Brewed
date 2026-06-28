import { useCart } from "../context/CartContext";

export default function CartPage({ setPage }) {
  const { cart, updateQty, removeFromCart, total } = useCart();

  if (cart.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>☕</div>
        <h2 style={styles.emptyTitle}>Your cart is empty</h2>
        <p style={styles.emptySub}>Add something delicious from our menu.</p>
        <button style={styles.browseBtn} onClick={() => setPage("menu")}>Browse Menu</button>
      </div>
    );
  }

  return (
    <>
      <style>{`
  .cart-layout {
    display: flex;
    flex-direction: row;
    gap: 2rem;
    align-items: start;
  }
  .cart-summary {
    width: 300px;
    flex-shrink: 0;
    position: sticky;
    top: 80px;
  }
  @media (max-width: 768px) {
    .cart-layout {
      flex-direction: column;
    }
    .cart-summary {
      width: 100%;
      position: static;
      order: 2;
    }
  }
`}</style>

      <div style={styles.page}>
        <div style={styles.container}>
          <h1 style={styles.heading}>Your Order</h1>
          <div className="cart-layout">

            <div style={styles.items}>
              {cart.map((item) => (
                <div key={item.id} style={styles.row}>
                  <div style={styles.rowEmoji}>{item.emoji}</div>
                  <div style={styles.rowInfo}>
                    <p style={styles.rowName}>{item.name}</p>
                    <p style={styles.rowPrice}>${(item.price * item.qty).toFixed(2)}</p>
                  </div>
                  <div style={styles.qtyControls}>
                    <button style={styles.qtyBtn} onClick={() => updateQty(item.id, item.qty - 1)}>−</button>
                    <span style={styles.qtyNum}>{item.qty}</span>
                    <button style={styles.qtyBtn} onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                  </div>
                  <button style={styles.removeBtn} onClick={() => removeFromCart(item.id)}>✕</button>
                </div>
              ))}
            </div>

            <div className="cart-summary" style={styles.summary}>
              <h2 style={styles.summaryTitle}>Summary</h2>
              <div style={styles.summaryRow}><span>Subtotal</span><span>${total.toFixed(2)}</span></div>
              <div style={styles.summaryRow}><span>Tax (8%)</span><span>${(total * 0.08).toFixed(2)}</span></div>
              <div style={styles.divider} />
              <div style={{ ...styles.summaryRow, ...styles.summaryTotal }}>
                <span>Total</span><span>${(total * 1.08).toFixed(2)}</span>
              </div>
              <button style={styles.checkoutBtn} onClick={() => setPage("checkout")}>
                Proceed to Checkout →
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  page: { background: "#FDFAF5", minHeight: "100vh", padding: "2rem 1.5rem" },
  container: { maxWidth: "900px", margin: "0 auto" },
  heading: { fontFamily: "'Playfair Display', serif", fontSize: "2rem", color: "#1A0A00", marginBottom: "1.5rem" },
  items: { display: "flex", flexDirection: "column", gap: "1rem", flex: 1, minWidth: 0 },
  row: {
    background: "#fff", borderRadius: "14px", border: "1px solid #E8E0D5",
    display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.9rem 1rem",
  },
  rowEmoji: { fontSize: "1.75rem" },
  rowInfo: { flex: 1, minWidth: 0 },
  rowName: { fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: "#1A0A00", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  rowPrice: { fontFamily: "'Inter', sans-serif", fontSize: "0.88rem", color: "#C4956A", fontWeight: 600, margin: "0.2rem 0 0" },
  qtyControls: { display: "flex", alignItems: "center", gap: "0.4rem" },
  qtyBtn: {
    width: "30px", height: "30px", borderRadius: "8px",
    border: "1.5px solid #3B1A08", background: "transparent",
    color: "#1A0A00", fontSize: "1rem", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  qtyNum: { fontFamily: "'Inter', sans-serif", fontWeight: 600, color: "#1A0A00", minWidth: "22px", textAlign: "center" },
  removeBtn: { background: "none", border: "none", cursor: "pointer", color: "#C0A090", fontSize: "0.9rem" },
  summary: { background: "#1A0A00", borderRadius: "16px", padding: "1.5rem", color: "#F5F0E8" },
  summaryTitle: { fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", color: "#C4956A", marginBottom: "1.1rem" },
  summaryRow: { display: "flex", justifyContent: "space-between", fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", color: "#C4A882", marginBottom: "0.7rem" },
  summaryTotal: { color: "#FDFAF5", fontWeight: 700, fontSize: "1.05rem", marginBottom: "1.25rem" },
  divider: { borderTop: "1px solid #3B1A08", margin: "0.75rem 0" },
  checkoutBtn: {
    width: "100%", padding: "0.9rem", background: "#C4956A", color: "#1A0A00",
    border: "none", borderRadius: "10px", fontFamily: "'Inter', sans-serif",
    fontWeight: 700, fontSize: "1rem", cursor: "pointer",
  },
  empty: { textAlign: "center", padding: "6rem 1.5rem", background: "#FDFAF5", minHeight: "100vh" },
  emptyIcon: { fontSize: "4rem", marginBottom: "1rem" },
  emptyTitle: { fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", color: "#1A0A00" },
  emptySub: { fontFamily: "'Inter', sans-serif", color: "#7A6658", marginBottom: "2rem" },
  browseBtn: {
    padding: "0.75rem 2rem", background: "#1A0A00", color: "#C4956A",
    border: "none", borderRadius: "10px", fontFamily: "'Inter', sans-serif",
    fontWeight: 600, cursor: "pointer", fontSize: "1rem",
  },
};