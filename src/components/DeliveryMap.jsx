import React, { useEffect, useRef, useState } from "react";

export default function DeliveryMap({ currentStep = 1 }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const routeLineRef = useRef(null);
  const [isLeafletReady, setIsLeafletReady] = useState(false);

  const coordinatesByStep = {
    1: [12.9716, 77.5946],
    2: [12.9716, 77.5946],
    3: [12.9780, 77.5990],
    4: [12.9830, 77.6030],
    5: [12.9750, 77.5960],
  };

  const allSteps = Object.keys(coordinatesByStep)
    .map(Number)
    .sort((a, b) => a - b);

  const getCoords = (step) => coordinatesByStep[step] || coordinatesByStep[1];

  const getTraveledPath = (step) => {
    const traveled = allSteps.filter((s) => s <= step).map((s) => coordinatesByStep[s]);
    if (traveled.length < 2) {
      return [coordinatesByStep[1], coordinatesByStep[1]];
    }
    return traveled;
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

    mapInstance.current = window.L.map(mapRef.current, {
      zoomControl: false,
    }).setView(initialCoords, 14);

    // Muted, cream-toned basemap (CartoDB Positron) instead of default busy OSM tiles
    window.L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '© OpenStreetMap contributors © CARTO',
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(mapInstance.current);

    // Dashed trail line
    routeLineRef.current = window.L.polyline(getTraveledPath(currentStep), {
      color: "#8B7355",
      weight: 3,
      dashArray: "8, 8",
      opacity: 0.8,
    }).addTo(mapInstance.current);

    // Invisible circle marker anchoring the scooter emoji tooltip
    markerRef.current = window.L.circleMarker(initialCoords, {
      radius: 0,
      opacity: 0,
      fillOpacity: 0,
    }).addTo(mapInstance.current);

    // Scooter facing forward, no flip, no cup icon
    markerRef.current
      .bindTooltip(`<div class="clean-scooter-text">🛵</div>`, {
        permanent: true,
        direction: "center",
        className: "completely-empty-tooltip",
      })
      .openTooltip();
  }, [isLeafletReady]);

  useEffect(() => {
    if (!mapInstance.current || !markerRef.current || !window.L) return;

    const newCoords = getCoords(currentStep);
    markerRef.current.setLatLng(newCoords);
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
        .clean-scooter-text {
          font-size: 34px !important;
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
          zIndex: 1,
        }}
      />
    </div>
  );
}
