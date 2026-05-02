"use client";

import { acquireSocketConnection, releaseSocketConnection, socket } from "@/lib/socket";

export default function TestSocketButton() {
  return (
    <button
      onClick={() => {
        const token = acquireSocketConnection();

        const payload = {
          ambulanceId: "69d944de1a2be1cafdb3ba95",
          coordinates: [85.324, 27.7172],
          timestamp: new Date().toISOString(),
        };

        console.log("[client] manual emit:", payload);
        socket.emit("ambulance.location.send", payload);
        window.setTimeout(() => releaseSocketConnection(token), 1000);
      }}
    >
      Send Test Location
    </button>
  );
}
