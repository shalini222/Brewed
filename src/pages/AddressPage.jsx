import { useState } from "react";
import { ArrowLeft, Search, Plus, MapPin } from "lucide-react";

export default function AddressPage({ setPage }) {
  const [search, setSearch] = useState("");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FDFAF5",
        padding: "24px",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Back */}
      <button
        onClick={() => setPage("profile")}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          marginBottom: 24,
        }}
      >
        <ArrowLeft size={26} color="#1A0B05" />
      </button>

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 30,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 34,
              fontFamily: "Playfair Display",
              color: "#1A0B05",
            }}
          >
            Address Book
          </h1>

          <p
            style={{
              marginTop: 8,
              color: "#666",
              fontSize: 15,
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
            borderRadius: 14,
            padding: "12px 22px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 15,
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
          marginBottom: 35,
        }}
      >
        <Search
          size={18}
          style={{
            position: "absolute",
            left: 16,
            top: 15,
            color: "#888",
          }}
        />

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search saved addresses..."
          style={{
            width: "100%",
            padding: "14px 18px 14px 48px",
            borderRadius: 16,
            border: "1px solid #ddd",
            background: "#fff",
            outline: "none",
            fontSize: 15,
          }}
        />
      </div>

      {/* Empty State */}
      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          padding: "70px 30px",
          textAlign: "center",
          border: "2px dashed #E4D8CA",
        }}
      >
        <MapPin
          size={56}
          color="#C4956A"
          style={{ marginBottom: 18 }}
        />

        <h2
          style={{
            margin: 0,
            fontFamily: "Playfair Display",
            color: "#1A0B05",
          }}
        >
          No saved addresses
        </h2>

        <p
          style={{
            marginTop: 12,
            color: "#777",
            lineHeight: 1.6,
          }}
        >
          Save your delivery locations
          <br />
          to make checkout faster.
        </p>

        <button
          style={{
            marginTop: 28,
            background: "#C4956A",
            color: "#fff",
            border: "none",
            borderRadius: 14,
            padding: "12px 28px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 15,
          }}
        >
          + Add Address
        </button>
      </div>
    </div>
  );
}
