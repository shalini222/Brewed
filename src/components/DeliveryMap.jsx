import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 1. Fix default Leaflet icon paths so they don't break in React/Vite builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 2. Custom Emojis styled into map pins matching your minimalist theme
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
  html: '<div style="font-size: 28px; filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.35));">🛵</div>',
  iconSize: [35, 35],
  className: 'custom-map-icon'
});

// Helper component to auto-focus the map center perfectly between the Cafe and the House
function AutoBoundView({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [bounds, map]);
  return null;
}

export default function DeliveryMap({ isMoving }) {
  // Coordinates based on the Dhakuria / Selimpur Lane, Kolkata area from your checkout view
  const cafeCoords = [22.5065, 88.3630];
  const customerCoords = [22.5125, 88.3755];

  // Route path dots that simulate typical street corners
  const routePath = [
    cafeCoords,
    [22.5085, 88.3660],
    [22.5100, 88.3710],
    customerCoords
  ];

  const [bikePosition, setBikePosition] = useState(cafeCoords);

  useEffect(() => {
    if (!isMoving) {
      setBikePosition(cafeCoords); // Reset position if order isn't out for delivery yet
      return;
    }

    const totalDuration = 30000; // Animation takes 30 seconds to travel from cafe to house
    const tickRate = 100;        // Smooth update positions every 100ms
    const totalSteps = totalDuration / tickRate;
    let currentStep = 0;

    const animationInterval = setInterval(() => {
      currentStep++;
      const progress = Math.min(currentStep / totalSteps, 1);

      const totalSegments = routePath.length - 1;
      const currentSegmentIndex = Math.min(Math.floor(progress * totalSegments), totalSegments - 1);
      
      const startNode = routePath[currentSegmentIndex];
      const endNode = routePath[currentSegmentIndex + 1];
      const segmentProgress = (progress * totalSegments) - currentSegmentIndex;

      // Interpolation calculation formula
      const nextLat = startNode[0] + (endNode[0] - startNode[0]) * segmentProgress;
      const nextLng = startNode[1] + (endNode[1] - startNode[1]) * segmentProgress;

      setBikePosition([nextLat, nextLng]);

      if (progress >= 1) clearInterval(animationInterval);
    }, tickRate);

    return () => clearInterval(animationInterval);
  }, [isMoving]);

  return (
    <div style={{ height: '240px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E6DFD5', marginTop: '1rem', position: 'relative', zIndex: 1 }}>
      <MapContainer center={cafeCoords} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <AutoBoundView bounds={[cafeCoords, customerCoords]} />
        <Polyline positions={routePath} color="#C4956A" weight={4} dashArray="6, 10" opacity={0.8} />
        
        <Marker position={cafeCoords} icon={cafeIcon} />
        <Marker position={customerCoords} icon={houseIcon} />
        <Marker position={bikePosition} icon={bikeIcon} />
      </MapContainer>
    </div>
  );
}

