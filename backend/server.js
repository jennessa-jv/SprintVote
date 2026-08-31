const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const db = require("./db");
const { redisClient, connectRedis } = require("./redis");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());


// =====================================================
// HELPER
// =====================================================

function generateRoomCode() {
    return crypto.randomBytes(3).toString("hex").toUpperCase();
}


// =====================================================
// TEST API
// =====================================================

app.get("/", (req, res) => {
    res.json({
        message: "Agile Planning Poker API is running"
    });
});


// =====================================================
// CREATE ROOM
// =====================================================

app.post("/api/rooms", async (req, res) => {

    const { story, moderatorName } = req.body;

    if (!story || !moderatorName) {
        return res.status(400).json({
            error: "Story and moderator name are required"
        });
    }

    const roomCode = generateRoomCode();

    try {

        // Save room in MySQL
        const roomSql = `
            INSERT INTO rooms
            (room_code, story)
            VALUES (?, ?)
        `;

        db.query(
            roomSql,
            [roomCode, story],
            async (roomErr) => {

                if (roomErr) {
                    console.log("Room creation error:", roomErr);

                    return res.status(500).json({
                        error: "Could not create room"
                    });
                }

                // Save moderator in MySQL
                const playerSql = `
                    INSERT INTO players
                    (room_code, name, is_moderator)
                    VALUES (?, ?, true)
                `;

                db.query(
                    playerSql,
                    [roomCode, moderatorName],
                    async (playerErr) => {

                        if (playerErr) {
                            console.log(
                                "Moderator creation error:",
                                playerErr
                            );

                            return res.status(500).json({
                                error: "Could not create moderator"
                            });
                        }

                        // Store temporary room data in Redis
                        const roomData = {
                            roomCode: roomCode,
                            story: story,
                            revealed: false,
                            players: []
                        };

                        await redisClient.setEx(
                            `room:${roomCode}`,
                            3600,
                            JSON.stringify(roomData)
                        );

                        res.status(201).json({
                            message: "Room created",
                            roomCode: roomCode,
                            story: story,
                            moderatorName: moderatorName
                        });

                    }
                );

            }
        );

    } catch (error) {

        console.log("Create room error:", error);

        res.status(500).json({
            error: error.message
        });

    }

});


// =====================================================
// GET ROOM
// =====================================================

app.get("/api/rooms/:roomCode", async (req, res) => {

    const roomCode =
        req.params.roomCode.toUpperCase();

    try {

        // First check Redis
        const cachedRoom =
            await redisClient.get(`room:${roomCode}`);

        if (cachedRoom) {

            console.log(
                "Room loaded from Redis"
            );

            return res.json(
                JSON.parse(cachedRoom)
            );

        }

        // If not in Redis, get room from MySQL
        const roomSql = `
            SELECT *
            FROM rooms
            WHERE room_code = ?
        `;

        db.query(
            roomSql,
            [roomCode],
            async (err, rooms) => {

                if (err) {

                    return res.status(500).json({
                        error: err.message
                    });

                }

                if (rooms.length === 0) {

                    return res.status(404).json({
                        error: "Room not found"
                    });

                }

                const room = rooms[0];

                // Get players
                const playerSql = `
                    SELECT name, is_moderator
                    FROM players
                    WHERE room_code = ?
                `;

                db.query(
                    playerSql,
                    [roomCode],
                    async (playerErr, players) => {

                        if (playerErr) {

                            return res.status(500).json({
                                error: playerErr.message
                            });

                        }

                        const roomData = {
                            roomCode: room.room_code,
                            story: room.story,
                            revealed: false,
                            players: players
                        };

                        // Put room back into Redis
                        await redisClient.setEx(
                            `room:${roomCode}`,
                            3600,
                            JSON.stringify(roomData)
                        );

                        res.json(roomData);

                    }
                );

            }
        );

    } catch (error) {

        console.log("Get room error:", error);

        res.status(500).json({
            error: error.message
        });

    }

});


// =====================================================
// JOIN ROOM
// =====================================================

app.post("/api/rooms/:roomCode/join", async (req, res) => {

    const roomCode =
        req.params.roomCode.toUpperCase();

    const { name } = req.body;

    if (!name) {

        return res.status(400).json({
            error: "Name is required"
        });

    }

    try {

        // Check that room exists
        const roomSql = `
            SELECT *
            FROM rooms
            WHERE room_code = ?
        `;

        db.query(
            roomSql,
            [roomCode],
            (err, rooms) => {

                if (err) {

                    return res.status(500).json({
                        error: err.message
                    });

                }

                if (rooms.length === 0) {

                    return res.status(404).json({
                        error: "Room does not exist"
                    });

                }

                // Add player
                const playerSql = `
                    INSERT INTO players
                    (room_code, name, is_moderator)
                    VALUES (?, ?, false)
                `;

                db.query(
                    playerSql,
                    [roomCode, name],
                    async (playerErr) => {

                        if (playerErr) {

                            console.log(
                                "Join error:",
                                playerErr
                            );

                            return res.status(500).json({
                                error: playerErr.message
                            });

                        }

                        // Remove old room cache
                        await redisClient.del(
                            `room:${roomCode}`
                        );

                        res.json({
                            message: "Joined room",
                            roomCode: roomCode,
                            name: name
                        });

                    }
                );

            }
        );

    } catch (error) {

        console.log("Join room error:", error);

        res.status(500).json({
            error: error.message
        });

    }

});


// =====================================================
// SOCKET.IO
// =====================================================

io.on("connection", (socket) => {

    console.log(
        "User connected:",
        socket.id
    );


    // =================================================
    // JOIN SOCKET ROOM
    // =================================================

    socket.on("join-room", async (data) => {

        try {

            const {
                roomCode,
                name,
                moderator
            } = data;

            socket.join(roomCode);

            socket.roomCode = roomCode;
            socket.playerName = name;
            socket.isModerator = moderator;

            console.log(
                `${name} joined room ${roomCode}`
            );

            // Tell everyone in the room
            io.to(roomCode).emit(
                "player-joined",
                {
                    name: name,
                    moderator: moderator
                }
            );

        } catch (error) {

            console.log(
                "Join socket error:",
                error
            );

        }

    });


    // =================================================
    // VOTE
    // =================================================

    socket.on("vote", async (data) => {

        try {

            const {
                roomCode,
                name,
                vote
            } = data;

            console.log(
                `${name} voted ${vote} in ${roomCode}`
            );

            // Redis key for current voting round
            const voteKey =
                `votes:${roomCode}`;

            // Store hidden vote in Redis
            await redisClient.hSet(
                voteKey,
                name,
                String(vote)
            );

            // Automatically expire votes after 1 hour
            await redisClient.expire(
                voteKey,
                3600
            );

            // Tell everyone that this player voted
            // BUT DO NOT SEND THE ACTUAL VOTE
            io.to(roomCode).emit(
                "player-voted",
                {
                    name: name
                }
            );

        } catch (error) {

            console.log(
                "Vote error:",
                error
            );

        }

    });


    // =================================================
    // REVEAL VOTES
    // =================================================

    socket.on("reveal-votes", async (data) => {

        const { roomCode } = data;

        // Only moderator can reveal
        if (!socket.isModerator) {

            console.log(
                "Unauthorized reveal attempt"
            );

            return;

        }

        try {

            // Get votes from Redis
            const voteKey =
                `votes:${roomCode}`;

            const votes =
                await redisClient.hGetAll(voteKey);

            console.log(
                "Votes from Redis:",
                votes
            );

            if (Object.keys(votes).length === 0) {

                console.log(
                    "No votes found"
                );

                return;

            }

            // -----------------------------------------
            // CALCULATE AVERAGE
            // -----------------------------------------

            const numericVotes =
                Object.values(votes)
                    .map(Number)
                    .filter(
                        value => !isNaN(value)
                    );

            let averageVote = 0;

            if (numericVotes.length > 0) {

                const total =
                    numericVotes.reduce(
                        (sum, value) =>
                            sum + value,
                        0
                    );

                averageVote =
                    total / numericVotes.length;

            }

            // Round to 2 decimal places
            averageVote =
                Number(
                    averageVote.toFixed(2)
                );


            // -----------------------------------------
            // GET STORY FROM MYSQL
            // -----------------------------------------

            const roomSql = `
                SELECT story
                FROM rooms
                WHERE room_code = ?
            `;

            db.query(
                roomSql,
                [roomCode],
                (roomErr, rooms) => {

                    if (roomErr) {

                        console.log(
                            "Room query error:",
                            roomErr
                        );

                        return;

                    }

                    if (rooms.length === 0) {

                        console.log(
                            "Room does not exist"
                        );

                        return;

                    }

                    const story =
                        rooms[0].story;


                    // ---------------------------------
                    // CREATE VOTING SESSION
                    // ---------------------------------

                    const sessionSql = `
                        INSERT INTO voting_sessions
                        (room_code, story, average_vote)
                        VALUES (?, ?, ?)
                    `;

                    db.query(
                        sessionSql,
                        [
                            roomCode,
                            story,
                            averageVote
                        ],
                        (sessionErr, result) => {

                            if (sessionErr) {

                                console.log(
                                    "Session insert error:",
                                    sessionErr
                                );

                                return;

                            }

                            const sessionId =
                                result.insertId;

                            console.log(
                                "Voting session created:",
                                sessionId
                            );


                            // ---------------------------------
                            // SAVE EACH VOTE TO MYSQL
                            // ---------------------------------

                            const voteSql = `
                                INSERT INTO votes
                                (session_id, player_name, vote)
                                VALUES (?, ?, ?)
                            `;

                            const voteEntries =
                                Object.entries(votes);

                            let completed =
                                0;

                            voteEntries.forEach(
                                ([playerName, vote]) => {

                                    db.query(
                                        voteSql,
                                        [
                                            sessionId,
                                            playerName,
                                            vote
                                        ],
                                        (voteErr) => {

                                            if (voteErr) {

                                                console.log(
                                                    "Vote insert error:",
                                                    voteErr
                                                );

                                            }

                                            completed++;

                                            // Once all votes have
                                            // been processed
                                            if (
                                                completed ===
                                                voteEntries.length
                                            ) {

                                                console.log(
                                                    "All votes saved to MySQL"
                                                );

                                                // Tell everyone
                                                // the votes are revealed
                                                io.to(roomCode).emit(
                                                    "votes-revealed",
                                                    {
                                                        votes: votes,
                                                        averageVote:
                                                            averageVote
                                                    }
                                                );

                                            }

                                        }
                                    );

                                }
                            );

                        }
                    );

                }
            );

        } catch (error) {

            console.log(
                "Reveal error:",
                error
            );

        }

    });


    // =================================================
    // RESET VOTES
    // =================================================

    socket.on("reset-votes", async (data) => {

        const { roomCode } = data;

        // Only moderator can reset
        if (!socket.isModerator) {

            console.log(
                "Unauthorized reset attempt"
            );

            return;

        }

        try {

            // Delete current votes from Redis
            await redisClient.del(
                `votes:${roomCode}`
            );

            console.log(
                `Votes reset for ${roomCode}`
            );

            // Tell everyone to reset their UI
            io.to(roomCode).emit(
                "votes-reset"
            );

        } catch (error) {

            console.log(
                "Reset error:",
                error
            );

        }

    });


    // =================================================
    // DISCONNECT
    // =================================================

    socket.on("disconnect", () => {

        console.log(
            "User disconnected:",
            socket.id
        );

    });

});


// =====================================================
// START SERVER
// =====================================================

async function startServer() {

    try {

        // Connect Redis first
        await connectRedis();

        // Start HTTP + Socket.IO server
        server.listen(5000, () => {

            console.log("");
            console.log(
                "======================================"
            );

            console.log(
                "Agile Planning Poker Server"
            );

            console.log(
                "Running on http://localhost:5000"
            );

            console.log(
                "======================================"
            );

        });

    } catch (error) {

        console.log(
            "Server failed:",
            error.message
        );

    }

}

startServer();