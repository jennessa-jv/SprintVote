
import api from "../config/api";
// api/historyApi.js
//       ↓ ..
// src/
//       ↓ config/api.js

// CREATE ROOM

export async function createRoom(story) { //from the frontend

    const response = await api.post(
        "/rooms",
        {
            story
        }
    );
    console.log(response.data); //fromt he backend
    return response.data;  //returned form the backend to the frontend

}


// JOIN ROOM

export async function joinRoom(roomCode) {

    const response = await api.post(
        `/rooms/${roomCode}/join`
    );

    return response.data;
}


// GET ROOM

export async function getRoom(roomCode) {

    const response = await api.get(  //getting a room from the roomcode shared by someone
        `/rooms/${roomCode}`
    );

    return response.data;
}

