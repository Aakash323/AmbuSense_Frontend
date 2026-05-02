"use client";

import L from "leaflet";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

type Coordinates = [number, number];

type LocationMapPickerProps = {
  coordinates: Coordinates | null;
  onChange: (coordinates: Coordinates) => void;
};

const defaultCoordinates: Coordinates = [85.324, 27.7172];

const markerIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      align-items: center;
      background: white;
      border-radius: 9999px;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.22);
      display: flex;
      height: 40px;
      justify-content: center;
      width: 40px;
    ">
      <div style="
        background: #059669;
        border: 4px solid #047857;
        border-radius: 9999px 9999px 9999px 0;
        height: 24px;
        transform: rotate(-45deg);
        width: 24px;
      ">
        <div style="
          background: white;
          border-radius: 9999px;
          height: 8px;
          left: 4px;
          position: relative;
          top: 4px;
          width: 8px;
        "></div>
      </div>
    </div>
  `,
  iconAnchor: [20, 40],
  iconSize: [40, 40],
});

function toLatLng([lng, lat]: Coordinates): [number, number] {
  return [lat, lng];
}

function MapClickHandler({
  onChange,
}: {
  onChange: (coordinates: Coordinates) => void;
}) {
  const map = useMapEvents({
    click(event) {
      map.setView(event.latlng, map.getZoom());
      onChange([event.latlng.lng, event.latlng.lat]);
    },
  });

  return null;
}

function SyncMapCenter({ coordinates }: { coordinates: Coordinates }) {
  const map = useMap();

  useEffect(() => {
    map.setView(toLatLng(coordinates), map.getZoom(), { animate: true });
  }, [coordinates, map]);

  return null;
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

export default function LocationMapPicker({
  coordinates,
  onChange,
}: LocationMapPickerProps) {
  const [selectedCoordinates, setSelectedCoordinates] =
    useState<Coordinates>(coordinates ?? defaultCoordinates);

  useEffect(() => {
    if (coordinates) {
      setSelectedCoordinates(coordinates);
    }
  }, [coordinates]);

  const handleChange = useCallback((nextCoordinates: Coordinates) => {
    setSelectedCoordinates(nextCoordinates);
    onChange(nextCoordinates);
  }, [onChange]);

  const markerEventHandlers = useMemo(
    () => ({
      dragend(event: L.LeafletEvent) {
        const marker = event.target as L.Marker;
        const position = marker.getLatLng();
        handleChange([position.lng, position.lat]);
      },
    }),
    [handleChange],
  );

  return (
    <div className="relative overflow-hidden rounded-lg border">
      <MapContainer
        center={toLatLng(selectedCoordinates)}
        className="h-72 w-full"
        scrollWheelZoom
        zoom={14}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          draggable
          eventHandlers={markerEventHandlers}
          icon={markerIcon}
          position={toLatLng(selectedCoordinates)}
        />
        <MapClickHandler onChange={handleChange} />
        <RefreshMapSize />
        <SyncMapCenter coordinates={selectedCoordinates} />
      </MapContainer>
    </div>
  );
}
