const net = require('net');
const port = process.env.PORT || 10000;
let clients = [];

const server = net.createServer((socket) => {
    clients.push(socket);
    
    // Inside server.js connection handler
let clientId = Math.random().toString(36).substring(7);

socket.on('data', (data) => {
    // Parse or wrap the packet to include this client's unique ID
    let packet = `<move id='${clientId}' data='${data.toString().trim()}' />`;
    clients.forEach((client) => {
        if (client !== socket) {
            client.write(packet + "\0");
        }
    });
});
    
    socket.on('end', () => {
        clients = clients.filter(c => c !== socket);
    });
    
    socket.on('error', (err) => {
        console.log('Socket error: ' + err.message);
    });
});

server.listen(port, () => {
    console.log('Raw TCP Socket server listening on port ' + port);
});
