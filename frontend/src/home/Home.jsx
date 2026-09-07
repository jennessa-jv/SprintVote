import { useNavigate } from "react-router-dom";

function Home({
    user, //from the app
    onLogout
}) {

    const navigate = useNavigate();

    return (
        <div className="page">

            <header>

                <div>

                    <h1>
                        Planning Poker
                    </h1>

                    <p>
                        Welcome, {user.name} //the user that app haad stored(data.user)
                    </p>

                </div>

                <button
                    className="logout"
                    onClick={onLogout}
                >
                    Logout
                </button>

            </header>


            <main className="dashboard">

                <div className="welcome-card">

                    <h2>
                        Agile Planning Poker
                    </h2>

                    <p>
                        Estimate your team's
                        user stories together.
                    </p>

                </div>


                <div className="dashboard-buttons">

                    <button
                        onClick={() =>
                            navigate("/room")
                        }
                    >
                        Create / Join Room
                    </button>


                    <button
                        className="secondary"
                        onClick={() =>
                            navigate("/history")
                        }
                    >
                        View Voting History
                    </button>

                </div>

            </main>

        </div>
    );
}

export default Home;