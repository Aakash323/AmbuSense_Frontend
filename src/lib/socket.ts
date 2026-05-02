import { io } from "socket.io-client";

export const socket = io(
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4008",
  {
    withCredentials: true,
    autoConnect: false,
  },
);

const socketConsumers = new Set<symbol>();

export function acquireSocketConnection() {
  const token = Symbol("socket-consumer");

  socketConsumers.add(token);

  if (!socket.connected) {
    socket.connect();
  }

  return token;
}

export function releaseSocketConnection(token: symbol) {
  socketConsumers.delete(token);

  if (socketConsumers.size === 0 && socket.connected) {
    socket.disconnect();
  }
}
