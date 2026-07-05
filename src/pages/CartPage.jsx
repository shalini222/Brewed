import React from "react";
import { useCart } from "../context/CartContext";

export default function CartPage({ setPage }) {
  const { cart, updateQty, removeFromCart, total, clearCart } = useCart();

  // Helper to format item modifications into a neat comma-separated string
  const formatCustomizations = (item) => {
    const modifications = [];
    if (item.size) modifications.push(`Size: ${item.size}`);
    if (item.milk) modifications.push(item.milk);
    if (item.temperature) modifications.push(item.temperature);
    if (item.iceLevel && item.temperature !== "Hot") modifications.push(`Ice: ${item.iceLevel}`);
    if (item.sweetness !== undefined) modifications.push(`Sweetness: ${item.sweetness}%`);
    if (item.toppings && item.toppings.length > 0) {
      modifications.push(`Toppings: ${item.toppings.join(", ")}`);
    }
    return modifications.join(" | ");
  };

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <h1 style={styles.title}>Your Shopping Cart</h1>

        {cart.length === 0 ? (
          <div style={styles.emptyContainer}>
            <p style={styles.emptyText}>Your cart feels a bit light! Let's find some delicious coffee.</p>
            <button style={styles.primaryButton} onClick={() => setPage("menu")}>
              Browse Menu
            </button>
          </div>
        ) : (
          <div style={styles.cartContent}>
            {/* Left Side: Items List */}
            <div style={styles.itemsColumn}>
              <div style={styles.listHeader}>
                <span>Items</span>
                <button style={styles.clearAllBtn} onClick={clearCart}>Clear All</button>
              </div>

              {cart.map((item, index) => (
                <div key={`${item.id}-${index}`} style={styles.cartItem}>
                  <img 
                    src={item.image || "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=150"} 
                    alt={item.name} 
                    style={styles.itemImage}
                  />
                  
                  <div style={styles.itemDetails}>
                    <h3 style={styles.itemName}>{item.name}</h3>
                    <p style={styles.itemCustoms}>
                      {formatCustomizations(item)}
                    </p>
                    {item.instructions && (
                      <p style={styles.itemNotes}>⚠️ Note: "{item.instructions}"</p>
                    )}
                    <span style={styles.itemPrice}>₹{Math.round(item.price * item.qty)}</span>
                  </div>

                  {/* Quantity Actions */}
                  <div style={styles.actionBlock}>
                    <div style={styles.qtyControl}>
                      <button 
                        style={styles.qtyBtn} 
                        onClick={() => updateQty(item, item.qty - 1)}
                      >
                        -
                      </button>
                      <span style={styles.qtyValue}>{item.qty}</span>
                      <button 
                        style={styles.qtyBtn} 
                        onClick={() => updateQty(item, item.qty + 1)}
                      >
                        +
                      </button>
                    </div>

                    <button 
                      style={styles.removeBtn} 
                      onClick={() => removeFromCart(item)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Side: Order Summary */}
            <div style={styles.summaryColumn}>
              <div style={styles.summaryCard}>
                <h2 style={styles.summaryTitle}>Order Summary</h2>
                
                <div style={styles.summaryRow}>
                  <span>Subtotal</span>
                  <span>₹{Math.round(total)}</span>
                </div>
                <div style={styles.summaryRow}>
                  <span>Estimated Tax (8%)</span>
                  <span>₹{Math.round(total * 0.08)}</span>
                </div>
                
                <hr style={styles.divider} />

                <div style={styles.summaryRow}>
                  <span>Estimated Total</span>
                  <span style={styles.finalTotal}>₹{Math.round(total * 1.08)}</span>
                </div>

                <button 
                  style={styles.checkoutButton}
                  onClick={() => setPage("checkout")}
                >
                  Proceed to Checkout
                </button>

                <button 
                  style={styles.continueButton}
                  onClick={() => setPage("menu")}
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "80vh",
    padding: "40px 20px",
    fontFamily: "'Inter', sans-serif",
  },
  wrapper: {
    maxWidth: "1100px",
    margin: "0 auto",
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "32px",
    fontWeight: "700",
    color: "#2C1B11",
    marginBottom: "30px",
  },
  emptyContainer: {
    textAlign: "center",
    padding: "60px 20px",
    background: "#FFF",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
  },
  emptyText: {
    fontSize: "18px",
    color: "#6B5E55",
    marginBottom: "20px",
  },
  cartContent: {
    display: "flex",
    gap: "30px",
    flexWrap: "wrap",
  },
  itemsColumn: {
    flex: "2",
    minWidth: "320px",
  },
  listHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: "10px",
    borderBottom: "1px solid #EAE3D8",
    color: "#6B5E55",
    fontWeight: "500",
    fontSize: "14px",
    marginBottom: "15px",
  },
  clearAllBtn: {
    background: "none",
    border: "none",
    color: "#A04040",
    cursor: "pointer",
    fontWeight: "600",
  },
  cartItem: {
    display: "flex",
    alignItems: "center",
    background: "#FFF",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "15px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
    gap: "20px",
    flexWrap: "wrap",
  },
  itemImage: {
    width: "80px",
    height: "80px",
    objectFit: "cover",
    borderRadius: "8px",
  },
  itemDetails: {
    flex: "1",
    minWidth: "200px",
  },
  itemName: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#2C1B11",
    marginBottom: "4px",
  },
  itemCustoms: {
    fontSize: "13px",
    color: "#8A796E",
    lineHeight: "1.4",
    marginBottom: "4px",
  },
  itemNotes: {
    fontSize: "12px",
    color: "#B37D4E",
    fontStyle: "italic",
    marginBottom: "6px",
  },
  itemPrice: {
    fontWeight: "700",
    color: "#2C1B11",
    fontSize: "16px",
  },
  actionBlock: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "10px",
    justifyContent: "center",
  },
  qtyControl: {
    display: "flex",
    alignItems: "center",
    border: "1px solid #EAE3D8",
    borderRadius: "20px",
    padding: "2px",
    background: "#FDFAF5",
  },
  qtyBtn: {
    background: "none",
    border: "none",
    width: "28px",
    height: "28px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "16px",
    color: "#2C1B11",
  },
  qtyValue: {
    padding: "0 12px",
    fontWeight: "600",
    minWidth: "20px",
    textAlign: "center",
    fontSize: "14px",
  },
  removeBtn: {
    background: "none",
    border: "none",
    color: "#A0A0A0",
    cursor: "pointer",
    fontSize: "13px",
    textDecoration: "underline",
  },
  summaryColumn: {
    flex: "1",
    minWidth: "300px",
  },
  summaryCard: {
    background: "#FFF",
    padding: "25px",
    borderRadius: "12px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
    position: "sticky",
    top: "20px",
  },
  summaryTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "22px",
    fontWeight: "600",
    color: "#2C1B11",
    marginBottom: "20px",
    borderBottom: "1px solid #EAE3D8",
    paddingBottom: "10px",
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "12px",
    color: "#6B5E55",
    fontSize: "15px",
    alignItems: "center"
  },
  divider: {
    border: "none",
    borderTop: "1px dashed #EAE3D8",
    margin: "15px 0"
  },
  finalTotal: {
    fontWeight: "700",
    fontSize: "18px",
    color: "#2C1B11",
  },
  checkoutButton: {
    width: "100%",
    padding: "14px",
    background: "#D4A373",
    color: "#FFF",
    border: "none",
    borderRadius: "30px",
    fontWeight: "600",
    fontSize: "16px",
    cursor: "pointer",
    marginTop: "15px",
    boxShadow: "0 4px 10px rgba(212, 163, 115, 0.2)",
  },
  continueButton: {
    width: "100%",
    padding: "12px",
    background: "none",
    color: "#D4A373",
    border: "1px solid #D4A373",
    borderRadius: "30px",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    marginTop: "10px",
  },
  primaryButton: {
    padding: "12px 28px",
    background: "#D4A373",
    color: "#FFF",
    border: "none",
    borderRadius: "30px",
    fontWeight: "600",
    cursor: "pointer",
  },
};
