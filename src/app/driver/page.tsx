"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ambulance,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileImage,
  FileUp,
  Lock,
  MapPin,
  Navigation,
  Phone,
  RadioTower,
  Route,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TripMap } from "@/components/map/TripMap";
import { LocationDisplay } from "@/components/location/location-display";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useMe } from "@/hooks/use-auth";
import {
  driverTripKeys,
  useDriverMyTrip,
  useUpdateDriverTripStatus,
} from "@/hooks/use-driver-trip";
import { api, getFriendlyApiErrorMessage } from "@/lib/api";
import {
  acquireSocketConnection,
  releaseSocketConnection,
  socket,
} from "@/lib/socket";
import type { Ambulance as AmbulanceType } from "@/types/ambulances";
import type {
  DriverDocumentUploadResponse,
  UploadedMedia,
} from "@/types/auth";
import type {
  EmergencyRequest,
  EmergencyRequestStatus,
} from "@/types/emergency-requests";

const documentTypes = [
  "Driving License",
  "National ID",
  "Ambulance Permit",
] as const;

type VerificationState = "verified" | "pending" | "required" | "rejected";

function getVerificationState(
  isVerified: boolean | undefined,
  documentImageId: string | null | undefined,
  verificationNote: string | null | undefined,
): VerificationState {
  if (isVerified) {
    return "verified";
  }

  if (documentImageId && verificationNote) {
    return "rejected";
  }

  if (documentImageId) {
    return "pending";
  }

  return "required";
}

function verificationCopy(state: VerificationState) {
  if (state === "verified") {
    return {
      label: "Verified",
      title: "Verified driver",
      description:
        "Your profile is approved. You can access trip controls as they become available.",
      badgeClass: "border-green-200 bg-green-50 text-green-700",
      Icon: ShieldCheck,
    };
  }

  if (state === "pending") {
    return {
      label: "Waiting for admin approval",
      title: "Waiting for admin approval",
      description:
        "Your document is uploaded. An admin must verify it before you can accept trips.",
      badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
      Icon: Clock3,
    };
  }

  if (state === "rejected") {
    return {
      label: "Rejected",
      title: "Document needs attention",
      description:
        "Your last submission was not approved. Review the note and upload a replacement document.",
      badgeClass: "border-red-200 bg-red-50 text-red-700",
      Icon: XCircle,
    };
  }

  return {
    label: "Not uploaded",
    title: "Verification required",
    description:
      "Upload a driver document so an admin can review your profile.",
    badgeClass: "border-red-200 bg-red-50 text-red-700",
    Icon: ShieldAlert,
  };
}

function resolveMediaUrl(media: UploadedMedia | null) {
  if (!media?.url) {
    return null;
  }

  if (media.url.startsWith("http")) {
    return media.url;
  }

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4008/api";
  const origin = apiBaseUrl.replace(/\/api\/?$/, "");

  return `${origin}${media.url}`;
}

const nextStatusByStatus: Partial<
  Record<EmergencyRequestStatus, EmergencyRequestStatus>
> = {
  assigned: "en-route",
  "en-route": "at-patient",
  "at-patient": "transporting",
  transporting: "at-hospital",
  "at-hospital": "completed",
};

function formatStatus(value: string | null | undefined) {
  if (!value) {
    return "Not assigned";
  }

  return value
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusClass(status: EmergencyRequestStatus) {
  switch (status) {
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "assigned":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "en-route":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "at-patient":
      return "border-red-200 bg-red-50 text-red-700";
    case "transporting":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "at-hospital":
      return "border-red-200 bg-red-50 text-red-700";
    case "completed":
      return "border-green-200 bg-green-50 text-green-700";
    case "cancelled":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatLocation(request: EmergencyRequest) {
  const coordinates = request.pickupLocation?.coordinates;
  return (
    <LocationDisplay
      coordinates={coordinates}
      label="Pickup location"
      tone="muted"
    />
  );
}

function getAmbulanceId(ambulance: AmbulanceType | null | undefined) {
  return ambulance?.id ?? ambulance?._id ?? "";
}

function getAmbulanceLabel(ambulance: AmbulanceType | null | undefined) {
  return ambulance?.ambulanceCode ?? "Not assigned";
}

function getHospitalLabel(request: EmergencyRequest | null | undefined) {
  return request?.assignedHospital?.name ?? "Not assigned";
}

function isTrackableTrip(trip: EmergencyRequest | null | undefined) {
  return Boolean(
    trip &&
      trip.status !== "completed" &&
      trip.status !== "cancelled" &&
      getAmbulanceId(trip.assignedAmbulance),
  );
}

function DriverTripPanel({
  isStatusPending,
  isTrackingActive,
  lastKnownLocation,
  onStatusUpdate,
  queryError,
  queryIsError,
  queryIsLoading,
  trackingMessage,
  trip,
}: {
  isStatusPending: boolean;
  isTrackingActive: boolean;
  lastKnownLocation: LastKnownLocation | null;
  onStatusUpdate: (status: EmergencyRequestStatus) => void;
  queryError: unknown;
  queryIsError: boolean;
  queryIsLoading: boolean;
  trackingMessage: string;
  trip: EmergencyRequest | null;
}) {
  const nextStatus = trip ? nextStatusByStatus[trip.status] : undefined;

  if (queryIsLoading) {
    return (
      <Card id="trip">
        <CardContent className="space-y-3 p-6">
          <div className="h-10 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (queryIsError) {
    return (
      <Card className="border-red-200 bg-red-50" id="trip">
        <CardContent className="p-6">
          <p className="font-medium text-red-800">
            Failed to load active trip
          </p>
          <p className="mt-1 text-sm text-red-700">
            {getFriendlyApiErrorMessage(queryError)}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!trip) {
    return (
      <Card id="trip">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
              <Route className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">No active trip</h2>
              <p className="text-sm text-muted-foreground">
                Assigned emergency trips will appear here automatically.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
            Live tracking is idle until dispatch assigns an active trip to your
            ambulance.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" id="trip">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                <Route className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">My active trip</h2>
                <p className="text-sm text-muted-foreground">
                  Current emergency assignment and destination details.
                </p>
              </div>
            </div>
            <Badge className={getStatusClass(trip.status)}>
              {formatStatus(trip.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <TripDetail label="Patient" value={trip.patientName} />
          <TripDetail
            icon={<Phone className="size-3.5 text-muted-foreground" />}
            label="Phone"
            value={trip.patientPhone}
          />
          <TripDetail
            icon={<MapPin className="size-3.5 text-muted-foreground" />}
            label="Pickup Location"
            value={formatLocation(trip)}
          />
          <TripDetail
            icon={<Ambulance className="size-3.5 text-muted-foreground" />}
            label="Ambulance"
            value={getAmbulanceLabel(trip.assignedAmbulance)}
          />
          <TripDetail label="Hospital" value={getHospitalLabel(trip)} />
          <TripDetail label="Assigned" value={formatDate(trip.assignedAt)} />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Status actions</h2>
                <p className="text-sm text-muted-foreground">
                  Advance the trip one lifecycle step at a time.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {nextStatus ? (
              <>
                <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                  <p className="text-muted-foreground">Next status</p>
                  <p className="mt-1 font-medium">
                    {formatStatus(trip.status)} to {formatStatus(nextStatus)}
                  </p>
                </div>
                <Button
                  className="w-full bg-blue-600 text-white hover:bg-blue-700"
                  disabled={isStatusPending}
                  onClick={() => onStatusUpdate(nextStatus)}
                  type="button"
                >
                  {isStatusPending
                    ? "Updating..."
                    : `Mark ${formatStatus(nextStatus)}`}
                </Button>
              </>
            ) : (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                No further status action is available for this trip.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                <RadioTower className="size-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Live tracking</h2>
                <p className="text-sm text-muted-foreground">
                  Sends your ambulance location while this trip is active.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Badge
              className={
                isTrackingActive
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }
            >
              <Navigation className="size-3.5" />
              {isTrackingActive ? "Live tracking active" : "Tracking idle"}
            </Badge>
            <p className="text-sm text-muted-foreground">{trackingMessage}</p>
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="text-muted-foreground">Last known location</p>
              <div className="mt-1 font-medium">
                <LocationDisplay
                  coordinates={lastKnownLocation?.coordinates}
                  label="Ambulance location"
                />
              </div>
              {lastKnownLocation ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Accuracy:{" "}
                  {lastKnownLocation.accuracy !== null
                    ? `${Math.round(lastKnownLocation.accuracy)}m`
                    : "unknown"}{" "}
                  - {formatDate(lastKnownLocation.timestamp)}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <TripMap trip={trip} />
    </div>
  );
}

function TripDetail({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 break-words font-medium">{value}</p>
    </div>
  );
}

type LastKnownLocation = {
  coordinates: [number, number];
  accuracy: number | null;
  timestamp: string;
};

export type DriverDashboardMode = "overview" | "verification" | "trip";

function OverviewActionCard({
  description,
  href,
  Icon,
  title,
}: {
  description: string;
  href: string;
  Icon: typeof ShieldCheck;
  title: string;
}) {
  return (
    <Link
      className="group block rounded-lg border border-blue-100/80 bg-white/90 p-6 shadow-lg shadow-blue-950/5 transition hover:border-blue-200 hover:bg-white hover:shadow-xl hover:shadow-blue-950/10"
      href={href}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition group-hover:bg-white">
          <Icon className="size-5" />
        </div>
      </div>
    </Link>
  );
}

export default function DriverPage() {
  return <DriverDashboardContent mode="overview" />;
}

function useDriverTripSocketInvalidation(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const token = acquireSocketConnection();

    const invalidateTrip = () => {
      queryClient.invalidateQueries({ queryKey: driverTripKeys.all });
    };

    socket.on("emergency.request.updated", invalidateTrip);

    return () => {
      socket.off("emergency.request.updated", invalidateTrip);
      releaseSocketConnection(token);
    };
  }, [enabled, queryClient]);
}

function useDriverLiveLocationTracking({
  isVerified,
  trip,
}: {
  isVerified: boolean;
  trip: EmergencyRequest | null | undefined;
}) {
  const watcherRef = useRef<number | null>(null);
  const [lastKnownLocation, setLastKnownLocation] =
    useState<LastKnownLocation | null>(null);
  const [trackingMessage, setTrackingMessage] = useState(
    "Live tracking is waiting for an active trip.",
  );
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const ambulanceId = getAmbulanceId(trip?.assignedAmbulance);
  const canTrack = isVerified && isTrackableTrip(trip);

  useEffect(() => {
    function stopWatching(message: string) {
      if (watcherRef.current !== null) {
        navigator.geolocation.clearWatch(watcherRef.current);
        watcherRef.current = null;
      }

      setIsTrackingActive(false);
      setTrackingMessage(message);
    }

    if (!isVerified) {
      stopWatching("Driver verification is required before live tracking.");
      return;
    }

    if (!trip) {
      stopWatching("Live tracking starts when an active trip is assigned.");
      return;
    }

    if (trip.status === "completed" || trip.status === "cancelled") {
      stopWatching("Live tracking stopped because the trip is closed.");
      return;
    }

    if (!ambulanceId) {
      stopWatching("Live tracking needs an assigned ambulance.");
      return;
    }

    if (!("geolocation" in navigator)) {
      stopWatching("Location tracking is unavailable in this browser.");
      return;
    }

    const token = acquireSocketConnection();

    setTrackingMessage("Live tracking active");
    setIsTrackingActive(true);

    watcherRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const coordinates: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ];
        const timestamp = new Date(position.timestamp).toISOString();

        setLastKnownLocation({
          coordinates,
          accuracy: Number.isFinite(position.coords.accuracy)
            ? position.coords.accuracy
            : null,
          timestamp,
        });
        setTrackingMessage("Live tracking active");
        setIsTrackingActive(true);

        socket.emit("ambulance.location.send", {
          ambulanceId,
          coordinates,
          accuracy: position.coords.accuracy,
          timestamp,
        });
      },
      (error) => {
        setIsTrackingActive(false);
        if (error.code === error.PERMISSION_DENIED) {
          setTrackingMessage(
            "Location permission was denied. Enable location access to share live updates.",
          );
          return;
        }

        setTrackingMessage(error.message || "Could not read current location.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
      },
    );

    return () => {
      if (watcherRef.current !== null) {
        navigator.geolocation.clearWatch(watcherRef.current);
        watcherRef.current = null;
      }
      setIsTrackingActive(false);
      releaseSocketConnection(token);
    };
  }, [ambulanceId, canTrack, isVerified, trip]);

  return {
    isTrackingActive,
    lastKnownLocation,
    trackingMessage,
  };
}

export function DriverDashboardContent({
  mode = "overview",
}: {
  mode?: DriverDashboardMode;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia | null>(
    null,
  );
  const [documentType, setDocumentType] =
    useState<(typeof documentTypes)[number]>("Driving License");
  const { data, isLoading, isFetching } = useMe();
  const profile = data?.profile;
  const verificationState = getVerificationState(
    profile?.isVerified,
    profile?.documentImageId,
    profile?.verificationNote,
  );
  const copy = verificationCopy(verificationState);
  const isVerified = verificationState === "verified";
  const hasDocument = !!profile?.documentImageId || !!uploadedMedia;
  useDriverTripSocketInvalidation(isVerified);
  const myTripQuery = useDriverMyTrip(isVerified);
  const updateTripStatus = useUpdateDriverTripStatus();
  const activeTrip = myTripQuery.data ?? null;
  const { isTrackingActive, lastKnownLocation, trackingMessage } =
    useDriverLiveLocationTracking({
      isVerified,
      trip: activeTrip,
    });
  const documentMedia = useQuery({
    queryKey: ["uploads", "media", profile?.documentImageId],
    queryFn: async () => {
      const { data } = await api.get<UploadedMedia>(
        `/uploads/media/${profile?.documentImageId}`,
      );
      return data;
    },
    enabled: !!profile?.documentImageId,
  });
  const resolvedMedia = uploadedMedia ?? documentMedia.data ?? null;
  const documentPreviewUrl = resolveMediaUrl(resolvedMedia);
  const StatusIcon = copy.Icon;
  const showOverview = mode === "overview";
  const showVerification = mode === "verification";
  const showTrip = mode === "trip";

  const uploadDocument = useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await api.post<DriverDocumentUploadResponse>(
        "/uploads/driver-document",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      return data;
    },
    onSuccess: async (data) => {
      toast.success("Document uploaded for review");
      setUploadedMedia(data.media);
      setSelectedFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
    onError: (error) => {
      toast.error(getFriendlyApiErrorMessage(error));
    },
  });

  function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a document image to upload");
      return;
    }

    const formData = new FormData();
    formData.append("documentType", documentType);
    formData.append("file", file);
    uploadDocument.mutate(formData);
  }

  async function handleTripStatusUpdate(status: EmergencyRequestStatus) {
    try {
      await updateTripStatus.mutateAsync({ status });
      toast.success(`Trip status updated to ${formatStatus(status)}`);
    } catch (error) {
      toast.error(getFriendlyApiErrorMessage(error));
    }
  }

  if (isLoading) {
    return (
      <main className="p-6">
        <div className="mx-auto max-w-5xl">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">
                Loading driver dashboard...
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="overflow-hidden rounded-lg border border-blue-100/80 bg-white/90 shadow-xl shadow-blue-950/5 backdrop-blur">
          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                <Ambulance className="size-4" />
                Driver workspace
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                Welcome, {data?.user.fullName ?? "Driver"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Complete verification before operational trip controls become
                available.
              </p>
            </div>
            <Badge className={copy.badgeClass}>
              <StatusIcon className="size-3.5" />
              {copy.label}
            </Badge>
          </div>
          <div className="grid border-t bg-blue-50/50 sm:grid-cols-3">
            <div className="border-b p-4 sm:border-b-0 sm:border-r">
              <p className="text-xs text-muted-foreground">Profile status</p>
              <p className="mt-1 text-sm font-medium">{copy.title}</p>
            </div>
            <div className="border-b p-4 sm:border-b-0 sm:border-r">
              <p className="text-xs text-muted-foreground">Document</p>
              <p className="mt-1 text-sm font-medium">
                {hasDocument ? "Uploaded" : "Not uploaded"}
              </p>
            </div>
            <div className="p-4">
              <p className="text-xs text-muted-foreground">Trip controls</p>
              <p className="mt-1 text-sm font-medium">
                {isVerified ? "Unlocked" : "Locked"}
              </p>
            </div>
          </div>
        </section>

        {showOverview ? (
          <section className="grid gap-6 md:grid-cols-2">
            <OverviewActionCard
              description="Review verification status, uploaded documents, and replacement upload controls."
              href="/driver/verification"
              Icon={ShieldCheck}
              title="Verification"
            />
            <OverviewActionCard
              description="Open active trip details, lifecycle actions, live tracking, and the three-point trip map."
              href="/driver/trip"
              Icon={Route}
              title="Trip controls"
            />
          </section>
        ) : null}

        {!showOverview ? (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            {showVerification ? (
              <>
            <Card id="verification">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">
                      Verification status
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {copy.description}
                    </p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                    <StatusIcon className="size-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-sm text-muted-foreground">
                      Document type
                    </p>
                    <p className="mt-1 font-medium">
                      {profile?.documentType ?? documentType}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-sm text-muted-foreground">
                      Upload status
                    </p>
                    <p className="mt-1 font-medium">
                      {hasDocument ? "Document uploaded" : "No document yet"}
                    </p>
                  </div>
                </div>

                {profile?.verificationNote ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    {profile.verificationNote}
                  </div>
                ) : null}

                {!isVerified ? (
                  <div className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <Lock className="mt-0.5 size-4 shrink-0" />
                    <p>
                      Admin verification is required before accepting trips or
                      updating trip status.
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {hasDocument ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">
                        Verification document
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {documentPreviewUrl
                          ? "Preview of your latest uploaded document."
                          : documentMedia.isLoading
                            ? "Loading document preview..."
                            : "Document uploaded. Preview is unavailable."}
                      </p>
                    </div>
                    <FileCheck2 className="size-5 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {documentPreviewUrl ? (
                    <div className="overflow-hidden rounded-lg border bg-slate-50">
                      <img
                        alt="Uploaded driver verification document"
                        className="max-h-80 w-full object-contain"
                        src={documentPreviewUrl}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
                      <FileImage className="size-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          Document uploaded
                        </p>
                        <p className="text-sm text-muted-foreground">
                          We could not load the image URL, but your document is
                          uploaded.
                        </p>
                      </div>
                    </div>
                  )}
                  <Separator />
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium">
                        {profile?.documentType ?? documentType}
                      </p>
                      <p className="text-muted-foreground">{copy.label}</p>
                    </div>
                    {!isVerified ? (
                      <Badge className="border-slate-200 bg-white text-slate-700">
                        Replace document below
                      </Badge>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {!isVerified ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                      <FileUp className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">
                        {hasDocument
                          ? "Replace verification document"
                          : "Upload verification document"}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Upload a JPEG, PNG, or WebP image for admin review.
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handleUpload}>
                    <div className="space-y-2">
                      <Label htmlFor="documentType">Document type</Label>
                      <select
                      title="document-type"
                        id="documentType"
                        className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none transition focus-visible:border-blue-500 focus-visible:ring-3 focus-visible:ring-blue-500/20"
                        value={documentType}
                        onChange={(event) =>
                          setDocumentType(
                            event.target
                              .value as (typeof documentTypes)[number],
                          )
                        }
                      >
                        {documentTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="file">Document image</Label>
                      <label
                        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-blue-200 bg-blue-50/50 px-4 py-8 text-center transition hover:bg-blue-50"
                        htmlFor="file"
                      >
                        <FileUp className="size-8 text-blue-600" />
                        <span className="mt-3 text-sm font-medium text-slate-900">
                          Choose a document image
                        </span>
                        <span className="mt-1 text-xs text-muted-foreground">
                          JPEG, PNG, or WebP
                        </span>
                        {selectedFileName ? (
                          <span className="mt-3 rounded-full bg-white px-3 py-1 text-xs font-medium text-blue-700">
                            {selectedFileName}
                          </span>
                        ) : null}
                      </label>
                      <Input
                        id="file"
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(event) =>
                          setSelectedFileName(
                            event.target.files?.[0]?.name ?? null,
                          )
                        }
                      />
                    </div>

                    <Button
                      className="h-11 bg-blue-600 text-white hover:bg-blue-700"
                      disabled={uploadDocument.isPending || isFetching}
                      type="submit"
                    >
                      {uploadDocument.isPending
                        ? "Uploading..."
                        : hasDocument
                          ? "Replace document"
                          : "Upload document"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : null}
              </>
            ) : null}

            {showTrip && isVerified ? (
              <DriverTripPanel
                isStatusPending={updateTripStatus.isPending}
                isTrackingActive={isTrackingActive}
                lastKnownLocation={lastKnownLocation}
                onStatusUpdate={handleTripStatusUpdate}
                queryError={myTripQuery.error}
                queryIsError={myTripQuery.isError}
                queryIsLoading={myTripQuery.isLoading}
                trackingMessage={trackingMessage}
                trip={activeTrip}
              />
            ) : null}

            {showTrip && !isVerified ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                      <Lock className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">
                        Trip controls locked
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Complete driver verification before active trip tools
                        and live tracking become available.
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    asChild
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Link href="/driver/verification">Go to verification</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <Card className="h-fit">
            <CardHeader>
              <h2 className="text-lg font-semibold">Driver profile</h2>
              <p className="text-sm text-muted-foreground">
                Basic account details from your session.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{data?.user.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium">{data?.user.phone}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Verification</p>
                <p className="font-medium">{copy.label}</p>
              </div>
            </CardContent>
          </Card>
        </div>
        ) : null}
      </div>
    </main>
  );
}
