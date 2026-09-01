import { io } from "socket.io-client";

import { API } from "../config/api";


export function createSocket() {
    return io(API);
}