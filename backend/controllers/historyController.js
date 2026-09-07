const db = require("../db");

//voting sessions and players see schema properly!!!!!!!!!!!!!!!!!!1
function getHistory(req, res) {
    const userId =
        req.user.userId;

    db.query(
        `
        SELECT DISTINCT
            vs.id,
            vs.room_code,
            vs.story,
            vs.average_vote,
            vs.created_at
        FROM voting_sessions vs

        INNER JOIN players p
            ON p.room_code = vs.room_code

        WHERE p.user_id = ?

        ORDER BY vs.created_at DESC
        `,
        [userId],
        (err, results) => {

            if (err) {
                console.log(err);

                return res.status(500).json({
                    error:
                        "Could not load history"
                });
            }

            res.json(results);
        }
    );
}


function getHistoryDetails(req, res) {
    const sessionId =
        req.params.sessionId;

    const userId =
        req.user.userId;

    db.query(
        `
        SELECT vs.*
        FROM voting_sessions vs

        INNER JOIN players p
            ON p.room_code = vs.room_code

        WHERE vs.id = ?
        AND p.user_id = ?

        LIMIT 1
        `,
        [
            sessionId,
            userId
        ],
        (err, sessions) => {

            if (err) {
                return res.status(500).json({
                    error:
                        "Database error"
                });
            }

            if (sessions.length === 0) {
                return res.status(404).json({
                    error:
                        "Session not found"
                });
            }

            db.query(
                `
                SELECT
                    player_name,
                    vote,
                    created_at
                FROM votes
                WHERE session_id = ?
                ORDER BY id ASC
                `,
                [sessionId],
                (voteErr, votes) => {

                    if (voteErr) {
                        return res.status(500).json({
                            error:
                                "Could not load votes"
                        });
                    }

                    res.json({
                        session:
                            sessions[0],
                        votes
                    });
                }
            );
        }
    );
}


module.exports = {
    getHistory,
    getHistoryDetails
};