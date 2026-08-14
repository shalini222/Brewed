import { useState } from "react";

import AdminDashboard from "../admin/AdminDashboard";
import MenuManagement from "../admin/MenuManagement";
import CouponManagement from "../admin/CouponManagement";
import CustomerManagement from "../admin/CustomerManagement";
import WalletManagement from "../admin/WalletManagement";
import OrderManagement from "../admin/OrderManagement";
import LoyaltyManagement from "../admin/LoyaltyManagement";
import SupportManagement from "../admin/SupportManagement";
import EmployeeManagement from "../admin/EmployeeManagement";
import RiderManagement from "./admin/RiderManagement";

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

        {activePage === "couponadmin" && (
        <CouponManagement
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

      {activePage === "customeradmin" && (
        <CustomerManagement
          setPage={setPage}
          activePage={activePage}
          setActivePage={setActivePage}
        />
      )} 



      {activePage === "walletadmin" && (
        <WalletManagement
          setPage={setPage}
          activePage={activePage}
          setActivePage={setActivePage}
        />
      )} 

      
      {activePage === "loyaltyadmin" && (
        <LoyaltyManagement
          setPage={setPage}
          activePage={activePage}
          setActivePage={setActivePage}
        />
      )} 



        {activePage === "supportadmin" && (
        <SupportManagement
          setPage={setPage}
          activePage={activePage}
          setActivePage={setActivePage}
        />
      )} 



       {activePage === "rideradmin" && (
        <RiderManagement
          setPage={setPage}
          activePage={activePage}
          setActivePage={setActivePage}
        />
      )} 

 {activePage === "employeeadmin" && (
        <EmployeeManagement
          setPage={setPage}
          activePage={activePage}
          setActivePage={setActivePage}
        />
      )} 

      
      {/* Future pages will go here */}
    </div>
  );
}
