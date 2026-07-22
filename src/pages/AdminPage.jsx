import { useState } from "react";

import AdminDashboard from "../admin/AdminDashboard";
import MenuManagement from "../admin/MenuManagement";

export default function AdminPage({ setPage, setActivePage }) {
  // Which admin page is currently active
  

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

      {activePage === "menuadmin" && (
        <MenuManagement
          setPage={setPage}
          activePage={activePage}
          setActivePage={setActivePage}
        />
      )} 

      {/* Future pages will go here */}
    </div>
  );
}
