const http = require("http");
const net = require("net");
const { WebSocketServer } = require("ws");

const PORT = Number(process.env.PORT) || 10000;
const TCP_PORT = 10001;


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
// TCP MULTIPLAYER SERVER
// ============================================================

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
        y: 200,

        // Empty until the client sends its spawn.
        username: "",

        // Character appearance state.
        direction: "front",
        walking: false
    };

    tcpClients.push(client);

    console.log(
        `[TCP] Player connected: ${clientId}`
    );


    // ========================================================
    // WELCOME
    // ========================================================

    sendPacket(
        socket,
        `<welcome id='${clientId}' />`
    );


    // ========================================================
    // SEND EXISTING PLAYERS
    // ========================================================

    for (const other of tcpClients) {

        if (other === client) {
            continue;
        }

        sendPacket(
            socket,

            `<spawn ` +
            `id='${other.id}' ` +
            `x='${other.x}' ` +
            `y='${other.y}' ` +
            `username='${escapeXml(other.username)}' ` +
            `direction='${escapeXml(other.direction)}' ` +
            `walking='${other.walking ? "true" : "false"}' />`
        );
    }


    // ========================================================
    // RECEIVE DATA
    // ========================================================

    let buffer = "";

    socket.on("data", (data) => {

        buffer += data.toString();

        const packets =
            buffer.split("\0");

        buffer =
            packets.pop();


        for (const packet of packets) {

            const cleanPacket =
                packet.trim();

            if (cleanPacket === "") {
                continue;
            }


            console.log(
                `[${client.id}] ${cleanPacket}`
            );


            // ==================================================
            // SPAWN
            // ==================================================

            if (
                cleanPacket.indexOf("<spawn") === 0
            ) {

                const x =
                    getAttribute(
                        cleanPacket,
                        "x"
                    );

                const y =
                    getAttribute(
                        cleanPacket,
                        "y"
                    );

                const username =
                    getAttribute(
                        cleanPacket,
                        "username"
                    );

                const direction =
                    getAttribute(
                        cleanPacket,
                        "direction"
                    );

                const walking =
                    getAttribute(
                        cleanPacket,
                        "walking"
                    );


                // ==============================================
                // POSITION
                // ==============================================

                if (
                    x !== "" &&
                    y !== ""
                ) {
                    client.x =
                        Number(x);

                    client.y =
                        Number(y);
                }


                // ==============================================
                // USERNAME
                // ==============================================

                if (
                    username !== ""
                ) {
                    client.username =
                        decodeXml(username);
                }


                // ==============================================
                // CHARACTER DIRECTION
                // ==============================================

                if (
                    direction !== ""
                ) {
                    client.direction =
                        decodeXml(direction);
                }


                // ==============================================
                // CHARACTER WALKING
                // ==============================================

                if (
                    walking !== ""
                ) {
                    client.walking =
                        walking === "true";
                }


                console.log(
                    `[SPAWN] ` +
                    `${client.id} ` +
                    `username="${client.username}" ` +
                    `position=${client.x},${client.y} ` +
                    `direction="${client.direction}" ` +
                    `walking=${client.walking}`
                );


                // ==============================================
                // BROADCAST
                // ==============================================

                const spawnPacket =
                    `<spawn ` +
                    `id='${client.id}' ` +
                    `x='${client.x}' ` +
                    `y='${client.y}' ` +
                    `username='${escapeXml(client.username)}' ` +
                    `direction='${escapeXml(client.direction)}' ` +
                    `walking='${client.walking ? "true" : "false"}' />`;


                console.log(
                    `[SPAWN BROADCAST] ${spawnPacket}`
                );


                broadcastExcept(
                    client,
                    spawnPacket
                );


                continue;
            }


            // ==================================================
            // MOVE
            // ==================================================

            if (
                cleanPacket.indexOf("<move") === 0
            ) {

                const x =
                    getAttribute(
                        cleanPacket,
                        "x"
                    );

                const y =
                    getAttribute(
                        cleanPacket,
                        "y"
                    );

                const direction =
                    getAttribute(
                        cleanPacket,
                        "direction"
                    );

                const walking =
                    getAttribute(
                        cleanPacket,
                        "walking"
                    );


                // ==============================================
                // POSITION
                // ==============================================

                if (
                    x !== "" &&
                    y !== ""
                ) {
                    client.x =
                        Number(x);

                    client.y =
                        Number(y);
                }


                // ==============================================
                // DIRECTION
                // ==============================================

                if (
                    direction !== ""
                ) {
                    client.direction =
                        decodeXml(direction);
                }


                // ==============================================
                // WALKING
                // ==============================================

                if (
                    walking !== ""
                ) {
                    client.walking =
                        walking === "true";
                }


                console.log(
                    `[MOVE] ` +
                    `${client.id} ` +
                    `position=${client.x},${client.y} ` +
                    `direction="${client.direction}" ` +
                    `walking=${client.walking}`
                );


                // ==============================================
                // BROADCAST
                // ==============================================

                const movePacket =
                    `<move ` +
                    `id='${client.id}' ` +
                    `x='${client.x}' ` +
                    `y='${client.y}' ` +
                    `direction='${escapeXml(client.direction)}' ` +
                    `walking='${client.walking ? "true" : "false"}' />`;


                console.log(
                    `[MOVE BROADCAST] ${movePacket}`
                );


                broadcastExcept(
                    client,
                    movePacket
                );


                continue;
            }
        }
    });


    // ========================================================
    // DISCONNECT
    // ========================================================

    socket.on("close", () => {

        if (
            removeClient(client)
        ) {

            console.log(
                `[TCP] Player disconnected: ${client.id}`
            );

            broadcast(
                `<leave id='${client.id}' />`
            );
        }
    });


    socket.on("end", () => {

        if (
            removeClient(client)
        ) {

            console.log(
                `[TCP] Player ended: ${client.id}`
            );

            broadcast(
                `<leave id='${client.id}' />`
            );
        }
    });


    socket.on("error", (err) => {

        console.log(
            `[TCP] ${client.id} error: ${err.message}`
        );

        removeClient(client);
    });
});


// ============================================================
// INTERNAL TCP SERVER
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
// ============================================================

const wss =
    new WebSocketServer({
        server: httpServer
    });


wss.on("connection", (ws) => {

    console.log(
        "[WS] Ruffle socket connected"
    );


    const tcp =
        net.createConnection({
            host: "127.0.0.1",
            port: TCP_PORT
        });


    // ========================================================
    // TCP -> WEBSOCKET
    // ========================================================

    tcp.on("data", (data) => {

        if (
            ws.readyState === ws.OPEN
        ) {

            ws.send(data);
        }
    });


    // ========================================================
    // WEBSOCKET -> TCP
    // ========================================================

    ws.on("message", (data) => {

        if (
            tcp.writable
        ) {

            tcp.write(
                Buffer.from(data)
            );
        }
    });


    // ========================================================
    // WEBSOCKET CLOSE
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
        }
        catch (e) {}
    });


    tcp.on("close", () => {

        try {
            ws.close();
        }
        catch (e) {}
    });
});


// ============================================================
// PUBLIC SERVER
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
// SEND PACKET
// ============================================================

function sendPacket(socket, packet) {

    if (
        !socket.destroyed
    ) {

        socket.write(
            packet + "\0"
        );

        console.log(
            `[SEND] ${packet}`
        );
    }
}


// ============================================================
// BROADCAST
// ============================================================

function broadcast(packet) {

    for (
        const client of tcpClients
    ) {

        sendPacket(
            client.socket,
            packet
        );
    }
}


// ============================================================
// BROADCAST EXCEPT
// ============================================================

function broadcastExcept(
    except,
    packet
) {

    for (
        const client of tcpClients
    ) {

        if (
            client === except
        ) {
            continue;
        }

        sendPacket(
            client.socket,
            packet
        );
    }
}


// ============================================================
// REMOVE CLIENT
// ============================================================

function removeClient(client) {

    const index =
        tcpClients.indexOf(client);

    if (
        index !== -1
    ) {

        tcpClients.splice(
            index,
            1
        );

        return true;
    }

    return false;
}


// ============================================================
// XML ATTRIBUTE
// ============================================================

function getAttribute(
    text,
    attribute
) {

    let search =
        attribute + "='";

    let start =
        text.indexOf(search);


    // Single quotes
    if (
        start >= 0
    ) {

        start +=
            search.length;

        const end =
            text.indexOf(
                "'",
                start
            );

        if (
            end >= 0
        ) {

            return text.substring(
                start,
                end
            );
        }
    }


    // Double quotes
    search =
        attribute + '="';

    start =
        text.indexOf(search);


    if (
        start >= 0
    ) {

        start +=
            search.length;

        const end =
            text.indexOf(
                '"',
                start
            );

        if (
            end >= 0
        ) {

            return text.substring(
                start,
                end
            );
        }
    }


    return "";
}


// ============================================================
// ESCAPE XML
// ============================================================

function escapeXml(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/'/g, "&apos;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}


// ============================================================
// DECODE XML
// ============================================================

function decodeXml(text) {

    return String(text)
        .replace(/&apos;/g, "'")
        .replace(/&gt;/g, ">")
        .replace(/&lt;/g, "<")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&");
}
