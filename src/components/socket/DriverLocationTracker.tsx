"use client";

import { useEffect } from "react";
import { acquireSocketConnection, releaseSocketConnection, socket } from "@/lib/socket";

export default function DriverLocationTracker({
  ambulanceId,
}: {
  ambulanceId: string;
}) {
  useEffect(() => {
    const token = acquireSocketConnection();

    const handleConnect = () => {
      console.log("[client] connected:", socket.id);
    };

    const handleAnyEvent = (event: string, ...args: unknown[]) => {
      console.log("[client] incoming event:", event, args);
    };

    socket.on("connect", handleConnect);
    socket.onAny(handleAnyEvent);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const payload = {
          ambulanceId,
          coordinates: [
            position.coords.longitude,
            position.coords.latitude,
          ] as [number, number],
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
        };

        console.log("[client] emitting ambulance.location.send:", payload);
        socket.emit("ambulance.location.send", payload);
      },
      (error) => {
        console.error("[client] geolocation error:", error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      socket.off("connect", handleConnect);
      socket.offAny(handleAnyEvent);
      releaseSocketConnection(token);
    };
  }, [ambulanceId]);

  return null;
}
