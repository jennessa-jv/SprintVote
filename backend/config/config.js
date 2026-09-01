const PORT = 5000;

const JWT_SECRET =
    process.env.JWT_SECRET || "planning-poker-secret";

const FRONTEND_URL =
    process.env.FRONTEND_URL || "http://localhost:5173";

module.exports = {
    PORT,
    JWT_SECRET,
    FRONTEND_URL
};