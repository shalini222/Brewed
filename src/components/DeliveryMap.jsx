import React, { useEffect, useRef } from "react";

export default function DeliveryMap({ currentStep }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);

  // Simulated coordinates for order stages (Café -> Route 1 -> Route 2 -> Customer)
  const coordinatesByStep = {
    1: [12.9716, 77.5946], // Café Location
    2: [12.9716, 77.5946], // Still at Café (Brewing)
    3: [12.9780, 77.5990], // Moving (Out for delivery)
    4: [12.9830, 77.6030], // Customer Location (Delivered)
    5: [12.9750, 77.5960], // Failed midpoint
  };

  useEffect(() => {
    // Access the global L object provided by the CDN script
    if (typeof window !== "undefined" && window.L && !mapInstance.current) {
      const initialCoords = coordinatesByStep[currentStep] || [12.9716, 77.5946];
      
      // Initialize Map
      mapInstance.current = window.L.map(mapRef.current).setView(initialCoords, 14);

      // Add Tile Layer (OpenStreetMap styles)
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(mapInstance.current);

      // Add Driver Marker
      markerRef.current = window.L.marker(initialCoords).addTo(mapInstance.current);
    }
  }, []);

  // Watch for step changes to animate the driver moving live
  useEffect(() => {
    if (mapInstance.current && markerRef.current && window.L) {
      const newCoords = coordinatesByStep[currentStep];
      if (newCoords) {
        markerRef.current.setLatLng(newCoords);
        mapInstance.current.panTo(newCoords);
      }
    }
  }, [currentStep]);

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div 
        ref={mapRef} 
        style={{ 
          height: "200px", 
          width: "100%", 
          borderRadius: "12px", 
          border: "1px solid #E6DFD5",
          zIndex: 1 
        }} 
      />
    </div>
  );
}
