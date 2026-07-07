    import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Styled Marker Pins
const cafeIcon = L.divIcon({
  html: '<div style="font-size: 24px; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3));">☕</div>',
  iconSize: [30, 30],
  className: 'custom-map-icon'
});

const houseIcon = L.divIcon({
  html: '<div style="font-size: 24px; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3));">🏠</div>',
  iconSize: [30, 30],
  className: 'custom-map-icon'
});

const bikeIcon = L.divIcon({
  html: '<div style="font-size: 28px; filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.35)); transition: transform 0.1s linear;">🛵</div>',
  iconSize: [35, 35],
  className: 'custom-map-icon'
});

// Helper component to center the map viewport dynamically to include the full path layout
function AutoBoundView({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

export default function DeliveryMap({ currentStep }) {
  // 1. Defining Core Coordinates (Kolkata Dhakuria / Selimpur Area)
  const riderStartCoords = [22.4985, 88.3580]; // Rider starting far away south-west
  const cafeCoords       = [22.5065, 88.3630]; // The Cafe Hub
  const customerCoords   = [22.5125, 88.3755]; // Customer Address

  // 2. Full path breakdown
  const transitToCafePath = [
    riderStartCoords,
    [22.5020, 88.3595],
    cafeCoords
  ];

  const transitToCustomerPath = [
    cafeCoords,
    [22.5085, 88.3660],
    [22.5100, 88.3710],
    customerCoords
  ];

  const fullMapBounds = [riderStartCoords, cafeCoords, customerCoords];
  const [bikePosition, setBikePosition] = useState(riderStartCoords);

  useEffect(() => {
    let activePath = [];
    let duration = 20000; // Animation timing for each trip segment phase (20 seconds)

    if (currentStep <= 2) {
      // Phase A: Rider driving toward the cafe to pick up order
      activePath = transitToCafePath;
    } else if (currentStep === 3) {
      // Phase B: Rider driving from cafe to customer home address
      activePath = transitToCustomerPath;
    } else {
      // Phase C: Delivered! Rider stays static at customer house location
      setBikePosition(customerCoords);
      return;
    }

    const tickRate = 100;
    const totalSteps = duration / tickRate;
    let currentStepTick = 0;

    const interval = setInterval(() => {
      currentStepTick++;
      const progress = Math.min(currentStepTick / totalSteps, 1);

      const totalSegments = activePath.length - 1;
      const currentSegmentIndex = Math.min(Math.floor(progress * totalSegments), totalSegments - 1);
      
      const startNode = activePath[currentSegmentIndex];
      const endNode = activePath[currentSegmentIndex + 1];
      const segmentProgress = (progress * totalSegments) - currentSegmentIndex;

      const nextLat = startNode[0] + (endNode[0] - startNode[0]) * segmentProgress;
      const nextLng = startNode[1] + (endNode[1] - startNode[1]) * segmentProgress;

      setBikePosition([nextLat, nextLng]);

      if (progress >= 1) clearInterval(interval);
    }, tickRate);

    return () => clearInterval(interval);
  }, [currentStep]);

  return (
    <div style={{ height: '260px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E6DFD5', marginTop: '1rem', position: 'relative', zIndex: 1 }}>
      <MapContainer center={cafeCoords} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap'
        />
        <AutoBoundView bounds={fullMapBounds} />
        
        {/* Draw rider roadmap lines */}
        <Polyline positions={transitToCafePath} color="#70645C" weight={3} dashArray="4, 8" opacity={0.5} />
        <Polyline positions={transitToCustomerPath} color="#C4956A" weight={4} dashArray="6, 10" opacity={0.8} />
        
        {/* Static Hub Pins */}
        <Marker position={cafeCoords} icon={cafeIcon} />
        <Marker position={customerCoords} icon={houseIcon} />
        
        {/* Animated Moving Rider Marker */}
        <Marker position={bikePosition} icon={bikeIcon} />
      </MapContainer>
    </div>
  );
}
