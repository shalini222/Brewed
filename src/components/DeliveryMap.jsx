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

  // Road-snapped street grid path
  const fullRoadPath = [
    // --- STAGE 1: Order Confirmed ---
    [12.9650, 77.5850],
    [12.9680, 77.5900],
    
    // --- STAGE 2: Brewing ---
    [12.9716, 77.5946], 
    
    // --- STAGE 3: Out for Delivery ---
    [12.9730, 77.5955],
    [12.9755, 77.5970],
    [12.9775, 77.5990],
    [12.9800, 77.6010],
    
    // --- STAGE 4: Delivered ---
    [12.9830, 77.6030]
  ];

  const getTargetCoords = (step) => {
    if (step <= 1) return fullRoadPath[0];
    if (step === 2) return fullRoadPath[2]; 
    if (step === 3) return fullRoadPath[5]; 
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
      color: "#1A1A2E", 
      weight: 4,
      opacity: 0.9,
    }).addTo(map);

    // 1. PREMIUM DARK COFFEE SHOP LOCATION PIN
    const premiumCafePin = `
      <div class="premium-pin-wrapper cafe-pin">
        <svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M32 2C19.8 2 10 11.8 10 24C10 39.5 32 62 32 62C32 62 54 39.5 54 24C54 11.8 44.2 2 32 2Z" fill="#1A1A2E" stroke="#FFFFFF" stroke-width="2"/>
          <circle cx="32" cy="24" r="13" fill="#FFFFFF" />
          <path d="M25 21H37V26C37 29.3 34.3 32 31 32H29C25.7 32 23 29.3 23 26V21H25Z" fill="#1A1A2E" />
          <path d="M37 22H39C40.1 22 41 22.9 41 24C41 25.1 40.1 26 39 26H37" stroke="#1A1A2E" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
    `;

    cafeMarkerRef.current = window.L.circleMarker(cafeCoords, {
      radius: 0, opacity: 0, fillOpacity: 0
    }).addTo(map);

    cafeMarkerRef.current
      .bindTooltip(premiumCafePin, {
        permanent: true, direction: "center", className: "completely-empty-tooltip"
      })
      .openTooltip();

    // 2. CLASSIC EMOJI-STYLE HOUSE LOCATION PIN
    const elegantHomePin = `
      <div class="premium-pin-wrapper home-pin">
        <svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M32 2C19.84 2 10 11.84 10 24C10 39.5 32 62 32 62C32 62 54 39.5 54 24C54 11.84 44.16 2 32 2Z" fill="#E28743" stroke="#A64B2A" stroke-width="2"/>
          <circle cx="32" cy="24" r="14" fill="#FFFFFF" />
          <path d="M25 26V31H39V26M32 17L23 24H41L32 17Z" fill="#A64B2A" stroke="#A64B2A" stroke-width="1"/>
        </svg>
      </div>
    `;

    homeMarkerRef.current = window.L.circleMarker(destinationCoords, {
      radius: 0, opacity: 0, fillOpacity: 0
    }).addTo(map);

    homeMarkerRef.current
      .bindTooltip(elegantHomePin, {
        permanent: true, direction: "center", className: "completely-empty-tooltip"
      })
      .openTooltip();

    // 3. MATTE BIRD-EYE BIKE MARKER
    scooterMarkerRef.current = window.L.circleMarker(startPos, {
      radius: 0, opacity: 0, fillOpacity: 0
    }).addTo(map);

    const topDownRiderAndBikeSvg = `
      <div id="live-scooter-container">
        <svg width="30" height="30" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="29" y="2" width="6" height="12" rx="3" fill="#111111" />
          <rect x="14" y="14" width="36" height="3" rx="1.5" fill="#34495E" />
          <rect x="12" y="13" width="5" height="5" rx="1" fill="#111111" />
          <rect x="47" y="13" width="5" height="5" rx="1" fill="#111111" />
          <path d="M25 15H39V46H25V15Z" fill="#D97706" />
          <path d="M19 24C19 24 16 32 18 38H25V22H19V24Z" fill="#111111" />
          <path d="M45 24C45 24 48 32 46 38H39V22H45V24Z" fill="#111111" />
          <path d="M21 22C21 20 25 18 32 18C39 18 43 20 43 22V34H21V22Z" fill="#34495E" />
          <path d="M21 22L15 16" stroke="#34495E" stroke-width="4" stroke-linecap="round" />
          <path d="M43 22L49 16" stroke="#34495E" stroke-width="4" stroke-linecap="round" />
          <circle cx="32" cy="25" r="7" fill="#1A1A2E" />
          <path d="M26 23C26 21 28 20 32 20C36 20 38 21 38 23V25H26V23Z" fill="#FFFFFF" />
          <rect x="18" y="44" width="28" height="16" rx="2" fill="#1A1A2E" />
          <rect x="25" y="48" width="14" height="8" rx="1" fill="#D97706" />
          <rect x="29" y="54" width="6" height="8" rx="2" fill="#111111" />
        </svg>
      </div>
    `;

    scooterMarkerRef.current
      .bindTooltip(topDownRiderAndBikeSvg, {
        permanent: true, direction: "center", className: "completely-empty-tooltip"
      })
      .openTooltip();

    setMapInstance(map);
  }, [isLeafletReady]);

  // SMOOTH ROTATION ENGINE
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
        
        /* Pin placement balancing offset */
        .premium-pin-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          transform: translateY(-20px);
        }
        .cafe-pin {
          filter: drop-shadow(0px 4px 10px rgba(26, 26, 46, 0.35));
        }
        .home-pin {
          filter: drop-shadow(0px 4px 10px rgba(166, 75, 42, 0.3));
        }
        
        /* Scaled Bike Engine Container */
        #live-scooter-container {
          transform-origin: center center;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.16));
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
