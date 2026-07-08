import React, { useEffect, useRef, useState } from "react";

export default function DeliveryMap({ currentStep }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const [isLeafletReady, setIsLeafletReady] = useState(false);

  // Coordinates matching your tracking steps
  const coordinatesByStep = {
    1: [12.9716, 77.5946], // Café Location
    2: [12.9716, 77.5946], // Still at Café (Brewing)
    3: [12.9780, 77.5990], // Moving (Out for delivery)
    4: [12.9830, 77.6030], // Customer Location (Delivered)
    5: [12.9750, 77.5960], // Failed midpoint
  };

  // Dynamically load Leaflet CDN assets if they aren't available globally
  useEffect(() => {
    if (window.L) {
      setIsLeafletReady(true);
      return;
    }

    // Load Leaflet CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    // Load Leaflet JS Script
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => setIsLeafletReady(true);
    document.body.appendChild(script);

    return () => {
      // Clean up script triggers on unmount if necessary
    };
  }, []);

  // Initialize Map once Leaflet assets load successfully
  useEffect(() => {
    if (!isLeafletReady || !window.L || mapInstance.current) return;

    const initialCoords = coordinatesByStep[currentStep] || [12.9716, 77.5946];
    
    // Initialize Map with hidden zoom controls
    mapInstance.current = window.L.map(mapRef.current, {
      zoomControl: false
    }).setView(initialCoords, 14);

    // Load standard clean map tiles
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(mapInstance.current);

    // Custom CSS icon layout to flip the scooter to face forward (right)
    const flippedScooterIcon = window.L.divIcon({
      html: `<div style="font-size: 28px; transform: scaleX(-1); display: inline-block; line-height: 1;">🛵</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      className: "custom-scooter-marker" 
    });

    // Spawn single driver marker (No redundant coffee cup marker)
    markerRef.current = window.L.marker(initialCoords, { icon: flippedScooterIcon }).addTo(mapInstance.current);
  }, [isLeafletReady]);

  // Handle real-time animation panning when step shifts
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
      <div 
        ref={mapRef} 
        style={{ 
          height: "280px", 
          width: "100%", 
          borderRadius: "12px", 
          backgroundColor: "#F5F3E9", // Fallback color while map loads
          zIndex: 1 
        }} 
      />
    </div>
  );
}
