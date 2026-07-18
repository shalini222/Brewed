
import { useState } from "react";

export default function ReservationPage({ setPage, currentUser = { name: "Alex Morgan", email: "alex.morgan@premium.com", phone: "+1 (555) 234-5678", tier: "Gold Member" } }) {
  // Navigation State: 'landing' | 'book' | 'dashboard'
  const [activeTab, setActiveTab] = useState("landing");
  
  // Booking Form Flow State
  const [bookingStep, setBookingStep] = useState(1);
  const [booking, setBooking] = useState({
    date: new Date().toISOString().split('T')[0],
    timeSlot: "6:00 PM",
    guests: 2,
    area: "Indoor", // Indoor, Outdoor
    smoking: "Non-Smoking",
    tablePreference: "Standard table",
    duration: "1.5 Hours",
    occasion: "None",
    specialRequests: {
      wheelchair: false,
      highChair: false,
      extraChair: false,
      stroller: false,
      decor: false,
      cake: false
    },
    dietaryNotes: "",
    name: currentUser?.name || "",
    email: currentUser?.email || "",
    phone: currentUser?.phone || ""
  });

  // Mock Active Database States
  const [reservationsList, setReservationsList] = useState([
    {
      id: "BRW-9842",
      date: "2026-07-24",
      timeSlot: "7:30 PM",
      guests: 4,
      area: "Garden Terrace",
      tablePreference: "Window seat",
      occasion: "🥂 Anniversary",
      status: "Confirmed"
    },
    {
      id: "BRW-1102",
      date: "2026-05-12",
      timeSlot: "1:30 PM",
      guests: 2,
      area: "Indoor",
      tablePreference: "Near coffee bar",
      occasion: "💼 Business meeting",
      status: "Completed"
    }
  ]);

  const [showCancelModal, setShowCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedId, setGeneratedId] = useState("");

  // System Static Data Maps
  const timeSlotsConfig = [
    { time: "12:00 PM", status: "Available", peak: false },
    { time: "1:30 PM", status: "Limited", peak: false },
    { time: "3:00 PM", status: "Fully Booked", peak: false },
    { time: "6:00 PM", status: "Available", peak: true },
    { time: "7:30 PM", status: "Limited", peak: true },
    { time: "9:00 PM", status: "Available", peak: false }
  ];

  const tablePrefs = ["Standard table", "Window seat", "Quiet corner", "Near coffee bar", "Sofa seating", "High table", "No preference"];
  const occasions = ["None", "Birthday", "Anniversary", "Date", "Business meeting", "Family gathering", "Celebration"];

  // Handlers
  const handleToggleRequest = (key) => {
    setBooking(prev => ({
      ...prev,
      specialRequests: { ...prev.specialRequests, [key]: !prev.specialRequests[key] }
    }));
  };

  const executeBookingSubmit = (e) => {
    e.preventDefault();
    const mockId = "BRW-" + Math.floor(1000 + Math.random() * 9000);
    setGeneratedId(mockId);
    
    // Append to dashboard listing
    const newReservation = {
      id: mockId,
      date: booking.date,
      timeSlot: booking.timeSlot,
      guests: booking.guests,
      area: booking.area,
      tablePreference: booking.tablePreference,
      occasion: booking.occasion,
      status: "Confirmed"
    };

    setReservationsList(prev => [newReservation, ...prev]);
    setIsSuccess(true);
  };

  const handleCancelClick = (id) => {
    setShowCancelModal(id);
  };

  const confirmCancellation = () => {
    setReservationsList(prev => prev.map(res => res.id === showCancelModal ? { ...res, status: "Cancelled" } : res));
    setShowCancelModal(null);
    setCancelReason("");
  };

  // Styling Framework Objects
  const theme = {
    bg: "#FDFAF6",
    surface: "#ffffff",
    primary: "#3B1A08",
    accent: "#D4AF37",
    textMain: "#2C2520",
    textMuted: "#7A726C",
    border: "#EFECE6",
    borderDark: "#E0D9D0",
    goldLight: "#FCFAF2"
  };

  const cardStyle = {
    background: theme.surface,
    borderRadius: "16px",
    padding: "24px",
    border: `1px solid ${theme.border}`,
    boxShadow: "0 4px 20px rgba(59, 26, 8, 0.01)"
  };

  const labelStyle = {
    display: "block",
    fontSize: "12px",
    fontWeight: "700",
    color: "#6E655F",
    textTransform: "uppercase",
    letterSpacing: "1px",
    marginBottom: "8px"
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "10px",
    border: `1px solid ${theme.borderDark}`,
    background: "#FCFAF7",
    fontSize: "14px",
    color: theme.textMain,
    outline: "none",
    boxSizing: "border-box"
  };

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.textMain, fontFamily: "system-ui, -apple-system, sans-serif", paddingBottom: "60px" }}>
      
      {/* Dynamic Global Top Navigation */}
      <nav style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}`, position: "sticky", top: 0, zIndex: 10, padding: "0 20px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: "70px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }} onClick={() => { setActiveTab("landing"); setIsSuccess(false); setBookingStep(1); }}>
            <span style={{ fontSize: "24px" }}>☕</span>
            <span style={{ fontFamily: "Playfair Display, serif", fontWeight: "800", fontSize: "20px", color: theme.primary, letterSpacing: "0.5px" }}>BREWED</span>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button onClick={() => { setActiveTab("landing"); setIsSuccess(false); }} style={{ background: activeTab === "landing" ? "#F5EFE6" : "transparent", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: "600", fontSize: "14px", color: theme.primary, cursor: "pointer" }}>Home</button>
            <button onClick={() => { setActiveTab("book"); setIsSuccess(false); }} style={{ background: activeTab === "book" ? "#F5EFE6" : "transparent", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: "600", fontSize: "14px", color: theme.primary, cursor: "pointer" }}>Reserve Table</button>
            <button onClick={() => { setActiveTab("dashboard"); setIsSuccess(false); }} style={{ background: activeTab === "dashboard" ? "#F5EFE6" : "transparent", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: "600", fontSize: "14px", color: theme.primary, cursor: "pointer" }}>My Bookings</button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: "1100px", margin: "30px auto", padding: "0 20px", boxSizing: "border-box" }}>
        
        {/* ===================================== */}
        {/* VIEW 1: RESERVATION LANDING HOMEPAGE  */}
        {/* ===================================== */}
        {activeTab === "landing" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
            {/* Hero Section */}
            <div style={{ ...cardStyle, background: `linear-gradient(rgba(59,26,8,0.85), rgba(59,26,8,0.95)), url('https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1000')`, backgroundSize: "cover", backgroundPosition: "center", color: "#ffffff", padding: "60px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ background: theme.accent, color: theme.primary, padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "16px" }}>Experience Excellence</div>
              <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "38px", margin: "0 0 16px 0", maxWidth: "600px" }}>Culinary Craftsmanship & Curated Micro-Brews</h1>
              <p style={{ color: "#E0D9D0", fontSize: "16px", margin: "0 0 28px 0", maxWidth: "500px", lineHeight: "1.6" }}>Secure your preferred seating alcove, window viewpoint, or outdoor fairy-lit garden terrace instantly.</p>
              <button onClick={() => setActiveTab("book")} style={{ background: "#ffffff", color: theme.primary, border: "none", padding: "16px 36px", borderRadius: "12px", fontSize: "15px", fontWeight: "700", cursor: "pointer", boxShadow: "0 10px 20px rgba(0,0,0,0.2)", transition: "transform 0.2s" }}>Reserve a Table Now</button>
            </div>

            {/* Twin Columns Meta Layout */}
            <div style={{ display: "grid", gridTemplateColumns: "window.innerWidth > 768 ? '2fr 1fr' : '1fr'", gap: "30px" }}>
              {/* Left Column: Rules & Map Information */}
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div style={cardStyle}>
                  <h3 style={{ margin: "0 0 16px 0", fontFamily: "Playfair Display, serif", fontSize: "20px" }}>📜 Reservation Rules & Policies</h3>
                  <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "10px", color: theme.textMuted, fontSize: "14px", lineHeight: "1.5" }}>
                    <li><strong>Arrival Grace Period:</strong> We hold reserved structural tables for a maximum of 15 minutes past target check-in time before waitlist release.</li>
                    <li><strong>Cancellation Policy:</strong> Adjustments or cancellations can be processed free of charge up to 2 hours before the reservation schedule.</li>
                    <li><strong>Large Parties:</strong> Groups exceeding 12 guests require dedicated processing via our Private Events team.</li>
                    <li><strong>Minimum Spend:</strong> A minimum spend of $35 per guest applies directly to VIP Lounge Private Alcoves.</li>
                  </ul>
                </div>

                <div style={cardStyle}>
                  <h3 style={{ margin: "0 0 16px 0", fontFamily: "Playfair Display, serif", fontSize: "20px" }}>📍 Location & Contact Framework</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", fontSize: "14px", lineHeight: "1.5" }}>
                    <div>
                      <p style={{ margin: "0 0 8px 0" }}><strong>📍 Cafe Address:</strong><br />742 Artisan Boulevard, Culinary District, Plaza Level</p>
                      <p style={{ margin: "0 0 8px 0" }}><strong>🏢 Nearby Landmark:</strong><br />Adjacent to the Glass Galleria Fountain</p>
                    </div>
                    <div>
                      <p style={{ margin: "0 0 8px 0" }}><strong>🚗 Parking Logistics:</strong><br />Complimentary underground subterranean parking with validation.</p>
                      <p style={{ margin: "0" }}><strong>📞 Direct Phone:</strong><br />+1 (555) 900-3342</p>
                    </div>
                  </div>
                  {/* Embedded Map Block Placeholder */}
                  <div style={{ height: "140px", background: "#EFECE6", borderRadius: "12px", marginTop: "16px", display: "flex", alignItems: "center", justifyContent: "center", color: theme.textMuted, fontSize: "13px" }}>
                    🗺️ Google Maps Visual Node Integration Active
                  </div>
                </div>
              </div>

              {/* Right Column: Opening Hours & Tier Status */}
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div style={{ ...cardStyle, background: theme.primary, color: "#ffffff" }}>
                  <h3 style={{ margin: "0 0 16px 0", fontFamily: "Playfair Display, serif", fontSize: "18px", color: theme.accent }}>🕰️ Operating Hours</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "6px" }}><span>Monday – Thursday</span><strong>7:00 AM – 10:00 PM</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "6px" }}><span>Friday</span><strong>7:00 AM – 11:30 PM</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "6px" }}><span>Saturday</span><strong>8:00 AM – 11:30 PM</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "2px" }}><span>Sunday</span><strong>8:00 AM – 9:00 PM</strong></div>
                  </div>
                </div>

                <div style={{ ...cardStyle, background: theme.goldLight, borderColor: "rgba(212,175,55,0.3)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                    <span style={{ fontSize: "20px" }}>⭐</span>
                    <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: theme.primary }}>{currentUser.tier} Profile</h4>
                  </div>
                  <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: theme.textMuted, lineHeight: "1.4" }}>Welcome back, <strong>{currentUser.name}</strong>. You enjoy unlocked priority tracking perks, automatic access to VIP tables, and a free birthday dessert token active.</p>
                  <div style={{ display: "inline-block", padding: "4px 8px", background: "rgba(212,175,55,0.15)", borderRadius: "6px", fontSize: "12px", fontWeight: "600", color: "#A47C00" }}>🏆 4,250 Active Points</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* VIEW 2: INTERACTIVE RESERVATION FORM  */}
        {/* ===================================== */}
        {activeTab === "book" && !isSuccess && (
          <div style={{ maxWidth: "680px", margin: "0 auto" }}>
            
            {/* Step Banner Pipeline */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", background: theme.surface, padding: "16px 24px", borderRadius: "12px", border: `1px solid ${theme.border}` }}>
              {[1, 2, 3, 4].map((stepNum) => (
                <div key={stepNum} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: bookingStep >= stepNum ? theme.primary : "#EFECE6", color: bookingStep >= stepNum ? "#ffffff" : theme.textMuted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "700" }}>{stepNum}</div>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: bookingStep === stepNum ? theme.primary : theme.textMuted, display: window.innerWidth < 480 ? "none" : "inline" }}>
                    {stepNum === 1 ? "Basics" : stepNum === 2 ? "Preferences" : stepNum === 3 ? "Requests" : "Verification"}
                  </span>
                </div>
              ))}
            </div>

            <form onSubmit={executeBookingSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              {/* STEP 1: LOGISTICS BASICS */}
              {bookingStep === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={cardStyle}>
                    <h3 style={{ margin: "0 0 20px 0", fontFamily: "Playfair Display, serif", fontSize: "18px" }}>📅 Step 1: Party Mechanics & Scheduling</h3>
                    
                    <div style={{ marginBottom: "20px" }}>
                      <label style={labelStyle}>Party Scale (1–12 Guests) *</label>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FCFAF7", border: `1px solid ${theme.borderDark}`, borderRadius: "10px", padding: "10px 16px" }}>
                        <button type="button" onClick={() => setBooking(p => ({ ...p, guests: Math.max(1, p.guests - 1) }))} style={{ width: "32px", height: "32px", borderRadius: "50%", border: "none", background: "#ffffff", boxShadow: "0 2px 5px rgba(0,0,0,0.05)", cursor: "pointer", fontSize: "16px", fontWeight: "bold" }}>–</button>
                        <span style={{ fontSize: "15px", fontWeight: "700" }}>{booking.guests} {booking.guests === 1 ? "Guest" : "Guests"}</span>
                        <button type="button" onClick={() => setBooking(p => ({ ...p, guests: Math.min(12, p.guests + 1) }))} style={{ width: "32px", height: "32px", borderRadius: "50%", border: "none", background: "#ffffff", boxShadow: "0 2px 5px rgba(0,0,0,0.05)", cursor: "pointer", fontSize: "16px", fontWeight: "bold" }}>+</button>
                      </div>
                      {booking.guests >= 10 && (
                        <div style={{ background: "#FFF9E6", border: "1px solid #FFE0B2", borderRadius: "8px", padding: "10px", marginTop: "12px", fontSize: "12px", color: "#B78103", lineHeight: "1.4" }}>
                          ℹ️ Large gathering structural alert. Planning a corporate or private event? Consider reviewing our <strong>Private Banquet Event Accommodations</strong>.
                        </div>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                      <div>
                        <label style={labelStyle}>Select Target Date *</label>
                        <input type="date" style={inputStyle} value={booking.date} onChange={(e) => setBooking({ ...booking, date: e.target.value })} required />
                      </div>
                      <div>
                        <label style={labelStyle}>Estimated Duration</label>
                        <select style={inputStyle} value={booking.duration} onChange={(e) => setBooking({ ...booking, duration: e.target.value })}>
                          <option value="1 Hour">1.0 Hour Block</option>
                          <option value="1.5 Hours">1.5 Hours Block (Standard)</option>
                          <option value="2 Hours">2.0 Hours Block</option>
                          <option value="2.5 Hours">2.5 Hours Block</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>Select Time Slot *</label>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "10px" }}>
                        {timeSlotsConfig.map((slot) => {
                          const isSelected = booking.timeSlot === slot.time;
                          const isFull = slot.status === "Fully Booked";
                          return (
                            <button key={slot.time} type="button" disabled={isFull} onClick={() => setBooking({ ...booking, timeSlot: slot.time })} style={{ padding: "12px 8px", borderRadius: "8px", border: isSelected ? `2px solid ${theme.primary}` : `1px solid ${theme.borderDark}`, background: isFull ? "#F5F2EE" : isSelected ? theme.primary : "#ffffff", color: isFull ? theme.textMuted : isSelected ? "#ffffff" : theme.textMain, cursor: isFull ? "not-allowed" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", position: "relative" }}>
                              <span style={{ fontSize: "14px", fontWeight: "700" }}>{slot.time}</span>
                              <span style={{ fontSize: "10px", fontWeight: "600", opacity: 0.8 }}>
                                {slot.status === "Limited" ? "⚠️ Limited" : isFull ? "❌ Full" : "✓ Available"}
                              </span>
                              {slot.peak && !isFull && (
                                <span style={{ fontSize: "9px", background: isSelected ? theme.accent : "#FFF0F0", color: isSelected ? theme.primary : "#D32F2F", padding: "1px 4px", borderRadius: "4px", fontWeight: "700", marginTop: "4px" }}>🔥 PEAK HOUR</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ marginTop: "12px", fontSize: "13px", color: theme.textMuted }}>
                        💡 <em>Tip: Alternative schedules can be mapped dynamically by shifting target parameter metrics above.</em>
                      </div>
                    </div>

                  </div>
                  <button type="button" onClick={() => setBookingStep(2)} style={{ background: theme.primary, color: "#ffffff", border: "none", padding: "14px", borderRadius: "10px", fontWeight: "600", cursor: "pointer", alignSelf: "flex-end", width: "160px" }}>Next: Preferences</button>
                </div>
              )}

              {/* STEP 2: SPATIAL PREFERENCES */}
              {bookingStep === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={cardStyle}>
                    <h3 style={{ margin: "0 0 20px 0", fontFamily: "Playfair Display, serif", fontSize: "18px" }}>🪑 Step 2: Spatial Architecture & Placement</h3>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                      <div>
                        <label style={labelStyle}>Environment Sector</label>
                        <div style={{ display: "flex", gap: "8px" }}>
                          {["Indoor", "Outdoor"].map(areaOpt => (
                            <button key={areaOpt} type="button" onClick={() => setBooking({ ...booking, area: areaOpt })} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: booking.area === areaOpt ? `2px solid ${theme.primary}` : `1px solid ${theme.borderDark}`, background: booking.area === areaOpt ? "#F5EFE6" : "#ffffff", fontWeight: "600", cursor: "pointer" }}>
                              {areaOpt === "Indoor" ? "🍽️ Indoor Main" : "🌿 Garden Patio"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Airway Classification</label>
                        <div style={{ display: "flex", gap: "8px" }}>
                          {["Non-Smoking", "Smoking Section"].map(smokeOpt => (
                            <button key={smokeOpt} type="button" onClick={() => setBooking({ ...booking, smoking: smokeOpt })} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: booking.smoking === smokeOpt ? `2px solid ${theme.primary}` : `1px solid ${theme.borderDark}`, background: booking.smoking === smokeOpt ? "#F5EFE6" : "#ffffff", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}>
                              {smokeOpt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                      <label style={labelStyle}>Specific Table Target Node Configuration</label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        {tablePrefs.map(pref => (
                          <div key={pref} onClick={() => setBooking({ ...booking, tablePreference: pref })} style={{ padding: "12px 16px", borderRadius: "8px", border: booking.tablePreference === pref ? `2px solid ${theme.primary}` : `1px solid ${theme.borderDark}`, background: booking.tablePreference === pref ? "#FDFAF6" : "#ffffff", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", fontWeight: "600" }}>
                            <input type="radio" checked={booking.tablePreference === pref} readOnly style={{ accentColor: theme.primary }} />
                            <span>{pref}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>Occasion Framework</label>
                      <select style={inputStyle} value={booking.occasion} onChange={(e) => setBooking({ ...booking, occasion: e.target.value })}>
                        {occasions.map(occ => (
                          <option key={occ} value={occ}>{occ === "None" ? "No Special Occasion" : occ}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <button type="button" onClick={() => setBookingStep(1)} style={{ background: "transparent", color: theme.primary, border: `1px solid ${theme.primary}`, padding: "14px", borderRadius: "10px", fontWeight: "600", cursor: "pointer", width: "120px" }}>Back</button>
                    <button type="button" onClick={() => setBookingStep(3)} style={{ background: theme.primary, color: "#ffffff", border: "none", padding: "14px", borderRadius: "10px", fontWeight: "600", cursor: "pointer", width: "140px" }}>Next: Requests</button>
                  </div>
                </div>
              )}

              {/* STEP 3: SPECIAL REQUESTS & UTILITIES */}
              {bookingStep === 3 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={cardStyle}>
                    <h3 style={{ margin: "0 0 20px 0", fontFamily: "Playfair Display, serif", fontSize: "18px" }}>🎉 Step 3: Event Add-ons & Accessibility</h3>
                    
                    <label style={labelStyle}>Structural Layout Assistance toggles</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                      {[
                        { key: "wheelchair", label: "♿ Wheelchair Access" },
                        { key: "highChair", label: "👶 High Chair Needed" },
                        { key: "extraChair", label: "🪑 Extra Structural Chair" },
                        { key: "stroller", label: "🛒 Baby Stroller Space" },
                        { key: "decor", label: "✨ Table Decor Request" },
                        { key: "cake", label: "🎂 Custom Cake Pre-Order" }
                      ].map(item => (
                        <div key={item.key} onClick={() => handleToggleRequest(item.key)} style={{ padding: "12px", borderRadius: "8px", border: booking.specialRequests[item.key] ? `2px solid ${theme.primary}` : `1px solid ${theme.border}`, background: booking.specialRequests[item.key] ? "#F5EFE6" : "#ffffff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13px", fontWeight: "600" }}>
                          <span>{item.label}</span>
                          <input type="checkbox" checked={booking.specialRequests[item.key]} readOnly style={{ accentColor: theme.primary }} />
                        </div>
                      ))}
                    </div>

                    <div>
                      <label style={labelStyle}>Dietary Restrictions, Allergies, or Custom Logistics</label>
                      <textarea style={{ ...inputStyle, height: "100px", resize: "none" }} placeholder="List processing notes here (e.g. Nut allergies, gluten free metrics, quiet zone dependency)..." value={booking.dietaryNotes} onChange={(e) => setBooking({ ...booking, dietaryNotes: e.target.value })} />
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <button type="button" onClick={() => setBookingStep(2)} style={{ background: "transparent", color: theme.primary, border: `1px solid ${theme.primary}`, padding: "14px", borderRadius: "10px", fontWeight: "600", cursor: "pointer", width: "120px" }}>Back</button>
                    <button type="button" onClick={() => setBookingStep(4)} style={{ background: theme.primary, color: "#ffffff", border: "none", padding: "14px", borderRadius: "10px", fontWeight: "600", cursor: "pointer", width: "140px" }}>Next: Customer Verification</button>
                  </div>
                </div>
              )}

              {/* STEP 4: CUSTOMER DATA VERIFICATION */}
              {bookingStep === 4 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={cardStyle}>
                    <h3 style={{ margin: "0 0 4px 0", fontFamily: "Playfair Display, serif", fontSize: "18px" }}>👤 Step 4: Account Linkage & Identity</h3>
                    <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: theme.textMuted }}>Review communication channels for active verification receipts.</p>

                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div>
                        <label style={labelStyle}>Full Legal Name *</label>
                        <input type="text" style={inputStyle} value={booking.name} onChange={(e) => setBooking({ ...booking, name: e.target.value })} required />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div>
                          <label style={labelStyle}>Mobile Number *</label>
                          <input type="tel" style={inputStyle} value={booking.phone} onChange={(e) => setBooking({ ...booking, phone: e.target.value })} required />
                        </div>
                        <div>
                          <label style={labelStyle}>Email Address *</label>
                          <input type="email" style={inputStyle} value={booking.email} onChange={(e) => setBooking({ ...booking, email: e.target.value })} required />
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: "24px", background: "#FCFAF7", border: `1px solid ${theme.border}`, borderRadius: "10px", padding: "16px", fontSize: "13px", color: theme.textMuted }}>
                      🔒 <strong>Secure Automated Processing Frame:</strong> By continuing, your credentials auto-register a non-member priority guest profile if not logged in. Details auto-dispatch immediately via SMS & Email.
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <button type="button" onClick={() => setBookingStep(3)} style={{ background: "transparent", color: theme.primary, border: `1px solid ${theme.primary}`, padding: "14px", borderRadius: "10px", fontWeight: "600", cursor: "pointer", width: "120px" }}>Back</button>
                    <button type="submit" style={{ background: "#27ae60", color: "#ffffff", border: "none", padding: "14px 28px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", boxShadow: "0 4px 12px rgba(39,174,96,0.2)" }}>Execute Reservation Transaction</button>
                  </div>
                </div>
              )}

            </form>
          </div>
        )}

        {/* ===================================== */}
        {/* STATE DISPLAY: RESERVATION SUCCESS    */}
        {/* ===================================== */}
        {activeTab === "book" && isSuccess && (
          <div style={{ maxWidth: "520px", margin: "0 auto", textAlign: "center" }}>
            <div style={cardStyle}>
              <div style={{ fontSize: "56px", marginBottom: "12px", animation: "bounce 1s infinite" }}>✨</div>
              <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "28px", color: theme.primary, margin: "0 0 6px 0" }}>Table Layout Secured</h2>
              <p style={{ color: theme.textMuted, fontSize: "14px", margin: "0 0 24px 0", lineHeight: "1.5" }}>
                System Transaction verified. Your structural placement node code is compiled. Digital assets dispatched to <strong>{booking.phone}</strong>.
              </p>

              {/* Master Summary Breakdown */}
              <div style={{ background: "#FCFAF7", border: `1px solid ${theme.border}`, borderRadius: "12px", padding: "20px", fontSize: "14px", textAlign: "left", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>🆔 Reservation Identifier:</span><strong>{generatedId}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px dashed ${theme.borderDark}`, paddingTop: "8px" }}><span>👤 Primary Account:</span><strong>{booking.name}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>📅 Target Schedule:</span><strong>{booking.date} @ {booking.timeSlot}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>👥 Group Metric:</span><strong>{booking.guests} Seats Allocated</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>📍 Structural Zone:</span><strong>{booking.area} — {booking.tablePreference}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>🎉 Occasion Alignment:</span><strong>{booking.occasion}</strong></div>
              </div>

              {/* Interactive Calendar & QR Frame */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                <div style={{ border: `1px solid ${theme.border}`, borderRadius: "10px", padding: "12px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "#ffffff" }}>
                  <div style={{ width: "80px", height: "80px", background: "#2C2520", borderRadius: "6px", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px" }}>📱</div>
                  <span style={{ fontSize: "11px", color: theme.textMuted, marginTop: "8px", fontWeight: "700" }}>PASSBOOK QR CODE ACTIVE</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", justifyContent: "center" }}>
                  <button type="button" onClick={() => alert("ICS Calendar Data Injection Stream active.")} style={{ background: "#ffffff", border: `1px solid ${theme.borderDark}`, padding: "10px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer", textAlign: "left" }}>📅 Google Calendar</button>
                  <button type="button" onClick={() => alert("Apple Wallet .ics compilation download starting.")} style={{ background: "#ffffff", border: `1px solid ${theme.borderDark}`, padding: "10px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer", textAlign: "left" }}>🍏 Apple iCal Export</button>
                </div>
              </div>

              <button onClick={() => { setActiveTab("dashboard"); setIsSuccess(false); }} style={{ width: "100%", background: theme.primary, color: "#ffffff", border: "none", padding: "16px", borderRadius: "10px", fontSize: "15px", fontWeight: "700", cursor: "pointer" }}>
                Route to Dashboard Panel
              </button>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* VIEW 3: USER CENTRAL DASHBOARD       */}
        {/* ===================================== */}
        {activeTab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
            
            {/* Live Table Availability Grid Layout Block */}
            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h3 style={{ margin: "0 0 4px 0", fontFamily: "Playfair Display, serif", fontSize: "18px" }}>🪑 Live Layout & Waitlist Simulator</h3>
                  <p style={{ margin: 0, fontSize: "13px", color: theme.textMuted }}>Real-time sensory telemetry tracking from dining floor grid nodes.</p>
                </div>
                <div style={{ display: "flex", gap: "12px", fontSize: "12px", fontWeight: "600" }}>
                  <span style={{ color: "#27ae60" }}>● Available (4)</span>
                  <span style={{ color: "#e74c3c" }}>● Occupied (12)</span>
                  <span style={{ color: theme.accent }}>● VIP Reserved</span>
                </div>
              </div>

              {/* Graphical Seats Layout Representation */}
              <div style={{ background: "#FCFAF7", border: `1px solid ${theme.border}`, borderRadius: "12px", padding: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))", gap: "12px", textAlign: "center" }}>
                {[
                  { id: "T1", type: "Standard", status: "Available" },
                  { id: "T2", type: "Standard", status: "Occupied" },
                  { id: "T3", type: "Window", status: "Occupied" },
                  { id: "T4", type: "VIP Private", status: "Reserved" },
                  { id: "T5", type: "Outdoor", status: "Available" },
                  { id: "T6", type: "Bar High", status: "Occupied" },
                  { id: "T7", type: "Standard", status: "Available" },
                  { id: "T8", type: "Window", status: "Occupied" }
                ].map(table => (
                  <div key={table.id} style={{ padding: "10px 4px", borderRadius: "8px", background: table.status === "Available" ? "#E8F8F5" : table.status === "Reserved" ? "#FEF9E7" : "#FADBD8", border: `1px solid ${table.status === "Available" ? "#27ae60" : table.status === "Reserved" ? theme.accent : "#e74c3c"}`, fontSize: "12px" }}>
                    <div style={{ fontWeight: "700", color: theme.primary }}>{table.id}</div>
                    <div style={{ fontSize: "9px", opacity: 0.7, marginTop: "2px" }}>{table.type}</div>
                  </div>
                ))}
              </div>

              {/* Dynamic Queue Framework */}
              <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: theme.goldLight, padding: "12px 16px", borderRadius: "8px", border: `1px solid ${theme.borderDark}` }}>
                <span style={{ fontSize: "13px" }}>⏳ Current Standby Waitlist Volume: <strong>3 Parties</strong> | Est. Delay: <strong>14 Mins</strong></span>
                <button type="button" onClick={() => alert("Waitlist stream connection established.")} style={{ background: theme.primary, color: "#ffffff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>Join Active Waitlist Queue</button>
              </div>
            </div>

            {/* Account Database Ledger Lists */}
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 20px 0", fontFamily: "Playfair Display, serif", fontSize: "20px" }}>📋 Historical Matrix & Active Ledgers</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {reservationsList.map((res) => (
                  <div key={res.id} style={{ border: `1px solid ${theme.border}`, borderRadius: "12px", padding: "18px", background: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                        <span style={{ fontSize: "16px", fontWeight: "700", color: theme.primary }}>{res.id}</span>
                        <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "12px", background: res.status === "Confirmed" ? "#E8F8F5" : res.status === "Completed" ? "#EAECEE" : "#FADBD8", color: res.status === "Confirmed" ? "#27ae60" : res.status === "Completed" ? "#5D6D7E" : "#c0392b" }}>
                          {res.status.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: theme.textMain }}>
                        📅 {res.date} @ {res.timeSlot} — 👥 {res.guests} Guests
                      </div>
                      <div style={{ fontSize: "12px", color: theme.textMuted, marginTop: "4px" }}>
                        📍 Architecture Pref: {res.area} ({res.tablePreference}) {res.occasion !== "None" && `| Target: ${res.occasion}`}
                      </div>
                    </div>

                    {res.status === "Confirmed" && (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button type="button" onClick={() => { setBooking(prev => ({ ...prev, ...res })); setActiveTab("book"); setBookingStep(1); }} style={{ background: "#ffffff", border: `1px solid ${theme.borderDark}`, padding: "8px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>Modify</button>
                        <button type="button" onClick={() => handleCancelClick(res.id)} style={{ background: "#FFF0F0", border: "1px solid #FADBD8", color: "#c0392b", padding: "8px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>Cancel</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ===================================== */}
      {/* GLOBAL MODAL: CANCELLATION ENGINE     */}
      {/* ===================================== */}
      {showCancelModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "20px" }}>
          <div style={{ background: "#ffffff", maxWidth: "420px", width: "100%", padding: "24px", borderRadius: "16px", boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}>
            <h3 style={{ margin: "0 0 8px 0", fontFamily: "Playfair Display, serif", fontSize: "18px" }}>Confirm Cancellation</h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: theme.textMuted, lineHeight: "1.4" }}>
              Are you sure you want to cancel reservation <strong>{showCancelModal}</strong>? This action will immediately surrender the structural seating block assignment.
            </p>
            
            <label style={labelStyle}>Reason for Cancellation</label>
            <select style={{ ...inputStyle, marginBottom: "20px" }} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}>
              <option value="">Select a reason...</option>
              <option value="Schedule Conflict">Change of Scheduling Plans</option>
              <option value="Sickness">Health or Medical Emergency</option>
              <option value="Weather">Weather / Logistics Obstacles</option>
              <option value="Other">Alternative Reason</option>
            </select>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setShowCancelModal(null)} style={{ background: "transparent", border: `1px solid ${theme.borderDark}`, padding: "10px 16px", borderRadius: "8px", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}>Dismiss</button>
              <button type="button" onClick={confirmCancellation} style={{ background: "#c0392b", color: "#ffffff", border: "none", padding: "10px 16px", borderRadius: "8px", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}>Cancel Booking Permanently</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
