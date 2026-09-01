import { API } from "../config/api";


function getAuthHeaders() {
    const token =
        localStorage.getItem("token");

    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
    };
}


// CREATE ROOM
export async function createRoom(story) {

    const response = await fetch(
        `${API}/api/rooms`,
        {
            method: "POST",

            headers: getAuthHeaders(),

            body: JSON.stringify({
                story
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.error || "Could not create room"
        );
    }

    return data;
}


// JOIN ROOM
export async function joinRoom(roomCode) {

    const response = await fetch(
        `${API}/api/rooms/${roomCode}/join`,
        {
            method: "POST",

            headers: getAuthHeaders()
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.error || "Could not join room"
        );
    }

    return data;
}


// GET ROOM
export async function getRoom(roomCode) {

    const response = await fetch(
        `${API}/api/rooms/${roomCode}`,
        {
            method: "GET",

            headers: getAuthHeaders()
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.error || "Could not get room"
        );
    }

    return data;
}