export default function SupportAdminPage({ setPage, setActivePage }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FDFAF5",
        padding: "24px"
      }}
    >
      <h1
        style={{
          color: "#2C221E",
          fontFamily: "Playfair Display, serif",
          marginBottom: "8px"
        }}
      >
        Support Dashboard
      </h1>

      <p
        style={{
          color: "#6B5E55"
        }}
      >
        Manage customer support tickets.
      </p>
    </div>
  );
}
