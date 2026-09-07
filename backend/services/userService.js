const db = require("../db");

function getUserById(userId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT id, name, email
            FROM users
            WHERE id = ?
        `;

        db.query(sql, [userId], (err, users) => {
            if (err) {
                reject(err);
                return;
            }

            if (users.length === 0) {
                resolve(null);
                return;
            }

            resolve(users[0]);
        });
    });
}

module.exports = {
    getUserById
};