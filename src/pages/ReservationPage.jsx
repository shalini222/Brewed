import { useState } from "react";

export default function ReservationPage({ setPage }) {
  const [booking, setBooking] = useState({
    date: "",
    timeSlot: "",
    guests: 2,
    seatingPreference: "Standard",
    specialOccasion: "None",
    notes: "",
    name: "",
    email: "",
    phone: ""
  });

  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timeSlots = ["12:00 PM", "1:30 PM", "6:00 PM", "7:30 PM", "9:00 PM"];
  const occasions = ["None", "🎂 Birthday", "🥂 Anniversary", "💼 Business Dinner", "✨ Date Night"];
  
  const seatingOptions = [
    { value: "Standard", label: "🍽️ Main Dining Room", desc: "Vibrant atmosphere near our central kitchen" },
    { value: "Window", label: "🪟 Window Side", desc: "Scenic views along our curated ambient glass facade" },
    { value: "Outdoor", label: "🌿 Garden Terrace", desc: "Al-fresco dining underneath ambient fairy lights" },
    { value: "Private", label: "🚪 VIP Lounge Private Alcove", desc: "An exclusive space with personal sommelier service" }
  ];

  const handleGuestChange = (amount) => {
    setBooking(prev => ({ ...prev, guests: Math.max(1, Math.min(12, prev.guests + amount)) }));
  };

  const handleConfirmReservation = (e) => {
    e.preventDefault();
    if (!booking.date || !booking.timeSlot || !booking.name || !booking.phone) {
      alert("Please fill out all required fields marked with *");
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 1500);
  };

  const cardStyle = {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "24px",
    border: "1px solid #EFECE6",
    boxShadow: "0 10px 30px rgba(59, 26, 8, 0.02)"
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
    padding: "14px 16px",
    borderRadius: "12px",
    border: "1px solid #E0D9D0",
    background: "#FCFAF7",
    fontSize: "15px",
    color: "#2C2520",
    outline: "none",
    boxSizing: "border-box"
  };

  if (isSuccess) {
    return (
      <div style={{ minHeight: "100vh", background: "#FDFAF6", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ background: "#ffffff", maxWidth: "460px", width: "100%", padding: "40px 30px", borderRadius: "24px", border: "1px solid #EFECE6", boxShadow: "0 20px 40px rgba(59,26,8,0.05)", textAlign: "center" }}>
          <div style={{ fontSize: "50px", marginBottom: "16px" }}>✨</div>
          <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "26px", color: "#2C2520", margin: "0 0 8px 0" }}>Your Table is Secured</h2>
          <p style={{ color: "#7A726C", fontSize: "15px", margin: "0 0 24px 0", lineHeight: "1.5" }}>
            We look forward to hosting you, <strong>{booking.name}</strong>. A confirmation code has been generated and details have been linked to your phone.
          </p>

          <div style={{ background: "#FCFAF7", border: "1px solid #EFECE6", borderRadius: "16px", padding: "20px", fontSize: "14px", color: "#3B342F", textAlign: "left", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>📅 Date:</span><strong>{booking.date}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>⏰ Time:</span><strong>{booking.timeSlot}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>👥 Party Size:</span><strong>{booking.guests} Guests</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>📍 Seating:</span><strong>{booking.seatingPreference} Option</strong></div>
          </div>

          <button onClick={() => setPage ? setPage("home") : setIsSuccess(false)} style={{ width: "100%", background: "#3B1A08", color: "#ffffff", border: "none", padding: "16px", borderRadius: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer" }}>
            Return to Home Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FDFAF6", padding: "40px 20px", fontFamily: "system-ui, -apple-system, sans-serif", boxSizing: "border-box" }}>
      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        
        {/* Page Top Intro */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "30px", color: "#2C2520", margin: "0 0 8px 0" }}>
            Book a Table
          </h1>
          <p style={{ margin: 0, color: "#7A726C", fontSize: "14px", lineHeight: "1.4" }}>
            Experience culinary craftsmanship. Reserve your dining experience below.
          </p>
        </div>

        <form onSubmit={handleConfirmReservation} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Section 1: Guest Volume & Calendar Date */}
          <div style={cardStyle}>
            <div style={{ marginBottom: "24px" }}>
              <label style={labelStyle}>How many guests in your party? *</label>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FCFAF7", border: "1px solid #E0D9D0", borderRadius: "12px", padding: "8px 16px" }}>
                <button type="button" onClick={() => handleGuestChange(-1)} style={{ width: "36px", height: "36px", borderRadius: "50%", border: "none", background: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", fontSize: "18px", cursor: "pointer", color: "#3B1A08" }}>–</button>
                <span style={{ fontSize: "16px", fontWeight: "700", color: "#2C2520" }}>{booking.guests} {booking.guests === 1 ? "Guest" : "Guests"}</span>
                <button type="button" onClick={() => handleGuestChange(1)} style={{ width: "36px", height: "36px", borderRadius: "50%", border: "none", background: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", fontSize: "18px", cursor: "pointer", color: "#3B1A08" }}>+</button>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Select Date *</label>
              <input type="date" style={inputStyle} value={booking.date} onChange={(e) => setBooking({ ...booking, date: e.target.value })} required />
            </div>
          </div>

          {/* Section 2: Time Slot Array */}
          <div style={cardStyle}>
            <label style={labelStyle}>Preferred Dining Time *</label>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "4px" }}>
              {timeSlots.map((slot) => {
                const selected = booking.timeSlot === slot;
                return (
                  <button key={slot} type="button" onClick={() => setBooking({ ...booking, timeSlot: slot })} style={{ flex: "1 1 calc(33.33% - 10px)", minWidth: "90px", padding: "12px 0", borderRadius: "10px", border: selected ? "2px solid #3B1A08" : "1px solid #E0D9D0", background: selected ? "#3B1A08" : "#ffffff", color: selected ? "#ffffff" : "#4A423D", fontWeight: "600", fontSize: "13px", cursor: "pointer", transition: "all 0.15s ease" }}>
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Preference Customizations */}
          <div style={cardStyle}>
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Seating Preference</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "6px" }}>
                {seatingOptions.map((opt) => {
                  const currentMatch = booking.seatingPreference === opt.value;
                  return (
                    <div key={opt.value} onClick={() => setBooking({ ...booking, seatingPreference: opt.value })} style={{ padding: "14px", borderRadius: "12px", border: currentMatch ? "2px solid #3B1A08" : "1px solid #E0D9D0", background: currentMatch ? "#FDFAF6" : "#ffffff", cursor: "pointer", transition: "all 0.15s ease" }}>
                      <div style={{ fontWeight: "600", fontSize: "14px", color: "#2C2520", marginBottom: "2px" }}>{opt.label}</div>
                      <div style={{ fontSize: "12px", color: "#7A726C" }}>{opt.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Are you celebrating an occasion?</label>
              <select style={inputStyle} value={booking.specialOccasion} onChange={(e) => setBooking({ ...booking, specialOccasion: e.target.value })}>
                {occasions.map(occ => (
                  <option key={occ} value={occ}>{occ}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 4: Customer Info Fields */}
          <div style={cardStyle}>
            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Your Full Name *</label>
              <input type="text" style={inputStyle} placeholder="Enter your name" value={booking.name} onChange={(e) => setBooking({ ...booking, name: e.target.value })} required />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Mobile Number *</label>
              <input type="tel" style={inputStyle} placeholder="Enter phone number" value={booking.phone} onChange={(e) => setBooking({ ...booking, phone: e.target.value })} required />
            </div>

            <div>
              <label style={labelStyle}>Email Address (Optional)</label>
              <input type="email" style={inputStyle} placeholder="Receive digital receipts" value={booking.email} onChange={(e) => setBooking({ ...booking, email: e.target.value })} />
            </div>
          </div>

          {/* Custom Notes Section */}
          <div style={{ padding: "0 8px" }}>
            <label style={labelStyle}>Special Requests / Dietary Notes</label>
            <textarea style={{ ...inputStyle, height: "80px", resize: "none" }} placeholder="Let us know about food allergies or accessibility needs..." value={booking.notes} onChange={(e) => setBooking({ ...booking, notes: e.target.value })} />
          </div>

          {/* Core Master Booking Action Trigger Button */}
          <button type="submit" disabled={isSubmitting} style={{ background: "#3B1A08", color: "#ffffff", border: "none", padding: "18px", borderRadius: "14px", cursor: isSubmitting ? "not-allowed" : "pointer", fontSize: "15px", fontWeight: "700", boxShadow: "0 8px 24px rgba(59,26,8,0.12)", marginTop: "10px", width: "100%", transition: "all 0.2s" }}>
            {isSubmitting ? "Processing Reservation..." : "Complete Booking"}
          </button>

        </form>
      </div>
    </div>
  );
}
