const express = require("express");
const cors = require("cors");
const http = require("http");

const { Server } = require("socket.io");

const {
    FRONTEND_URL
} = require("./config/config");

const authRoutes =
    require("./routes/authRoutes");

const roomRoutes =
    require("./routes/roomRoutes");

const historyRoutes =
    require("./routes/historyRoutes");

const setupSocketHandlers =
    require("./sockets/socketHandler");


const app = express();

const server =
    http.createServer(app);


// Middleware

app.use(
    cors({
        origin: FRONTEND_URL
    })
);

app.use(
    express.json()
);


// Routes

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/rooms",
    roomRoutes
);

app.use(
    "/api/history",
    historyRoutes
);


// Socket.IO

const io = new Server(
    server,
    {
        cors: {
            origin: FRONTEND_URL,
            methods: [
                "GET",
                "POST"
            ]
        }
    }
);

setupSocketHandlers(io);


module.exports = {
    app,
    server
};