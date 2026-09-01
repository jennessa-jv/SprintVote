const {
    server
} = require("./app");

const {
    PORT
} = require("./config/config");

const {
    connectRedis
} = require("./redis");


async function startServer() {

    try {

        await connectRedis();

        server.listen(
            PORT,
            () => {

                console.log(
                    `Server running on http://localhost:${PORT}`
                );

            }
        );

    } catch (error) {

        console.log(
            "Server failed:",
            error
        );

    }
}


startServer();