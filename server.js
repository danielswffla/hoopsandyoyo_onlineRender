const net = require("net");

const port = process.env.PORT || 10000;

const clients = new Map();

function makeId() {
    return Math.random().toString(36).substring(2, 10);
}

function send(socket, xml) {
    socket.write(xml + "\0");
}

function broadcast(xml, exceptSocket = null) {
    for (const [socket] of clients) {
        if (socket !== exceptSocket && !socket.destroyed) {
            send(socket, xml);
        }
    }
}

const server = net.createServer((socket) => {

    const id = makeId();

    const player = {
        id: id,
        socket: socket,
        x: 275,
        y: 200
    };

    clients.set(socket, player);

    console.log("Player connected:", id);

    // Give this client its ID.
    send(
        socket,
        `<welcome id='${id}' />`
    );

    // Tell this client about everyone already connected.
    for (const [otherSocket, otherPlayer] of clients) {

        if (otherSocket === socket) {
            continue;
        }

        send(
            socket,
            `<spawn id='${otherPlayer.id}' x='${otherPlayer.x}' y='${otherPlayer.y}' />`
        );
    }


    socket.on("data", (data) => {

        const text = data.toString();

        // XMLSocket can potentially give us multiple packets.
        const packets = text.split("\0");

        for (let packet of packets) {

            packet = packet.trim();

            if (!packet) {
                continue;
            }

            console.log("Received from", id, ":", packet);

            // ----------------------------------------
            // SPAWN
            // ----------------------------------------

            if (packet.indexOf("<spawn") === 0) {

                const xMatch = packet.match(/x=['"]([^'"]+)['"]/);
                const yMatch = packet.match(/y=['"]([^'"]+)['"]/);

                if (xMatch) {
                    player.x = Number(xMatch[1]);
                }

                if (yMatch) {
                    player.y = Number(yMatch[1]);
                }

                broadcast(
                    `<spawn id='${player.id}' x='${player.x}' y='${player.y}' />`,
                    socket
                );
            }

            // ----------------------------------------
            // MOVE
            // ----------------------------------------

            else if (packet.indexOf("<move") === 0) {

                const xMatch = packet.match(/x=['"]([^'"]+)['"]/);
                const yMatch = packet.match(/y=['"]([^'"]+)['"]/);

                if (xMatch) {
                    player.x = Number(xMatch[1]);
                }

                if (yMatch) {
                    player.y = Number(yMatch[1]);
                }

                broadcast(
                    `<move id='${player.id}' x='${player.x}' y='${player.y}' />`,
                    socket
                );
            }
        }
    });


    socket.on("close", () => {

        console.log("Player disconnected:", id);

        clients.delete(socket);

        broadcast(
            `<leave id='${id}' />`
        );
    });


    socket.on("error", (err) => {
        console.log("Socket error:", err.message);
    });

});


server.listen(port, () => {
    console.log(
        "Raw TCP Socket server listening on port " + port
    );
});
