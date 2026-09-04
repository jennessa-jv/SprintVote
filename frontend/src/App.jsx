import { useState } from "react";
import {
    BrowserRouter,  //?BrowerRouter, Routes, Route
    Routes,
    Route,
    Navigate,
    useNavigate
} from "react-router-dom";

import Login from "./auth/Login";
import Signup from "./auth/Signup";
import Home from "./home/Home";
import Room from "./room/Room";
import History from "./history/History";

import "./App.css";


function App() {
    const [user, setUser] = useState(() => {
        const storedUser =
            localStorage.getItem("user");

        return storedUser
            ? JSON.parse(storedUser)
            : null;
    });


    function handleLogin(userData) { //comes from the frintend which was 

        setUser(userData);

        localStorage.setItem(
            "user",
            JSON.stringify(userData)
        );
    }


    function handleLogout() {

        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("currentRoom");
        localStorage.removeItem("currentStory");

        setUser(null);
    }


    return (
        <BrowserRouter>

            <Routes>

                {/* LOGIN */}
                <Route
    path="/login"
    element={
        <Login
            onLogin={handleLogin}
           
        />
    }
/>


                {/* SIGNUP */}
                <Route
                    path="/signup"
                    element={
                        <Signup />
                    }
                />


                {/* HOME */}
                <Route
                    path="/home"
                    element={
                        user ? (   //will check whether the user is stored in the browser
                            <Home
                                user={user}
                                onLogout={handleLogout}
                            />
                        ) : (
                            <Navigate to="/login" />
                        )
                    }
                />


                {/* ROOM */}
                <Route
                    path="/room"
                    element={
                        user ? (
                            <Room
                                user={user}
                            />
                        ) : (
                            <Navigate to="/login" />
                        )
                    }
                />


                {/* HISTORY */}
                <Route
                    path="/history"
                    element={
                        user ? (
                            <History />
                        ) : (
                            <Navigate to="/login" />
                        )
                    }
                />


                {/* DEFAULT */}
                <Route
                    path="*"
                    element={
                        <Navigate
                            to={user ? "/home" : "/login"}
                        />
                    }
                />

            </Routes>

        </BrowserRouter>
    );
}


export default App;