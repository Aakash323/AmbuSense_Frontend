"use client";

import L, { type LatLngExpression } from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  Tooltip,
  TileLayer,
  useMap,
} from "react-leaflet";
import { RoutePolyline } from "@/components/map/RoutePolyline";
import type { FullTripRoute, RouteCoordinates } from "@/types/routes";
import { createAmbulanceIcon, createHospitalIcon, createPatientIcon } from "./icons";

type TripMapClientProps = {
  ambulanceCoordinates: RouteCoordinates;
  pickupCoordinates: RouteCoordinates;
  hospitalCoordinates: RouteCoordinates;
  route: FullTripRoute | null;
  ambulanceDetails?: { code: string; driverName?: string };
  hospitalDetails?: { name: string };
  patientDetails?: { name: string; phone?: string };
};

type StaticPoint = {
  id: "pickup" | "hospital";
  label: string;
  details?: string;
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


/**
 * Animated ambulance marker — uses an imperative ref so Leaflet animates the
 * position change smoothly instead of a React re-render snap.
 */
function AmbulanceMarker({
  coordinates,
  details,
}: {
  coordinates: RouteCoordinates;
  details?: { code: string; driverName?: string };
}) {
  const markerRef = useRef<L.Marker | null>(null);
  const icon = useMemo(() => createAmbulanceIcon(), []);
  const position = toLatLng(coordinates);

  // On every coordinate update, slide marker to the new position.
  // Leaflet handles the CSS transition automatically.
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng(toLatLng(coordinates));
    }
  }, [coordinates]);

  return (
    <Marker icon={icon} position={position} ref={markerRef}>
      <Tooltip direction="top" offset={[0, -20]} opacity={1}>
        <div className="font-medium">Ambulance {details?.code ?? ""}</div>
        {details?.driverName ? <div className="text-xs text-muted-foreground">{details.driverName}</div> : null}
      </Tooltip>
      <Popup>
        <div className="font-medium">Ambulance {details?.code ?? ""}</div>
        {details?.driverName ? <div className="text-xs text-muted-foreground">{details.driverName}</div> : null}
      </Popup>
    </Marker>
  );
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

/**
 * Fits map bounds only once on initial mount. After that the user can freely
 * pan/zoom without the map snapping back every time the ambulance moves.
 */
function FitMapBounds({
  coordinates,
}: {
  coordinates: RouteCoordinates[];
}) {
  const map = useMap();
  const hasFit = useRef(false);

  useEffect(() => {
    if (hasFit.current || coordinates.length === 0) {
      return;
    }

    const bounds = L.latLngBounds(coordinates.map(toLatLng));
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
    hasFit.current = true;
  }, [coordinates, map]);

  return null;
}

export default function TripMapClient({
  ambulanceCoordinates,
  hospitalCoordinates,
  pickupCoordinates,
  route,
  ambulanceDetails,
  hospitalDetails,
  patientDetails,
}: TripMapClientProps) {
  const staticPoints = useMemo<StaticPoint[]>(
    () => [
      {
        id: "pickup",
        label: "Patient",
        details: patientDetails?.name ? `${patientDetails.name}${patientDetails.phone ? ` (${patientDetails.phone})` : ""}` : "",
        coordinates: pickupCoordinates,
        color: "#7e22ce",
        fillColor: "#a855f7",
      },
      {
        id: "hospital",
        label: "Hospital",
        details: hospitalDetails?.name ?? "",
        coordinates: hospitalCoordinates,
        color: "#dc2626",
        fillColor: "#ef4444",
      },
    ],
    [hospitalCoordinates, pickupCoordinates, patientDetails, hospitalDetails],
  );

  const boundsCoordinates = useMemo(
    () => [
      ambulanceCoordinates,
      pickupCoordinates,
      hospitalCoordinates,
      ...allRouteCoordinates(route),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Only recalculate when the route changes, not when ambulance moves
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pickupCoordinates, hospitalCoordinates, route],
  );

  // Group static points that overlap so their labels merge in popups
  const staticGroups = useMemo(() => {
    return staticPoints.reduce<StaticPoint[][]>((groups, point) => {
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
  }, [staticPoints]);

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

      {/* Animated ambulance marker — slides smoothly as GPS updates */}
      <AmbulanceMarker coordinates={ambulanceCoordinates} details={ambulanceDetails} />

      {/* Static circle markers for pickup and hospital */}
      {staticGroups.map((group) =>
        group.map((point, index) => {
          const spread = 0.00012;
          const angle =
            group.length === 1
              ? 0
              : (2 * Math.PI * index) / group.length - Math.PI / 2;
          const [lng, lat] = point.coordinates;
          const center: LatLngExpression =
            group.length === 1
              ? toLatLng(point.coordinates)
              : [
                  lat + Math.sin(angle) * spread,
                  lng + Math.cos(angle) * spread,
                ];

          const icon = point.id === "pickup" ? createPatientIcon() : createHospitalIcon();

          return (
            <Marker
              position={center}
              key={point.id}
              icon={icon}
            >
              <Tooltip direction="top" offset={[0, -20]} opacity={1}>
                {group.map((p, i) => (
                  <div key={i}>
                    <div className="font-medium">{p.label}</div>
                    {p.details ? <div className="text-xs text-muted-foreground">{p.details}</div> : null}
                  </div>
                ))}
              </Tooltip>
              <Popup>
                {group.map((p, i) => (
                  <div key={i} className="mb-1 last:mb-0">
                    <div className="font-medium">{p.label}</div>
                    {p.details ? <div className="text-xs text-muted-foreground">{p.details}</div> : null}
                  </div>
                ))}
              </Popup>
            </Marker>
          );
        }),
      )}

      <FitMapBounds coordinates={boundsCoordinates} />
    </MapContainer>
  );
}
