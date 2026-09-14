const { createServer } = require('http');
const WebSocket = require('server'); // or 'ws'
const express = require('express');

const app = express();
const server = createServer(app);
const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({ server, path: '/ws' });

let players = {};

wss.on('connection', (ws) => {
    let playerId = Math.random().toString(36.substring(7));
    
    ws.on('message', (message) => {
        let data = JSON.parse(message);
        // Broadcast player position to everyone else
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ id: playerId, x: data.x, y: data.y }));
            }
        });
    });

    ws.on('close', () => {
        delete players[playerId];
    });
});

server.listen(process.env.PORT || 10000, () => {
    console.log('Server started on port ' + (process.env.PORT || 10000));
});
