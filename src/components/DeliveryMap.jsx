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
    
    // --- STAGE 2: Brewing (At the Premium Coffee Shop) ---
    [12.9716, 77.5946], 
    
    // --- STAGE 3: Out for Delivery ---
    [12.9730, 77.5955],
    [12.9755, 77.5970],
    [12.9775, 77.5990],
    [12.9800, 77.6010],
    
    // --- STAGE 4: Delivered (At the Customer House) ---
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
      color: "#1A1A2E", // Elegant ultra-dark path line
      weight: 4,
      opacity: 0.9,
    }).addTo(map);

    // 1. PREMIUM MINIMALIST COFFEE SHOP FRONT
    const premiumCoffeeShopSvg = `
      <div class="premium-map-token cafe-token">
        <svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="24" width="48" height="32" rx="4" fill="#FFFFFF" stroke="#1A1A2E" stroke-width="2.5"/>
          <path d="M4 14H60L54 24H10L4 14Z" fill="#1A1A2E" stroke="#1A1A2E" stroke-width="2.5" stroke-linejoin="round"/>
          <rect x="16" y="34" width="12" height="22" stroke="#1A1A2E" stroke-width="2"/>
          <rect x="36" y="34" width="12" height="14" stroke="#1A1A2E" stroke-width="2"/>
          <path d="M26 6H34V10H26V6Z" fill="#FFFFFF" stroke="#1A1A2E" stroke-width="2" stroke-linejoin="round"/>
          <path d="M34 7H36C37 7 37 9 36 9H34" stroke="#1A1A2E" stroke-width="1.5"/>
        </svg>
      </div>
    `;

    cafeMarkerRef.current = window.L.circleMarker(cafeCoords, {
      radius: 0, opacity: 0, fillOpacity: 0
    }).addTo(map);

    cafeMarkerRef.current
      .bindTooltip(premiumCoffeeShopSvg, {
        permanent: true, direction: "center", className: "completely-empty-tooltip"
      })
      .openTooltip();

    // 2. PREMIUM MINIMALIST CUSTOMER RESIDENCE
    const premiumHouseSvg = `
      <div class="premium-map-token home-token">
        <svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="12" y="28" width="40" height="28" rx="4" fill="#FFFFFF" stroke="#D97706" stroke-width="2.5"/>
          <path d="M6 28L32 6L58 28" stroke="#D97706" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <rect x="27" y="42" width="10" height="14" rx="1" fill="#D97706" stroke="#D97706" stroke-width="1"/>
          <rect x="19" y="34" width="6" height="6" rx="1" stroke="#D97706" stroke-width="2"/>
          <rect x="39" y="34" width="6" height="6" rx="1" stroke="#D97706" stroke-width="2"/>
        </svg>
      </div>
    `;

    homeMarkerRef.current = window.L.circleMarker(destinationCoords, {
      radius: 0, opacity: 0, fillOpacity: 0
    }).addTo(map);

    homeMarkerRef.current
      .bindTooltip(premiumHouseSvg, {
        permanent: true, direction: "center", className: "completely-empty-tooltip"
      })
      .openTooltip();

    // 3. MATTE-FINISH BIRDS-EYE VEHICLE ASSET
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
        
        /* Premium Token Styles */
        .premium-map-token {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #FFFFFF;
          border-radius: 50%;
          width: 56px;
          height: 56px;
          transition: all 0.3s ease;
        }
        .cafe-token {
          filter: drop-shadow(0px 6px 14px rgba(26, 26, 46, 0.24));
        }
        .home-token {
          filter: drop-shadow(0px 6px 14px rgba(217, 119, 6, 0.24));
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
