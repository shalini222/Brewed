import { ArrowLeft, Plus, Search, MapPin } from "lucide-react";
import "../styles/AddressPage.css";

export default function AddressPage({ setPage }) {
  return (
    <div className="address-page">
      {/* Back Button */}
      <button
        onClick={() => setPage("profile")}
        className="back-btn"
      >
        <ArrowLeft size={24} />
      </button>

      {/* Header */}
      <div className="address-header">
        <div>
          <h1 className="address-title">Address Book</h1>
          <p className="address-subtitle">Manage your saved delivery addresses.</p>
        </div>

        <button className="btn-primary add-address-btn">
          <Plus size={18} />
          Add Address
        </button>
      </div>

      {/* Search */}
      <div className="search-container">
        <Search size={18} className="search-icon" />
        <input
          placeholder="Search saved addresses..."
          className="search-input"
        />
      </div>

      {/* Empty State */}
      <div className="empty-state">
        <MapPin size={54} />
        <h2>No saved addresses</h2>
        <p>Save your delivery locations for faster checkout.</p>
        <button className="btn-primary">+ Add Address</button>
      </div>
    </div>
  );
}
