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


async function createRoomController(req, res) {  //from routes and middleware
    const { story } = req.body; //from middleware
    const isModerator = true; //from middleware
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

        await createRoom(  //to sql
            roomCode,
            story
        );

        await addPlayer(
            roomCode,
            userId,
            userName,
            isModerator
        );

        res.status(201).json({
            roomCode,
            story,
            isModerator
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
        req.params.roomCode;  //from the url

    const userId =
        req.user.userId;  //from jwt token in the middleware

    const userName =
        req.user.name;

    try {
        const room =
            await getRoom(roomCode);  //sql query in services

        if (!room) {
            return res.status(404).json({
                error:
                    "Room does not exist"
            });
        }

        const existingPlayer =   //again a sql query
            await getPlayer(
                roomCode,
                userId
            );

        if (existingPlayer) {
            return res.json({
                roomCode,
                story: room.story, //from the database
                isModerator:
                    Boolean(
                        existingPlayer.is_moderator   //from the database
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