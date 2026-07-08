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

  // Exact landmark locations
  const cafeCoords = [12.9716, 77.5946];
  const destinationCoords = [12.9830, 77.6030];

  // ROAD-SNAPPED TRAJECTORY: Detailed multi-point road segments mapping actual street turns
  const fullRoadPath = [
    // --- STAGE 1: Order Confirmed (Rider starts down the road, heading toward the café) ---
    [12.9695, 77.5932], 
    [12.9705, 77.5938],
    
    // --- STAGE 2: Brewing (Rider arrives right outside the café entrance layout) ---
    [12.9716, 77.5946], 
    
    // --- STAGE 3: Out for Delivery (Rider takes local street turns toward destination) ---
    [12.9732, 77.5955],
    [12.9750, 77.5972], 
    [12.9782, 77.5985], 
    [12.9801, 77.6008], 
    
    // --- STAGE 4: Delivered (Arrives exactly at customer's house) ---
    [12.9830, 77.6030]
  ];

  // Maps your parent tracking steps to explicit index windows on our detailed road trajectory array
  const getTargetCoords = (step) => {
    if (step <= 1) return fullRoadPath[0];
    if (step === 2) return fullRoadPath[2]; // Arrived at Café
    if (step === 3) return fullRoadPath[5]; // Midpoint on delivery route
    return fullRoadPath[fullRoadPath.length - 1]; // Step 4+ (Customer House)
  };

  // Slice out the remaining path geometry starting from the driver's current position down to the house
  const calculateRemainingPath = (currentLatLng) => {
    // Find the closest road point index we are approaching to keep vector rendering accurate
    let closestIdx = 0;
    let minDist = Infinity;
    
    for (let i = 0; i < fullRoadPath.length; i++) {
      const d = Math.hypot(fullRoadPath[i][0] - currentLatLng.lat, fullRoadPath[i][1] - currentLatLng.lng);
      if (d < minDist) {
        minDist = d;
        closestIdx = i;
      }
    }

    // Build path starting at the live animated point, running through remaining road turn vertices
    const path = [[currentLatLng.lat, currentLatLng.lng]];
    for (let i = closestIdx + 1; i < fullRoadPath.length; i++) {
      path.push(fullRoadPath[i]);
    }
    return path;
  };

  // Dynamic asset injection
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

  // 1. INITIALIZE STATIC BASEMAP LAYERS
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

    // Initial Solid Path Setup
    routeLineRef.current = window.L.polyline(fullRoadPath, {
      color: "#8B7355", 
      weight: 4,
      opacity: 0.9,
    }).addTo(map);

    // CAFETERIA MARKER: Using a sleek shopfront building emoji (🏪)
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

    // CUSTOMER HOUSE MARKER
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

    // SMOOTH BIKE CONTAINER MARKER
    scooterMarkerRef.current = window.L.circleMarker(startPos, {
      radius: 0,
      opacity: 0,
      fillOpacity: 0,
    }).addTo(map);

    scooterMarkerRef.current
      .bindTooltip(`<div id="live-scooter-container" class="clean-icon-text">🛵</div>`, {
        permanent: true,
        direction: "center",
        className: "completely-empty-tooltip",
      })
      .openTooltip();

    setMapInstance(map);
  }, [isLeafletReady]);

  // 2. TRUE ROAD STEERING & INTERPOLATION ENGINE
  useEffect(() => {
    if (!mapInstance || !window.L || !scooterMarkerRef.current) return;

    const targetCoords = getTargetCoords(currentStep);
    const startCoords = scooterMarkerRef.current.getLatLng();
    
    const startTime = performance.now();
    const duration = 1200; // Eased over 1.2 seconds for fluid pacing across turn segments

    const animateMovement = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * (2 - progress); // easeOutQuad

      const currentLat = startCoords.lat + (targetCoords[0] - startCoords.lat) * easeProgress;
      const currentLng = startCoords.lng + (targetCoords[1] - startCoords.lng) * easeProgress;
      const animatedPoint = { lat: currentLat, lng: currentLng };

      // Calculate Bearing/Angle for true frontwards orientation matching the road heading
      const dLat = targetCoords[0] - startCoords.lat;
      const dLng = targetCoords[1] - startCoords.lng;
      
      // Calculate rotation in degrees if the bike is actively covering distance
      if (Math.abs(dLat) > 0.0001 || Math.abs(dLng) > 0.0001) {
        let angle = Math.atan2(dLng, dLat) * (180 / Math.PI);
        
        // Offset mapping to maintain proper frontwards horizontal scale balance
        const targetRotation = angle - 90; 
        
        const el = document.getElementById("live-scooter-container");
        if (el) {
          el.style.transform = `scaleX(-1) rotate(${targetRotation}deg)`;
        }
      }

      // Move marker location step-by-step
      scooterMarkerRef.current.setLatLng([animatedPoint.lat, animatedPoint.lng]);

      // Dynamic path trimmer: Keeps remaining distance lines perfectly up-to-date
      if (routeLineRef.current) {
        if (currentStep === 4 && progress > 0.95) {
          routeLineRef.current.setLatLngs([]); // Disappear line completely upon formal completion
        } else {
          routeLineRef.current.setLatLngs(calculateRemainingPath(animatedPoint));
        }
        routeLineRef.current.redraw();
      }

      // Center the tracking map dynamically
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
          font-size: 34px !important;
          display: block !important;
          line-height: 1 !important;
          transition: transform 0.1s linear; /* Keeps rotational adjustment fluid */
        }
        #live-scooter-container {
          transform: scaleX(-1); /* Base orientation fix */
          transform-origin: center center;
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
