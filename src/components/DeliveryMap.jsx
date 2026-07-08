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

    // Using a fully native div wrapper inside the HTML block to prevent standard styling leaks
    const flippedScooterIcon = window.L.divIcon({
      html: `<div class="bike-emoji-wrapper">🛵</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      className: "unstyle-leaflet-marker"
    });

    markerRef.current = window.L.marker(initialCoords, { icon: flippedScooterIcon }).addTo(mapInstance.current);
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
      {/* Absolute Override Style block targeting both the library class and container */}
      <style>{`
        .unstyle-leaflet-marker, 
        .leaflet-marker-icon.unstyle-leaflet-marker,
        .leaflet-div-icon.unstyle-leaflet-marker {
          background: transparent !important;
          background-color: transparent !important;
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
        }
        .bike-emoji-wrapper {
          font-size: 34px !important;
          transform: scaleX(-1) !important;
          display: block !important;
          line-height: 1 !important;
          width: 36px !important;
          height: 36px !important;
          background: transparent !important;
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
