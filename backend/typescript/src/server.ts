import { HttpHandler } from './handler'; // Adjust the path as necessary

const port = 8089;
const hostname = "0.0.0.0";
const httpHandler = new HttpHandler(); // Create an instance of your HTTP handler

const server = Bun.serve({
    port: port,
    hostname: hostname,
    fetch(request, server) {
        // Use the HttpHandler instance to respond to HTTP requests
        return httpHandler.handleRequest(request);
    },
    websocket: {
        async message(ws, message) {
            console.log(`Received ${message}`);
            ws.send(`You said: ${message}`);
        },
    },
});

console.log(`Listening on ${hostname}:${port}`);