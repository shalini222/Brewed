import React, { useEffect, useRef, useState } from "react";

export default function DeliveryMap({ currentStep = 1 }) {
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const scooterMarkerRef = useRef(null);
  const cafeMarkerRef = useRef(null);
  const homeMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const [isLeafletReady, setIsLeafletReady] = useState(false);

  // Exact step coordinates matching the delivery states
  const coordinatesByStep = {
    1: [12.9716, 77.5946], // Café Location (Confirmed)
    2: [12.9719, 77.5950], // Right outside on the road (Brewing)
    3: [12.9780, 77.5990], // Midpoint on route (Out for Delivery)
    4: [12.9830, 77.6030], // Customer House (Delivered)
    5: [12.9750, 77.5960], // Midpoint fallback
  };

  const cafeCoords = coordinatesByStep[1];
  const destinationCoords = coordinatesByStep[4];

  const getCoords = (step) => coordinatesByStep[step] || cafeCoords;

  // REMOVES PASSED LINE: Draws a solid line ONLY from the current bike position to the destination house
  const getRemainingPath = (step) => {
    const currentDriverCoords = getCoords(step);
    
    // If already delivered, don't show any remaining line path
    if (step === 4) return []; 
    
    return [currentDriverCoords, destinationCoords];
  };

  // Load Leaflet CDN script assets cleanly
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

  // 1. INITIALIZE BASE MAP LAYERS ONCE
  useEffect(() => {
    if (!isLeafletReady || !window.L || mapInstance) return;

    const initialCoords = getCoords(currentStep);

    // Initial tight zoom factor set to 15
    const map = window.L.map(mapRef.current, {
      zoomControl: false,
    }).setView(initialCoords, 15);

    // Cream-toned clean basemap
    window.L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution: '© OpenStreetMap contributors © CARTO',
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(map);

    // SOLID BROWN PATH: Renders remaining path layout
    routeLineRef.current = window.L.polyline(getRemainingPath(currentStep), {
      color: "#8B7355", // Your beautiful brand theme brown color
      weight: 4,
      opacity: 0.9,
    }).addTo(map);

    // CAFE MARKER (Stationary at start position)
    cafeMarkerRef.current = window.L.circleMarker(cafeCoords, {
      radius: 0,
      opacity: 0,
      fillOpacity: 0,
    }).addTo(map);

    cafeMarkerRef.current
      .bindTooltip(`<div class="clean-icon-text">☕</div>`, {
        permanent: true,
        direction: "center",
        className: "completely-empty-tooltip",
      })
      .openTooltip();

    // HOUSE MARKER (Stationary at final delivery position)
    homeMarkerRef.current = window.L.circleMarker(destinationCoords, {
      radius: 0,
      opacity: 0,
      fillOpacity: 0,
    }).addTo(map);

    homeMarkerRef.current
      .bindTooltip(`<div class="clean-icon-text">🏠</div>`, {
        permanent: true,
        direction: "center",
        className: "completely-empty-tooltip",
      })
      .openTooltip();

    // LIVE RIDER SCOOTER MARKER (Changes location dynamically)
    scooterMarkerRef.current = window.L.circleMarker(initialCoords, {
      radius: 0,
      opacity: 0,
      fillOpacity: 0,
    }).addTo(map);

    scooterMarkerRef.current
      .bindTooltip(`<div class="clean-icon-text flip-bike">🛵</div>`, {
        permanent: true,
        direction: "center",
        className: "completely-empty-tooltip",
      })
      .openTooltip();

    setMapInstance(map);
  }, [isLeafletReady]);

  // 2. STATE HANDLER: Moves bike and updates line paths on active state step updates
  useEffect(() => {
    if (!mapInstance || !window.L) return;

    const newCoords = getCoords(currentStep);

    // Animate bike marker to new position
    if (scooterMarkerRef.current) {
      scooterMarkerRef.current.setLatLng(newCoords);
    }

    // Refresh path lines so passed routes clear away immediately
    if (routeLineRef.current) {
      routeLineRef.current.setLatLngs(getRemainingPath(currentStep));
      routeLineRef.current.redraw();
    }

    // Camera tracks along smoothly with premium zoom perspective
    mapInstance.setView(newCoords, 15, { animate: true, duration: 0.6 });
  }, [currentStep, mapInstance]);

  return (
    <div style={{ width: "100%" }}>
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
          display: none !important;
        }
        .clean-icon-text {
          font-size: 34px !important;
          display: block !important;
          line-height: 1 !important;
        }
        .flip-bike {
          transform: scaleX(-1) !important;
        }
      `}</style>

      <div
        ref={mapRef}
        style={{
          height: "280px",
          width: "100%",
          borderRadius: "12px",
          backgroundColor: "#F5F3E9",
          zIndex: 1,
        }}
      />
    </div>
  );
}
