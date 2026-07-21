import React, { useState, useEffect } from 'react';
import { 
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, 
  serverTimestamp, query, orderBy, writeBatch 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Home, Briefcase, MapPin, Plus, Search, Trash2, Edit, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

const addressesCollectionRef = collection(db, 'addresses');

export default function AddressPage({setPage}) {
  const [addresses, setAddresses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAddress, setCurrentAddress] = useState(null); 
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [selectedCheckoutAddress, setSelectedCheckoutAddress] = useState(
    localStorage.getItem('lastSelectedAddress') || null
  );

  // Styles Object (All inline CSS consolidated inside the component)
  const styles = {
    pageWrapper: {
      backgroundColor: '#f8fafc',
      minHeight: '100vh',
      padding: '30px 16px',
      boxSizing: 'border-box',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    container: {
      width: '100%',
      maxWidth: '820px',
      backgroundColor: '#ffffff',
      borderRadius: '24px',
      padding: '32px',
      boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
      boxSizing: 'border-box'
    },
    toast: {
      position: 'fixed', top: '20px', right: '20px', zIndex: 1000,
      display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px',
      borderRadius: '12px', color: 'white', fontWeight: 500, fontSize: '14px',
      backgroundColor: toast?.type === 'success' ? '#16a34a' : '#e11d48',
      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
    },
    headerRow: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      flexWrap: 'wrap', gap: '16px', marginBottom: '24px'
    },
    title: { fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 4px 0' },
    subtitle: { fontSize: '14px', color: '#64748b', margin: 0 },
    actionsContainer: { display: 'flex', gap: '8px', alignItems: 'center' },
    refreshBtn: {
      padding: '10px', background: 'white', border: '1px solid #cbd5e1',
      borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#475569'
    },
    addBtn: {
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
      backgroundColor: '#4f46e5', color: 'white', border: 'none', padding: '10px 16px',
      borderRadius: '12px', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
      boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)', whiteSpace: 'nowrap'
    },
    searchWrapper: { position: 'relative', marginBottom: '24px' },
    searchIcon: { position: 'absolute', left: '14px', top: '12px', color: '#94a3b8' },
    searchInput: {
      width: '100%', padding: '10px 14px 10px 42px', backgroundColor: 'white',
      border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '14px',
      outline: 'none', boxSizing: 'border-box'
    },
    emptyState: {
      textAlign: 'center', padding: '64px 20px', backgroundColor: '#ffffff',
      borderRadius: '16px', border: '2px dashed #cbd5e1'
    },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' },
    card: (isSelected, isDefault) => ({
      backgroundColor: isSelected ? '#f5f3ff' : '#ffffff',
      borderRadius: '16px', padding: '20px',
      border: isDefault ? '2px solid #4f46e5' : '1px solid #e2e8f0',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      boxSizing: 'border-box'
    }),
    modalOverlay: {
      position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(15, 23, 42, 0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', boxSizing: 'border-box'
    },
    modalContent: {
      backgroundColor: 'white', borderRadius: '20px', maxWidth: '500px', width: '100%',
      padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh',
      overflowY: 'auto', boxSizing: 'border-box'
    },
    inputField: {
      width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1',
      borderRadius: '10px', fontSize: '13px', boxSizing: 'border-box', outline: 'none'
    },
    labelStyle: { display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const q = query(addressesCollectionRef, orderBy('isDefault', 'desc'), orderBy('createdAt', 'desc'));
      const data = await getDocs(q);
      setAddresses(data.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      showToast('Failed to fetch addresses', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    if (data.pincode.startsWith('9')) {
      showToast('Sorry, delivery is not available for this PIN code.', 'error');
      return; 
    }

    try {
      const snapshot = await getDocs(addressesCollectionRef);
      const isFirstAddress = snapshot.size === 0;
      const batch = writeBatch(db);

      if (isFirstAddress) {
        data.isDefault = true;
      } else if (data.isDefault === 'true' || data.isDefault === true) {
        snapshot.docs.forEach((docItem) => {
          if (!currentAddress || docItem.id !== currentAddress.id) {
            batch.update(docItem.ref, { isDefault: false });
          }
        });
        data.isDefault = true;
      } else {
        data.isDefault = false;
      }

      if (currentAddress) {
        const docRef = doc(db, 'addresses', currentAddress.id);
        batch.update(docRef, data);
        await batch.commit();
        showToast('Address updated successfully');
      } else {
        await batch.commit();
        await addDoc(addressesCollectionRef, {
          ...data,
          createdAt: serverTimestamp()
        });
        showToast('Address added successfully');
      }

      setIsModalOpen(false);
      setCurrentAddress(null);
      fetchAddresses();
    } catch (err) {
      showToast('Failed to save address', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      const targetDocRef = doc(db, 'addresses', id);
      const targetAddress = addresses.find(a => a.id === id);
      
      await deleteDoc(targetDocRef);

      if (targetAddress?.isDefault) {
        const remaining = addresses.filter(a => a.id !== id);
        if (remaining.length > 0) {
          const nextDefaultRef = doc(db, 'addresses', remaining[0].id);
          await updateDoc(nextDefaultRef, { isDefault: true });
        }
      }

      showToast('Address deleted successfully');
      setDeleteConfirmId(null);
      fetchAddresses();
    } catch (err) {
      showToast('Could not delete address', 'error');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      const snapshot = await getDocs(addressesCollectionRef);
      const batch = writeBatch(db);

      snapshot.docs.forEach((docItem) => {
        batch.update(docItem.ref, { isDefault: docItem.id === id });
      });

      await batch.commit();
      showToast('Default address updated');
      fetchAddresses();
    } catch (err) {
      showToast('Error setting default address', 'error');
    }
  };

  const handleSelectForCheckout = (id) => {
    setSelectedCheckoutAddress(id);
    localStorage.setItem('lastSelectedAddress', id);
    showToast('Delivery address selected');
  };

  const filteredAddresses = addresses.filter(addr => 
    addr.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    addr.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    addr.pincode?.includes(searchQuery) ||
    addr.locality?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.container}>
        
        {/* Toast Notification */}
        {toast && (
          <div style={styles.toast}>
            {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Header & Controls */}
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>📍 Address Book</h1>
            <p style={styles.subtitle}>Manage your shipping and billing locations</p>
          </div>
          <div style={styles.actionsContainer}>
            <button 
              onClick={fetchAddresses} 
              style={styles.refreshBtn}
              title="Refresh"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => { setCurrentAddress(null); setIsModalOpen(true); }}
              style={styles.addBtn}
            >
              <Plus size={18} /> Add New Address
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div style={styles.searchWrapper}>
          <Search style={styles.searchIcon} size={18} />
          <input
            type="text"
            placeholder="Search by name, city, locality, or PIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {/* Empty State */}
        {filteredAddresses.length === 0 && !loading && (
          <div style={styles.emptyState}>
            <MapPin style={{ margin: '0 auto 12px auto', color: '#cbd5e1' }} size={48} />
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#334155', margin: '0 0 4px 0' }}>No addresses found</h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 16px 0' }}>Add a new delivery address to get started.</p>
            <button
              onClick={() => { setCurrentAddress(null); setIsModalOpen(true); }}
              style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', border: 'none', fontWeight: 500, padding: '8px 16px', borderRadius: '12px', fontSize: '14px', cursor: 'pointer' }}
            >
              Add Address
            </button>
          </div>
        )}

        {/* Address Cards Grid */}
        <div style={styles.grid}>
          {filteredAddresses.map((addr) => {
            const isSelected = selectedCheckoutAddress === addr.id;
            return (
              <div key={addr.id} style={styles.card(isSelected, addr.isDefault)}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ padding: '6px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '8px', display: 'flex' }}>
                        {addr.label === 'Home' && <Home size={16} />}
                        {addr.label === 'Work' && <Briefcase size={16} />}
                        {addr.label === 'Other' && <MapPin size={16} />}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                        {addr.label} {addr.nickname && `(${addr.nickname})`}
                      </span>
                    </div>
                    {addr.isDefault && (
                      <span style={{ backgroundColor: '#e0e7ff', color: '#4338ca', fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '9999px' }}>
                        Default
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '15px', margin: '0 0 4px 0' }}>{addr.fullName}</h3>
                  <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                    {addr.houseNo}, {addr.street}, {addr.landmark ? `${addr.landmark}, ` : ''}
                    {addr.locality}, {addr.city}, {addr.state} - <strong style={{ color: '#1e293b' }}>{addr.pincode}</strong>
                  </p>
                  <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', margin: '0 0 16px 0' }}>Phone: {addr.phone}</p>
                </div>

                <div style={{ paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    {!addr.isDefault ? (
                      <button 
                        onClick={() => handleSetDefault(addr.id)}
                        style={{ background: 'none', border: 'none', color: '#4f46e5', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                      >
                        Set as Default
                      </button>
                    ) : <span />}

                    <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
                      <button 
                        onClick={() => { setCurrentAddress(addr); setIsModalOpen(true); }}
                        style={{ background: 'none', border: 'none', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 500, padding: 0 }}
                      >
                        <Edit size={13} /> Edit
                      </button>
                      <button 
                        onClick={() => setDeleteConfirmId(addr.id)}
                        style={{ background: 'none', border: 'none', color: '#e11d48', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 500, padding: 0 }}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectForCheckout(addr.id)}
                    style={{
                      width: '100%', padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none',
                      backgroundColor: isSelected ? '#16a34a' : '#f1f5f9',
                      color: isSelected ? 'white' : '#334155'
                    }}
                  >
                    {isSelected ? '✓ Deliver Here (Selected)' : 'Deliver Here'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add/Edit Modal */}
        {isModalOpen && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 16px 0' }}>
                {currentAddress ? 'Edit Address' : 'Add New Address'}
              </h2>
              <form onSubmit={handleSaveAddress} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={styles.labelStyle}>Full Name</label>
                    <input name="fullName" defaultValue={currentAddress?.fullName} required style={styles.inputField} placeholder="John Doe" />
                  </div>
                  <div>
                    <label style={styles.labelStyle}>Phone Number</label>
                    <input name="phone" defaultValue={currentAddress?.phone} required style={styles.inputField} placeholder="9876543210" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={styles.labelStyle}>House / Flat / Apt</label>
                    <input name="houseNo" defaultValue={currentAddress?.houseNo} required style={styles.inputField} placeholder="Flat 402, Block B" />
                  </div>
                  <div>
                    <label style={styles.labelStyle}>Street / Road</label>
                    <input name="street" defaultValue={currentAddress?.street} required style={styles.inputField} placeholder="Park Street" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={styles.labelStyle}>Landmark (Optional)</label>
                    <input name="landmark" defaultValue={currentAddress?.landmark} style={styles.inputField} placeholder="Near City Mall" />
                  </div>
                  <div>
                    <label style={styles.labelStyle}>Area / Locality</label>
                    <input name="locality" defaultValue={currentAddress?.locality} required style={styles.inputField} placeholder="Downtown" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={styles.labelStyle}>City</label>
                    <input name="city" defaultValue={currentAddress?.city} required style={styles.inputField} placeholder="Kolkata" />
                  </div>
                  <div>
                    <label style={styles.labelStyle}>State</label>
                    <input name="state" defaultValue={currentAddress?.state} required style={styles.inputField} placeholder="WB" />
                  </div>
                  <div>
                    <label style={styles.labelStyle}>PIN / ZIP</label>
                    <input name="pincode" defaultValue={currentAddress?.pincode} required style={styles.inputField} placeholder="700001" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={styles.labelStyle}>Label Type</label>
                    <select name="label" defaultValue={currentAddress?.label || 'Home'} style={{ ...styles.inputField, backgroundColor: 'white' }}>
                      <option value="Home">Home</option>
                      <option value="Work">Work</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.labelStyle}>Nickname (Optional)</label>
                    <input name="nickname" defaultValue={currentAddress?.nickname} style={styles.inputField} placeholder="Mom's House" />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', marginTop: '4px' }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', fontSize: '13px', color: '#475569', background: '#f1f5f9', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)' }}>Save Address</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div style={styles.modalOverlay}>
            <div style={{ ...styles.modalContent, maxWidth: '360px', textAlign: 'center' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 8px 0' }}>Delete Address?</h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>Are you sure you want to remove this delivery address?</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setDeleteConfirmId(null)} style={{ flex: 1, padding: '9px', fontSize: '13px', color: '#475569', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '10px', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => handleDelete(deleteConfirmId)} style={{ flex: 1, padding: '9px', fontSize: '13px', color: 'white', backgroundColor: '#e11d48', border: 'none', borderRadius: '10px', fontWeight: 500, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(225, 29, 72, 0.2)' }}>Delete</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
