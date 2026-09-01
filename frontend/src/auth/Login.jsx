import { useState } from "react";

import { loginUser } from "../api/authApi";


function Login({
    onLogin,
    onSignup
}) {

    const [email, setEmail] =
        useState("");

    const [password, setPassword] =
        useState("");

    const [error, setError] =
        useState("");


    async function handleLogin() {

        setError("");

        try {

            const data =
                await loginUser(
                    email,
                    password
                );


            localStorage.setItem(
                "token",
                data.token
            );


            localStorage.setItem(
                "user",
                JSON.stringify(data.user)
            );


            onLogin(data.user);

        } catch (error) {

            setError(
                error.message
            );

        }
    }


    return (
        <div className="auth-page">

            <div className="auth-card">

                <h1>
                    Planning Poker
                </h1>

                <p className="subtitle">
                    Agile estimation made simple
                </p>

                <h2>
                    Login
                </h2>


                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e =>
                        setEmail(
                            e.target.value
                        )
                    }
                />


                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e =>
                        setPassword(
                            e.target.value
                        )
                    }
                />


                {error && (
                    <p className="error">
                        {error}
                    </p>
                )}


                <button
                    onClick={handleLogin}
                >
                    Login
                </button>


                <button
                    className="secondary"
                    onClick={onSignup}
                >
                    Create Account
                </button>

            </div>

        </div>
    );
}


export default Login;