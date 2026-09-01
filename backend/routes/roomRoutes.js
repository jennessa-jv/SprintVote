const express = require("express");

const authenticateToken =
    require("../middleware/authMiddleware");

const {
    createRoomController,
    joinRoom,
    getRoomController
} = require("../controllers/roomController");

const router = express.Router();

router.post(
    "/",
    authenticateToken,
    createRoomController
);

router.post(
    "/:roomCode/join",
    authenticateToken,
    joinRoom
);

router.get(
    "/:roomCode",
    authenticateToken,
    getRoomController
);

module.exports = router;