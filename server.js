const net = require('net');
const port = process.env.PORT || 10000;
let clients = [];

const server = net.createServer((socket) => {
    clients.push(socket);
    
    socket.on('data', (data) => {
        // Flash XMLSocket messages require a null terminator (\0) at the end
        clients.forEach((client) => {
            if (client !== socket) {
                client.write(data);
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
