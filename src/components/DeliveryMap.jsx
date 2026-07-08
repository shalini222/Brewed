import React, { useEffect, useRef, useState } from "react";

export default function DeliveryMap({ currentStep = 1 }) {
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const scooterMarkerRef = useRef(null);
  const cafeMarkerRef = useRef(null);
  const homeMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const [isLeafletReady, setIsLeafletReady] = useState(false);

  // Animation frame tracker
  const animationRef = useRef(null);

  const coordinatesByStep = {
    1: [12.9716, 77.5946], // Café Location (Confirmed)
    2: [12.9725, 77.5952], // Moved to the nearby road right next to café (Brewing)
    3: [12.9780, 77.5990], // Midpoint route (Out for Delivery)
    4: [12.9830, 77.6030], // Customer House (Delivered)
    5: [12.9750, 77.5960], 
  };

  const cafeCoords = coordinatesByStep[1];
  const destinationCoords = coordinatesByStep[4];

  const getCoords = (step) => coordinatesByStep[step] || cafeCoords;

  const getRemainingPath = (currentCoords, step) => {
    if (step === 4) return []; 
    return [currentCoords, destinationCoords];
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

    const map = window.L.map(mapRef.current, {
      zoomControl: false,
    }).setView(initialCoords, 15);

    window.L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution: '© OpenStreetMap contributors © CARTO',
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(map);

    routeLineRef.current = window.L.polyline(getRemainingPath(initialCoords, currentStep), {
      color: "#8B7355", 
      weight: 4,
      opacity: 0.9,
    }).addTo(map);

    // CAFE MARKER - Replaced the cup with a sleek coffee bean (🫘) or roastery store icon (🏪)
    cafeMarkerRef.current = window.L.circleMarker(cafeCoords, {
      radius: 0,
      opacity: 0,
      fillOpacity: 0,
    }).addTo(map);

    cafeMarkerRef.current
      .bindTooltip(`<div class="clean-icon-text">🫘</div>`, {
        permanent: true,
        direction: "center",
        className: "completely-empty-tooltip",
      })
      .openTooltip();

    // HOUSE MARKER
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

    // LIVE RIDER SCOOTER
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

  // 2. SMOOTH LIVE INTERPOLATION ANIMATION ENGINE
  useEffect(() => {
    if (!mapInstance || !window.L || !scooterMarkerRef.current) return;

    const targetCoords = getCoords(currentStep);
    const startCoords = scooterMarkerRef.current.getLatLng();
    
    const startTime = performance.now();
    const duration = 800; // Animation duration in milliseconds (0.8 seconds of smooth gliding)

    const animateMovement = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth easing curve formula (easeOutQuad)
      const easeProgress = progress * (2 - progress);

      // Linearly interpolate lat and lng values step by step
      const currentLat = startCoords.lat + (targetCoords[0] - startCoords.lat) * easeProgress;
      const currentLng = startCoords.lng + (targetCoords[1] - startCoords.lng) * easeProgress;
      const animatedPoint = [currentLat, currentLng];

      // Move marker frame by frame
      scooterMarkerRef.current.setLatLng(animatedPoint);

      // Redraw the solid line path vanishing behind it dynamically
      if (routeLineRef.current) {
        routeLineRef.current.setLatLngs(getRemainingPath(animatedPoint, currentStep));
        routeLineRef.current.redraw();
      }

      // Smoothly pan camera center frame by frame
      mapInstance.setView(animatedPoint, 15, { animate: false });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animateMovement);
      }
    };

    // Cancel prior moving hooks to prevent position overlapping glides
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    animationRef.current = requestAnimationFrame(animateMovement);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
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
