import React, { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, doc, collection, getDoc, setDoc, updateDoc, 
  addDoc, query, orderBy, onSnapshot, serverTimestamp 
} from 'firebase/firestore';
import { 
  FiPlus, FiClock, FiGift, FiCoffee, FiRotateCcw, 
  FiSliders, FiPieChart 
} from 'react-icons/fi';





// ==========================================
// 🛠️ FIREBASE SERVICE UTILITIES
// ==========================================
const initializeWallet = async (userId) => {
  const walletRef = doc(db, 'users_wallet', userId);
  const snap = await getDoc(walletRef);
  if (!snap.exists()) {
    await setDoc(walletRef, {
      availableBalance: 0.00,
      promotionalBalance: 0.00,
      pendingRefunds: 0.00,
      settings: {
        autoUseWallet: true,
        showPromoSeparately: false,
        notifications: true
      },
      insights: {
        totalAdded: 0.00,
        totalSpent: 0.00,
        totalRefundsReceived: 0.00,
        totalPromosEarned: 0.00,
        totalSaved: 0.00
      }
    });
  }
};

const addMoneyToWallet = async (userId, amount, method) => {
  const walletRef = doc(db, 'users_wallet', userId);
  const walletSnap = await getDoc(walletRef);
  const currentData = walletSnap.data();

  const newBalance = (currentData.availableBalance || 0) + Number(amount);
  const newTotalAdded = (currentData.insights?.totalAdded || 0) + Number(amount);

  await updateDoc(walletRef, {
    availableBalance: newBalance,
    'insights.totalAdded': newTotalAdded
  });

  await addDoc(collection(db, `users_wallet/${userId}/transactions`), {
    type: 'ADD_MONEY',
    amount: Number(amount),
    method: method, 
    status: 'SUCCESS',
    title: `Added via ${method}`,
    createdAt: serverTimestamp()
  });
};

const updateWalletSettings = async (userId, newSettings) => {
  const walletRef = doc(db, 'users_wallet', userId);
  await updateDoc(walletRef, { settings: newSettings });
};

// ==========================================
// 💻 MAIN REACT COMPONENT
// ==========================================
export default function WalletPage({ userId = "default_user_123", setPage }) {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [promos, setPromos] = useState([]);
  
  const [activeModal, setActiveModal] = useState(null); 
  const [addAmount, setAddAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    if (!userId) return;
    initializeWallet(userId);

    const unsubWallet = onSnapshot(doc(db, 'users_wallet', userId), (docSnap) => {
      if (docSnap.exists()) setWallet(docSnap.data());
    });

    const unsubTx = onSnapshot(query(collection(db, `users_wallet/${userId}/transactions`), orderBy('createdAt', 'desc')), (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubPromos = onSnapshot(query(collection(db, `users_wallet/${userId}/promotional_credits`)), (snapshot) => {
      setPromos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubWallet();
      unsubTx();
      unsubPromos();
    };
  }, [userId]);

  if (!wallet) return <div style={styles.loading}>Loading Cafe Wallet...</div>;

  const handleAddMoneySubmit = async () => {
    if (!addAmount || isNaN(addAmount) || addAmount <= 0) return alert('Enter a valid amount');
    try {
      await addMoneyToWallet(userId, addAmount, paymentMethod);
      setAddAmount('');
      setActiveModal(null);
      alert('Money added successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to add money');
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filterType === 'ALL') return true;
    if (filterType === 'ADD' && tx.type === 'ADD_MONEY') return true;
    if (filterType === 'SPEND' && tx.type === 'ORDER_PAYMENT') return true;
    if (filterType === 'REFUND' && tx.type === 'REFUND') return true;
    if (filterType === 'PROMO' && tx.type === 'PROMO_CREDIT') return true;
    return false;
  });

  return (
    <div style={styles.container}>
      
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>☕ Cafe Wallet</h2>
        <div style={styles.headerActions}>
          <button style={styles.iconBtn} onClick={() => setActiveModal('insights')}><FiPieChart size={18} /></button>
          <button style={styles.iconBtn} onClick={() => setActiveModal('settings')}><FiSliders size={18} /></button>
        </div>
      </div>

      {/* 💰 Wallet Balance Card */}
      <div style={styles.balanceCard}>
        <div style={styles.balanceMainRow}>
          <div>
            <span style={styles.balanceLabel}>Available Balance</span>
            <h1 style={styles.balanceAmount}>₹{wallet.availableBalance.toFixed(2)}</h1>
          </div>
          <button style={styles.addMoneyBtn} onClick={() => setActiveModal('addMoney')}>
            <FiPlus /> Add Money
          </button>
        </div>

        <div style={styles.divider} />

        <div style={styles.balanceSubRow}>
          <span>Promotional: <strong style={styles.highlight}>₹{wallet.promotionalBalance.toFixed(2)}</strong></span>
          {wallet.pendingRefunds > 0 && (
            <span style={styles.pendingBadge}>⏳ Pending Refund: ₹{wallet.pendingRefunds}</span>
          )}
        </div>
      </div>

      {/* 💸 Pending Refund Tracker Banner */}
      {wallet.pendingRefunds > 0 && (
        <div style={styles.refundBanner}>
          <FiClock color="#d97706" size={20} />
          <div>
            <strong>Active Refund Tracker</strong>
            <p style={{margin: '2px 0 0 0'}}>₹{wallet.pendingRefunds} is currently processing back to your wallet.</p>
          </div>
        </div>
      )}

      {/* 🎁 Promotional Credits Section */}
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>🎁 Promos & Rewards ({promos.length})</h3>
      </div>
      <div style={styles.promoScroll}>
        {promos.length === 0 ? (
          <p style={styles.emptyText}>No active promotional credits available.</p>
        ) : (
          promos.map(promo => (
            <div key={promo.id} style={styles.promoCard}>
              <div style={styles.promoTop}>
                <span style={styles.promoTitle}>{promo.title}</span>
                <span style={styles.promoAmount}>+₹{promo.amount}</span>
              </div>
              <p style={styles.promoReason}>{promo.reason || 'Special Perk'}</p>
              <p style={styles.promoTerms}>{promo.terms || 'Valid on orders above ₹299'}</p>
              <span style={styles.promoExpiry}>Expires: {promo.expiryDate}</span>
            </div>
          ))
        )}
      </div>

      {/* 📜 Transaction History & Filters */}
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>📜 Transaction History</h3>
      </div>
      <div style={styles.filterChips}>
        {['ALL', 'ADD', 'SPEND', 'REFUND', 'PROMO'].map(type => (
          <button 
            key={type} 
            style={{
              ...styles.chip, 
              ...(filterType === type ? styles.chipActive : {})
            }}
            onClick={() => setFilterType(type)}
          >
            {type}
          </button>
        ))}
      </div>

      <div style={styles.txList}>
        {filteredTransactions.length === 0 ? (
          <p style={styles.emptyText}>No transactions found for this filter.</p>
        ) : (
          filteredTransactions.map(tx => (
            <div key={tx.id} style={styles.txItem}>
              <div style={styles.txLeft}>
                <div style={styles.txIcon}>
                  {tx.type === 'PROMO_CREDIT' && <FiGift size={16} />}
                  {tx.type === 'REFUND' && <FiRotateCcw size={16} />}
                  {tx.type === 'ORDER_PAYMENT' && <FiCoffee size={16} />}
                  {tx.type === 'ADD_MONEY' && <FiPlus size={16} />}
                </div>
                <div>
                  <h4 style={styles.txTitle}>{tx.title}</h4>
                  <span style={styles.txDate}>
                    {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleString() : 'Just now'}
                  </span>
                </div>
              </div>
              <span style={{
                ...styles.txAmount,
                color: ['ADD_MONEY', 'REFUND', 'PROMO_CREDIT'].includes(tx.type) ? '#059669' : '#1e293b'
              }}>
                {['ADD_MONEY', 'REFUND', 'PROMO_CREDIT'].includes(tx.type) ? `+₹${tx.amount}` : `-₹${tx.amount}`}
              </span>
            </div>
          ))
        )}
      </div>

      {/* ➕ Add Money Modal */}
      {activeModal === 'addMoney' && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>Add Money to Wallet</h3>
            <p style={styles.modalSub}>Select your preferred payment mode</p>
            
            <div style={styles.paymentMethodsGrid}>
              {['UPI', 'Debit Card', 'Credit Card', 'Net Banking'].map(m => (
                <button 
                  key={m} 
                  style={{
                    ...styles.pmBtn,
                    ...(paymentMethod === m ? styles.pmBtnSelected : {})
                  }}
                  onClick={() => setPaymentMethod(m)}
                >
                  {m}
                </button>
              ))}
            </div>

            <div style={styles.quickAmounts}>
              {[100, 250, 500, 1000].map(amt => (
                <button key={amt} style={styles.quickAmtBtn} onClick={() => setAddAmount(amt)}>₹{amt}</button>
              ))}
            </div>
            
            <input 
              type="number" 
              placeholder="Enter custom amount" 
              value={addAmount} 
              onChange={(e) => setAddAmount(e.target.value)} 
              style={styles.input}
            />

            <div style={styles.modalActions}>
              <button style={styles.btnSecondary} onClick={() => setActiveModal(null)}>Cancel</button>
              <button style={styles.btnPrimary} onClick={handleAddMoneySubmit}>Proceed via {paymentMethod}</button>
            </div>
          </div>
        </div>
      )}

      {/* 📊 Wallet Insights Modal */}
      {activeModal === 'insights' && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>📊 Wallet Insights</h3>
            <p style={styles.modalSub}>Your lifetime savings and spending summary</p>
            <div style={styles.insightsGrid}>
              <div style={styles.insightBox}><span>Total Added</span><h4>₹{wallet.insights?.totalAdded || 0}</h4></div>
              <div style={styles.insightBox}><span>Total Spent</span><h4>₹{wallet.insights?.totalSpent || 0}</h4></div>
              <div style={styles.insightBox}><span>Refunds Got</span><h4>₹{wallet.insights?.totalRefundsReceived || 0}</h4></div>
              <div style={styles.insightBox}><span>Promos Earned</span><h4>₹{wallet.insights?.totalPromosEarned || 0}</h4></div>
            </div>
            <div style={styles.savingsHighlight}>
              🎉 Total Lifetime Savings: <strong>₹{wallet.insights?.totalSaved || 0}</strong>
            </div>
            <button style={{...styles.btnPrimary, width: '100%', marginTop: '10px'}} onClick={() => setActiveModal(null)}>Close</button>
          </div>
        </div>
      )}

      {/* ⚙️ Wallet Settings Modal */}
      {activeModal === 'settings' && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>⚙️ Wallet Settings</h3>
            <div style={styles.settingToggle}>
              <span>Auto-use wallet balance at checkout</span>
              <input 
                type="checkbox" 
                checked={wallet.settings?.autoUseWallet ?? true} 
                onChange={(e) => updateWalletSettings(userId, { ...wallet.settings, autoUseWallet: e.target.checked })} 
              />
            </div>
            <div style={styles.settingToggle}>
              <span>Show promotional credits separately</span>
              <input 
                type="checkbox" 
                checked={wallet.settings?.showPromoSeparately ?? false} 
                onChange={(e) => updateWalletSettings(userId, { ...wallet.settings, showPromoSeparately: e.target.checked })} 
              />
            </div>
            <div style={styles.settingToggle}>
              <span>Transaction push notifications</span>
              <input 
                type="checkbox" 
                checked={wallet.settings?.notifications ?? true} 
                onChange={(e) => updateWalletSettings(userId, { ...wallet.settings, notifications: e.target.checked })} 
              />
            </div>
            <button style={{...styles.btnPrimary, width: '100%', marginTop: '20px'}} onClick={() => setActiveModal(null)}>Save Settings</button>
          </div>
        </div>
      )}

    </div>
  );
}

// ==========================================
// 🎨 INLINE STYLES (Clean & Mobile-Friendly)
// ==========================================
const styles = {
  container: { maxWidth: '500px', margin: '0 auto', padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', boxSizing: 'border-box' },
  loading: { textAlign: 'center', padding: '50px', fontSize: '16px', color: '#64748b' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  title: { fontSize: '20px', color: '#1e293b', margin: 0 },
  headerActions: { display: 'flex', gap: '8px' },
  iconBtn: { background: '#fff', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '8px', cursor: 'pointer' },
  balanceCard: { background: '#0f172a', color: '#fff', padding: '20px', borderRadius: '16px', marginBottom: '16px' },
  balanceMainRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { fontSize: '12px', color: '#94a3b8' },
  balanceAmount: { fontSize: '28px', fontWeight: '700', margin: '2px 0 0 0' },
  addMoneyBtn: { background: '#10b981', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' },
  divider: { height: '1px', backgroundColor: '#334155', margin: '16px 0' },
  balanceSubRow: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1' },
  highlight: { color: '#34d399' },
  pendingBadge: { color: '#fbbf24' },
  refundBanner: { backgroundColor: '#fef3c7', border: '1px solid #f59e0b', color: '#92400e', padding: '10px 14px', borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'center', fontSize: '12px', marginBottom: '16px' },
  sectionHeader: { margin: '18px 0 10px 0' },
  sectionTitle: { fontSize: '15px', color: '#1e293b', margin: 0 },
  promoScroll: { display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' },
  promoCard: { backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '10px', minWidth: '200px', boxSizing: 'border-box' },
  promoTop: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' },
  promoTitle: { fontWeight: '600', fontSize: '12px', color: '#334155' },
  promoAmount: { fontWeight: '700', color: '#059669', fontSize: '13px' },
  promoReason: { fontSize: '11px', color: '#475569', margin: '0 0 2px 0' },
  promoTerms: { fontSize: '10px', color: '#64748b', margin: 0 },
  promoExpiry: { fontSize: '9px', color: '#d97706', display: 'block', marginTop: '6px' },
  filterChips: { display: 'flex', gap: '6px', marginBottom: '12px', overflowX: 'auto' },
  chip: { backgroundColor: '#e2e8f0', border: 'none', padding: '6px 12px', borderRadius: '16px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', color: '#475569' },
  chipActive: { backgroundColor: '#0f172a', color: '#fff' },
  txList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  txItem: { backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  txLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  txIcon: { width: '32px', height: '32px', backgroundColor: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' },
  txTitle: { fontSize: '13px', fontWeight: '500', color: '#1e293b', margin: 0 },
  txDate: { fontSize: '10px', color: '#94a3b8', display: 'block', marginTop: '2px' },
  txAmount: { fontWeight: '700', fontSize: '13px' },
  emptyText: { fontSize: '12px', color: '#64748b', margin: 0 },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 100 },
  modalContent: { backgroundColor: '#fff', padding: '20px', borderRadius: '16px', width: '100%', maxWidth: '380px', boxSizing: 'border-box' },
  modalSub: { color: '#64748b', fontSize: '12px', margin: '4px 0 14px 0' },
  paymentMethodsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' },
  pmBtn: { padding: '8px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' },
  pmBtnSelected: { backgroundColor: '#0f172a', color: '#fff', borderColor: '#0f172a' },
  quickAmounts: { display: 'flex', gap: '6px', marginBottom: '10px' },
  quickAmtBtn: { flex: 1, padding: '6px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' },
  input: { width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '14px', fontSize: '14px', boxSizing: 'border-box' },
  modalActions: { display: 'flex', gap: '8px' },
  btnPrimary: { flex: 1, backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  btnSecondary: { backgroundColor: '#e2e8f0', border: 'none', padding: '10px 14px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  insightsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' },
  insightBox: { backgroundColor: '#f1f5f9', padding: '10px', borderRadius: '8px', textAlign: 'center' },
  insightBoxSpan: { fontSize: '10px', color: '#64748b', display: 'block' },
  savingsHighlight: { backgroundColor: '#ecfdf5', color: '#065f46', padding: '10px', borderRadius: '8px', fontSize: '12px', textAlign: 'center', marginBottom: '12px' },
  settingToggle: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#334155', marginBottom: '12px' }
};
