import {
  doc,
  getDoc,
  query,
  where,
  runTransaction
} from "firebase/firestore";

import { useState, useEffect, useMemo, useRef } from "react";
import { useCart } from "../context/CartContext";
import { auth, db, functions } from "../firebase";
import { httpsCallable } from "firebase/functions";
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
  const createRazorpayOrder = httpsCallable(
    functions,
    "createRazorpayOrder"
  );
  
  const {
    cart,
    total,
    placeOrder,
    clearCart,
    addToCart,
    removeFromCart,
  } = useCart();
  
  const [status, setStatus] = useState("idle"); 
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", instructions: "" });
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null); 
  const [couponError, setCouponError] = useState("");
  const [useRewards, setUseRewards] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState(null);
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [availableRewards, setAvailableRewards] = useState([]);
  const [selectedReward, setSelectedReward] = useState(null);
  const [loadingAvailableRewards, setLoadingAvailableRewards] = useState(true);
  const [rewardMenuItem, setRewardMenuItem] = useState(null);

  // Loyalty states
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true);
  const [loyaltySettings, setLoyaltySettings] = useState(null);

  // Wallet states
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [useWallet, setUseWallet] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  
  const canvasRef = useRef(null);

  const CONFIG = {
    taxRate: 0.08,
    codFee: 30,
  };
  
  const calculations = useMemo(() => {
    const subtotal = Number.isFinite(total) ? total : 0;
    const tax = Math.round(subtotal * CONFIG.taxRate);

    let rewardDiscount = 0;
    if (selectedReward?.menuItem) {
      rewardDiscount = selectedReward.menuItem.price || 0;
    }
    
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
    
    const baseTotal = Math.max(0, Math.round(subtotal + tax + delivery + cod - discount));

    let grandTotal = baseTotal;
    grandTotal = Math.max(0, grandTotal);

    let walletDeduction = 0;
    if (useWallet && wallet?.balance > 0) {
      walletDeduction = Math.min(wallet.balance, grandTotal);
      grandTotal -= walletDeduction;
    }

    let rewardDeduction = 0;
    if (useRewards && wallet && wallet.rewardBalance > 0) {
      rewardDeduction = Math.min(wallet.rewardBalance, grandTotal);
      grandTotal -= rewardDeduction;
    }

    grandTotal = Math.max(0, grandTotal);
    const remainingAmount = grandTotal;

    return {
      subtotal,
      tax,
      delivery,
      cod,
      discount,
      rewardDiscount,
      baseTotal,
      walletDeduction,
      rewardDeduction,
      grandTotal,
      remainingAmount,
    };
  }, [
    total,
    paymentMethod,
    appliedCoupon,
    deliveryInfo,
    useWallet,
    wallet,
    useRewards,
    selectedReward
  ]);

  useEffect(() => {
    if (
      paymentMethod === "cod" &&
      calculations.remainingAmount === 0
    ) {
      setPaymentMethod("online");
    }
  }, [paymentMethod, calculations.remainingAmount]);

  useEffect(() => { loadRazorpayScript(); }, []);

  useEffect(() => {
    async function loadLoyaltySettings(){
      const snap = await getDoc(
        doc(db, "settings", "loyalty")
      );
      if (snap.exists()){
        const data = snap.data();
        setLoyaltySettings(data);
        setLoyaltyEnabled(data.enabled !== false);
      }
    }
    loadLoyaltySettings();
  }, []);

  useEffect(() => {
    async function loadWallet() {
      if (!auth.currentUser) {
        setWallet(null);
        setWalletLoading(false);
        return;
      }

      try {
        setWalletLoading(true);
        let walletData = await walletService.getWallet(auth.currentUser.uid);

        if (!walletData) {
          walletData = await walletService.createWallet(auth.currentUser.uid);
        }

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

  useEffect(() => {
    async function loadAvailableRewards() {
      if (!loyaltyEnabled) {
        setAvailableRewards([]);
        setLoadingAvailableRewards(false);
        return;
      }

      if (!auth.currentUser) {
        setAvailableRewards([]);
        setLoadingAvailableRewards(false);
        return;
      }

      try {
        setLoadingAvailableRewards(true);

        const loyaltySettingsSnap = await getDoc(
          doc(db, "settings", "loyalty")
        );

        if (
          loyaltySettingsSnap.exists() &&
          loyaltySettingsSnap.data().enabled === false
        ) {
          setAvailableRewards([]);
          setLoadingAvailableRewards(false);
          return;
        }

        const snapshot = await getDocs(
          query(
            collection(db, "users", auth.currentUser.uid, "redeemedRewards"),
            where("status", "==", "unused")
          )
        );

        const rewards = await Promise.all(
          snapshot.docs.map(async (rewardDoc) => {
            const reward = {
              id: rewardDoc.id,
              ...rewardDoc.data(),
            };

            if (reward.menuItemId) {
              const menuSnap = await getDoc(doc(db, "menu", reward.menuItemId));

              if (menuSnap.exists()) {
                reward.menuItem = {
                  id: menuSnap.id,
                  ...menuSnap.data(),
                };
              }
            }

            return reward;
          })
        );

        setAvailableRewards(rewards);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingAvailableRewards(false);
      }
    }

    loadAvailableRewards();
  }, [loyaltyEnabled]);
  
  useEffect(() => {
    if (status !== "failure" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationFrameId, active = true;

    const resizeCanvas = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    const failureColors = ["#DE6B48", "#1A0B05", "#E6DFD5", "#70645C"];
    const particles = [];

    for (let i = 0; i < 140; i++) {
      particles.push({
        x: canvas.width / 2, y: canvas.height * 0.5, radius: Math.random() * 4 + 3,
        color: failureColors[Math.floor(Math.random() * failureColors.length)],
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

  useEffect(() => {
    if (auth.currentUser?.email) {
      setForm(prev => ({
        ...prev,
        email: auth.currentUser.email,
      }));
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log("FIREBASE AUTH STATE:", {
        uid: user?.uid,
        email: user?.email,
        loggedIn: !!user,
      });
    });

    return unsubscribe;
  }, []);

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

    if (placingOrder) return;

    const user = auth.currentUser;

    console.log("CHECKOUT USER:", {
      uid: user?.uid,
      email: user?.email,
      loggedIn: !!user,
    });

    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    if (!user) {
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

    if (
      deliveryInfo &&
      calculations.subtotal < deliveryInfo.minOrder
    ) {
      alert(`Minimum order for this area is ₹${deliveryInfo.minOrder}.`);
      return;
    }

    setPlacingOrder(true);

    let paymentResponse = null;

    try {
      // =========================================================
      // RAZORPAY ONLINE PAYMENT
      // =========================================================

      if (
        paymentMethod === "online" &&
        calculations.remainingAmount > 0
      ) {
        const razorpayLoaded = await loadRazorpayScript();

        if (!razorpayLoaded) {
          throw new Error("Razorpay SDK failed to load.");
        }

        console.log("RAZORPAY AUTH CHECK:", {
          uid: auth.currentUser?.uid,
          email: auth.currentUser?.email,
          isAuthenticated: !!auth.currentUser,
        });
        console.log("RAZORPAY AMOUNT:", calculations.remainingAmount);

        const razorpayOrderResult = await createRazorpayOrder({
          amount: calculations.remainingAmount,
        });

        console.log("RAZORPAY FUNCTION RESPONSE:", razorpayOrderResult.data);
        const razorpayOrder = razorpayOrderResult.data;

        if (
          !razorpayOrder ||
          !razorpayOrder.success ||
          !razorpayOrder.orderId ||
          !razorpayOrder.keyId
        ) {
          throw new Error("Unable to create Razorpay order.");
        }

        paymentResponse = await new Promise((resolve, reject) => {
          const options = {
            key: razorpayOrder.keyId,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            name: "Brewed Cafe",
            description: "Online Order Settlement",
            order_id: razorpayOrder.orderId,
            handler: function (response) {
              console.log("RAZORPAY PAYMENT SUCCESS:", response);
              resolve(response);
            },
            modal: {
              ondismiss: function () {
                reject(
                  new Error("Payment cancelled by user.")
                );
              },
            },
            prefill: {
              name: form.name,
              email: form.email,
              contact: form.phone,
            },
            theme: {
              color: THEME.colors.primary,
            },
          };

          try {
            const rzp = new window.Razorpay(options);
            rzp.on("payment.failed", function (response) {
              console.error("RAZORPAY PAYMENT FAILED:", response.error);
              reject(
                new Error(
                  response.error?.description || "Razorpay payment failed."
                )
              );
            });
            rzp.open();
          } catch (err) {
            reject(err);
          }
        });
      }

      // =========================================================
      // WALLET / REWARDS
      // =========================================================

      let walletPaid = 0;
      let refreshedWalletBalance = wallet
        ? wallet.balance
        : 0;

      let walletTransaction = null;

      let rewardPaid = 0;
      let refreshedRewardBalance = wallet
        ? wallet.rewardBalance
        : 0;

      if (
        useWallet &&
        calculations.walletDeduction > 0
      ) {
        walletTransaction =
          await walletService.deductMoney({
            userId: auth.currentUser.uid,
            amount: calculations.walletDeduction,
          });

        walletPaid = calculations.walletDeduction;

        refreshedWalletBalance = Math.max(
          0,
          refreshedWalletBalance - walletPaid
        );
      }

      if (
        useRewards &&
        calculations.rewardDeduction > 0
      ) {
        await walletService.redeemReward({
          userId: auth.currentUser.uid,
          amount: calculations.rewardDeduction,
          description: "Reward Redemption",
        });

        rewardPaid = calculations.rewardDeduction;

        refreshedRewardBalance = Math.max(
          0,
          refreshedRewardBalance - rewardPaid
        );
      }

      // =========================================================
      // PAYMENT METHOD
      // =========================================================

      const remainingAmount =
        calculations.remainingAmount;

      const basePaymentLabel =
        paymentMethod === "cod"
          ? "Cash on Delivery"
          : "UPI/Card";

      const finalPaymentMethod =
        walletPaid > 0 || rewardPaid > 0
          ? remainingAmount > 0
            ? `Wallet/Rewards + ${basePaymentLabel}`
            : "Wallet/Rewards"
          : basePaymentLabel;

      // =========================================================
      // CREATE ORDER
      // =========================================================

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
        walletPaid,
        usedWallet: walletPaid > 0,
        walletBalanceBeforePayment: wallet?.balance || 0,
        walletBalanceAfterPayment: refreshedWalletBalance,
        usedRewards: rewardPaid > 0,
        rewardPaid,
        rewardBalanceBeforePayment: wallet?.rewardBalance || 0,
        rewardBalanceAfterPayment: refreshedRewardBalance,
        otherPayment: remainingAmount,
        total: calculations.grandTotal,
        paymentMethod: finalPaymentMethod,
        status: "New",
        walletTransactionId: walletTransaction?.transactionId || null,
        walletPayment: walletPaid,
        walletStatus: walletPaid > 0 ? "PAID" : "NOT_USED",
        paymentStatus: "SUCCESS",
        paymentGateway: paymentMethod === "online" ? "Razorpay" : null,
        paymentReference: paymentResponse?.razorpay_payment_id || null,
        razorpayOrderId: paymentResponse?.razorpay_order_id || null,
        refundStatus: "NOT_REFUNDED",
        loyaltyPointsUsed: selectedReward?.points || 0,
        refundAmount: 0,
        refundTransactionId: null,
        cancelReason: null,
        cancelledAt: null,
        cancelledBy: null,
        selectedReward,
        rewardStatus: rewardPaid > 0 ? "REDEEMED" : "PENDING",
        rewardAmount: rewardPaid,
        rewardCreditedAt: rewardPaid > 0 ? serverTimestamp() : null,
        createdAt: serverTimestamp(),
      };

      const orderId = await placeOrder(orderData);

      // =========================================================
      // LOYALTY POINTS
      // =========================================================

      const loyaltySettingsSnap =
        await getDoc(
          doc(db, "settings", "loyalty")
        );

      if (loyaltySettingsSnap.exists()) {
        const fetchedLoyaltySettings =
          loyaltySettingsSnap.data();

        if (
          fetchedLoyaltySettings.enabled !== false
        ) {
          let earnedPoints =
            Math.floor(
              calculations.subtotal / 100
            ) *
            (
              fetchedLoyaltySettings.pointsPer100 ||
              0
            );

          const today = new Date();

          const campaignActive =
            fetchedLoyaltySettings.seasonalCampaignEnabled &&
            fetchedLoyaltySettings.seasonalStartDate &&
            fetchedLoyaltySettings.seasonalEndDate &&
            today >=
              new Date(
                fetchedLoyaltySettings.seasonalStartDate
              ) &&
            today <=
              new Date(
                fetchedLoyaltySettings.seasonalEndDate
              );

          if (campaignActive) {
            earnedPoints =
              Math.round(
                earnedPoints *
                  (
                    fetchedLoyaltySettings.seasonalMultiplier ||
                    2
                  )
              );
          }

          if (earnedPoints > 0) {
            await runTransaction(
              db,
              async (transaction) => {
                const userRef =
                  doc(
                    db,
                    "users",
                    auth.currentUser.uid
                  );

                const userSnap =
                  await transaction.get(
                    userRef
                  );

                if (userSnap.exists()) {
                  const user =
                    userSnap.data();

                  transaction.update(
                    userRef,
                    {
                      loyaltyPoints:
                        (user.loyaltyPoints || 0) +
                        earnedPoints,

                      lifetimePoints:
                        (user.lifetimePoints || 0) +
                        earnedPoints,

                      totalOrders:
                        (user.totalOrders || 0) +
                        1,
                    }
                  );

                  const txRef =
                    doc(
                      collection(
                        db,
                        "loyaltyTransactions"
                      )
                    );

                  transaction.set(
                    txRef,
                    {
                      userId:
                        auth.currentUser.uid,

                      type:
                        "earned",

                      points:
                        earnedPoints,

                      description:
                        campaignActive
                          ? `🎉 ${fetchedLoyaltySettings.seasonalCampaignName} Bonus`
                          : "Points earned from order",

                      seasonalCampaign:
                        campaignActive
                          ? fetchedLoyaltySettings.seasonalCampaignName
                          : null,

                      orderId,

                      amount:
                        calculations.subtotal,

                      createdAt:
                        serverTimestamp(),
                    }
                  );
                }
              }
            );
          }
        }
      }

      // =========================================================
      // REFRESH WALLET
      // =========================================================

      const updatedWallet =
        await walletService.getWallet(
          auth.currentUser.uid
        );

      setWallet(updatedWallet);

      setUseWallet(false);
      setUseRewards(false);

      // =========================================================
      // SUCCESS
      // =========================================================

      setStatus("success");

    } catch (err) {
      console.error(
        "Critical submission failure:",
        err
      );

      alert(
        err.message ||
        "Unable to complete your order. Please try again."
      );

      setStatus("failure");

    } finally {
      setPlacingOrder(false);
    }
  };

  if (status === "success") {
    return (
      <div style={styles.confirmPage}>
        <canvas ref={canvasRef} style={styles.confettiCanvas} />

        <div style={styles.confirmCard}>
          <h2
            style={{
              ...styles.confirmTitle,
              color: THEME.colors.primary,
            }}
          >
            Payment Successful!
          </h2>

          <p style={styles.confirmSub}>
            Your payment has been processed successfully.
          </p>

          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              marginTop: "24px",
              flexWrap: "wrap",
            }}
          >
            {/* TRACK ORDER */}
            <button
              style={{
                ...styles.payBtn,
                minWidth: "140px",
              }}
              onClick={() => setPage("tracking")}
            >
              Track Order
            </button>

            {/* BACK TO MENU */}
            <button
              style={{
                ...styles.payBtn,
                minWidth: "140px",
                background: "transparent",
                color: THEME.colors.primary,
                border: `1px solid ${THEME.colors.primary}`,
              }}
              onClick={() => {
                setStatus("idle");
                setPage("menu");
              }}
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "failure") {
    return (
      <div style={styles.confirmPage}>
        <canvas ref={canvasRef} style={styles.confettiCanvas} />

        <div style={styles.confirmCard}>
          <h2
            style={{
              ...styles.confirmTitle,
              color: THEME.colors.danger,
            }}
          >
            Payment Failed
          </h2>

          <p style={styles.confirmSub}>
            We couldn't process your transaction.
          </p>

          <button
            style={styles.payBtn}
            onClick={() => {
              setStatus("idle");
              setPage("menu");
            }}
          >
            Return to Menu
          </button>
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

            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>💳 Select Payment Method</h2>

              <div
                style={{
                  background: "#FAF6F0",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16,
                  border: "1px solid #E6DFD5",
                }}
              >
                <h3 style={{ marginTop: 0, color: THEME.colors.textDark, fontSize: "1rem" }}>
                  👛 Brewed Wallet
                </h3>

                {walletLoading ? (
                  <p style={{ fontSize: "0.9rem", color: THEME.colors.textMuted }}>Loading wallet...</p>
                ) : (
                  <>
                    <p style={{ fontSize: "0.95rem", margin: "0.4rem 0" }}>
                      Available Balance: <strong>₹{useWallet && wallet ? Math.max(
  0,
  (wallet?.balance || 0) - calculations.walletDeduction
): (wallet?.balance || 0)}</strong>
                    </p>

                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        cursor: "pointer",
                        fontSize: "0.95rem"
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

                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: "0.95rem", marginTop: 10, }} >
                      <input type="checkbox" checked={useRewards} disabled={!wallet || wallet.rewardBalance <= 0} onChange={(e) => setUseRewards(e.target.checked)} />
                      Use Reward Balance (₹{wallet?.rewardBalance || 0})
                    </label>

                    {useWallet && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: 12,
                          borderRadius: 8,
                          background: "#FFF",
                          border: "1px solid #E6DFD5",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: "0.9rem" }}>
                          <span>Order Total</span>
                          <strong>₹{calculations.baseTotal.toFixed(2)}</strong>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: "0.9rem" }}>
                          <span>Wallet Used</span>
                          <strong>₹{calculations.walletDeduction.toFixed(2)}</strong>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginTop: 8,
                            paddingTop: 8,
                            borderTop: "1px solid #E6DFD5",
                            fontSize: "0.9rem"
                          }}
                        >
                          <strong>Remaining Payment</strong>
                          <strong>₹{calculations.remainingAmount.toFixed(2)}</strong>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>


{!loadingAvailableRewards && availableRewards.length > 0 && (
  <div className="checkout-card">
    <h3>🎁 Available Rewards</h3>

    {availableRewards.map((reward) => (
      <div
        key={reward.id}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 0",
          borderBottom: "1px solid #eee",
        }}
      >
        <div>
          <strong>
  {reward.menuItem?.name
    ? `Free ${reward.menuItem.name}`
    : reward.title}
</strong>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "#777",
            }}
          >
            Status: {reward.status}
          </p>
        </div>

        <input
          type="checkbox"
          checked={selectedReward?.id === reward.id}
          onChange={async () => {
            // Unselect reward
            if (selectedReward?.id === reward.id) {
              setSelectedReward(null);

              removeFromCart(
                cart.find(item => item.rewardId === reward.id)
              );

              return;
            }

            // Select reward
            setSelectedReward(reward);


if (
  reward.menuItemId &&
  !cart.some(item => item.rewardId === reward.id)
) {
  const menuSnap = await getDoc(
    doc(db, "menu", reward.menuItemId)
  );

  if (menuSnap.exists()) {
    const menuItem = {
      ...menuSnap.data(),
      id: menuSnap.id,
      firestoreId: menuSnap.id,
      price: 0,
      qty: 1,
      isReward: true,
      rewardId: reward.id,
    };

    addToCart(menuItem);
  }
}
   
          }}
          style={{
            cursor: "pointer",
            width: "18px",
            height: "18px",
          }}
        />
      </div>
    ))}
  </div>
)}


       
              
              
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
              
              

{selectedReward && (
  <div style={{ ...styles.calcRow, color: THEME.colors.success }}>
    <span>
      🎁 Free {selectedReward.menuItem?.name || selectedReward.title}
    </span>
    <span>FREE</span>
  </div>
)}







              
           
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
              {calculations.rewardDeduction > 0 && ( <div style={{ ...styles.calcRow, color: THEME.colors.success }}> <span>Reward Balance Used</span> <span>-₹{calculations.rewardDeduction}</span> </div> )}
              
              <div style={{ borderTop: `1px solid ${THEME.colors.cardBorder}`, margin: "1rem 0" }} />
              <div style={{ ...styles.calcRow, fontWeight: "bold", fontSize: "1.1rem" }}>
                <span>Grand Total</span>
                <span>₹{calculations.grandTotal}</span>
              </div>

            <button
              type="submit"
              disabled={
                placingOrder ||
                deliveryLoading ||
                !selectedAddress
              }
              style={styles.payBtn}
            >
              {deliveryLoading
                ? "Checking delivery..."
                : placingOrder
                ? "Placing Order..."
                : "Place Order"}
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
