const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/config");
const { getUserById } = require("../services/userService");

async function authenticateToken(req, res, next) {  //from routes
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            error: "Authentication required"
        });
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(  //!token secret and data
        token,
        JWT_SECRET, //?After successful verification:
// err = null
// user = the payload that was stored inside the JWT
// For example, suppose when logging in you created the token like:
// const token = jwt.sign(
//     {
//         userId: 25,
//         name: "John"
//     },
//     JWT_SECRET
// );
        async (err, user) => {
            if (err) {
                return res.status(401).json({
                    error: "Invalid or expired token"
                });
            }

            try {
                const existingUser =
                    await getUserById(user.userId);

                if (!existingUser) {
                    return res.status(401).json({
                        error: "User no longer exists"
                    });
                }
            
                req.user = user;
//               now:::::  req.user = {
//     userId: 25,
//     name: "John",
//     iat: 1757150000
// };
                next();

            } catch (error) {
                console.log(error);

                return res.status(500).json({
                    error: "Authentication failed"
                });
            }
        }
    );
}

module.exports = authenticateToken;