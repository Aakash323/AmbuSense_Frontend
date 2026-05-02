"use client";

import dynamic from "next/dynamic";
import { ExternalLink, MapPin } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Coordinates = [number, number];

const LocationPreviewMap = dynamic(
  () => import("@/components/location/location-preview-map.client"),
  {
    ssr: false,
    loading: () => (
      <div className="mt-3 flex h-52 items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
        Loading map...
      </div>
    ),
  },
);

type LocationDisplayProps = {
  address?: string | null;
  className?: string;
  coordinates?: Coordinates | null;
  label?: string;
  mapMode?: "link" | "inline" | "none";
  tone?: "default" | "muted";
};

function isValidCoordinates(
  coordinates: Coordinates | null | undefined,
): coordinates is Coordinates {
  return (
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    coordinates.every((coordinate) => Number.isFinite(coordinate))
  );
}

function mapUrl(coordinates: Coordinates) {
  const [lng, lat] = coordinates;

  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
}

export function LocationDisplay({
  address,
  className,
  coordinates,
  label = "Location",
  mapMode = "link",
  tone = "default",
}: LocationDisplayProps) {
  const [isMapOpen, setIsMapOpen] = useState(false);
  const hasCoordinates = isValidCoordinates(coordinates);
  const primaryText = address?.trim() || label;

  if (!hasCoordinates && !address?.trim()) {
    return (
      <span className={cn("text-sm text-muted-foreground", className)}>
        Location unavailable
      </span>
    );
  }

  if (mapMode === "inline") {
    return (
      <div className={cn("min-w-0 text-sm", className)}>
        <div
          className={cn(
            "inline-flex min-w-0 items-center gap-2",
            tone === "muted" ? "text-muted-foreground" : "text-foreground",
          )}
        >
          <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate">{primaryText}</span>
          {hasCoordinates ? (
            <button
              className="shrink-0 font-medium text-emerald-700 underline-offset-4 hover:underline"
              onClick={() => setIsMapOpen((value) => !value)}
              type="button"
            >
              {isMapOpen ? "Hide map" : "Map"}
            </button>
          ) : null}
        </div>
        {hasCoordinates && isMapOpen ? (
          <LocationPreviewMap coordinates={coordinates} />
        ) : null}
      </div>
    );
  }

  if (mapMode === "none") {
    return (
      <span
        className={cn(
          "inline-flex min-w-0 items-center gap-2 text-sm",
          tone === "muted" ? "text-muted-foreground" : "text-foreground",
          className,
        )}
      >
        <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 truncate">{primaryText}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-2 text-sm",
        tone === "muted" ? "text-muted-foreground" : "text-foreground",
        className,
      )}
    >
      <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate">{primaryText}</span>
      {hasCoordinates ? (
        <a
          aria-label={`Open ${label.toLowerCase()} in map`}
          className="inline-flex shrink-0 items-center gap-1 font-medium text-emerald-700 underline-offset-4 hover:underline"
          href={mapUrl(coordinates)}
          rel="noreferrer"
          target="_blank"
        >
          Map
          <ExternalLink className="size-3" />
        </a>
      ) : null}
    </span>
  );
}
