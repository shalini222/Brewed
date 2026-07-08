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

  // Core anchor positions for the buildings
  const cafeCoords = [12.9716, 77.5946];
  const destinationCoords = [12.9830, 77.6030];

  // COMPLETE ROAD PATHWAY
  // Index 2 is the exact roadside spot for the Café.
  // Index 7 (the final index) is the exact spot for the House.
  const fullRoadPath = [
    // --- STAGE 1: Order Confirmed (Starts far away) ---
    [12.9610, 77.5840],
    [12.9635, 77.5870],
    
    // --- STAGE 2: Brewing (Stops exactly 2 road nodes back from the Café) ---
    [12.9665, 77.5900], 
    
    // Intermediate path nodes passing the café
    [12.9692, 77.5925],
    [12.9716, 77.5946], // Exact Café Node
    
    // --- STAGE 3: Out for Delivery (Moving through the shortest road grid) ---
    [12.9735, 77.5958],
    
    // --- STAGE 4: Delivered (Stops exactly 2 road nodes back from the Customer House) ---
    [12.9760, 77.5978], 
    
    // Final destination approach nodes leading up to the house
    [12.9790, 77.6000], 
    [12.9830, 77.6030]  // Exact House Node
  ];

  // Helper targeting function keeping the bike exactly 2 steps away from landmarks
  const getTargetCoords = (step) => {
    if (step <= 1) return fullRoadPath[0];
    if (step === 2) return fullRoadPath[2]; // 2 steps back from Café node (index 4)
    if (step === 3) return fullRoadPath[5]; // Midpoint transit
    return fullRoadPath[6]; // Step 4+: 2 steps back from House node (index 8)
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

    // COFFEE DARK BROWN ROUTE LINE
    routeLineRef.current = window.L.polyline(fullRoadPath, {
      color: "#4A3525", 
      weight: 5,
      opacity: 0.95,
    }).addTo(map);

    // DYNAMIC CAFE SVG MARKER (Comparatively large, cozy aesthetic coffee shop)
    const premiumCafeSvg = `
      <div class="building-container">
        <svg width="58" height="58" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="24" width="48" height="34" rx="3" fill="#D7CCC8" stroke="#5D4037" stroke-width="2"/>
          <path d="M6 14H58L52 24H12L6 14Z" fill="#8D6E63" />
          <path d="M12 14L16 24M23 14L24 24M34 14L32 24M45 14L43 24" stroke="#5D4037" stroke-width="2"/>
          <rect x="26" y="38" width="12" height="20" rx="1" fill="#BBDEFB" stroke="#5D4037" stroke-width="2"/>
          <rect x="42" y="34" width="10" height="12" rx="1" fill="#BBDEFB" stroke="#5D4037" stroke-width="1.5"/>
          <circle cx="47" cy="40" r="2" fill="#6D4C41"/>
          <path d="M18 8Q20 5 18 2" stroke="#A1887F" stroke-width="1.5" stroke-linecap="round"/>
          <rect x="12" y="8" width="12" height="10" rx="2" fill="#6D4C41" stroke="#5D4037" stroke-width="1.5"/>
          <path d="M24 11H26V15H24" stroke="#5D4037" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
    `;

    cafeMarkerRef.current = window.L.circleMarker(cafeCoords, {
      radius: 0, opacity: 0, fillOpacity: 0
    }).addTo(map);

    cafeMarkerRef.current
      .bindTooltip(premiumCafeSvg, { permanent: true, direction: "center", className: "completely-empty-tooltip" })
      .openTooltip();

    // DYNAMIC HOME SVG MARKER (Comparatively large residential townhouse)
    const premiumHomeSvg = `
      <div class="building-container">
        <svg width="58" height="58" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="12" y="26" width="40" height="32" rx="2" fill="#FFF9C4" stroke="#F57F17" stroke-width="2"/>
          <path d="M8 28L32 6L56 28H8Z" fill="#E53935" stroke="#B71C1C" stroke-width="2" stroke-linejoin="round"/>
          <rect x="42" y="10" width="6" height="10" fill="#B71C1C" />
          <rect x="28" y="42" width="10" height="16" fill="#8D6E63" stroke="#5D4037" stroke-width="1.5"/>
          <circle cx="31" cy="50" r="1" fill="#FFD54F"/>
          <circle cx="32" cy="20" r="4" fill="#E0F7FA" stroke="#006064" stroke-width="1.5"/>
        </svg>
      </div>
    `;

    homeMarkerRef.current = window.L.circleMarker(destinationCoords, {
      radius: 0, opacity: 0, fillOpacity: 0
    }).addTo(map);

    homeMarkerRef.current
      .bindTooltip(premiumHomeSvg, { permanent: true, direction: "center", className: "completely-empty-tooltip" })
      .openTooltip();

    // TEENY TINY BIKE MARKER CONTAINER
    scooterMarkerRef.current = window.L.circleMarker(startPos, {
      radius: 0, opacity: 0, fillOpacity: 0
    }).addTo(map);

    const topDownRiderAndBikeSvg = `
      <div id="live-scooter-container">
        <svg width="34" height="34" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="29" y="2" width="6" height="12" rx="3" fill="#1A1A1A" />
          
          <rect x="14" y="14" width="36" height="3" rx="1.5" fill="#34495E" />
          <rect x="12" y="13" width="5" height="5" rx="1" fill="#111111" />
          <rect x="47" y="13" width="5" height="5" rx="1" fill="#111111" />
          
          <path d="M25 15H39V46H25V15Z" fill="#F39C12" />
          
          <path d="M19 24C19 24 16 32 18 38H25V22H19V24Z" fill="#2980B9" />
          <path d="M45 24C45 24 48 32 46 38H39V22H45V24Z" fill="#2980B9" />
          
          <path d="M21 22C21 20 25 18 32 18C39 18 43 20 43 22V34H21V22Z" fill="#34495E" />
          
          <path d="M21 22L15 16" stroke="#34495E" stroke-width="4" stroke-linecap="round" />
          <path d="M43 22L49 16" stroke="#34495E" stroke-width="4" stroke-linecap="round" />

          <circle cx="32" cy="25" r="7" fill="#E67E22" />
          <path d="M26 23C26 21 28 20 32 20C36 20 38 21 38 23V25H26V23Z" fill="#111111" />

          <rect x="18" y="44" width="28" height="16" rx="2" fill="#D35400" stroke="#E67E22" stroke-width="1" />
          <rect x="25" y="48" width="14" height="8" rx="1" fill="#4A3525" />
          <circle cx="32" cy="52" r="1.5" fill="#FFFFFF" />
          
          <rect x="29" y="54" width="6" height="8" rx="2" fill="#1A1A1A" />
        </svg>
      </div>
    `;

    scooterMarkerRef.current
      .bindTooltip(topDownRiderAndBikeSvg, { permanent: true, direction: "center", className: "completely-empty-tooltip" })
      .openTooltip();

    setMapInstance(map);
  }, [isLeafletReady]);

  // 2. MOVEMENT INTERPOLATION & HEADING ROTATION MOTOR
  useEffect(() => {
    if (!mapInstance || !window.L || !scooterMarkerRef.current) return;

    const targetCoords = getTargetCoords(currentStep);
    const startCoords = scooterMarkerRef.current.getLatLng();
    
    const startTime = performance.now();
    const duration = 4500; 

    const animateMovement = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const currentLat = startCoords.lat + (targetCoords[0] - startCoords.lat) * progress;
      const currentLng = startCoords.lng + (targetCoords[1] - startCoords.lng) * progress;
      const animatedPoint = { lat: currentLat, lng: currentLng };

      // ORIENTATION HEADING CALCULATOR
      const dLat = targetCoords[0] - startCoords.lat;
      const dLng = targetCoords[1] - startCoords.lng;
      
      if (Math.abs(dLat) > 0.00001 || Math.abs(dLng) > 0.00001) {
        const angleRad = Math.atan2(dLng, dLat);
        const angleDeg = angleRad * (180 / Math.PI);

        const el = document.getElementById("live-scooter-container");
        if (el) {
          el.style.transform = `rotate(${angleDeg}deg)`;
        }
      }

      scooterMarkerRef.current.setLatLng([animatedPoint.lat, animatedPoint.lng]);

      if (routeLineRef.current) {
        if (currentStep === 4 && progress > 0.98) {
          routeLineRef.current.setLatLngs([]);
        } else {
          routeLineRef.current.setLatLngs(calculateRemainingPath(animatedPoint));
        }
        routeLineRef.current.redraw();
      }

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
        }
        .leaflet-tooltip-top.completely-empty-tooltip::before,
        .leaflet-tooltip-bottom.completely-empty-tooltip::before,
        .leaflet-tooltip-left.completely-empty-tooltip::before,
        .leaflet-tooltip-right.completely-empty-tooltip::before {
          display: none !important;
        }
        .building-container {
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.15));
        }
        #live-scooter-container {
          transform-origin: center center;
          display: flex;
          align-items: center;
          justify-content: center;
          /* Bike set to teeny-tiny scale proportions relative to building landmarks */
          width: 34px;
          height: 34px;
          filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.2));
          transition: transform 0.08s linear;
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
