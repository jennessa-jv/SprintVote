
import api from "../config/api";


// GET ALL HISTORY

export async function getHistory() {

    const response = await api.get(
        "/history"
    );

    return response.data;
}


// GET SINGLE HISTORY SESSION

export async function getHistorySession(id) {

    const response = await api.get(
        `/history/${id}`
    );

    return response.data;
}

