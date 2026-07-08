import React, { useEffect, useRef, useState } from "react";

export default function DeliveryMap({ currentStep = 1 }) {
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const scooterMarkerRef = useRef(null);
  const homeMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const [isLeafletReady, setIsLeafletReady] = useState(false);

  // Core project step coordinates
  const coordinatesByStep = {
    1: [12.9716, 77.5946], // Café Location (Origin)
    2: [12.9716, 77.5946], // Still at Café
    3: [12.9780, 77.5990], // Out for delivery
    4: [12.9830, 77.6030], // Customer Location (True Destination)
    5: [12.9750, 77.5960], // Issue midpoint
  };

  const originCoords = coordinatesByStep[1];
  const destinationCoords = coordinatesByStep[4];

  const getCoords = (step) => coordinatesByStep[step] || originCoords;

  // Draws a path strictly from the café up to where the rider is currently located
  const getTraveledPath = (step) => {
    const currentDriverCoords = getCoords(step);
    return [originCoords, currentDriverCoords];
  };

  // Load CDN Script assets
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

  // 1. INITIALIZE THE BASE MAP ONCE
  useEffect(() => {
    if (!isLeafletReady || !window.L || mapInstance) return;

    const initialCoords = getCoords(currentStep);

    // Zoom bumped to 15 for a premium close-up view
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

    // Create the polyline component instance on the map layout
    routeLineRef.current = window.L.polyline(getTraveledPath(currentStep), {
      color: "#8B7355",
      weight: 4, // Slightly thicker line so it's highly visible
      dashArray: "8, 8",
      opacity: 0.9,
    }).addTo(map);

    // Destination marker (house) stays stationary at Step 4 coordinates
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

    // Scooter marker setup using the circleMarker tooltip engine
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

    // Save the created map instance to state so our updater effect can access it smoothly
    setMapInstance(map);
  }, [isLeafletReady]);

  // 2. LIVE STATE UPDATER: Synchronizes the path and bike marker dynamically on step shifts
  useEffect(() => {
    if (!mapInstance || !window.L) return;

    const newCoords = getCoords(currentStep);

    // Update the rider icon coordinates
    if (scooterMarkerRef.current) {
      scooterMarkerRef.current.setLatLng(newCoords);
    }

    // Force redraw the trail behind the moving rider
    if (routeLineRef.current) {
      routeLineRef.current.setLatLngs(getTraveledPath(currentStep));
      routeLineRef.current.redraw(); // Forces Leaflet renderer to show vector updates instantly
    }

    // Center the view camera smoothly on the driver's current position
    mapInstance.setView(newCoords, 15, { animate: true, duration: 0.5 });
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
