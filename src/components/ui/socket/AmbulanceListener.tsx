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

    socket.on("ambulance.updated", handleAmbulanceUpdated);
    socket.on("ambulance.location.updated", handleLocationUpdated);

    return () => {
      socket.off("ambulance.updated", handleAmbulanceUpdated);
      socket.off("ambulance.location.updated", handleLocationUpdated);
      releaseSocketConnection(token);
    };
  }, []);

  return null;
}
