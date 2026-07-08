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

  // EXTENDED ROAD TRAJECTORY: Started much further back south-west to maximize travel distance
  const fullRoadPath = [
    // --- STAGE 1: Order Confirmed (Rider starts far away, driving slowly toward the café) ---
    [12.9645, 77.5880], 
    [12.9668, 77.5905],
    [12.9688, 77.5924],
    [12.9702, 77.5935],
    
    // --- STAGE 2: Brewing (Rider reaches the road near the café entrance) ---
    [12.9716, 77.5946], 
    
    // --- STAGE 3: Out for Delivery (Rider moves along roads to destination) ---
    [12.9732, 77.5955],
    [12.9750, 77.5972], 
    [12.9782, 77.5985], 
    [12.9801, 77.6008], 
    
    // --- STAGE 4: Delivered (Arrives perfectly at the house) ---
    [12.9830, 77.6030]
  ];

  const getTargetCoords = (step) => {
    if (step <= 1) return fullRoadPath[0];
    if (step === 2) return fullRoadPath[4]; // Café location index
    if (step === 3) return fullRoadPath[7]; // Midpoint path
    return fullRoadPath[fullRoadPath.length - 1]; // House location
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

    routeLineRef.current = window.L.polyline(fullRoadPath, {
      color: "#8B7355", 
      weight: 4,
      opacity: 0.9,
    }).addTo(map);

    // CAFETERIA STORE MARKER (Sleek Store Icon)
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

    // LIVE DRIVER MARKER (Starts without structural transforms)
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

  // 2. SMOOTH REAL-TIME ROTATIONAL INTERPOLATION ENGINE
  useEffect(() => {
    if (!mapInstance || !window.L || !scooterMarkerRef.current) return;

    const targetCoords = getTargetCoords(currentStep);
    const startCoords = scooterMarkerRef.current.getLatLng();
    
    const startTime = performance.now();
    // CRUISE SPEED: Increased to 2500ms (2.5 seconds) so the bike drives slowly and realistically
    const duration = 2500; 

    const animateMovement = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Linear transition for steady, consistent driving velocity
      const currentLat = startCoords.lat + (targetCoords[0] - startCoords.lat) * progress;
      const currentLng = startCoords.lng + (targetCoords[1] - startCoords.lng) * progress;
      const animatedPoint = { lat: currentLat, lng: currentLng };

      // TRUE DIRECTION CALCULATOR
      const dLat = targetCoords[0] - startCoords.lat;
      const dLng = targetCoords[1] - startCoords.lng;
      
      if (Math.abs(dLat) > 0.00001 || Math.abs(dLng) > 0.00001) {
        // Calculate the raw mathematical angle of the street line
        const angleRad = Math.atan2(dLng, dLat);
        let angleDeg = angleRad * (180 / Math.PI);

        // PERFECT ALIGNMENT CORRECTION: 
        // Emojis face left by default. To make it head-first, we map the rotation directly
        // and toggle scale mirror properties contextually depending on whether moving left or right.
        const el = document.getElementById("live-scooter-container");
        if (el) {
          if (dLng >= 0) {
            // Heading Eastwards (Right side of map view) -> Flip horizontally + add angle offset
            el.style.transform = `scaleX(-1) rotate(${angleDeg - 90}deg)`;
          } else {
            // Heading Westwards (Left side of map view) -> Standard scale + opposite tracking offset
            el.style.transform = `scaleX(1) rotate(${-angleDeg - 90}deg)`;
          }
        }
      }

      // Update position coordinates frame-by-frame
      scooterMarkerRef.current.setLatLng([animatedPoint.lat, animatedPoint.lng]);

      // Erase trailing paths behind the vehicle in real-time
      if (routeLineRef.current) {
        if (currentStep === 4 && progress > 0.98) {
          routeLineRef.current.setLatLngs([]);
        } else {
          routeLineRef.current.setLatLngs(calculateRemainingPath(animatedPoint));
        }
        routeLineRef.current.redraw();
      }

      // Keep map view focus centered on the driver
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
          display: inline-block;
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

      
