"use client";

import L, { type LatLngExpression } from "leaflet";
import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { RoutePolyline } from "@/components/map/RoutePolyline";
import type { FullTripRoute, RouteCoordinates } from "@/types/routes";

type TripMapClientProps = {
  ambulanceCoordinates: RouteCoordinates;
  pickupCoordinates: RouteCoordinates;
  hospitalCoordinates: RouteCoordinates;
  route: FullTripRoute | null;
};

type MapPoint = {
  id: "ambulance" | "pickup" | "hospital";
  label: string;
  coordinates: RouteCoordinates;
  color: string;
  fillColor: string;
};

function toLatLng(coordinates: RouteCoordinates): LatLngExpression {
  const [lng, lat] = coordinates;
  return [lat, lng];
}

function coordinatesOverlap(
  first: RouteCoordinates,
  second: RouteCoordinates,
) {
  const [firstLng, firstLat] = first;
  const [secondLng, secondLat] = second;

  return (
    Math.abs(firstLng - secondLng) < 0.00005 &&
    Math.abs(firstLat - secondLat) < 0.00005
  );
}

function groupOverlappingPoints(points: MapPoint[]) {
  return points.reduce<MapPoint[][]>((groups, point) => {
    const group = groups.find((items) =>
      coordinatesOverlap(items[0].coordinates, point.coordinates),
    );

    if (group) {
      group.push(point);
      return groups;
    }

    groups.push([point]);
    return groups;
  }, []);
}

function markerRadius(groupSize: number, index: number) {
  return 8;
}

function markerCenter(group: MapPoint[], index: number) {
  const coordinates = group[index].coordinates;

  if (group.length === 1) {
    return toLatLng(coordinates);
  }

  const [lng, lat] = coordinates;
  const spread = 0.00012;
  const angle = (2 * Math.PI * index) / group.length - Math.PI / 2;

  return toLatLng([
    lng + Math.cos(angle) * spread,
    lat + Math.sin(angle) * spread,
  ]);
}

function popupLabel(points: MapPoint[]) {
  return points.map((point) => point.label).join(" and ");
}

function allRouteCoordinates(route: FullTripRoute | null) {
  if (!route) {
    return [];
  }

  return [
    ...route.ambulanceToPickup.geometry.coordinates,
    ...route.pickupToHospital.geometry.coordinates,
  ];
}

function FitMapBounds({
  coordinates,
}: {
  coordinates: RouteCoordinates[];
}) {
  const map = useMap();

  useEffect(() => {
    if (coordinates.length === 0) {
      return;
    }

    const bounds = L.latLngBounds(coordinates.map(toLatLng));
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
  }, [coordinates, map]);

  return null;
}

export default function TripMapClient({
  ambulanceCoordinates,
  hospitalCoordinates,
  pickupCoordinates,
  route,
}: TripMapClientProps) {
  const markerGroups = useMemo(
    () =>
      groupOverlappingPoints([
        {
          id: "ambulance",
          label: "Ambulance",
          coordinates: ambulanceCoordinates,
          color: "#047857",
          fillColor: "#059669",
        },
        {
          id: "pickup",
          label: "Pickup location",
          coordinates: pickupCoordinates,
          color: "#7e22ce",
          fillColor: "#a855f7",
        },
        {
          id: "hospital",
          label: "Hospital",
          coordinates: hospitalCoordinates,
          color: "#dc2626",
          fillColor: "#ef4444",
        },
      ]),
    [ambulanceCoordinates, hospitalCoordinates, pickupCoordinates],
  );
  const boundsCoordinates = useMemo(
    () => [
      ambulanceCoordinates,
      pickupCoordinates,
      hospitalCoordinates,
      ...allRouteCoordinates(route),
    ],
    [ambulanceCoordinates, hospitalCoordinates, pickupCoordinates, route],
  );

  return (
    <MapContainer
      center={toLatLng(ambulanceCoordinates)}
      className="h-full min-h-[400px] w-full"
      scrollWheelZoom
      zoom={13}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {route ? (
        <>
          <RoutePolyline
            color="#2563eb"
            coordinates={route.ambulanceToPickup.geometry.coordinates}
          />
          <RoutePolyline
            color="#0f766e"
            coordinates={route.pickupToHospital.geometry.coordinates}
          />
        </>
      ) : null}

      {markerGroups.map((group) =>
        group.map((point, index) => (
          <CircleMarker
            center={markerCenter(group, index)}
            key={point.id}
            pathOptions={{
              color: point.color,
              fillColor: point.fillColor,
              fillOpacity: 0.88,
              opacity: 1,
              weight: 3,
            }}
            radius={markerRadius(group.length, index)}
          >
            <Popup>{popupLabel(group)}</Popup>
          </CircleMarker>
        )),
      )}
      <FitMapBounds coordinates={boundsCoordinates} />
    </MapContainer>
  );
}
