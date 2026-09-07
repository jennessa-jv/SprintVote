const db = require("../db");

function getRoomPlayers(roomCode) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT
                id,
                user_id,
                name,
                is_moderator
            FROM players
            WHERE room_code = ?
            ORDER BY id ASC
        `;

        db.query(
            sql,
            [roomCode],
            (err, players) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(players);
            }
        );
    });
}


function getRoom(roomCode) {
    return new Promise((resolve, reject) => {
        db.query(
            `
            SELECT *
            FROM rooms
            WHERE room_code = ?
            `,
            [roomCode],
            (err, rooms) => {

                if (err) {
                    reject(err);
                    return;
                }

                resolve(
                    rooms.length > 0
                        ? rooms[0]
                        : null
                );
            }
        );
    });
}


function getPlayer(roomCode, userId) {
    return new Promise((resolve, reject) => {
        db.query(
            `
            SELECT *
            FROM players
            WHERE room_code = ?
            AND user_id = ?
            `,
            [
                roomCode,
                userId
            ],
            (err, players) => {

                if (err) {
                    reject(err);
                    return;
                }

                resolve(
                    players.length > 0
                        ? players[0]
                        : null
                );
            }
        );
    });
}


function createRoom(roomCode, story) {
    return new Promise((resolve, reject) => {
        db.query(
            `
            INSERT INTO rooms
            (room_code, story)
            VALUES (?, ?)
            `,
            [
                roomCode,
                story
            ],
            (err, result) => {

                if (err) {
                    reject(err);
                    return;
                }

                resolve(result);
            }
        );
    });
}


function addPlayer(
    roomCode,
    userId,
    name,
    isModerator 
) {
    return new Promise((resolve, reject) => {
        db.query(
            `
            INSERT INTO players
            (
                room_code,
                user_id,
                name,
                is_moderator
            )
            VALUES (?, ?, ?, ?)
            `,
            [
                roomCode,
                userId,
                name,
                isModerator
            ],
            (err, result) => {

                if (err) {
                    reject(err);
                    return;
                }

                resolve(result);
            }
        );
    });
}


module.exports = {
    getRoomPlayers,
    getRoom,
    getPlayer,
    createRoom,
    addPlayer
};