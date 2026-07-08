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

  // Core landmarks (Bengaluru grid context)
  const cafeCoords = [12.9716, 77.5946];
  const destinationCoords = [12.9830, 77.6030];

  // CONVENIENT SHORTEST ROAD-SNAPPED PATHWAY
  const fullRoadPath = [
    // --- STAGE 1: Order Confirmed (Rider starts at a distance away from the cafe) ---
    [12.9610, 77.5840],
    [12.9635, 77.5870],
    [12.9665, 77.5900],
    [12.9692, 77.5925],
    
    // --- STAGE 2: Brewing (Rider arrives at the road outside the cafeteria) ---
    [12.9716, 77.5946], 
    
    // --- STAGE 3: Out for Delivery (Shortest, most convenient connecting road grid cuts) ---
    [12.9735, 77.5958],
    [12.9760, 77.5978], 
    [12.9790, 77.6000], 
    
    // --- STAGE 4: Delivered (Arrives perfectly at customer's house) ---
    [12.9830, 77.6030]
  ];

  const getTargetCoords = (step) => {
    if (step <= 1) return fullRoadPath[0];
    if (step === 2) return fullRoadPath[4]; 
    if (step === 3) return fullRoadPath[6]; 
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

  // 1. INITIALIZE MAP LAYERS
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

    // RICH DARK COFFEE COLOURED VECTOR POLYLINE (#4A3525)
    routeLineRef.current = window.L.polyline(fullRoadPath, {
      color: "#4A3525", 
      weight: 5,
      opacity: 0.95,
    }).addTo(map);

    // CAFETERIA MARKER
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

    // LIVE RIDER MARKER CONTAINER
    scooterMarkerRef.current = window.L.circleMarker(startPos, {
      radius: 0,
      opacity: 0,
      fillOpacity: 0,
    }).addTo(map);

    // DEDICATED TOP-DOWN BIKE DESIGN COMPONENT
    const premiumTopDownBikeSvg = `
      <div id="live-scooter-container">
        <svg width="46" height="46" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="29" y="4" width="6" height="10" rx="3" fill="#1A1A1A" />
          
          <rect x="16" y="12" width="32" height="4" rx="2" fill="#555555" />
          <circle cx="16" cy="14" r="2.5" fill="#111111" />
          <circle cx="48" cy="14" r="2.5" fill="#111111" />
          
          <path d="M18 12L14 7" stroke="#555555" stroke-width="2" stroke-linecap="round"/>
          <path d="M46 12L50 7" stroke="#555555" stroke-width="2" stroke-linecap="round"/>
          <ellipse cx="14" cy="6" rx="3" ry="1.5" fill="#777777" />
          <ellipse cx="50" cy="6" rx="3" ry="1.5" fill="#777777" />

          <path d="M24 14C24 14 20 28 22 40C23.5 49 26 52 32 52C38 52 40.5 49 42 40C44 28 40 14 40 14H24Z" fill="#F1C40F" />
          
          <rect x="26" y="22" width="12" height="12" rx="1" fill="#2C3E50" />
          
          <path d="M25 34C25 34 26 44 32 44C38 44 39 34 39 34H25Z" fill="#222222" />
          
          <rect x="20" y="45" width="24" height="14" rx="2" fill="#D35400" stroke="#E67E22" stroke-width="1.5" />
          <rect x="26" y="48" width="12" height="8" rx="1" fill="#4A3525" />
          <circle cx="32" cy="52" r="2" fill="#FFFFFF" />
        </svg>
      </div>
    `;

    scooterMarkerRef.current
      .bindTooltip(premiumTopDownBikeSvg, {
        permanent: true,
        direction: "center",
        className: "completely-empty-tooltip",
      })
      .openTooltip();

    setMapInstance(map);
  }, [isLeafletReady]);

  // 2. TURNING VELOCITY MOVEMENT & HEAD-FIRST STEERING ENGINE
  useEffect(() => {
    if (!mapInstance || !window.L || !scooterMarkerRef.current) return;

    const targetCoords = getTargetCoords(currentStep);
    const startCoords = scooterMarkerRef.current.getLatLng();
    
    const startTime = performance.now();
    const duration = 4500; // Slow, immersive cruising speed

    const animateMovement = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const currentLat = startCoords.lat + (targetCoords[0] - startCoords.lat) * progress;
      const currentLng = startCoords.lng + (targetCoords[1] - startCoords.lng) * progress;
      const animatedPoint = { lat: currentLat, lng: currentLng };

      // HEAD-FIRST VECTOR ORIENTATION
      const dLat = targetCoords[0] - startCoords.lat;
      const dLng = targetCoords[1] - startCoords.lng;
      
      if (Math.abs(dLat) > 0.00001 || Math.abs(dLng) > 0.00001) {
        const angleRad = Math.atan2(dLng, dLat);
        const angleDeg = angleRad * (180 / Math.PI);

        const el = document.getElementById("live-scooter-container");
        if (el) {
          // Since our new custom top-down vehicle vector points perfectly North by default,
          // applying the raw angle vector cleanly locks the front wheel directly to the street path layout!
          el.style.transform = `rotate(${angleDeg}deg)`;
        }
      }

      // Update positions
      scooterMarkerRef.current.setLatLng([animatedPoint.lat, animatedPoint.lng]);

      // Remove passed segments from remaining line path
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
          width: 46px;
          height: 46px;
          transition: transform 0.08s linear; /* Keeps the head-first path rotation highly fluid */
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
