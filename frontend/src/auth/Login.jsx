import { useState } from "react";

import { loginUser } from "../api/authApi";
import { useNavigate } from "react-router-dom";

function Login({
    onLogin,  //passed from app.jsx
}) {
  const navigate=useNavigate();
    const [email, setEmail] =
        useState("");

    const [password, setPassword] =
        useState("");

    const [error, setError] =
        useState("");


    async function handleLogin() {

        setError("");
        // validation
         if (!email.trim()) {
             setError( "Please enter your email." ); 
            // return; 
        } 
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
             if (!emailRegex.test(email))
                 { setError( "Please enter a valid email address." ); return;

                  } 
                  if (!password) {
                     setError( "Please enter your password." ); return; 
                    }
        try {

            const data =
                await loginUser( //login user from the auth file axios sends it to the backend
                    email,
                    password
                );
//                 data from the backend fetched by axios is now:

// data = {
//     token: "...",
//     user: {
//         id: 1,
//         name: "John",
//         email: "john@gmail.com"
//     }
// }
// So you can access:
// data.token
// and:
// data.user
if (!data.token) { //incase token is undefined
            throw new Error(
                "Login failed: server did not return a token."
            );
        }
            localStorage.setItem(
                "token",
                data.token
            );


            localStorage.setItem(
                "user",
                JSON.stringify(data.user)
            );
           
// so basically onLogin=handleLogin from app
            onLogin(data.user); //from where does this come from?
            navigate("/home");
/*      This is a callback function provided by the parent component, probably your App.jsx.
The Login component is essentially saying:
"Login was successful. Here's the logged-in user's information."
For example:
onLogin({
    id: 1,
    name: "John",
    email: "john@gmail.com"
});
Your App can then update its state:
setUser(data.user);
and React can switch from:
Login Page to the home page */

       } catch (error) {
    setError(
        error.response?.data?.error ||
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
    onChange={e => {
        console.log("EMAIL:", e.target.value);
        setEmail(e.target.value);
    }}
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
{/* Login component, I'm giving you my handleLogin function. You can call it when you need to tell me that the login succeeded."
This is passing a function as a prop.
Think of it as:
App
 │ handleLogin function
 ↓
Login
 │ receives it as onLogin */
 /* Login receives it
Your Login component says:
function Login({
    onLogin,
    onSignup
}) {
This is destructuring props.
React essentially gives Login an object like:
{
    onLogin: handleLogin,
    onSignup: someFunction
}  */}

                <button
                    className="secondary"
                    onClick={()=>navigate("/signup")} //this comes from app thru login heading callback
                >
                    Create Account
                </button>

            </div>

        </div>
    );
}


export default Login;