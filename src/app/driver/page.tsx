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
  Route,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useMe } from "@/hooks/use-auth";
import { api, getApiErrorMessage } from "@/lib/api";
import type {
  DriverDocumentUploadResponse,
  UploadedMedia,
} from "@/types/auth";

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
      badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
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
      badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
      Icon: XCircle,
    };
  }

  return {
    label: "Not uploaded",
    title: "Verification required",
    description:
      "Upload a driver document so an admin can review your profile.",
    badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
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

export default function DriverPage() {
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
      toast.error(getApiErrorMessage(error));
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

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_34%),linear-gradient(135deg,#f8fffc_0%,#f1fdf8_42%,#f8fafc_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="overflow-hidden rounded-xl border border-emerald-100 bg-white/90 shadow-sm">
          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
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
          <div className="grid border-t bg-emerald-50/50 sm:grid-cols-3">
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

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Card>
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
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
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
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
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
                    <FileCheck2 className="size-5 text-emerald-600" />
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
                    <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
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
                        className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none transition focus-visible:border-emerald-500 focus-visible:ring-3 focus-visible:ring-emerald-500/20"
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
                        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-4 py-8 text-center transition hover:bg-emerald-50"
                        htmlFor="file"
                      >
                        <FileUp className="size-8 text-emerald-600" />
                        <span className="mt-3 text-sm font-medium text-slate-900">
                          Choose a document image
                        </span>
                        <span className="mt-1 text-xs text-muted-foreground">
                          JPEG, PNG, or WebP
                        </span>
                        {selectedFileName ? (
                          <span className="mt-3 rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-700">
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
                      className="h-11 bg-emerald-600 text-white hover:bg-emerald-700"
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

            {isVerified ? (
              <div className="grid gap-6 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <Ambulance className="size-5 text-emerald-600" />
                    <h2 className="text-base font-semibold">
                      Assigned ambulance
                    </h2>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Ambulance assignment details will appear here.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <Route className="size-5 text-emerald-600" />
                    <h2 className="text-base font-semibold">My active trip</h2>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Active emergency trip details will appear here.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CheckCircle2 className="size-5 text-emerald-600" />
                    <h2 className="text-base font-semibold">Status actions</h2>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Trip status update controls will appear here.
                    </p>
                  </CardContent>
                </Card>
              </div>
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
                <p className="text-muted-foreground">Profile ID</p>
                <p className="break-all font-medium">
                  {profile?.id ?? "Not available"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
