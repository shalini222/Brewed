import React, { useEffect, useRef, useState } from "react";

export default function DeliveryMap({ currentStep = 1 }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
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

  // FIX: Explicitly lock the home destination to step 4 so it never drifts
  const originCoords = coordinatesByStep[1];
  const destinationCoords = coordinatesByStep[4];

  const getCoords = (step) => coordinatesByStep[step] || originCoords;

  // FIX: Create a direct line path trailing right behind the driver from start to current location
  const getTraveledPath = (step) => {
    const currentDriverCoords = getCoords(step);
    return [originCoords, currentDriverCoords];
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

    const initialCoords = getCoords(currentStep);

    // FIX: Changed zoom factor from 14 to 15 for a closer, premium view
    mapInstance.current = window.L.map(mapRef.current, {
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
    ).addTo(mapInstance.current);

    // Dashed path trailing behind the scooter marker
    routeLineRef.current = window.L.polyline(getTraveledPath(currentStep), {
      color: "#8B7355",
      weight: 3,
      dashArray: "8, 8",
      opacity: 0.8,
    }).addTo(mapInstance.current);

    // Destination marker (house) stays stationary at Step 4 coordinates
    homeMarkerRef.current = window.L.circleMarker(destinationCoords, {
      radius: 0,
      opacity: 0,
      fillOpacity: 0,
    }).addTo(mapInstance.current);

    homeMarkerRef.current
      .bindTooltip(`<div class="clean-icon-text">🏠</div>`, {
        permanent: true,
        direction: "center",
        className: "completely-empty-tooltip",
      })
      .openTooltip();

    // Scooter marker setup using the flip utility style
    scooterMarkerRef.current = window.L.circleMarker(initialCoords, {
      radius: 0,
      opacity: 0,
      fillOpacity: 0,
    }).addTo(mapInstance.current);

    scooterMarkerRef.current
      .bindTooltip(`<div class="clean-icon-text flip-bike">🛵</div>`, {
        permanent: true,
        direction: "center",
        className: "completely-empty-tooltip",
      })
      .openTooltip();
  }, [isLeafletReady]);

  useEffect(() => {
    if (!mapInstance.current || !scooterMarkerRef.current || !window.L) return;

    const newCoords = getCoords(currentStep);
    scooterMarkerRef.current.setLatLng(newCoords);
    mapInstance.current.panTo(newCoords);

    if (routeLineRef.current) {
      routeLineRef.current.setLatLngs(getTraveledPath(currentStep));
    }
  }, [currentStep, isLeafletReady]);

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
        /* Clean flip style execution without Leaflet overrides getting in the way */
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
