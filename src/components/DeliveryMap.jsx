import React, { useEffect, useRef, useState } from "react";

export default function DeliveryMap({ currentStep = 1 }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const fullRouteLineRef = useRef(null);
  const traveledLineRef = useRef(null);
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
    // Guarantee at least 2 points so Leaflet can draw a line even at step 1
    if (traveled.length < 2) {
      return [coordinatesByStep[1], coordinatesByStep[1]];
    }
    return traveled;
  };

  const getFullPath = () => allSteps.map((s) => coordinatesByStep[s]);

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

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(mapInstance.current);

    // Full planned route, faint dashed line, always visible
    fullRouteLineRef.current = window.L.polyline(getFullPath(), {
      color: "#8B7355",
      weight: 2,
      dashArray: "6, 10",
      opacity: 0.35,
    }).addTo(mapInstance.current);

    // Traveled portion, darker dashed line, on top
    traveledLineRef.current = window.L.polyline(getTraveledPath(currentStep), {
      color: "#8B7355",
      weight: 3,
      dashArray: "8, 8",
      opacity: 0.85,
    }).addTo(mapInstance.current);

    // Invisible circle marker anchoring the scooter emoji tooltip
    markerRef.current = window.L.circleMarker(initialCoords, {
      radius: 0,
      opacity: 0,
      fillOpacity: 0,
    }).addTo(mapInstance.current);

    // Scooter emoji, facing its natural (unmirrored) direction
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

    if (traveledLineRef.current) {
      traveledLineRef.current.setLatLngs(getTraveledPath(currentStep));
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
