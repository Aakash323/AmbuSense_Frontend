"use client";

import { socket } from "@/lib/socket";

export default function TestSocketButton() {
  return (
    <button
      onClick={() => {
        socket.connect();

        const payload = {
          ambulanceId: "69d944de1a2be1cafdb3ba95",
          coordinates: [85.324, 27.7172],
          timestamp: new Date().toISOString(),
        };

        console.log("[client] manual emit:", payload);
        socket.emit("ambulance.location.send", payload);
      }}
    >
      Send Test Location
    </button>
  );
}