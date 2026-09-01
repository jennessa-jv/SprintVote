import {
    useEffect,
    useState
} from "react";

import Login
    from "./auth/Login";

import Signup
    from "./auth/Signup";

import Home
    from "./home/Home";

import Room
    from "./room/Room";

import History
    from "./history/History";

import "./App.css";


function App() {

    const [user, setUser] =
        useState(() => {

            const storedUser =
                localStorage.getItem("user");

            return storedUser
                ? JSON.parse(storedUser)
                : null;

        });


    const [page, setPage] =
        useState(() => {

            const storedUser =
                localStorage.getItem("user");

            const storedPage =
                localStorage.getItem(
                    "currentPage"
                );

            if (!storedUser) {
                return "login";
            }

            return storedPage || "home";

        });


    function goToPage(newPage) {

        setPage(newPage);

        localStorage.setItem(
            "currentPage",
            newPage
        );

    }


    function handleLogout() {

        localStorage.removeItem(
            "token"
        );

        localStorage.removeItem(
            "user"
        );

        localStorage.removeItem(
            "currentPage"
        );

        localStorage.removeItem(
            "currentRoom"
        );

        localStorage.removeItem(
            "currentStory"
        );


        setUser(null);

        setPage("login");

    }


    // ================================================
    // NOT LOGGED IN
    // ================================================

    if (!user) {

        if (page === "signup") {

            return (
                <Signup
                    onLogin={() =>
                        goToPage("login")
                    }
                />
            );

        }


        return (
            <Login

                onLogin={userData => {

                    setUser(
                        userData
                    );

                    goToPage(
                        "home"
                    );

                }}


                onSignup={() =>
                    goToPage(
                        "signup"
                    )
                }

            />
        );

    }


    // ================================================
    // LOGGED IN
    // ================================================

    switch (page) {

        case "room":

            return (
                <Room
                    user={user}

                    onHome={() =>
                        goToPage(
                            "home"
                        )
                    }
                />
            );


        case "history":

            return (
                <History
                    onHome={() =>
                        goToPage(
                            "home"
                        )
                    }
                />
            );


        case "home":

        default:

            return (
                <Home
                    user={user}

                    onRoom={() =>
                        goToPage(
                            "room"
                        )
                    }

                    onHistory={() =>
                        goToPage(
                            "history"
                        )
                    }

                    onLogout={
                        handleLogout
                    }
                />
            );

    }
}


export default App;