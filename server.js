const http = require("http");
const WebSocket = require("ws");

const PORT = Number(process.env.PORT) || 10000;

const players = new Map();

function makeId() {
    return Math.random()
        .toString(36)
        .substring(2, 10);
}


// ==================================================
// HTTP SERVER
// ==================================================

const server = http.createServer((req, res) => {

    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    res.end(
        "Hoops & Yoyo Multiplayer Server Online"
    );
});


// ==================================================
// WEBSOCKET SERVER
// ==================================================

const wss = new WebSocket.Server({
    server: server
});


function send(ws, message) {

    if (
        ws.readyState === WebSocket.OPEN
    ) {
        ws.send(message);
    }
}


function broadcast(message, except) {

    for (const client of wss.clients) {

        if (
            client !== except &&
            client.readyState === WebSocket.OPEN
        ) {
            client.send(message);
        }
    }
}


// ==================================================
// PLAYER CONNECTED
// ==================================================

wss.on("connection", (ws) => {

    const id = makeId();

    const player = {
        id: id,
        x: 275,
        y: 200
    };

    players.set(ws, player);

    console.log(
        "PLAYER CONNECTED:",
        id
    );


    // Give this client its ID.

    send(
        ws,
        `<welcome id='${id}' />`
    );


    // Tell the new client about
    // players already online.

    for (const [otherWs, other] of players) {

        if (otherWs === ws) {
            continue;
        }

        send(
            ws,
            `<spawn id='${other.id}' x='${other.x}' y='${other.y}' />`
        );
    }


    // Tell everyone else about
    // this new player.

    broadcast(
        `<spawn id='${id}' x='${player.x}' y='${player.y}' />`,
        ws
    );


    // ==================================================
    // DATA
    // ==================================================

    ws.on("message", (message) => {

        const data =
            message.toString();

        console.log(
            "FROM",
            id,
            ":",
            data
        );


        // ----------------------------------------------
        // SPAWN
        // ----------------------------------------------

        if (
            data.indexOf("<spawn") === 0
        ) {

            const xMatch =
                data.match(/x=['"]([^'"]+)['"]/);

            const yMatch =
                data.match(/y=['"]([^'"]+)['"]/);


            if (xMatch) {
                player.x =
                    Number(xMatch[1]);
            }

            if (yMatch) {
                player.y =
                    Number(yMatch[1]);
            }


            broadcast(
                `<spawn id='${id}' x='${player.x}' y='${player.y}' />`,
                ws
            );

            return;
        }


        // ----------------------------------------------
        // MOVE
        // ----------------------------------------------

        if (
            data.indexOf("<move") === 0
        ) {

            const xMatch =
                data.match(/x=['"]([^'"]+)['"]/);

            const yMatch =
                data.match(/y=['"]([^'"]+)['"]/);


            if (xMatch) {
                player.x =
                    Number(xMatch[1]);
            }

            if (yMatch) {
                player.y =
                    Number(yMatch[1]);
            }


            broadcast(
                `<move id='${id}' x='${player.x}' y='${player.y}' />`,
                ws
            );

            return;
        }

    });


    // ==================================================
    // DISCONNECTED
    // ==================================================

    ws.on("close", () => {

        console.log(
            "PLAYER DISCONNECTED:",
            id
        );

        players.delete(ws);

        broadcast(
            `<leave id='${id}' />`
        );
    });


    ws.on("error", (error) => {

        console.log(
            "WebSocket error:",
            error.message
        );

    });

});


// ==================================================
// START
// ==================================================

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "Hoops & Yoyo server listening on port " +
            PORT
        );

    }
);
