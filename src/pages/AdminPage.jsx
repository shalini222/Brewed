import { useState } from "react";

import AdminDashboard from "../admin/AdminDashboard";

export default function AdminPage({ setPage }) {
  // Which admin page is currently active
  const [activePage, setActivePage] = useState("dashboard");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FDFAF5",
      }}
    >
      {/* =========================
          DASHBOARD
      ========================= */}

      {activePage === "dashboard" && (
        <AdminDashboard
          setPage={setPage}
          activePage={activePage}
          setActivePage={setActivePage}
        />
      )}

      {/* =========================
          MENU MANAGEMENT
      ========================= */}

      {/* {activePage === "menu" && (
        <MenuManagement
          setPage={setPage}
          activePage={activePage}
          setActivePage={setActivePage}
        />
      )} */}

      {/* Future pages will go here */}
    </div>
  );
}
