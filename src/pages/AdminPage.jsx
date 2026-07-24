import { useState } from "react";

import AdminDashboard from "../admin/AdminDashboard";
import MenuManagement from "../admin/MenuManagement";
import OrderManagement from "../admin/OrderManagement";


export default function AdminPage({ setPage }) {
  const [activePage, setActivePage] = useState("dashboard");
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

        {activePage === "orderadmin" && (
        <OrderManagement
          setPage={setPage}
          activePage={activePage}
          setActivePage={setActivePage}
        />
      )} 

      {/* Future pages will go here */}
    </div>
  );
}
