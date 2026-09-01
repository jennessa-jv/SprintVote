import { API } from "../config/api";

export async function loginUser(email, password) {
    const response = await fetch(
        `${API}/api/auth/login`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email,
                password
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.error || "Login failed"
        );
    }

    return data;
}


export async function signupUser(
    name,
    email,
    password
) {
    const response = await fetch(
        `${API}/api/auth/signup`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                name,
                email,
                password
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.error || "Signup failed"
        );
    }

    return data;
}