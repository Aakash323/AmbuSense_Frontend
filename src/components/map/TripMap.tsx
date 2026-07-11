"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useFullTripRoute } from "@/hooks/use-trip-route";
import { getFriendlyApiErrorMessage } from "@/lib/api";
import {
  acquireSocketConnection,
  releaseSocketConnection,
  socket,
} from "@/lib/socket";
import type { Ambulance } from "@/types/ambulances";
import type { EmergencyRequest } from "@/types/emergency-requests";
import type { RouteCoordinates } from "@/types/routes";

const TripMapClient = dynamic(() => import("./TripMap.client"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[400px] items-center justify-center bg-muted/30 text-sm text-muted-foreground">
      Loading map...
    </div>
  ),
});

type AmbulanceLocationUpdatedPayload = {
  id?: string;
  _id?: string;
  currentLocation?: {
    type: "Point";
    coordinates: RouteCoordinates;
  };
};

function getRequestId(request: EmergencyRequest) {
  return request.id ?? request._id ?? "";
}

function getAmbulanceId(ambulance: Ambulance | null | undefined) {
  return ambulance?.id ?? ambulance?._id ?? "";
}

function isValidCoordinates(
  coordinates: RouteCoordinates | null | undefined,
): coordinates is RouteCoordinates {
  return (
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    coordinates.every((coordinate) => Number.isFinite(coordinate))
  );
}

function formatDistance(value: number | undefined) {
  if (typeof value !== "number") {
    return "Route unavailable";
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} km`;
  }

  return `${Math.round(value)} m`;
}

function formatDuration(value: number | undefined) {
  if (typeof value !== "number") {
    return "Duration unavailable";
  }

  return `${Math.max(1, Math.round(value / 60))} min`;
}

export function TripMap({ trip }: { trip: EmergencyRequest }) {
  const queryClient = useQueryClient();
  const requestId = getRequestId(trip);
  const ambulanceId = getAmbulanceId(trip.assignedAmbulance);
  const [liveAmbulanceCoordinates, setLiveAmbulanceCoordinates] =
    useState<RouteCoordinates | null>(
      trip.assignedAmbulance?.currentLocation?.coordinates ?? null,
    );
  const ambulanceCoordinates =
    liveAmbulanceCoordinates ??
    trip.assignedAmbulance?.currentLocation?.coordinates;
  const pickupCoordinates = trip.pickupLocation?.coordinates;
  const hospitalCoordinates = trip.assignedHospital?.location?.coordinates;
  const hasCoordinates =
    isValidCoordinates(ambulanceCoordinates) &&
    isValidCoordinates(pickupCoordinates) &&
    isValidCoordinates(hospitalCoordinates);
  const routeQuery = useFullTripRoute(
    requestId,
    Boolean(requestId && ambulanceId && hasCoordinates),
  );

  useEffect(() => {
    setLiveAmbulanceCoordinates(null);
  }, [ambulanceId, requestId]);

  useEffect(() => {
    if (!ambulanceId) {
      return;
    }

    const token = acquireSocketConnection();

    const handleLocationUpdated = (
      payload: AmbulanceLocationUpdatedPayload,
    ) => {
      const payloadId = payload.id ?? payload._id ?? "";

      if (
        payloadId !== ambulanceId ||
        !isValidCoordinates(payload.currentLocation?.coordinates)
      ) {
        return;
      }

      setLiveAmbulanceCoordinates(payload.currentLocation.coordinates);

      if (requestId) {
        queryClient.invalidateQueries({
          queryKey: ["trip-route", "full", requestId],
        });
      }
    };

    socket.on("ambulance.location.updated", handleLocationUpdated);

    return () => {
      socket.off("ambulance.location.updated", handleLocationUpdated);
      releaseSocketConnection(token);
    };
  }, [ambulanceId, queryClient, requestId]);

  const routeSummary = useMemo(() => {
    if (!routeQuery.data) {
      return null;
    }

    return {
      distance: formatDistance(routeQuery.data.totalDistance),
      duration: formatDuration(routeQuery.data.totalDuration),
    };
  }, [routeQuery.data]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
              <MapPin className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Trip map</h2>
              <p className="text-sm text-muted-foreground">
                Ambulance, pickup, hospital, and OSRM route overview.
              </p>
            </div>
          </div>
          {routeSummary ? (
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-right text-xs">
              <p className="font-medium">{routeSummary.distance}</p>
              <p className="text-muted-foreground">{routeSummary.duration}</p>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasCoordinates ? (
          <MapState
            description="The map needs ambulance, pickup, and hospital coordinates before it can render."
            title="Map coordinates unavailable"
          />
        ) : null}

        {hasCoordinates && routeQuery.isError ? (
          <MapState
            description={getFriendlyApiErrorMessage(routeQuery.error)}
            title="Route unavailable"
            tone="warning"
          />
        ) : null}

        {hasCoordinates ? (
          <div className="overflow-hidden rounded-xl border">
            <TripMapClient
              ambulanceCoordinates={ambulanceCoordinates}
              hospitalCoordinates={hospitalCoordinates}
              pickupCoordinates={pickupCoordinates}
              route={routeQuery.data ?? null}
              ambulanceDetails={{
                code: trip.assignedAmbulance?.ambulanceCode ?? "Unknown",
                driverName: trip.assignedAmbulance?.driverName,
              }}
              hospitalDetails={{
                name: trip.assignedHospital?.name ?? "Hospital",
              }}
              patientDetails={{
                name: trip.patientName,
                phone: trip.patientPhone,
              }}
            />
          </div>
        ) : null}

        {hasCoordinates && routeQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">
            Loading OSRM route...
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MapState({
  description,
  title,
  tone = "default",
}: {
  description: string;
  title: string;
  tone?: "default" | "warning";
}) {
  return (
    <div
      className={
        tone === "warning"
          ? "flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900"
          : "flex gap-3 rounded-lg border bg-muted/30 p-4 text-muted-foreground"
      }
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-sm">{description}</p>
      </div>
    </div>
  );
}
