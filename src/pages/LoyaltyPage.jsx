import { useState, useEffect, useCallback, useRef } from "react";
import {
  doc,
  getDoc,
  getDocs,
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  orderBy,
  runTransaction
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
// Phase 5.3: Import birthday reward service
import { checkBirthdayReward } from "../service/birthdayRewardService";
// Phase 5.5: Import loyalty service for centralized settings
import { getLoyaltySettings } from "../service/loyaltyService";

export default function LoyaltyPage({ setPage }) {
  const [loading, setLoading] = useState(true);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [lifetimePoints, setLifetimePoints] = useState(0);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true);
  const [loyaltySettings, setLoyaltySettings] = useState(null);
  
  // Phase 5.2: Added tierSettings state
  const [tierSettings, setTierSettings] = useState({
    silverThreshold: 500,
    goldThreshold: 1500,
    platinumThreshold: 3000,
  });

  const [rewards, setRewards] = useState([]);
  const [activities, setActivities] = useState([]);
  const [successModal, setSuccessModal] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [myRewards, setMyRewards] = useState([]);
  const [loadingRewards, setLoadingRewards] = useState(true);
  const [redeemedRewardData, setRedeemedRewardData] = useState(null);
  const [redeemingRewardId, setRedeemingRewardId] = useState(null);
  
  const rewardsRef = useRef(null);
  const { currentUser } = useAuth();

  const loadLoyaltyData = useCallback(async () => {
    if (!currentUser) return;
    try {
      // Phase 5.3: Check and award birthday points if applicable
      await checkBirthdayReward(currentUser.uid);

      // Phase 5.5: Fetch loyalty settings via centralized service
      const settings = await getLoyaltySettings();

      if (settings) {
        // Calculate whether seasonal campaign is active
        const today = new Date();
        let seasonalCampaignActive = false;
        if (
          settings.seasonalCampaignEnabled &&
          settings.seasonalStartDate &&
          settings.seasonalEndDate
        ) {
          const start = new Date(settings.seasonalStartDate);
          const end = new Date(settings.seasonalEndDate);
          end.setHours(23, 59, 59, 999);
          seasonalCampaignActive = today >= start && today <= end;
        }
        settings.seasonalCampaignActive = seasonalCampaignActive;

        setLoyaltySettings(settings);
        setLoyaltyEnabled(settings.enabled !== false);

        // Phase 5.2: Load dynamic thresholds from settings
        setTierSettings({
          silverThreshold: settings.silverThreshold || 500,
          goldThreshold: settings.goldThreshold || 1500,
          platinumThreshold: settings.platinumThreshold || 3000,
        });
      }

      const userRef = doc(db, "users", currentUser.uid);

      const [userSnap, rewardsSnapshot, txSnapshotResult] = await Promise.all([
        getDoc(userRef),
        getDocs(query(collection(db, "loyaltyRewards"), orderBy("pointsRequired"))),
        getDocs(
          query(
            collection(db, "loyaltyTransactions"),
            where("userId", "==", currentUser.uid),
            orderBy("createdAt", "desc")
          )
        ).catch((txErr) => {
          console.error("Error loading transactions:", txErr);
          return { docs: [] };
        })
      ]);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setLoyaltyPoints(data.loyaltyPoints || 0);
        setLifetimePoints(data.lifetimePoints || 0);
      }

      const rewardsData = rewardsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(r => r.active !== false);

      setRewards(rewardsData);

      const txData = txSnapshotResult.docs.map(doc => {
        const data = doc.data();
        let dateStr = "Recent";
        if (data.createdAt && data.createdAt.toDate) {
          dateStr = data.createdAt.toDate().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric"
          });
        }
        return {
          id: doc.id,
          type: data.type || "earned",
          title: data.description || "Loyalty Event",
          points: data.points || 0,
          date: dateStr,
          icon: data.type === "redeem" ? "🎁" : (data.icon || "☕")
        };
      });
      setActivities(txData);

    } catch (err) {
      console.error("Error loading loyalty data:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const loadRedeemedRewards = useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoadingRewards(true);

      const snapshot = await getDocs(
        query(
          collection(db, "users", currentUser.uid, "redeemedRewards")
        )
      );

      const rewards = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();

          let menuItemName = null;

          if (data.menuItemId) {
            const menuSnap = await getDoc(
              doc(db, "menu", data.menuItemId)
            );

            if (menuSnap.exists()) {
              menuItemName = menuSnap.data().name;
            }
          }

          let expiryDate = null;
          if (data.expiresAt) {
            expiryDate = data.expiresAt.toDate
              ? data.expiresAt.toDate()
              : new Date(data.expiresAt);
          }

          const isExpired = expiryDate ? expiryDate < new Date() : false;

          return {
            id: docSnap.id,
            ...data,
            menuItemName,
            status: isExpired && data.status === "unused" ? "expired" : data.status,
            isExpired,
          };
        })
      );

      setMyRewards(rewards);

    } catch (err) {
      console.error("Error loading redeemed rewards:", err);
    } finally {
      setLoadingRewards(false);
    }
  }, [currentUser]);
  
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    loadRedeemedRewards();
    loadLoyaltyData();
  }, [currentUser, loadLoyaltyData, loadRedeemedRewards]);

  const tierProgressPoints = lifetimePoints;

  // Phase 5.2: Dynamic tier calculation using tierSettings
  const loyaltyTier =
    tierProgressPoints >= tierSettings.platinumThreshold
      ? "Platinum"
      : tierProgressPoints >= tierSettings.goldThreshold
      ? "Gold"
      : tierProgressPoints >= tierSettings.silverThreshold
      ? "Silver"
      : "Bronze";

  const redeemReward = async (reward) => {
    if (!currentUser) {
      setErrorMessage("Please sign in first.");
      setErrorModal(true);
      return;
    }

    // Phase 5.5 Step 3: Check if loyalty program is disabled by admin using service
    const settings = await getLoyaltySettings();

    if (settings && settings.enabled === false) {
      setErrorMessage(
        "Loyalty program is currently unavailable."
      );
      setErrorModal(true);
      return;
    }

    if (redeemingRewardId) return;

    const pointsNeeded = reward.pointsRequired || reward.points || 0;

    if (loyaltyPoints < pointsNeeded) {
      setErrorMessage("Not enough points to redeem this reward.");
      setErrorModal(true);
      return;
    }

    setRedeemingRewardId(reward.id);

    try {
      const userRef = doc(db, "users", currentUser.uid);
      let updatedPoints = loyaltyPoints;

      // Phase 5.4: Fetch admin-configured expiry days dynamically
      let expiryDays = settings?.rewardExpiryDays || 365;

      const expiry = new Date();
      expiry.setDate(expiry.getDate() + expiryDays);

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error("User does not exist!");
        }

        const currentPoints = userDoc.data().loyaltyPoints || 0;
        if (currentPoints < pointsNeeded) {
          throw new Error("Not enough points.");
        }

        updatedPoints = currentPoints - pointsNeeded;

        transaction.update(userRef, {
          loyaltyPoints: updatedPoints,
        });

        const newTxRef = doc(collection(db, "loyaltyTransactions"));
        transaction.set(newTxRef, {
          userId: currentUser.uid,
          type: "redeem",
          points: -pointsNeeded,
          description: reward.title,
          rewardId: reward.id,
          createdAt: serverTimestamp(),
        });

        const redeemedRewardRef = doc(
          collection(db, "users", currentUser.uid, "redeemedRewards")
        );

        const adminRedemptionRef = doc(
          collection(db, "rewardRedemptions")
        );
        
        transaction.set(redeemedRewardRef, {
          rewardId: reward.id,
          rewardTitle: reward.title,
          rewardType: reward.rewardType || null,
          menuItemId: reward.menuItemId || null,
          points: pointsNeeded,
          status: "unused",
          redeemedAt: serverTimestamp(),
          expiresAt: expiry,
        });

        transaction.set(adminRedemptionRef, {
          userId: currentUser.uid,
          customerName: currentUser.displayName || "Customer",
          customerEmail: currentUser.email || "",
          rewardId: reward.id,
          rewardTitle: reward.title,
          rewardType: reward.rewardType || "",
          menuItemId: reward.menuItemId || null,
          customerRewardId: redeemedRewardRef.id,
          points: pointsNeeded,
          status: "unused",
          redeemedAt: serverTimestamp(),
          expiresAt: expiry,
          usedAt: null,
          orderId: null,
        });
      });

      setRedeemedRewardData({
        title: reward.title,
        points: pointsNeeded,
        remaining: updatedPoints,
      });
      setSuccessModal(true);

      await loadLoyaltyData();
      await loadRedeemedRewards();
    } catch (err) {
      console.error("Error redeeming reward:", err);
      setErrorMessage(err.message || "Failed to redeem reward. Please try again.");
      setErrorModal(true);
    } finally {
      setRedeemingRewardId(null);
    }
  };

  const scrollToRewards = () => {
    setSuccessModal(false);
    rewardsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Phase 5.2: Dynamic TIERS array and progress calculation
  const dynamicTiers = [
    { name: "Bronze", min: 0 },
    { name: "Silver", min: tierSettings.silverThreshold },
    { name: "Gold", min: tierSettings.goldThreshold },
    { name: "Platinum", min: tierSettings.platinumThreshold }
  ];

  const currentTier =
    dynamicTiers.find((tier, index) => {
      const next = dynamicTiers[index + 1];
      return (
        tierProgressPoints >= tier.min && (!next || tierProgressPoints < next.min)
      );
    }) || dynamicTiers[0];

  const nextTier =
    dynamicTiers.find(tier => tier.min > tierProgressPoints);

  let calculatedProgress = 100;
  let pointsToNext = 0;

  if (nextTier) {
    calculatedProgress =
      ((tierProgressPoints - currentTier.min) /
        (nextTier.min - currentTier.min)) * 100;

    pointsToNext = nextTier.min - tierProgressPoints;
  }

  const progress = Math.min(100, Math.max(0, calculatedProgress));

  if (!loyaltyEnabled) {
    return (
      <div className="empty-state">
        <h2>
          ☕ Loyalty Program Paused
        </h2>
        <p>
          The loyalty program is temporarily unavailable.
        </p>
      </div>
    );
  }

   return (
    <>
      <style>{`
        .loyalty-page-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
          font-family: inherit;
          color: #333;
        }

        .seasonal-banner {
          background: linear-gradient(135deg, #8B4513 0%, #D4A373 100%);
          color: #fff;
          padding: 20px 24px;
          border-radius: 16px;
          margin-bottom: 24px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.08);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .seasonal-banner h3 {
          margin: 0;
          font-size: 20px;
        }

        .seasonal-banner p {
          margin: 0;
          font-size: 14px;
          opacity: 0.95;
        }

        .seasonal-banner strong {
          font-size: 15px;
          margin-top: 4px;
          background: rgba(0, 0, 0, 0.15);
          padding: 6px 12px;
          border-radius: 8px;
          width: fit-content;
        }

        .loyalty-hero {
          background: linear-gradient(135deg, #2C1810 0%, #4A2E1B 100%);
          border-radius: 20px;
          color: #fff;
          overflow: hidden;
          margin-bottom: 32px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .hero-overlay {
          padding: 32px;
        }

        .hero-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .hero-subtitle {
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: 1.5px;
          color: #D4A373;
          margin-bottom: 4px;
        }

        .hero-title {
          font-size: 28px;
          font-weight: 700;
          margin: 0;
        }

        .my-rewards-section .reward-card {
          margin-bottom: 16px;
        }

        .my-rewards-section .reward-card:last-child {
          margin-bottom: 0;
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .my-rewards-section {
          margin-bottom: 32px;
        }

        .my-rewards-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .coffee-icon {
          font-size: 36px;
          background: rgba(255,255,255,0.1);
          padding: 12px;
          border-radius: 50%;
        }

        .hero-main-flex {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }

        .hero-points-group {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .hero-points {
          font-size: 48px;
          font-weight: 800;
          line-height: 1;
        }

        .hero-label {
          font-size: 16px;
          color: #D4A373;
          align-self: flex-end;
          padding-bottom: 6px;
        }

        .progress-wrapper {
          flex: 1;
          min-width: 280px;
        }

        .progress-track {
          background: rgba(255,255,255,0.2);
          height: 10px;
          border-radius: 5px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          background: #D4A373;
          height: 100%;
          border-radius: 5px;
          transition: width 0.5s ease;
        }

        .progress-text {
          font-size: 13px;
          color: #E0E0E0;
          margin: 0;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 16px;
          border-top: 1px solid rgba(255,255,255,0.1);
          padding-top: 24px;
        }

        .stat-card {
          background: rgba(255,255,255,0.05);
          padding: 16px;
          border-radius: 12px;
          text-align: center;
        }

        .stat-number {
          display: block;
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .stat-title {
          font-size: 12px;
          color: #D4A373;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .membership-card {
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 32px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }

        .membership-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .membership-header h2 {
          font-size: 20px;
          margin: 0 0 4px 0;
        }

        .membership-header p {
          color: #666;
          margin: 0;
          font-size: 14px;
        }

        .tier-badge {
          font-size: 28px;
          background: #F8F3ED;
          padding: 8px;
          border-radius: 50%;
        }

        .benefits-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }

        .benefit-item {
          background: #F9F9F9;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
        }

        .rewards-section {
          margin-bottom: 32px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .section-header h2 {
          font-size: 20px;
          margin: 0;
        }

        .view-all-btn {
          background: none;
          border: none;
          color: #8B4513;
          font-weight: 600;
          cursor: pointer;
        }

        .empty-rewards {
          background: #fff;
          padding: 32px;
          text-align: center;
          border-radius: 12px;
          color: #666;
        }

        .rewards-scroll {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 16px;
        }

        .reward-card {
          background: #fff;
          padding: 20px;
          border-radius: 16px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .reward-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          margin-bottom: 16px;
        }

        .reward-card h3 {
          font-size: 16px;
          margin: 0 0 8px 0;
        }

        .reward-card p {
          font-size: 14px;
          color: #666;
          margin: 0 0 16px 0;
        }

        .redeem-btn {
          width: 100%;
          background: #2C1810;
          color: #fff;
          border: none;
          padding: 10px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
          margin-top: auto;
        }

        .redeem-btn:hover {
          background: #4A2E1B;
        }

        .redeem-btn.disabled {
          background: #E0E0E0;
          color: #888;
          cursor: not-allowed;
        }

        .activity-section {
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 32px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }

        .activity-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #F9F9F9;
          border-radius: 10px;
        }

        .activity-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .activity-icon {
          font-size: 20px;
          background: #fff;
          padding: 8px;
          border-radius: 8px;
        }

        .activity-card h4 {
          font-size: 14px;
          margin: 0 0 2px 0;
        }

        .activity-card span {
          font-size: 12px;
          color: #888;
        }

        .activity-points {
          font-weight: 600;
          font-size: 14px;
        }

        .activity-points.earned {
          color: #2E7D32;
        }

        .activity-points.redeemed {
          color: #C62828;
        }

        .tier-journey {
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 32px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }

        .tier-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 24px;
          position: relative;
        }

        .tier-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 1;
          opacity: 0.5;
          transition: opacity 0.3s;
        }

        .tier-step.active {
          opacity: 1;
        }

        .tier-circle {
          width: 48px;
          height: 48px;
          background: #F8F3ED;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          margin-bottom: 8px;
          border: 2px solid #E0E0E0;
        }

        .tier-step.active .tier-circle {
          border-color: #8B4513;
        }

        .tier-step h4 {
          font-size: 14px;
          margin: 0 0 2px 0;
        }

        .tier-step span {
          font-size: 12px;
          color: #666;
        }

        .tier-connector {
          flex: 1;
          height: 2px;
          background: #E0E0E0;
          margin: 0 -10px;
          transform: translateY(-20px);
        }

        .loyalty-info {
          background: #F8F3ED;
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 32px;
        }

        .loyalty-info h2 {
          text-align: center;
          font-size: 22px;
          margin-bottom: 24px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
        }

        .info-card {
          background: #fff;
          padding: 20px;
          border-radius: 12px;
          text-align: center;
        }

        .info-card span {
          font-size: 28px;
          display: block;
          margin-bottom: 12px;
        }

        .info-card h3 {
          font-size: 16px;
          margin: 0 0 8px 0;
        }

        .info-card p {
          font-size: 13px;
          color: #666;
          margin: 0;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }

        .modal-content {
          background: #fff;
          padding: 32px;
          border-radius: 20px;
          width: 100%;
          max-width: 360px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .modal-icon {
          font-size: 40px;
          margin-bottom: 16px;
        }

        .modal-content h3 {
          font-size: 20px;
          margin: 0 0 8px 0;
        }

        .modal-reward-title {
          font-weight: 600;
          color: #2C1810;
          margin: 0 0 4px 0;
        }

        .modal-deduction {
          font-size: 13px;
          color: #666;
          margin: 0 0 16px 0;
        }

        .modal-remaining {
          background: #F9F9F9;
          padding: 12px;
          border-radius: 8px;
          font-size: 14px;
          margin-bottom: 24px;
        }

        .modal-remaining span {
          font-weight: 700;
          color: #2C1810;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
        }

        .modal-btn {
          flex: 1;
          padding: 12px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          border: none;
        }

        .modal-btn.primary {
          background: #2C1810;
          color: #fff;
        }

        .modal-btn.secondary {
          background: #F0E6DD;
          color: #2C1810;
        }
        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.12);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.2);
          padding: 10px 16px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 24px;
          transition: all 0.2s ease;
        }

        .back-btn:hover {
          background: rgba(255,255,255,0.2);
        }

        .shimmer {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .skeleton-hero {
          height: 200px;
          border-radius: 20px;
          margin-bottom: 24px;
        }

        .skeleton-card {
          height: 120px;
          border-radius: 16px;
          margin-bottom: 16px;
        }
      `}</style>

      <button
        className="back-btn"
        onClick={() => setPage("menu")}
      >
        ← Back
      </button>

      {loading ? (
        <div className="loyalty-page-container">
          <div className="skeleton-hero shimmer"></div>
          <div className="skeleton-card shimmer"></div>
          <div className="skeleton-card shimmer"></div>
        </div>
      ) : (
        <div className="loyalty-page-container">
          {/* Seasonal Campaign Banner */}
          {loyaltySettings?.seasonalCampaignActive && (
            <div className="seasonal-banner">
              <h3>🎉 {loyaltySettings.seasonalCampaignName}</h3>
              <p>{loyaltySettings.seasonalCampaignDescription}</p>
              <strong>{loyaltySettings.seasonalMultiplier}× Points on every order!</strong>
            </div>
          )}

          <div className="loyalty-hero">
            <div className="hero-overlay">

              <div className="hero-top">
                <div>
                  <p className="hero-subtitle">Brewed Loyalty</p>
                  <h1 className="hero-title">
                    {loyaltyTier === "Bronze" && "🥉"}
                    {loyaltyTier === "Silver" && "🥈"}
                    {loyaltyTier === "Gold" && "🥇"}
                    {loyaltyTier === "Platinum" && "💎"}{" "}
                    {loyaltyTier} Member
                  </h1>
                </div>

                <div className="coffee-icon">☕</div>
              </div>

              <div className="hero-main-flex">
                <div>
                  <div className="hero-points-group">
                    <span className="hero-points">{loyaltyPoints.toLocaleString()}</span>
                    <span className="hero-label">Points</span>
                  </div>
                </div>

                <div className="progress-wrapper">
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>

                  <p className="progress-text">
                    {nextTier
                      ? `${pointsToNext} points until ${nextTier.name}`
                      : "Highest Tier Achieved 🎉"}
                  </p>
                </div>
              </div>

              <div className="stats-grid">

                <div className="stat-card">
                  <span className="stat-number">
                    {loyaltyPoints.toLocaleString()}
                  </span>
                  <span className="stat-title">
                    Current Points
                  </span>
                </div>

                <div className="stat-card">
                  <span className="stat-number">
                    {lifetimePoints.toLocaleString()}
                  </span>
                  <span className="stat-title">
                    Lifetime
                  </span>
                </div>

                <div className="stat-card">
                  <span className="stat-number">
                    {nextTier ? nextTier.name : "MAX"}
                  </span>
                  <span className="stat-title">
                    Next Tier
                  </span>
                </div>

                <div className="stat-card">
                  <span className="stat-number">
                    {nextTier ? `${pointsToNext} pts left` : "Maxed"}
                  </span>
                  <span className="stat-title">
                    {nextTier ? `${nextTier.name} Goal` : "Status"}
                  </span>
                </div>

              </div>

            </div>
          </div>

          <div className="membership-card">

            <div className="membership-header">
              <div>
                <h2>Your Membership</h2>
                <p>{loyaltyTier} Member</p>
              </div>

              <div className="tier-badge">
                {loyaltyTier === "Bronze" && "🥉"}
                {loyaltyTier === "Silver" && "🥈"}
                {loyaltyTier === "Gold" && "🥇"}
                {loyaltyTier === "Platinum" && "💎"}
              </div>
            </div>

            <div className="benefits-list">

              <div className="benefit-item">
                ☕ Earn {loyaltyTier === "Bronze"
                  ? "5"
                  : loyaltyTier === "Silver"
                  ? "10"
                  : loyaltyTier === "Gold"
                  ? "15"
                  : "20"} points per ₹100 spent
              </div>

              <div className="benefit-item">
                🎂 Birthday Reward
              </div>

              <div className="benefit-item">
                🎁 Exclusive Member Offers
              </div>

              <div className="benefit-item">
                🚀 Early Access to Seasonal Drinks
              </div>

              {loyaltyTier === "Gold" || loyaltyTier === "Platinum" ? (
                <div className="benefit-item">
                  🚚 Free Delivery Days
                </div>
              ) : null}

              {loyaltyTier === "Platinum" ? (
                <div className="benefit-item">
                  💎 Platinum Exclusive Menu
                </div>
              ) : null}

            </div>

          </div>

          <div ref={rewardsRef} className="rewards-section">
            <div className="section-header">
              <h2>Available Rewards</h2>
              <button className="view-all-btn"
                onClick={() => rewardsRef.current?.scrollIntoView({behavior:"smooth"})}>
                View All →
              </button>
            </div>
            
            {/* Render available rewards grid */}
            <div className="rewards-scroll">
              {rewards.length === 0 ? (
                <div className="empty-rewards" style={{ gridColumn: "1 / -1" }}>
                  <p>No rewards available right now. Check back later!</p>
                </div>
              ) : (
                rewards.map((reward) => (
                  <div key={reward.id} className="reward-card">
                    <div className="reward-icon" style={{ background: "#F8F3ED" }}>
                      {reward.icon || "🎁"}
                    </div>
                    <h3>{reward.title}</h3>
                    <p>{reward.pointsRequired} Points</p>
                    <button
                      className={`redeem-btn ${loyaltyPoints < (reward.pointsRequired || 0) ? "disabled" : ""}`}
                      onClick={() => redeemReward(reward)}
                      disabled={redeemingRewardId === reward.id || loyaltyPoints < (reward.pointsRequired || 0)}
                    >
                      {redeemingRewardId === reward.id ? "Redeeming..." : "Redeem"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="my-rewards-section">
            <div className="section-header">
              <h2>🎁 My Rewards</h2>
              <p>Your redeemed rewards.</p>
            </div>

            {loadingRewards ? (
              <p>Loading rewards...</p>
            ) : myRewards.length === 0 ? (
              <p>No redeemed rewards yet.</p>
            ) : (
              myRewards.map((reward) => (
                <div key={reward.id} className="reward-card">
                  <h3>
                    {reward.menuItemName
                      ? `Free ${reward.menuItemName}`
                      : reward.title}
                  </h3>

                  <p>
                    <strong>Status:</strong>{" "}
                    {reward.status === "unused" ? "Available" : "Used"}
                  </p>

                  <p>
                    <strong>Expires:</strong>{" "}
                    {reward.expiresAt?.toDate
                      ? reward.expiresAt.toDate().toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="activity-section">
            <div className="section-header">
              <h2>Loyalty Activity</h2>
            </div>
            
            <div className="activity-list">
              {activities.length === 0 ? (
                <p style={{ color: "#777" }}>No recent activity found.</p>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="activity-card">
                    <div className="activity-left">
                      <div className="activity-icon">
                        {activity.icon}
                      </div>
                      <div>
                        <h4>{activity.title}</h4>
                        <span>{activity.date}</span>
                      </div>
                    </div>
                    
                    <div
                      className={
                        activity.points > 0
                          ? "activity-points earned"
                          : "activity-points redeemed"
                      }
                    >
                      {activity.points > 0 ? "+" : ""}
                      {activity.points} pts
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="tier-journey">
            <div className="section-header">
              <h2>Tier Journey</h2>
              <p>Unlock more benefits as you earn points.</p>
            </div>

            <div className="tier-line">
              <div className={`tier-step ${tierProgressPoints >= 0 ? "active" : ""}`}>
                <div className="tier-circle">🥉</div>
                <h4>Bronze</h4>
                <span>0 pts</span>
              </div>

              <div className="tier-connector" />

              <div className={`tier-step ${tierProgressPoints >= 500 ? "active" : ""}`}>
                <div className="tier-circle">🥈</div>
                <h4>Silver</h4>
                <span>500 pts</span>
              </div>

              <div className="tier-connector" />

              <div className={`tier-step ${tierProgressPoints >= 1500 ? "active" : ""}`}>
                <div className="tier-circle">🥇</div>
                <h4>Gold</h4>
                <span>1500 pts</span>
              </div>

              <div className="tier-connector" />

              <div className={`tier-step ${tierProgressPoints >= 3000 ? "active" : ""}`}>
                <div className="tier-circle">💎</div>
                <h4>Platinum</h4>
                <span>3000 pts</span>
              </div>
            </div>
          </div>

          <div className="loyalty-info">
            <h2>How Brewed Loyalty Works</h2>

            <div className="info-grid">
              <div className="info-card">
                <span>☕</span>
                <h3>Earn</h3>
                <p>Collect loyalty points every time you place an order.</p>
              </div>

              <div className="info-card">
                <span>🎁</span>
                <h3>Redeem</h3>
                <p>Use your points for free drinks, food and exclusive rewards.</p>
              </div>

              <div className="info-card">
                <span>🏆</span>
                <h3>Upgrade</h3>
                <p>Reach higher tiers to unlock even better benefits.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {successModal && redeemedRewardData && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon">🎉</div>
            <h3>Reward Redeemed!</h3>
            <p className="modal-reward-title">{redeemedRewardData.title}</p>
            <p className="modal-deduction">{redeemedRewardData.points} points deducted</p>
            
            <div className="modal-remaining">
              Remaining Points: <span>{redeemedRewardData.remaining}</span>
            </div>

            <div className="modal-actions">
              <button 
                className="modal-btn secondary"
                onClick={scrollToRewards}
              >
                View Rewards
              </button>
              <button 
                className="modal-btn primary"
                onClick={() => setSuccessModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {errorModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon">⚠️</div>
            <h3>Unable to Redeem</h3>
            <p className="modal-deduction" style={{ color: "#C62828" }}>{errorMessage}</p>

            <div className="modal-actions">
              <button 
                className="modal-btn primary"
                onClick={() => setErrorModal(false)}
                style={{ width: "100%" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
