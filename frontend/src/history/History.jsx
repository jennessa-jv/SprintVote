import {
    useEffect,
    useState
} from "react";

import {
    useNavigate
} from "react-router-dom";

import {
    getHistory,
    getHistorySession
} from "../api/historyApi";


function History() {

    const navigate = useNavigate();

    const [history, setHistory] =
        useState([]);

    const [selected, setSelected] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");


    async function loadHistory() {

        setError("");

        try {

            const data =
                await getHistory();

            setHistory(data);

        } catch (error) {

            setError(
                error.response?.data?.error ||
                error.message
            );

        } finally {

            setLoading(false);
        }
    }


    async function openSession(id) {

        try {

            const data =
                await getHistorySession(id);

            setSelected(data);

        } catch (error) {

            setError(
                error.response?.data?.error ||
                error.message
            );
        }
    }


    useEffect(() => {

        loadHistory();

    }, []);


    return (

        <div className="page">

            <header>

                <h1>
                    Voting History
                </h1>


                <button
                    className="secondary"
                    onClick={() =>
                        navigate("/home")
                    }
                >
                    Home
                </button>

            </header>


            <main className="history">

                {error && (
                    <p className="error">
                        {error}
                    </p>
                )}


                {loading && (
                    <p>
                        Loading...
                    </p>
                )}


                {!loading &&
                    history.length === 0 && (

                    <div className="empty">

                        <h2>
                            No voting history
                        </h2>

                        <p>
                            Complete a Planning
                            Poker round and it
                            will appear here.
                        </p>

                    </div>
                )}


                {history.map( //session prolly from the backend
                    session => (

                        <div
                            className="history-card"
                            key={session.id}
                            onClick={() =>
                                openSession(
                                    session.id
                                )
                            }
                        >

                            <h2>
                                {session.story}
                            </h2>


                            <p>
                                Room:{" "}
                                {session.room_code}
                            </p>


                            <p>
                                Average:{" "}
                                {session.average_vote}
                            </p>


                            <small>
                                {new Date(
                                    session.created_at
                                ).toLocaleString()}
                            </small>

                        </div>
                    )
                )}


                {selected && (

                    <div className="details">

                        <h2>
                            {selected.session.story}
                        </h2>


                        <p>
                            Average:{" "}
                            {
                                selected.session
                                    .average_vote
                            }
                        </p>


                        <h3>
                            Votes
                        </h3>


                        {selected.votes.map(
                            (vote, index) => (

                                <div
                                    className="vote-row"
                                    key={
                                        `${vote.player_name}-${index}`
                                    }
                                >

                                    <span>
                                        {
                                            vote.player_name
                                        }
                                    </span>


                                    <strong>
                                        {vote.vote}
                                    </strong>

                                </div>
                            )
                        )}

                    </div>
                )}

            </main>

        </div>
    );
}


export default History;
