import { ArrowLeft, Plus, Search, MapPin } from "lucide-react";

export default function AddressPage({ setPage }) {
  return (
    <div
      style={{
        background: "#FDFAF5",
        minHeight: "100%",
        padding: "24px",
      }}
    >
      {/* Back */}
      <button
        onClick={() => setPage("profile")}
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          marginBottom: "20px",
        }}
      >
        <ArrowLeft size={24} color="#1A0B05" />
      </button>

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "Playfair Display",
              fontSize: "34px",
              color: "#1A0B05",
              marginBottom: "6px",
            }}
          >
            Address Book
          </h1>

          <p
            style={{
              color: "#7A6E66",
            }}
          >
            Manage your saved delivery addresses.
          </p>
        </div>

        <button
          style={{
            background: "#C4956A",
            color: "#fff",
            border: "none",
            padding: "12px 22px",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          <Plus size={18} />
          Add Address
        </button>
      </div>

      {/* Search */}
      <div
        style={{
          position: "relative",
          marginBottom: "28px",
        }}
      >
        <Search
          size={18}
          style={{
            position: "absolute",
            left: "16px",
            top: "15px",
            color: "#999",
          }}
        />

        <input
          placeholder="Search saved addresses..."
          style={{
            width: "100%",
            padding: "14px 16px 14px 48px",
            borderRadius: "14px",
            border: "1px solid #E6DDD4",
            outline: "none",
            background: "#fff",
          }}
        />
      </div>

      {/* Empty State */}
      <div
        style={{
          background: "#fff",
          borderRadius: "20px",
          border: "2px dashed #E8DDD2",
          padding: "70px 20px",
          textAlign: "center",
        }}
      >
        <MapPin
          size={54}
          color="#C4956A"
        />

        <h2
          style={{
            marginTop: "18px",
            fontFamily: "Playfair Display",
            color: "#1A0B05",
          }}
        >
          No saved addresses
        </h2>

        <p
          style={{
            color: "#7A6E66",
            marginTop: "10px",
          }}
        >
          Save your delivery locations for faster checkout.
        </p>

        <button
          style={{
            marginTop: "24px",
            background: "#C4956A",
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            padding: "12px 24px",
            cursor: "pointer",
          }}
        >
          + Add Address
        </button>
      </div>
    </div>
  );
}
