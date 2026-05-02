"use client";

import { useEffect } from "react";
import { acquireSocketConnection, releaseSocketConnection, socket } from "@/lib/socket";

export default function AmbulanceListener() {
  useEffect(() => {
    const token = acquireSocketConnection();

    const handleAmbulanceUpdated = (data: unknown) => {
      console.log("ambulance updated:", data);
    };
    const handleLocationUpdated = (data: unknown) => {
      console.log("location updated:", data);
    };
    const handleTestLive = (data: unknown) => {
      console.log("test.live:", data);
    };

    socket.on("ambulance.updated", handleAmbulanceUpdated);
    socket.on("ambulance.location.updated", handleLocationUpdated);
    socket.on("test.live", handleTestLive);

    return () => {
      socket.off("ambulance.updated", handleAmbulanceUpdated);
      socket.off("ambulance.location.updated", handleLocationUpdated);
      socket.off("test.live", handleTestLive);
      releaseSocketConnection(token);
    };
  }, []);

  return null;
}
