const crypto = require("crypto");

function generateRoomCode() {
    return crypto
        .randomBytes(8)
        .toString("hex");
}

module.exports = {
    generateRoomCode
};