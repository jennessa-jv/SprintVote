const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("../db");
const { JWT_SECRET } = require("../config/config");


async function signup(req, res) {
    const {
        name,
        email,
        password
    } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            error: "All fields are required"
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            error:
                "Password must be at least 6 characters"
        });
    }

    try {
        db.query(
            `
            SELECT id
            FROM users
            WHERE email = ?
            `,
            [email],
            async (err, users) => {

                if (err) {
                    console.log(err);

                    return res.status(500).json({
                        error: "Database error"
                    });
                }

                if (users.length > 0) {
                    return res.status(409).json({
                        error:
                            "Email already registered"
                    });
                }

                const hashedPassword =
                    await bcrypt.hash(
                        password,
                        10
                    );

                db.query(
                    `
                    INSERT INTO users
                    (name, email, password)
                    VALUES (?, ?, ?)
                    `,
                    [
                        name,
                        email,
                        hashedPassword
                    ],
                    (insertErr, result) => {

                        if (insertErr) {
                            console.log(insertErr);

                            return res.status(500).json({
                                error:
                                    "Could not create account"
                            });
                        }

                        res.status(201).json({
                            message:
                                "Account created",
                            userId:
                                result.insertId
                        });
                    }
                );
            }
        );

    } catch (error) {
        console.log(error);

        res.status(500).json({
            error: "Server error"
        });
    }
}


function login(req, res) {
    const {
        email,
        password
    } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            error:
                "Email and password are required"
        });
    }

    db.query(
        `
        SELECT *
        FROM users
        WHERE email = ?
        `,
        [email],
        async (err, users) => {

            if (err) {
                console.log(err);

                return res.status(500).json({
                    error: "Database error"
                });
            }

            if (users.length === 0) {
                return res.status(401).json({
                    error:
                        "Invalid email or password"
                });
            }

            const user = users[0];

            const correct =
                await bcrypt.compare(
                    password,
                    user.password
                );

            if (!correct) {
                return res.status(401).json({
                    error:
                        "Invalid email or password"
                });
            }

            const token = jwt.sign(
                {
                    userId: user.id,
                    name: user.name,
                    email: user.email
                },
                JWT_SECRET,
                {
                    expiresIn: "2h"
                }
            );

            res.json({
                token,

                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }
            });
        }
    );
}


module.exports = {
    signup,
    login
};