import { useState, useEffect, useMemo, useRef } from "react";
import { useCart } from "../context/CartContext";
import { auth, db } from "../firebase";
import { serverTimestamp, collection, getDocs } from "firebase/firestore";
import { checkDelivery } from "../service/deliveryService";
import walletService from "../service/walletService";

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
  const [addresses, setAddresses] = useState([]);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState(null);
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [orderSnapshot, setOrderSnapshot] = useState(null);

  // Wallet states
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [useWallet, setUseWallet] = useState(false);

  const canvasRef = useRef(null);

  const CONFIG = {
    taxRate: 0.08,
    codFee: 30,
  };
  
  const calculations = useMemo(() => {
    const subtotal = Number.isFinite(total) ? total : 0;
    const tax = Math.round(subtotal * CONFIG.taxRate);

    let delivery = 0;
    if (subtotal > 0 && deliveryInfo) {
      if (subtotal >= deliveryInfo.freeDeliveryAbove) {
        delivery = 0;
      } else {
        delivery = deliveryInfo.deliveryFee;
      }
    }

    const cod = paymentMethod === "cod" ? CONFIG.codFee : 0;
    const discount = appliedCoupon ? appliedCoupon.discount : 0;
    
    // Base total before wallet deduction
    const baseTotal = Math.max(0, Math.round(subtotal + tax + delivery + cod - discount));
    let grandTotal = baseTotal;

    // Deduct wallet balance if applied
    let walletDeduction = 0;
    if (useWallet && wallet && wallet.balance > 0) {
      walletDeduction = Math.min(wallet.balance, baseTotal);
      grandTotal = Math.max(0, baseTotal - walletDeduction);
    }

    return { subtotal, tax, delivery, cod, discount, baseTotal, walletDeduction, grandTotal };
  }, [total, paymentMethod, appliedCoupon, deliveryInfo, useWallet, wallet]);

  useEffect(() => { loadRazorpayScript(); }, []);

  // Load User Wallet
  useEffect(() => {
    async function loadWallet() {
      if (!auth.currentUser) {
        setWallet(null);
        setWalletLoading(false);
        return;
      }

      try {
        setWalletLoading(true);
        const walletData = await walletService.getWallet(auth.currentUser.uid);
        setWallet(walletData);
      } catch (err) {
        console.error(err);
        setWallet(null);
      } finally {
        setWalletLoading(false);
      }
    }

    loadWallet();
  }, []);

  useEffect(() => {
    async function loadAddresses() {
      if (!auth.currentUser) return;

      try {
        const snapshot = await getDocs(
          collection(db, "users", auth.currentUser.uid, "addresses")
        );

        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setAddresses(list);

        const defaultAddress = list.find((a) => a.isDefault);
        const addressToUse = defaultAddress || list[0];

        if (addressToUse) {
          setSelectedAddress(addressToUse);
          setForm((prev) => ({
            ...prev,
            name: addressToUse.name,
            phone: addressToUse.phone,
            email: auth.currentUser?.email || "",
            address: `${addressToUse.house}, ${addressToUse.street}, ${addressToUse.city}, ${addressToUse.state} ${addressToUse.pincode}`,
          }));
        }
      } catch (err) {
        console.log(err);
      }
    }

    loadAddresses();
  }, []);

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

  useEffect(() => {
    async function validateDelivery() {
      if (!selectedAddress?.pincode) {
        setDeliveryAvailable(null);
        setDeliveryInfo(null);
        return;
      }

      setDeliveryLoading(true);

      try {
        const result = await checkDelivery(selectedAddress.pincode);
        setDeliveryAvailable(result.available);
        setDeliveryInfo(result.info);
      } catch (err) {
        console.log(err);
        setDeliveryAvailable(false);
        setDeliveryInfo(null);
      } finally {
        setDeliveryLoading(false);
      }
    }

    validateDelivery();
  }, [selectedAddress]);

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

  const handleFormSubmission = async (e) => {
    e.preventDefault();

    if (!auth.currentUser) {
      alert("Please log in to your Brewed account to place an order.");
      setPage("login");
      return;
    }
    if (!selectedAddress) {
      alert("Please select a delivery address.");
      return;
    }
    if (!selectedAddress.pincode) {
      alert("Selected address doesn't have a valid pincode.");
      return;
    }
    if (deliveryLoading) {
      alert("Please wait while we verify delivery availability.");
      return;
    }
    if (deliveryAvailable === false) {
      alert("Sorry, we don't deliver to the selected address.");
      return;
    }
    if (deliveryInfo && calculations.subtotal < deliveryInfo.minOrder) {
      alert(`Minimum order for this area is ₹${deliveryInfo.minOrder}.`);
      return;
    }

    setStatus("processing");

    try {
      const orderData = {
        customer: form,
        userId: auth.currentUser.uid,
        items: cart,
        subtotal: calculations.subtotal,
        tax: calculations.tax,
        delivery: calculations.delivery,
        deliveryZone: deliveryInfo?.zoneName || "",
        estimatedDelivery: deliveryInfo?.estimatedTime || "",
        minimumOrder: deliveryInfo?.minOrder || 0,
        freeDeliveryAbove: deliveryInfo?.freeDeliveryAbove || 0,
        walletDeduction: calculations.walletDeduction,
        total: calculations.grandTotal,
        paymentMethod: paymentMethod === "cod" ? "COD" : "Online",
        status: "New",
        createdAt: serverTimestamp(),
      };

      const orderId = await placeOrder(orderData);

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
      alert(err.stack || err);
      setStatus("failure");
    }
  };

  if (status === "failure") {
    return (
      <div style={styles.confirmPage}>
        <canvas ref={canvasRef} style={styles.confettiCanvas} />
        <div style={styles.confirmCard}>
          <h2 style={{ ...styles.confirmTitle, color: THEME.colors.danger }}>Payment Failed</h2>
          <p style={styles.confirmSub}>We couldn't process your transaction.</p>
          <button style={styles.payBtn} onClick={() => { setStatus("idle"); setPage("menu"); }}>Return to Menu</button>
        </div>
      </div>
    );
  }

  if (status === "success" && orderSnapshot) {
    return (
      <div style={styles.confirmPage}>
        <canvas ref={canvasRef} style={styles.confettiCanvas} />
        <div style={styles.confirmCard}>
          <h2 style={styles.confirmTitle}>Order Confirmed</h2>
          <p style={styles.confirmSub}>Thank you for ordering from Brewed!</p>
          <button style={styles.payBtn} onClick={() => setPage("menu")}>Return to Menu</button>
          <br />
          <button style={styles.payBtn} onClick={() => setPage("tracking")}>Track Order</button>
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
            <div style={styles.addressCard}>
              <div style={styles.addressHeader}>
                <div>
                  <h3 style={styles.addressTitle}>📍 Delivery Address</h3>
                  {selectedAddress && (
                    <>
                      <p style={styles.addressName}>{selectedAddress.name}</p>
                      <p style={styles.addressText}>{selectedAddress.house}, {selectedAddress.street}</p>
                      <p style={styles.addressText}>{selectedAddress.city}, {selectedAddress.state}</p>
                      <p style={styles.addressText}>{selectedAddress.pincode}</p>
                    </>
                  )}
                </div>

                {addresses.length > 0 && (
                  <button
                    type="button"
                    style={styles.changeButton}
                    onClick={() => setShowAddressPicker(true)}
                  >
                    Change
                  </button>
                )}
              </div>
            </div>

            {showAddressPicker && (
              <div style={styles.addressPicker}>
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    style={styles.addressOption}
                    onClick={() => {
                      setSelectedAddress(address);
                      setForm((prev) => ({
                        ...prev,
                        name: address.name,
                        phone: address.phone,
                        email: auth.currentUser?.email || "",
                        address: `${address.house}, ${address.street}, ${address.city}, ${address.state} ${address.pincode}`,
                      }));
                      setShowAddressPicker(false);
                    }}
                  >
                    <strong>{address.type}</strong>
                    <br />
                    {address.house}, {address.street}
                    <br />
                    {address.city}, {address.state}
                  </div>
                ))}
              </div>
            )}
            
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

            {/* Brewed Wallet Section */}
            <div
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: 20,
                marginBottom: 20,
                border: "1px solid #eee",
              }}
            >
              <h3 style={{ marginTop: 0, color: "#3B1A08" }}>
                👛 Brewed Wallet
              </h3>

              {walletLoading ? (
                <p>Loading wallet...</p>
              ) : (
                <>
                  <p>
                    Available Balance: <strong>₹{wallet?.balance || 0}</strong>
                  </p>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={useWallet}
                      disabled={!wallet || wallet.balance <= 0}
                      onChange={(e) => setUseWallet(e.target.checked)}
                    />
                    Use Brewed Wallet
                  </label>

                  {useWallet && (
                    <div
                      style={{
                        marginTop: 15,
                        padding: 15,
                        borderRadius: 12,
                        background: "#FAF6F0",
                        border: "1px solid #eee",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span>Order Total</span>
                        <strong>₹{calculations.baseTotal.toFixed(2)}</strong>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span>Wallet Used</span>
                        <strong>₹{calculations.walletDeduction.toFixed(2)}</strong>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginTop: 10,
                          paddingTop: 10,
                          borderTop: "1px solid #ddd",
                        }}
                      >
                        <strong>Remaining Payment</strong>
                        <strong>₹{calculations.grandTotal.toFixed(2)}</strong>
                      </div>
                    </div>
                  )}
                </>
              )}
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
              
              {deliveryLoading ? (
                <p style={{ color: "#666", marginBottom: "12px" }}>
                  Checking delivery availability...
                </p>
              ) : deliveryAvailable === false ? (
                <div
                  style={{
                    background: "#FCE8E6",
                    color: "#C5221F",
                    padding: "12px",
                    borderRadius: "10px",
                    marginBottom: "12px",
                    fontWeight: 600,
                  }}
                >
                  ❌ Sorry, we don't deliver to this address.
                </div>
              ) : deliveryAvailable && deliveryInfo && (
                <div
                  style={{
                    background: "#E6F4EA",
                    color: "#137333",
                    padding: "12px",
                    borderRadius: "10px",
                    marginBottom: "12px",
                  }}
                >
                  <div><strong>Delivery Available ✅</strong></div>
                  <div>Zone: {deliveryInfo.zoneName}</div>
                  <div>ETA: {deliveryInfo.estimatedTime}</div>
                  <div>Minimum Order: ₹{deliveryInfo.minOrder}</div>
                  <div>Free Delivery Above: ₹{deliveryInfo.freeDeliveryAbove}</div>

                  {calculations.delivery === 0 && (
                    <div
                      style={{
                        marginTop: "4px",
                        fontWeight: 600,
                        color: THEME.colors.success,
                      }}
                    >
                      🎉 Free Delivery Applied
                    </div>
                  )}
                </div> 
              )} 

              {paymentMethod === "cod" && <div style={styles.calcRow}><span>COD Surcharge</span><span>₹{calculations.cod}</span></div>}
              {calculations.discount > 0 && <div style={{ ...styles.calcRow, color: THEME.colors.success }}><span>Discounts</span><span>-₹{calculations.discount}</span></div>}
              {calculations.walletDeduction > 0 && <div style={{ ...styles.calcRow, color: THEME.colors.success }}><span>Wallet Used</span><span>-₹{calculations.walletDeduction}</span></div>}
              
              <div style={{ borderTop: `1px solid ${THEME.colors.cardBorder}`, margin: "1rem 0" }} />
              <div style={{ ...styles.calcRow, fontWeight: "bold", fontSize: "1.1rem" }}>
                <span>Grand Total</span>
                <span>₹{calculations.grandTotal}</span>
              </div>

              <button
                type="submit"
                disabled={
                  status === "processing" ||
                  deliveryLoading ||
                  !selectedAddress
                }
                style={styles.payBtn}
              >
                {deliveryLoading
                  ? "Checking delivery..."
                  : status === "processing"
                  ? "Processing Order..."
                  : `Place Order · ₹{calculations.grandTotal}`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Styling objects used above can be appended or kept as in your initial styles.






const styles = {
  page: { padding: "2rem 0" },addressCard: {
  background: "#fff",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "20px",
  border: "1px solid #E6DFD5",
},

addressHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
},
  deliveryInfo: {
  margin: "8px 0",
  fontSize: "0.9rem",
  color: THEME.colors.textMuted,
},

addressTitle: {
  margin: 0,
  marginBottom: "10px",
},

addressName: {
  fontWeight: "600",
  marginBottom: "6px",
},

addressText: {
  margin: "2px 0",
  color: "#666",
},

changeButton: {
  background: "#C4956A",
  color: "#fff",
  border: "none",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
},

addressPicker: {
  background: "#fff",
  borderRadius: "16px",
  marginBottom: "20px",
  border: "1px solid #E6DFD5",
  overflow: "hidden",
},

addressOption: {
  padding: "16px",
  borderBottom: "1px solid #eee",
  cursor: "pointer",
},
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
