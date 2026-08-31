import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import "./App.css";

const STORAGE_KEY = "planning-poker-session";

const readStoredSession = () => {
    try {
        const stored = sessionStorage.getItem(STORAGE_KEY);

        if (!stored) {
            return {};
        }

        return JSON.parse(stored);
    } catch (error) {
        console.log("Could not read saved session.", error);
        return {};
    }
};

const saveSession = (session) => {
    try {
        sessionStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(session)
        );
    } catch (error) {
        console.log("Could not save session.", error);
    }
};

const socket = io("http://localhost:5000");

const cards = [
    "1",
    "2",
    "3",
    "5",
    "8",
    "13",
    "21",
    "?",
    "☕"
];

function App() {

    const savedSession = readStoredSession();

    const [screen, setScreen] = useState(
        savedSession.roomCode ? "room" : "home"
    );

    const [name, setName] = useState(
        savedSession.name || ""
    );

    const [roomCode, setRoomCode] = useState(
        savedSession.roomCode || ""
    );

    const [story, setStory] = useState(
        savedSession.story || ""
    );

    const [isModerator, setIsModerator] = useState(
        Boolean(savedSession.isModerator)
    );

    const [players, setPlayers] = useState([]);

    const [selectedCard, setSelectedCard] = useState(null);

    const [votes, setVotes] = useState({});

    const [revealed, setRevealed] = useState(false);


    // =================================================
    // SOCKET EVENTS
    // =================================================

    useEffect(() => {

        const restoreRoomSession = () => {

            const saved = readStoredSession();

            if (!saved.roomCode || !saved.name) {
                return;
            }

            socket.emit("join-room", {
                roomCode: saved.roomCode,
                name: saved.name,
                moderator: Boolean(saved.isModerator)
            });

        };

        if (socket.connected) {
            restoreRoomSession();
        } else {
            socket.once("connect", restoreRoomSession);
        }


        socket.on("player-joined", (player) => {

            setPlayers((currentPlayers) => {

                const exists = currentPlayers.some(
                    (p) => p.name === player.name
                );

                if (exists) {
                    return currentPlayers;
                }

                return [
                    ...currentPlayers,
                    {
                        name: player.name,
                        voted: false,
                        moderator: player.moderator
                    }
                ];

            });

        });


        socket.on("player-voted", (data) => {

            setPlayers((currentPlayers) =>
                currentPlayers.map((player) =>
                    player.name === data.name
                        ? {
                            ...player,
                            voted: true
                        }
                        : player
                )
            );

        });


        socket.on("votes-revealed", (data) => {

            setVotes(data.votes);

            setRevealed(true);

        });


        socket.on("votes-reset", () => {

            setVotes({});

            setSelectedCard(null);

            setRevealed(false);

            setPlayers((currentPlayers) =>
                currentPlayers.map((player) => ({
                    ...player,
                    voted: false
                }))
            );

        });


        return () => {

            socket.off("connect", restoreRoomSession);
            socket.off("player-joined");
            socket.off("player-voted");
            socket.off("votes-revealed");
            socket.off("votes-reset");

        };

    }, []);


    // =================================================
    // SAVE SESSION
    // =================================================

    useEffect(() => {

        if (!roomCode && !name && !story && !isModerator) {
            sessionStorage.removeItem(STORAGE_KEY);
            return;
        }

        saveSession({
            roomCode,
            name,
            story,
            isModerator
        });

    }, [name, roomCode, story, isModerator]);


    // =================================================
    // CREATE ROOM
    // =================================================

    const createRoom = async () => {

        if (!name.trim() || !story.trim()) {

            alert(
                "Enter your name and the user story."
            );

            return;

        }

        try {

            const response = await axios.post(
                "http://localhost:5000/api/rooms",
                {
                    story: story,
                    moderatorName: name
                }
            );

            const data = response.data;

            setRoomCode(data.roomCode);

            setIsModerator(true);

            setScreen("room");

            saveSession({
                roomCode: data.roomCode,
                name: name,
                story: story,
                isModerator: true
            });

            socket.emit("join-room", {
                roomCode: data.roomCode,
                name: name,
                moderator: true
            });

        } catch (error) {

            console.log(error);

            alert(
                error.response?.data?.error ||
                "Could not connect to the server."
            );

        }

    };


    // =================================================
    // JOIN ROOM
    // =================================================

    const joinRoom = async () => {

        if (!name.trim() || !roomCode.trim()) {

            alert(
                "Enter your name and room code."
            );

            return;

        }

        try {

            const response = await axios.post(
                `http://localhost:5000/api/rooms/${roomCode}/join`,
                {
                    name: name
                }
            );

            const data = response.data;


            const roomResponse = await axios.get(
                `http://localhost:5000/api/rooms/${roomCode}`
            );

            const roomData = roomResponse.data;


            setStory(roomData.story);

            setRoomCode(data.roomCode);

            setIsModerator(false);

            setScreen("room");

            saveSession({
                roomCode: data.roomCode,
                name: name,
                story: roomData.story,
                isModerator: false
            });

            socket.emit("join-room", {
                roomCode: data.roomCode,
                name: name,
                moderator: false
            });

        } catch (error) {

            console.log(error);

            alert(
                error.response?.data?.error ||
                "Could not connect to the server."
            );

        }

    };


    // =================================================
    // VOTE
    // =================================================

    const vote = (card) => {

        if (revealed) {
            return;
        }

        setSelectedCard(card);

        socket.emit("vote", {
            roomCode: roomCode,
            name: name,
            vote: card
        });

    };


    // =================================================
    // REVEAL
    // =================================================

    const revealVotes = () => {

        socket.emit("reveal-votes", {
            roomCode: roomCode
        });

    };


    // =================================================
    // RESET
    // =================================================

    const resetVotes = () => {

        socket.emit("reset-votes", {
            roomCode: roomCode
        });

    };


    // =================================================
    // HOME SCREEN
    // =================================================

    if (screen === "home") {

        return (

            <div className="app">

                <div className="home-card">

                    <div className="logo">
                        🃏
                    </div>

                    <h1>
                        Agile Planning Poker
                    </h1>

                    <p className="description">
                        Estimate user stories together
                        in real time.
                    </p>


                    <div className="form">

                        <input
                            type="text"
                            placeholder="Your name"
                            value={name}
                            onChange={(e) =>
                                setName(e.target.value)
                            }
                        />


                        <input
                            type="text"
                            placeholder="User story"
                            value={story}
                            onChange={(e) =>
                                setStory(e.target.value)
                            }
                        />


                        <button
                            className="primary"
                            onClick={createRoom}
                        >
                            Create Room
                        </button>

                    </div>


                    <div className="divider">
                        OR
                    </div>


                    <div className="form">

                        <input
                            type="text"
                            placeholder="Your name"
                            value={name}
                            onChange={(e) =>
                                setName(e.target.value)
                            }
                        />


                        <input
                            type="text"
                            placeholder="Room code"
                            value={roomCode}
                            onChange={(e) =>
                                setRoomCode(
                                    e.target.value.toUpperCase()
                                )
                            }
                        />


                        <button
                            className="secondary"
                            onClick={joinRoom}
                        >
                            Join Room
                        </button>

                    </div>

                </div>

            </div>

        );

    }


    // =================================================
    // ROOM SCREEN
    // =================================================

    return (

        <div className="app">

            <header>

                <div>

                    <h1>
                        🃏 Planning Poker
                    </h1>

                    <span className="room-code">
                        Room: {roomCode}
                    </span>

                </div>

                <div className="role">

                    {isModerator
                        ? "👑 Moderator"
                        : "👤 Player"}

                </div>

            </header>


            <main>

                <section className="story-card">

                    <span className="label">
                        USER STORY
                    </span>

                    <h2>
                        {story}
                    </h2>

                </section>


                <section className="content">

                    <div className="voting-area">

                        <h3>
                            Choose your estimate
                        </h3>


                        <div className="cards">

                            {cards.map((card) => (

                                <button
                                    key={card}
                                    className={
                                        selectedCard === card
                                            ? "poker-card selected"
                                            : "poker-card"
                                    }
                                    onClick={() =>
                                        vote(card)
                                    }
                                >
                                    {card}
                                </button>

                            ))}

                        </div>


                        <p className="hint">

                            {selectedCard
                                ? `You selected ${selectedCard}`
                                : "Select a card"}

                        </p>

                    </div>


                    <aside>

                        <h3>
                            Players
                        </h3>


                        <div className="players">

                            {players.map((player) => (

                                <div
                                    className="player"
                                    key={player.name}
                                >

                                    <div>

                                        <span className="status">
                                            {player.voted
                                                ? "🟢"
                                                : "⚪"}
                                        </span>

                                        {player.name}

                                        {player.moderator && (
                                            <span className="crown">
                                                👑
                                            </span>
                                        )}

                                    </div>


                                    <span>

                                        {revealed
                                            ? votes[player.name] || "-"
                                            : player.voted
                                                ? "Voted"
                                                : "Thinking"}

                                    </span>

                                </div>

                            ))}

                        </div>


                        {isModerator && (

                            <div className="moderator-controls">

                                {!revealed ? (

                                    <button
                                        className="primary"
                                        onClick={revealVotes}
                                    >
                                        Reveal Votes
                                    </button>

                                ) : (

                                    <button
                                        className="secondary"
                                        onClick={resetVotes}
                                    >
                                        Start New Vote
                                    </button>

                                )}

                            </div>

                        )}

                    </aside>

                </section>


                {revealed && (

                    <section className="results">

                        <h2>
                            Voting Results
                        </h2>


                        <div className="result-cards">

                            {Object.entries(votes).map(
                                ([player, vote]) => (

                                    <div
                                        className="result-card"
                                        key={player}
                                    >

                                        <strong>
                                            {vote}
                                        </strong>

                                        <span>
                                            {player}
                                        </span>

                                    </div>

                                )
                            )}

                        </div>


                        <div className="average">

                            <span>
                                Average
                            </span>

                            <strong>

                                {(() => {

                                    const numbers =
                                        Object.values(votes)
                                            .map(Number)
                                            .filter(
                                                (n) =>
                                                    !isNaN(n)
                                            );

                                    if (
                                        numbers.length === 0
                                    ) {
                                        return "N/A";
                                    }

                                    const avg =
                                        numbers.reduce(
                                            (a, b) =>
                                                a + b,
                                            0
                                        ) /
                                        numbers.length;

                                    return avg.toFixed(1);

                                })()}

                            </strong>

                        </div>

                    </section>

                )}

            </main>

        </div>

    );

}

export default App;