import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Coordinates matching your tracking steps
const coordinatesByStep = {
  1: [12.9716, 77.5946], // Café Location
  2: [12.9716, 77.5946], // Still at Café
  3: [12.9780, 77.5990], // Out for delivery
  4: [12.9830, 77.6030], // Customer Location (Delivered)
  5: [12.9750, 77.5960], // Issue midpoint
};

// Custom component to handle smooth map panning when the step changes
function RecenterMap({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.panTo(coords);
    }
  }, [coords, map]);
  return null;
}

export default function DeliveryMap({ currentStep }) {
  const currentCoords = coordinatesByStep[currentStep] || [12.9716, 77.5946];

  // Custom HTML Icon to flip the scooter emoji to face right
  const scooterIcon = L.divIcon({
    html: `<div style="font-size: 28px; transform: scaleX(-1); display: inline-block;">🛵</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    className: "custom-scooter" // Clears default white square background
  });

  return (
    <div style={{ width: "100%" }}>
      <MapContainer
        center={currentCoords}
        zoom={14}
        zoomControl={false} // Hides default bulky +/- buttons for a cleaner UI
        style={{ 
          height: "280px", 
          width: "100%", 
          borderRadius: "12px", 
          zIndex: 1 
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Only one live marker tracking Rahul */}
        <Marker position={currentCoords} icon={scooterIcon} />
        
        {/* Handles auto-panning live updates */}
        <RecenterMap coords={currentCoords} />
      </MapContainer>
    </div>
  );
}
