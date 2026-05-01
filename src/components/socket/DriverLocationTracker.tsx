"use client";

import { useEffect } from "react";
import { socket } from "@/lib/socket";

export default function DriverLocationTracker({
  ambulanceId,
}: {
  ambulanceId: string;
}) {
  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {
      console.log("[client] connected:", socket.id);
    });

    socket.onAny((event, ...args) => {
      console.log("[client] incoming event:", event, args);
    });

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
      socket.disconnect();
    };
  }, [ambulanceId]);

  return null;
}