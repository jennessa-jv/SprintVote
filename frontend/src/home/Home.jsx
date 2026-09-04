function Home({
    user,
    onRoom,
    onHistory,
    onLogout
}) {

    return (
        <div className="page">

            <header>

                <div>

                    <h1>
                        Planning Poker
                    </h1>

                    <p>
                        Welcome, {user.name} // the user that app had stored
                    </p>

                </div>


                <button
                    className="logout"
                    onClick={onLogout}  //from app
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
                        onClick={onRoom}
                    >
                        Create / Join Room
                    </button>


                    <button
                        className="secondary"
                        onClick={onHistory}
                    >
                        View Voting History
                    </button>

                </div>

            </main>

        </div>
    );
}


export default Home;