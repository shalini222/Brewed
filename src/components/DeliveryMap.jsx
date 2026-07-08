import React, { useEffect, useRef } from "react";

export default function DeliveryMap({ currentStep }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);

  // Coordinates matching your exact tracking steps
  const coordinatesByStep = {
    1: [12.9716, 77.5946], // Café Location
    2: [12.9716, 77.5946], // Still at Café (Brewing)
    3: [12.9780, 77.5990], // Moving (Out for delivery)
    4: [12.9830, 77.6030], // Customer Location (Delivered)
    5: [12.9750, 77.5960], // Failed midpoint
  };

  useEffect(() => {
    // Access the global L object from the script setup
    if (typeof window !== "undefined" && window.L && !mapInstance.current) {
      const initialCoords = coordinatesByStep[currentStep] || [12.9716, 77.5946];
      
      // Initialize Map with your preferred zoom level and hidden controls
      mapInstance.current = window.L.map(mapRef.current, {
        zoomControl: false
      }).setView(initialCoords, 14);

      // Add Map Tiles
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(mapInstance.current);

      // Create a custom icon that flips the scooter emoji to face right (forward)
      const flippedScooterIcon = window.L.divIcon({
        html: `<div style="font-size: 28px; transform: scaleX(-1); display: inline-block;">🛵</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        className: "custom-scooter-marker" // Clears default Leaflet white square background
      });

      // Add ONLY the single driver marker tracking Rahul (Coffee cup removed from here)
      markerRef.current = window.L.marker(initialCoords, { icon: flippedScooterIcon }).addTo(mapInstance.current);
    }
  }, []);

  // Watch for step changes to pan the map and animate the driver moving live
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
    <div style={{ width: "100%" }}>
      <div 
        ref={mapRef} 
        style={{ 
          height: "280px", // Balanced landscape banner height
          width: "100%", 
          borderRadius: "12px", 
          zIndex: 1 
        }} 
      />
    </div>
  );
}
