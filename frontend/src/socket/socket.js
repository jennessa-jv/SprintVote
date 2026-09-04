import { io } from "socket.io-client";

import api from "../config/api";


export function createSocket() {
    return io(api); //io to the backend url
}