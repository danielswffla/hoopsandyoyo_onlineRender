const http = require("http");
const net = require("net");
const { WebSocketServer } = require("ws");

const PORT = Number(process.env.PORT) || 10000;

// ============================================================
// HTTP SERVER
// ============================================================

const httpServer = http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    res.end("Hoops & Yoyo Multiplayer Server Online");
});


// ============================================================
// RAW TCP GAME SERVER
//
// This is the actual XMLSocket-style multiplayer server.
// It stays private inside Render.
// ============================================================

const TCP_PORT = 10001;

const tcpServer = net.createServer();

const tcpClients = [];

tcpServer.on("connection", (socket) => {

    const clientId =
        Math.random()
            .toString(36)
            .substring(2, 10);

    const client = {
        socket: socket,
        id: clientId,
        x: 275,
        y: 200
    };

    tcpClients.push(client);

    console.log(
        `[TCP] Player connected: ${clientId}`
    );


    // ========================================================
    // SEND WELCOME
    // ========================================================

    sendPacket(
        socket,
        `<welcome id='${clientId}' />`
    );


    // ========================================================
    // TELL NEW PLAYER ABOUT EXISTING PLAYERS
    // ========================================================

    for (const other of tcpClients) {

        if (other === client) {
            continue;
        }

        sendPacket(
            socket,
            `<spawn id='${other.id}' x='${other.x}' y='${other.y}' />`
        );
    }


    // ========================================================
    // TELL EVERYONE ELSE ABOUT NEW PLAYER
    // ========================================================

    broadcastExcept(
        client,
        `<spawn id='${client.id}' x='${client.x}' y='${client.y}' />`
    );


    // ========================================================
    // RECEIVE DATA
    // ========================================================

    let buffer = "";

    socket.on("data", (data) => {

        buffer += data.toString();

        // XMLSocket packets are terminated by NULL.
        const packets = buffer.split("\0");

        // Keep incomplete packet.
        buffer = packets.pop();


        for (const packet of packets) {

            const cleanPacket = packet.trim();

            if (cleanPacket === "") {
                continue;
            }

            console.log(
                `[${client.id}] ${cleanPacket}`
            );


            // ==================================================
            // SPAWN
            // ==================================================

            if (cleanPacket.startsWith("<spawn")) {

                const x =
                    getAttribute(cleanPacket, "x");

                const y =
                    getAttribute(cleanPacket, "y");

                if (x !== "" && y !== "") {

                    client.x = Number(x);
                    client.y = Number(y);

                    broadcastExcept(
                        client,
                        `<spawn id='${client.id}' x='${client.x}' y='${client.y}' />`
                    );
                }

                continue;
            }


            // ==================================================
            // MOVE
            // ==================================================

            if (cleanPacket.startsWith("<move")) {

                const x =
                    getAttribute(cleanPacket, "x");

                const y =
                    getAttribute(cleanPacket, "y");

                if (x !== "" && y !== "") {

                    client.x = Number(x);
                    client.y = Number(y);

                    broadcastExcept(
                        client,
                        `<move id='${client.id}' x='${client.x}' y='${client.y}' />`
                    );
                }

                continue;
            }
        }
    });


    // ========================================================
    // DISCONNECT
    // ========================================================

    socket.on("close", () => {

        removeClient(client);

        console.log(
            `[TCP] Player disconnected: ${client.id}`
        );

        broadcast(
            `<leave id='${client.id}' />`
        );
    });


    socket.on("end", () => {

        removeClient(client);

        console.log(
            `[TCP] Player ended: ${client.id}`
        );

        broadcast(
            `<leave id='${client.id}' />`
        );
    });


    socket.on("error", (err) => {

        console.log(
            `[TCP] ${client.id} error: ${err.message}`
        );

        removeClient(client);
    });
});


// ============================================================
// START TCP SERVER
// ============================================================

tcpServer.listen(
    TCP_PORT,
    "127.0.0.1",
    () => {

        console.log(
            `[TCP] Internal multiplayer server listening on ${TCP_PORT}`
        );
    }
);


// ============================================================
// WEBSOCKET PROXY
//
// Ruffle connects here using socketProxy.
// The WebSocket is simply bridged to the TCP server.
// ============================================================

const wss = new WebSocketServer({
    server: httpServer
});

wss.on("connection", (ws) => {

    console.log(
        "[WS] Ruffle socket connected"
    );

    const tcp = net.createConnection({
        host: "127.0.0.1",
        port: TCP_PORT
    });


    // ========================================================
    // TCP -> WEBSOCKET
    // ========================================================

    tcp.on("data", (data) => {

        if (ws.readyState === ws.OPEN) {

            ws.send(data);

        }
    });


    // ========================================================
    // WEBSOCKET -> TCP
    // ========================================================

    ws.on("message", (data) => {

        if (tcp.writable) {

            tcp.write(
                Buffer.from(data)
            );
        }
    });


    // ========================================================
    // CLOSE
    // ========================================================

    ws.on("close", () => {

        console.log(
            "[WS] Ruffle disconnected"
        );

        tcp.destroy();
    });


    ws.on("error", (err) => {

        console.log(
            `[WS] Error: ${err.message}`
        );

        tcp.destroy();
    });


    tcp.on("error", (err) => {

        console.log(
            `[Proxy] TCP error: ${err.message}`
        );

        try {
            ws.close();
        } catch (e) {}
    });


    tcp.on("close", () => {

        try {
            ws.close();
        } catch (e) {}
    });
});


// ============================================================
// START PUBLIC RENDER SERVER
// ============================================================

httpServer.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Hoops & Yoyo server listening on ${PORT}`
        );

    }
);


// ============================================================
// HELPERS
// ============================================================

function sendPacket(socket, packet) {

    if (!socket.destroyed) {

        socket.write(
            packet + "\0"
        );

        console.log(
            `[SEND] ${packet}`
        );
    }
}


function broadcast(packet) {

    for (const client of tcpClients) {

        sendPacket(
            client.socket,
            packet
        );
    }
}


function broadcastExcept(except, packet) {

    for (const client of tcpClients) {

        if (client === except) {
            continue;
        }

        sendPacket(
            client.socket,
            packet
        );
    }
}


function removeClient(client) {

    const index =
        tcpClients.indexOf(client);

    if (index !== -1) {

        tcpClients.splice(
            index,
            1
        );
    }
}


function getAttribute(text, attribute) {

    let search =
        attribute + "='";

    let start =
        text.indexOf(search);

    if (start >= 0) {

        start += search.length;

        const end =
            text.indexOf("'", start);

        if (end >= 0) {

            return text.substring(
                start,
                end
            );
        }
    }


    // Double quotes.

    search =
        attribute + '="';

    start =
        text.indexOf(search);

    if (start >= 0) {

        start += search.length;

        const end =
            text.indexOf('"', start);

        if (end >= 0) {

            return text.substring(
                start,
                end
            );
        }
    }


    return "";
}
