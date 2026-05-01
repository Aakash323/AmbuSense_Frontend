"use client";

import { useEffect } from 'react';
import { socket } from '@/lib/socket';

export default function AmbulanceListener() {
  useEffect(() => {
    socket.connect();

    socket.on('ambulance.updated', (data) => {
      console.log('ambulance updated:', data);
    });

    socket.on('ambulance.location.updated', (data) => {
      console.log('location updated:', data);
    });
    socket.on('test.live', (data) => {
  console.log('test.live:', data);
  });
    return () => {
      socket.off('ambulance.updated');
      socket.off('ambulance.location.updated');
      socket.disconnect();
    };
  }, []);

  return null;
}