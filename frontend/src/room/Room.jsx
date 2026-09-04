import {
    useEffect,
    useRef,
    useState
} from "react";

import {
    createRoom,
    joinRoom
} from "../api/roomApi";

import {
    createSocket
} from "../socket/socket";

import PlayerList
    from "./PlayerList";

import VotingCards
    from "./VotingCards";

import Results
    from "./Results";


function Room({
    user,
    onHome
}) {

    // ==================================================
    // INITIAL STATE
    // ==================================================

    const [mode, setMode] =
        useState(() => {

            const savedRoom =
                localStorage.getItem(
                    "currentRoom"
                );

            return savedRoom
                ? "playing"
                : "menu";
        });


    const [story, setStory] =
        useState(() => {

            return (
                localStorage.getItem(
                    "currentStory"
                ) || ""
            );
        });


    const [roomCode, setRoomCode] =
        useState(() => {

            return (
                localStorage.getItem(
                    "currentRoom"
                ) || ""
            );
        });


    const [currentRoom, setCurrentRoom] =
        useState(() => {

            return (
                localStorage.getItem(
                    "currentRoom"
                ) || null
            );
        });


    const [players, setPlayers] =
        useState([]);


    const [myVote, setMyVote] =
        useState(null);


    const [votes, setVotes] =
        useState({});


    const [revealed, setRevealed] =
        useState(false);


    const [average, setAverage] =
        useState(null);


    const [isModerator, setIsModerator] =
        useState(false);


    const [error, setError] =
        useState("");


    const socketRef =
        useRef(null);


    // ==================================================
    // CREATE ROOM
    // ==================================================

    async function handleCreateRoom() {

        setError("");

        if (!story.trim()) {

            setError(
                "User story is required"
            );

            return;
        }


        try {

            const data =
                await createRoom(
                    story
                );


            setRoomCode(
                data.roomCode
            );

            setCurrentRoom(
                data.roomCode
            );


            // Save room information
            // so refresh doesn't lose it

            localStorage.setItem(
                "currentRoom",
                data.roomCode
            );

            localStorage.setItem(
                "currentStory",
                story
            );

            localStorage.setItem(
                "currentPage",
                "room"
            );


            connectToSocket(
                data.roomCode
            );

        } catch (error) {

            setError(
                error.message
            );

        }
    }


    // ==================================================
    // JOIN ROOM
    // ==================================================

    async function handleJoinRoom() {

        setError("");

        if (!roomCode.trim()) {

            setError(
                "Enter a room code"
            );

            return;
        }


        try {

            const data =
                await joinRoom( //backend
                    roomCode.trim()
                );


            setStory(
                data.story
            );

            setRoomCode(
                data.roomCode
            );

            setCurrentRoom(
                data.roomCode
            );


            // Save room information

            localStorage.setItem(
                "currentRoom",
                data.roomCode
            );

            localStorage.setItem(
                "currentStory",
                data.story
            );

            localStorage.setItem(
                "currentPage",
                "room"
            );


            connectToSocket(
                data.roomCode
            );

        } catch (error) {

            setError(
                error.message
            );

        }
    }


    // ==================================================
    // SOCKET
    // ==================================================

    function connectToSocket(code) {

        if (!code) {
            return;
        }


        // Disconnect old socket

        if (socketRef.current) {

            socketRef.current.disconnect();

        }


        const socket =
            createSocket();


        socketRef.current =
            socket;


        socket.emit(
            "join-room",
            {
                roomCode: code,
                userId: user.id
            }
        );


        // ==============================================
        // COMPLETE ROOM STATE
        // ==============================================

        socket.on(
            "room-state",
            data => {

                setPlayers(
                    data.players
                );


                const currentPlayer =
                    data.players.find(
                        player =>
                            Number(
                                player.user_id
                            ) ===
                            Number(
                                user.id
                            )
                    );


                if (currentPlayer) {

                    setIsModerator(
                        Boolean(
                            currentPlayer
                                .is_moderator
                        )
                    );

                }

            }
        );


        // ==============================================
        // PLAYER VOTED
        // ==============================================

        socket.on(
            "player-voted",
            data => {

                setPlayers(
                    previous =>
                        previous.map(
                            player =>
                                Number(
                                    player.user_id
                                ) ===
                                Number(
                                    data.userId
                                )
                                    ? {
                                        ...player,
                                        voted: true
                                    }
                                    : player
                        )
                );

            }
        );


        // ==============================================
        // VOTES REVEALED
        // ==============================================

        socket.on(
            "votes-revealed",
            data => {

                const voteMap = {};


                data.votes.forEach(
                    vote => {

                        voteMap[
                            vote.userId
                        ] =
                            vote.vote;

                    }
                );


                setVotes(
                    voteMap
                );


                setAverage(
                    data.averageVote
                );


                setRevealed(
                    true
                );

            }
        );


        // ==============================================
        // RESET
        // ==============================================

        socket.on(
            "votes-reset",
            () => {

                setVotes({});

                setMyVote(null);

                setAverage(null);

                setRevealed(false);


                setPlayers(
                    previous =>
                        previous.map(
                            player => ({
                                ...player,
                                voted: false
                            })
                        )
                );

            }
        );


        setMode(
            "playing"
        );

    }


    // ==================================================
    // RECONNECT AFTER REFRESH
    // ==================================================

    useEffect(() => {

        const savedRoom =
            localStorage.getItem(
                "currentRoom"
            );


        if (
            savedRoom &&
            user
        ) {

            connectToSocket(
                savedRoom
            );

        }


        return () => {

            if (socketRef.current) {

                socketRef.current.disconnect();

                socketRef.current = null;

            }

        };

    }, []);


    // ==================================================
    // VOTE
    // ==================================================

    function handleVote(value) {

        if (
            revealed ||
            !socketRef.current
        ) {
            return;
        }


        setMyVote(
            value
        );


        socketRef.current.emit(
            "vote",
            {
                roomCode:
                    currentRoom,

                vote:
                    value
            }
        );

    }


    // ==================================================
    // REVEAL
    // ==================================================

    function handleReveal() {

        if (
            !isModerator ||
            !socketRef.current
        ) {
            return;
        }


        socketRef.current.emit(
            "reveal-votes",
            {
                roomCode:
                    currentRoom
            }
        );

    }


    // ==================================================
    // RESET
    // ==================================================

    function handleReset() {

        if (
            !isModerator ||
            !socketRef.current
        ) {
            return;
        }


        socketRef.current.emit(
            "reset-votes",
            {
                roomCode:
                    currentRoom
            }
        );

    }


    // ==================================================
    // LEAVE ROOM
    // ==================================================

    function handleLeaveRoom() {

        if (socketRef.current) {

            socketRef.current.disconnect();

            socketRef.current = null;

        }


        localStorage.removeItem(
            "currentRoom"
        );

        localStorage.removeItem(
            "currentStory"
        );


        localStorage.setItem(
            "currentPage",
            "home"
        );


        setCurrentRoom(null);

        setRoomCode("");

        setStory("");

        setPlayers([]);

        setMyVote(null);

        setVotes({});

        setRevealed(false);

        setAverage(null);

        setIsModerator(false);

        setMode("menu");


        onHome();

    }


    // ==================================================
    // ROOM MENU
    // ==================================================

    if (mode === "menu") {

        return (
            <div className="page">

                <header>

                    <h1>
                        Planning Poker
                    </h1>


                    <button
                        className="secondary"
                        onClick={onHome}
                    >
                        Home
                    </button>

                </header>


                <main className="room-menu">

                    <div className="room-card">

                        <h2>
                            Create a Room
                        </h2>


                        <input
                            placeholder="User story"
                            value={story}
                            onChange={e =>
                                setStory(
                                    e.target.value
                                )
                            }
                        />


                        <button
                            onClick={
                                handleCreateRoom
                            }
                        >
                            Create Room
                        </button>

                    </div>


                    <div className="room-card">

                        <h2>
                            Join a Room
                        </h2>


                        <input
                            placeholder="Room Code"
                            value={roomCode}
                            onChange={e =>
                                setRoomCode(
                                    e.target.value
                                )
                            }
                        />


                        <button
                            onClick={
                                handleJoinRoom
                            }
                        >
                            Join Room
                        </button>

                    </div>


                    {error && (
                        <p className="error">
                            {error}
                        </p>
                    )}

                </main>

            </div>
        );

    }


    // ==================================================
    // PLAYING ROOM
    // ==================================================

    return (
        <div className="page">

            <header>

                <div>

                    <h1>
                        Planning Poker
                    </h1>


                    <p>
                        Room: {currentRoom}
                    </p>

                </div>


                <button
                    className="secondary"
                    onClick={
                        handleLeaveRoom
                    }
                >
                    Home
                </button>

            </header>


            <main className="poker">

                <div className="story-card">

                    <p>
                        User Story
                    </p>


                    <h2>
                        {story ||
                            "Planning Poker Session"}
                    </h2>

                </div>


                <PlayerList
                    players={players}
                    revealed={revealed}
                    votes={votes}
                />


                <VotingCards
                    myVote={myVote}
                    revealed={revealed}
                    onVote={handleVote}
                />


                <Results
                    revealed={revealed}
                    average={average}
                />


                {isModerator && (

                    <div className="moderator-controls">

                        <button
                            onClick={
                                handleReveal
                            }
                            disabled={revealed}
                        >
                            Reveal Votes
                        </button>


                        <button
                            className="secondary"
                            onClick={
                                handleReset
                            }
                        >
                            Reset
                        </button>

                    </div>

                )}

            </main>

        </div>
    );
}


export default Room;