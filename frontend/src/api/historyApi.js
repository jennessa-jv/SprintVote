import { API } from "../config/api";


function getAuthHeaders() {

    const token =
        localStorage.getItem("token");

    return {
        Authorization:
            `Bearer ${token}`
    };
}


export async function getHistory() {

    const response = await fetch(
        `${API}/api/history`,
        {
            headers: getAuthHeaders()
        }
    );

    const data =
        await response.json();

    if (!response.ok) {
        throw new Error(
            data.error ||
            "Could not load history"
        );
    }

    return data;
}


export async function getHistorySession(id) {

    const response = await fetch(
        `${API}/api/history/${id}`,
        {
            headers: getAuthHeaders()
        }
    );

    const data =
        await response.json();

    if (!response.ok) {
        throw new Error(
            data.error ||
            "Could not load session"
        );
    }

    return data;
}