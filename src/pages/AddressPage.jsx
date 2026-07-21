import React, { useState, useEffect } from 'react';
import { 
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, 
  serverTimestamp, query, orderBy, writeBatch 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Home, Briefcase, MapPin, Plus, Search, Trash2, Edit, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

const addressesCollectionRef = collection(db, 'addresses');

export default function AddressBook() {
  const [addresses, setAddresses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAddress, setCurrentAddress] = useState(null); 
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Checkout selection state
  const [selectedCheckoutAddress, setSelectedCheckoutAddress] = useState(
    localStorage.getItem('lastSelectedAddress') || null
  );

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Fetch Addresses
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

  // 2. Delivery Availability Check & Save / Update Address
  const handleSaveAddress = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    // Delivery Availability Check (Mock: Block PIN codes starting with '9')
    if (data.pincode.startsWith('9')) {
      showToast('Sorry, delivery is not available for this PIN code.', 'error');
      return; 
    }

    try {
      const snapshot = await getDocs(addressesCollectionRef);
      const isFirstAddress = snapshot.size === 0;

      // Handle single-default logic securely on client batch write
      const batch = writeBatch(db);

      if (isFirstAddress) {
        data.isDefault = true;
      } else if (data.isDefault === 'true' || data.isDefault === true) {
        // If user marked this as default, unset all others
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
        // Update existing
        const docRef = doc(db, 'addresses', currentAddress.id);
        batch.update(docRef, data);
        await batch.commit();
        showToast('Address updated successfully');
      } else {
        // Create new
        await batch.commit(); // commit default updates if any
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

  // 3. Delete Address
  const handleDelete = async (id) => {
    try {
      const targetDocRef = doc(db, 'addresses', id);
      const targetAddress = addresses.find(a => a.id === id);
      
      await deleteDoc(targetDocRef);

      // If deleted item was default, assign default to the next available address
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

  // 4. Set Default Address Explicitly
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

  // 5. Checkout Integration Selection
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
    <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-slate-50 min-h-screen font-sans">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white transition-all animate-bounce ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">📍 Address Book</h1>
          <p className="text-sm text-slate-500">Manage your shipping and billing locations</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={fetchAddresses} 
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600"
            title="Refresh"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => { setCurrentAddress(null); setIsModalOpen(true); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md transition-all"
          >
            <Plus size={18} /> Add New Address
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Search by name, city, locality, or PIN..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
        />
      </div>

      {/* Empty State */}
      {filteredAddresses.length === 0 && !loading && (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
          <MapPin className="mx-auto text-slate-300 mb-3" size={48} />
          <h3 className="text-lg font-semibold text-slate-700">No addresses found</h3>
          <p className="text-sm text-slate-400 mb-4">Add a new delivery address to get started.</p>
          <button
            onClick={() => { setCurrentAddress(null); setIsModalOpen(true); }}
            className="bg-indigo-50 text-indigo-600 font-medium px-4 py-2 rounded-xl text-sm hover:bg-indigo-100"
          >
            Add Address
          </button>
        </div>
      )}

      {/* Address Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAddresses.map((addr) => {
          const isSelected = selectedCheckoutAddress === addr.id;
          return (
            <div 
              key={addr.id} 
              className={`bg-white rounded-2xl p-5 border transition-all shadow-sm relative flex flex-col justify-between ${
                addr.isDefault ? 'border-indigo-500 ring-1 ring-indigo-500/20' : 'border-slate-200'
              } ${isSelected ? 'bg-indigo-50/20' : ''}`}
            >
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
                      {addr.label === 'Home' && <Home size={16} />}
                      {addr.label === 'Work' && <Briefcase size={16} />}
                      {addr.label === 'Other' && <MapPin size={16} />}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      {addr.label} {addr.nickname && `(${addr.nickname})`}
                    </span>
                  </div>
                  {addr.isDefault && (
                    <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                      Default Address
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-slate-800 text-base mb-1">{addr.fullName}</h3>
                <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                  {addr.houseNo}, {addr.street}, {addr.landmark ? `${addr.landmark}, ` : ''}
                  {addr.locality}, {addr.city}, {addr.state} - <span className="font-semibold">{addr.pincode}</span>
                </p>
                <p className="text-xs font-medium text-slate-500 mb-4">Phone: {addr.phone}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                <div className="flex justify-between items-center text-sm">
                  {!addr.isDefault ? (
                    <button 
                      onClick={() => handleSetDefault(addr.id)}
                      className="text-indigo-600 font-medium hover:underline text-xs"
                    >
                      Set as Default
                    </button>
                  ) : <span />}

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => { setCurrentAddress(addr); setIsModalOpen(true); }}
                      className="text-slate-500 hover:text-indigo-600 flex items-center gap-1 text-xs font-medium"
                    >
                      <Edit size={14} /> Edit
                    </button>
                    <button 
                      onClick={() => setDeleteConfirmId(addr.id)}
                      className="text-rose-500 hover:text-rose-700 flex items-center gap-1 text-xs font-medium"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => handleSelectForCheckout(addr.id)}
                  className={`w-full py-2 rounded-xl text-xs font-semibold transition-all ${
                    isSelected 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl my-8">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              {currentAddress ? 'Edit Address' : 'Add New Address'}
            </h2>
            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
                  <input name="fullName" defaultValue={currentAddress?.fullName} required className="w-full p-2.5 border rounded-xl text-sm" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number</label>
                  <input name="phone" defaultValue={currentAddress?.phone} required className="w-full p-2.5 border rounded-xl text-sm" placeholder="9876543210" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">House / Flat / Apartment</label>
                  <input name="houseNo" defaultValue={currentAddress?.houseNo} required className="w-full p-2.5 border rounded-xl text-sm" placeholder="Flat 402, Block B" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Street / Road</label>
                  <input name="street" defaultValue={currentAddress?.street} required className="w-full p-2.5 border rounded-xl text-sm" placeholder="Park Street" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Landmark (Optional)</label>
                  <input name="landmark" defaultValue={currentAddress?.landmark} className="w-full p-2.5 border rounded-xl text-sm" placeholder="Near City Mall" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Area / Locality</label>
                  <input name="locality" defaultValue={currentAddress?.locality} required className="w-full p-2.5 border rounded-xl text-sm" placeholder="Downtown" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">City</label>
                  <input name="city" defaultValue={currentAddress?.city} required className="w-full p-2.5 border rounded-xl text-sm" placeholder="Kolkata" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">State</label>
                  <input name="state" defaultValue={currentAddress?.state} required className="w-full p-2.5 border rounded-xl text-sm" placeholder="WB" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">PIN / ZIP Code</label>
                  <input name="pincode" defaultValue={currentAddress?.pincode} required className="w-full p-2.5 border rounded-xl text-sm" placeholder="700001" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Label Type</label>
                  <select name="label" defaultValue={currentAddress?.label || 'Home'} className="w-full p-2.5 border rounded-xl text-sm bg-white">
                    <option value="Home">Home</option>
                    <option value="Work">Work</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nickname (Optional)</label>
                  <input name="nickname" defaultValue={currentAddress?.nickname} className="w-full p-2.5 border rounded-xl text-sm" placeholder="Mom's House" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md">Save Address</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl text-center">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Address?</h3>
            <p className="text-sm text-slate-500 mb-6">Are you sure you want to remove this delivery address?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirmId)} className="flex-1 py-2 text-sm text-white bg-rose-600 hover:bg-rose-700 rounded-xl font-medium shadow-md">Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
      }
