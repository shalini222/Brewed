     import React, { useEffect, useRef, useState } from "react";

export default function DeliveryMap({ currentStep = 1 }) {
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const scooterMarkerRef = useRef(null);
  const cafeMarkerRef = useRef(null);
  const homeMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const [isLeafletReady, setIsLeafletReady] = useState(false);

  const animationRef = useRef(null);

  // Core landmarks
  const cafeCoords = [12.9716, 77.5946];
  const destinationCoords = [12.9830, 77.6030];

  // LONGER ROAD TRAJECTORY: Extended far out so the rider drives slowly through multiple street turns
  const fullRoadPath = [
    // --- STAGE 1: Order Confirmed (Starts at a clear distance away from the cafe) ---
    [12.9610, 77.5840],
    [12.9635, 77.5870],
    [12.9665, 77.5900],
    [12.9692, 77.5925],
    
    // --- STAGE 2: Brewing (Rider arrives at the road outside the cafeteria) ---
    [12.9716, 77.5946], 
    
    // --- STAGE 3: Out for Delivery (Navigating road intersections) ---
    [12.9735, 77.5958],
    [12.9755, 77.5975], 
    [12.9785, 77.5990], 
    [12.9805, 77.6012], 
    
    // --- STAGE 4: Delivered (Arrives exactly at customer's house) ---
    [12.9830, 77.6030]
  ];

  const getTargetCoords = (step) => {
    if (step <= 1) return fullRoadPath[0];
    if (step === 2) return fullRoadPath[4]; 
    if (step === 3) return fullRoadPath[7]; 
    return fullRoadPath[fullRoadPath.length - 1]; 
  };

  const calculateRemainingPath = (currentLatLng) => {
    let closestIdx = 0;
    let minDist = Infinity;
    
    for (let i = 0; i < fullRoadPath.length; i++) {
      const d = Math.hypot(fullRoadPath[i][0] - currentLatLng.lat, fullRoadPath[i][1] - currentLatLng.lng);
      if (d < minDist) {
        minDist = d;
        closestIdx = i;
      }
    }

    const path = [[currentLatLng.lat, currentLatLng.lng]];
    for (let i = closestIdx + 1; i < fullRoadPath.length; i++) {
      path.push(fullRoadPath[i]);
    }
    return path;
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

  // 1. INITIALIZE MAP LAYERS ONCE
  useEffect(() => {
    if (!isLeafletReady || !window.L || mapInstance) return;

    const startPos = getTargetCoords(currentStep);

    const map = window.L.map(mapRef.current, {
      zoomControl: false,
    }).setView(startPos, 15);

    window.L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution: '© OpenStreetMap contributors © CARTO',
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(map);

    routeLineRef.current = window.L.polyline(fullRoadPath, {
      color: "#8B7355", 
      weight: 4,
      opacity: 0.9,
    }).addTo(map);

    // CAFETERIA MARKER (Storefront icon)
    cafeMarkerRef.current = window.L.circleMarker(cafeCoords, {
      radius: 0,
      opacity: 0,
      fillOpacity: 0,
    }).addTo(map);

    cafeMarkerRef.current
      .bindTooltip(`<div class="clean-icon-text">🏪</div>`, {
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

    // LIVE DRIVER MARKER (Using an embedded Top-Down vector icon layout)
    scooterMarkerRef.current = window.L.circleMarker(startPos, {
      radius: 0,
      opacity: 0,
      fillOpacity: 0,
    }).addTo(map);

    const topDownRiderSvg = `
      <div id="live-scooter-container">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="4" width="4" height="16" rx="2" fill="#E67E22" />
          <rect x="6" y="6" width="12" height="2" rx="1" fill="#2C3E50" />
          <circle cx="12" cy="12" r="3.5" fill="#34495E" />
          <rect x="8" y="15" width="8" height="5" rx="1" fill="#D35400" stroke="#FFFFFF" stroke-width="0.5" />
        </svg>
      </div>
    `;

    scooterMarkerRef.current
      .bindTooltip(topDownRiderSvg, {
        permanent: true,
        direction: "center",
        className: "completely-empty-tooltip",
      })
      .openTooltip();

    setMapInstance(map);
  }, [isLeafletReady]);

  // 2. SLOW REAL-TIME HEAD-FIRST ROTATION MOTOR ENGINE
  useEffect(() => {
    if (!mapInstance || !window.L || !scooterMarkerRef.current) return;

    const targetCoords = getTargetCoords(currentStep);
    const startCoords = scooterMarkerRef.current.getLatLng();
    
    const startTime = performance.now();
    // DELAYED TIMING: Set to 4500ms (4.5 seconds) to make the bike move slowly and deliberately
    const duration = 4500; 

    const animateMovement = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const currentLat = startCoords.lat + (targetCoords[0] - startCoords.lat) * progress;
      const currentLng = startCoords.lng + (targetCoords[1] - startCoords.lng) * progress;
      const animatedPoint = { lat: currentLat, lng: currentLng };

      // MATHEMATICAL TANGENT HEAD-FIRST CALCULATION
      const dLat = targetCoords[0] - startCoords.lat;
      const dLng = targetCoords[1] - startCoords.lng;
      
      if (Math.abs(dLat) > 0.00001 || Math.abs(dLng) > 0.00001) {
        // Map space conversion angle
        const angleRad = Math.atan2(dLng, dLat);
        const angleDeg = angleRad * (180 / Math.PI);

        const el = document.getElementById("live-scooter-container");
        if (el) {
          // Since our new top-down SVG points straight up (North), 
          // applying the exact computed map heading matches the road direction perfectly!
          el.style.transform = `rotate(${angleDeg}deg)`;
        }
      }

      // Update bike marker coordinates
      scooterMarkerRef.current.setLatLng([animatedPoint.lat, animatedPoint.lng]);

      // Dynamic path trimming logic
      if (routeLineRef.current) {
        if (currentStep === 4 && progress > 0.98) {
          routeLineRef.current.setLatLngs([]);
        } else {
          routeLineRef.current.setLatLngs(calculateRemainingPath(animatedPoint));
        }
        routeLineRef.current.redraw();
      }

      // Smooth camera pan locking onto the vehicle position
      mapInstance.setView([animatedPoint.lat, animatedPoint.lng], 15, { animate: false });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animateMovement);
      }
    };

    if (animationRef.current) cancelAnimationFrame(animationRef.current);
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
          font-size: 36px !important;
          display: block !important;
          line-height: 1 !important;
        }
        #live-scooter-container {
          transform-origin: center center;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          transition: transform 0.08s linear; /* Keeps the head-first rotational street tracking beautifully smooth */
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
