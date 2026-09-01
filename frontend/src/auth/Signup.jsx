import { useState } from "react";

import { signupUser } from "../api/authApi";


function Signup({
    onLogin
}) {

    const [name, setName] =
        useState("");

    const [email, setEmail] =
        useState("");

    const [password, setPassword] =
        useState("");

    const [error, setError] =
        useState("");


    async function handleSignup() {

        setError("");

        try {

            await signupUser(
                name,
                email,
                password
            );


            alert(
                "Account created! Please login."
            );


            onLogin();

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

                <h2>
                    Create Account
                </h2>


                <input
                    placeholder="Name"
                    value={name}
                    onChange={e =>
                        setName(
                            e.target.value
                        )
                    }
                />


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
                    onClick={handleSignup}
                >
                    Sign Up
                </button>


                <button
                    className="secondary"
                    onClick={onLogin}
                >
                    Back to Login
                </button>

            </div>

        </div>
    );
}


export default Signup;