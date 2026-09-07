import { io } from "socket.io-client";

import api from "../config/api";


export function createSocket() {
    return io("http://localhost:5000/api"); //io to the backend url
}