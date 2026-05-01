"use client";

import { socket } from '@/lib/socket';
import { useEffect } from 'react';


export default function AmbulanceListener() {
  useEffect(() => {
    socket.connect();

    socket.on('ambulance.updated', (data) => {
      console.log('ambulance updated:', data);
    });

    socket.on('ambulance.location.updated', (data) => {
      console.log('location updated:', data);
    });

    return () => {
      socket.off('ambulance.updated');
      socket.off('ambulance.location.updated');
      socket.disconnect();
    };
  }, []);

  return null;
}