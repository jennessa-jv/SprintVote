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

        socket.on(  //from the frontend
    "join-room",
    async ({
        roomCode,
        userId
    }) => {    //as i had studied this is a callback

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
                currentPlayer?.name;  //database

            socket.isModerator =
                Boolean(
                    currentPlayer?.is_moderator //database
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
//     The backend then checks:

// if (!socket.userId) {
//     return;
// }

// and:

// if (!socket.playerName) {
//     return;
// }

// Remember earlier when you stored:

// socket.userId = userId;
// socket.playerName = currentPlayer?.name;

// That's why the backend now knows who submitted the vote.

                try {

                    await saveVote( //goes to redis
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
                        await getVotes(  //from redis
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
// await resetVotes(
//     socket.roomCode
// );

// which does:

// await redisClient.del(
//     getVoteKey(roomCode)
// );

// So:

// Redis

// votes:ABC123

// is deleted.


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