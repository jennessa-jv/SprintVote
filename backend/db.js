const mysql = require("mysql2");

const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "kulshekar575005",
    database: "planning_poker",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection((err, connection) => {
    if (err) {
        console.log("MySQL connection failed:");
        console.log(err.message);
    } else {
        console.log("MySQL connected");
        connection.release();
    }
});

module.exports = db;