const db = require("../db");

const {
    redisClient
} = require("../redis");


function getVoteKey(roomCode) {
    return `votes:${roomCode}`;
}


async function saveVote(
    roomCode,
    userId,
    name,
    vote
) {
    const key =
        getVoteKey(roomCode);

    await redisClient.hSet(
        key,
        String(userId),
        JSON.stringify({
            name,
            vote: String(vote)
        })
    );

    await redisClient.expire(
        key,
        3600
    );
}


async function getVotes(roomCode) {
    const key =
        getVoteKey(roomCode);

    const storedVotes =
        await redisClient.hGetAll(key);

    return Object.entries(
        storedVotes
    ).map(
        ([userId, value]) => {

            const parsed =
                JSON.parse(value);

            return {
                userId,
                name: parsed.name,
                vote: parsed.vote
            };
        }
    );
}


function calculateAverage(votes) {
    const numericVotes =
        votes
            .map(vote => Number(vote.vote))
            .filter(
                value =>
                    !isNaN(value)
            );

    if (numericVotes.length === 0) {
        return 0;
    }

    const total =
        numericVotes.reduce(
            (sum, value) =>
                sum + value,
            0
        );

    return Number(
        (
            total /
            numericVotes.length
        ).toFixed(2)
    );
}


async function saveVotingSession(
    roomCode,
    votes,
    averageVote
) {
    return new Promise(
        (resolve, reject) => {

            db.query(
                `
                SELECT story
                FROM rooms
                WHERE room_code = ?
                `,
                [roomCode],
                (roomErr, rooms) => {

                    if (
                        roomErr ||
                        rooms.length === 0
                    ) {
                        reject(
                            roomErr ||
                            new Error(
                                "Room not found"
                            )
                        );

                        return;
                    }

                    const story =
                        rooms[0].story;

                    db.query(
                        `
                        INSERT INTO voting_sessions
                        (
                            room_code,
                            story,
                            average_vote
                        )
                        VALUES (?, ?, ?)
                        `,
                        [
                            roomCode,
                            story,
                            averageVote
                        ],
                        (
                            sessionErr,
                            result
                        ) => {

                            if (sessionErr) {
                                reject(
                                    sessionErr
                                );

                                return;
                            }

                            const sessionId =
                                result.insertId;

                            let completed = 0;

                            if (
                                votes.length === 0
                            ) {
                                resolve(
                                    sessionId
                                );

                                return;
                            }

                            votes.forEach(
                                vote => {

                                    db.query(
                                        `
                                        INSERT INTO votes
                                        (
                                            session_id,
                                            player_name,
                                            vote
                                        )
                                        VALUES (?, ?, ?)
                                        `,
                                        [
                                            sessionId,
                                            vote.name,
                                            vote.vote
                                        ],
                                        err => {

                                            if (err) {
                                                reject(err);
                                                return;
                                            }

                                            completed++;

                                            if (
                                                completed ===
                                                votes.length
                                            ) {
                                                resolve(
                                                    sessionId
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
        }
    );
}


async function resetVotes(roomCode) {
    await redisClient.del(
        getVoteKey(roomCode)
    );
}


module.exports = {
    saveVote,
    getVotes,
    calculateAverage,
    saveVotingSession,
    resetVotes
};