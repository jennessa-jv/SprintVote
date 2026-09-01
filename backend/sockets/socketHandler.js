const {
    getRoomPlayers
} = require("../services/roomService");

const {
    saveVote,
    getVotes,
    calculateAverage,
    saveVotingSession,
    resetVotes
} = require("../services/votingService");


function setupSocketHandlers(io) {

    io.on("connection", socket => {

        console.log(
            "Socket connected:",
            socket.id
        );


        // ============================================
        // JOIN ROOM
        // ============================================

        socket.on(
    "join-room",
    async ({
        roomCode,
        userId
    }) => {

        socket.join(roomCode);

        socket.roomCode = roomCode;
        socket.userId = userId;

        try {

            // Get all players from MySQL
            const players =
                await getRoomPlayers(
                    roomCode
                );


            // Find the current player
            const currentPlayer =
                players.find(
                    player =>
                        Number(
                            player.user_id
                        ) ===
                        Number(userId)
                );


            // Store player information
            // on this socket

            socket.playerName =
                currentPlayer?.name;

            socket.isModerator =
                Boolean(
                    currentPlayer?.is_moderator
                );


            // ==========================================
            // GET EXISTING VOTES FROM REDIS
            // ==========================================

            const votes =
                await getVotes(
                    roomCode
                );


            // ==========================================
            // ADD VOTED STATUS TO PLAYERS
            // ==========================================

            const playersWithStatus =
                players.map(
                    player => {

                        const hasVoted =
                            votes.some(
                                vote =>
                                    Number(
                                        vote.userId
                                    ) ===
                                    Number(
                                        player.user_id
                                    )
                            );


                        return {
                            ...player,
                            voted: hasVoted
                        };

                    }
                );


            // ==========================================
            // SEND ROOM STATE
            // ==========================================

            io.to(roomCode).emit(
                "room-state",
                {
                    players:
                        playersWithStatus
                }
            );

        } catch (error) {

            console.log(
                "Join room error:",
                error
            );

        }
    }
);


        // ============================================
        // VOTE
        // ============================================

        socket.on(
            "vote",
            async ({
                roomCode,
                vote
            }) => {

                if (!socket.userId) {
                    return;
                }


                if (!socket.playerName) {
                    return;
                }


                try {

                    await saveVote(
                        roomCode,
                        socket.userId,
                        socket.playerName,
                        vote
                    );


                    // Tell everyone that
                    // this user voted

                    io.to(roomCode).emit(
                        "player-voted",
                        {
                            userId:
                                socket.userId
                        }
                    );

                } catch (error) {

                    console.log(
                        "Vote error:",
                        error
                    );

                }

            }
        );


        // ============================================
        // REVEAL
        // ============================================

        socket.on(
            "reveal-votes",
            async () => {

                if (!socket.isModerator) {
                    return;
                }


                const roomCode =
                    socket.roomCode;


                try {

                    const votes =
                        await getVotes(
                            roomCode
                        );


                    if (
                        votes.length === 0
                    ) {
                        return;
                    }


                    const averageVote =
                        calculateAverage(
                            votes
                        );


                    await saveVotingSession(
                        roomCode,
                        votes,
                        averageVote
                    );


                    io.to(roomCode).emit(
                        "votes-revealed",
                        {
                            votes,
                            averageVote
                        }
                    );

                } catch (error) {

                    console.log(
                        "Reveal error:",
                        error
                    );

                }

            }
        );


        // ============================================
        // RESET
        // ============================================

        socket.on(
            "reset-votes",
            async () => {

                if (!socket.isModerator) {
                    return;
                }


                try {

                    await resetVotes(
                        socket.roomCode
                    );


                    io.to(
                        socket.roomCode
                    ).emit(
                        "votes-reset"
                    );

                } catch (error) {

                    console.log(
                        "Reset error:",
                        error
                    );

                }

            }
        );


        // ============================================
        // DISCONNECT
        // ============================================

        socket.on(
            "disconnect",
            () => {

                console.log(
                    "Socket disconnected:",
                    socket.id
                );

            }
        );

    });

}


module.exports = setupSocketHandlers;