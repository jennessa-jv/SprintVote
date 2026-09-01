const express = require("express");

const authenticateToken =
    require("../middleware/authMiddleware");

const {
    getHistory,
    getHistoryDetails
} = require("../controllers/historyController");

const router = express.Router();

router.get(
    "/",
    authenticateToken,
    getHistory
);

router.get(
    "/:sessionId",
    authenticateToken,
    getHistoryDetails
);

module.exports = router;