const {
    getRoom,
    getPlayer,
    getRoomPlayers,
    createRoom,
    addPlayer
} = require("../services/roomService");

const {
    generateRoomCode
} = require("../utils/roomUtils");


async function createRoomController(req, res) {
    const { story } = req.body;

    const userId = req.user.userId;
    const userName = req.user.name;

    if (!story) {
        return res.status(400).json({
            error: "Story is required"
        });
    }

    try {
        const roomCode =
            generateRoomCode();

        await createRoom(
            roomCode,
            story
        );

        await addPlayer(
            roomCode,
            userId,
            userName,
            true
        );

        res.status(201).json({
            roomCode,
            story,
            isModerator: true
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            error:
                "Could not create room"
        });
    }
}


async function joinRoom(req, res) {
    const roomCode =
        req.params.roomCode;

    const userId =
        req.user.userId;

    const userName =
        req.user.name;

    try {
        const room =
            await getRoom(roomCode);

        if (!room) {
            return res.status(404).json({
                error:
                    "Room does not exist"
            });
        }

        const existingPlayer =
            await getPlayer(
                roomCode,
                userId
            );

        if (existingPlayer) {
            return res.json({
                roomCode,
                story: room.story,
                isModerator:
                    Boolean(
                        existingPlayer.is_moderator
                    )
            });
        }

        await addPlayer(
            roomCode,
            userId,
            userName,
            false
        );

        res.json({
            roomCode,
            story: room.story,
            isModerator: false
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            error:
                "Could not join room"
        });
    }
}


async function getRoomController(req, res) {
    const roomCode =
        req.params.roomCode;

    try {
        const room =
            await getRoom(roomCode);

        if (!room) {
            return res.status(404).json({
                error:
                    "Room not found"
            });
        }

        const players =
            await getRoomPlayers(
                roomCode
            );

        res.json({
            roomCode,
            story: room.story,
            players
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            error:
                "Could not get room"
        });
    }
}


module.exports = {
    createRoomController,
    joinRoom,
    getRoomController
};