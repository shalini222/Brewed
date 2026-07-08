import React, { useEffect, useRef, useState } from "react";

export default function DeliveryMap({ currentStep }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const [isLeafletReady, setIsLeafletReady] = useState(false);

  const coordinatesByStep = {
    1: [12.9716, 77.5946], 
    2: [12.9716, 77.5946], 
    3: [12.9780, 77.5990], 
    4: [12.9830, 77.6030], 
    5: [12.9750, 77.5960], 
  };

  useEffect(() => {
    if (window.L) {
      setIsLeafletReady(true);
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => setIsLeafletReady(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!isLeafletReady || !window.L || mapInstance.current) return;

    const initialCoords = coordinatesByStep[currentStep] || [12.9716, 77.5946];
    
    mapInstance.current = window.L.map(mapRef.current, {
      zoomControl: false
    }).setView(initialCoords, 14);

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(mapInstance.current);

    // THE FIX: Create an invisible circle marker at the location point
    markerRef.current = window.L.circleMarker(initialCoords, {
      radius: 0,
      opacity: 0,
      fillOpacity: 0
    }).addTo(mapInstance.current);

    // Bind a permanent text layout that holds only our clean flipped emoji
    markerRef.current.bindTooltip(
      `<div class="clean-scooter-text">🛵</div>`, 
      {
        permanent: true,
        direction: "center",
        className: "completely-empty-tooltip"
      }
    ).openTooltip();

  }, [isLeafletReady]);

  useEffect(() => {
    if (mapInstance.current && markerRef.current && window.L) {
      const newCoords = coordinatesByStep[currentStep];
      if (newCoords) {
        markerRef.current.setLatLng(newCoords);
        mapInstance.current.panTo(newCoords);
      }
    }
  }, [currentStep, isLeafletReady]);

  return (
    <div style={{ width: "100%" }}>
      {/* Structural resets to explicitly wipe out Leaflet's built-in box layout */}
      <style>{`
        .leaflet-tooltip.completely-empty-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin: 0 !important;
          background-color: transparent !important;
        }
        .leaflet-tooltip-top.completely-empty-tooltip::before,
        .leaflet-tooltip-bottom.completely-empty-tooltip::before,
        .leaflet-tooltip-left.completely-empty-tooltip::before,
        .leaflet-tooltip-right.completely-empty-tooltip::before {
          display: none !important; /* Removes the tiny text arrow pointer */
        }
        .clean-scooter-text {
          font-size: 34px !important;
          transform: scaleX(-1) !important; /* Flips the scooter to face forward */
          display: block !important;
          line-height: 1 !important;
        }
      `}</style>
      
      <div 
        ref={mapRef} 
        style={{ 
          height: "280px", 
          width: "100%", 
          borderRadius: "12px", 
          backgroundColor: "#F5F3E9", 
          zIndex: 1 
        }} 
      />
    </div>
  );
}
