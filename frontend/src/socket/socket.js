import { io } from "socket.io-client";

export function createSocket() {
    // REST endpoints are mounted below /api, but Socket.IO is attached to the
    // HTTP server at its default /socket.io path. Do not add /api here: that
    // would select an /api Socket.IO namespace that the server does not use.
    const socket = io("http://localhost:5000"); //io to the backend

    socket.on("connect_error", error => {
        console.error("Socket connection failed:", error.message);
    });

    return socket;
}
