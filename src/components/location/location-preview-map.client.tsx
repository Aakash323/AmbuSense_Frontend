"use client";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

type Coordinates = [number, number];

type LocationPreviewMapProps = {
  coordinates: Coordinates;
};

const markerIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      align-items: center;
      background: white;
      border-radius: 9999px;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.22);
      display: flex;
      height: 36px;
      justify-content: center;
      width: 36px;
    ">
      <div style="
        background: #059669;
        border: 4px solid #047857;
        border-radius: 9999px 9999px 9999px 0;
        height: 22px;
        transform: rotate(-45deg);
        width: 22px;
      ">
        <div style="
          background: white;
          border-radius: 9999px;
          height: 7px;
          left: 3.5px;
          position: relative;
          top: 3.5px;
          width: 7px;
        "></div>
      </div>
    </div>
  `,
  iconAnchor: [18, 36],
  iconSize: [36, 36],
});

function toLatLng([lng, lat]: Coordinates): [number, number] {
  return [lat, lng];
}

function RefreshMapSize() {
  const map = useMap();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => window.clearTimeout(timeout);
  }, [map]);

  return null;
}

export default function LocationPreviewMap({
  coordinates,
}: LocationPreviewMapProps) {
  return (
    <div className="relative z-0 mt-3 overflow-hidden rounded-lg border">
      <MapContainer
        center={toLatLng(coordinates)}
        className="h-72 w-full sm:h-80"
        dragging
        scrollWheelZoom={false}
        zoom={15}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker icon={markerIcon} position={toLatLng(coordinates)} />
        <RefreshMapSize />
      </MapContainer>
    </div>
  );
}
