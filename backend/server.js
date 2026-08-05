const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocketServer } = require("ws");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Cipher Backend läuft");
});

const server = http.createServer(app);

const wss = new WebSocketServer({
    server
});

wss.on("connection", (socket) => {
    console.log("Client verbunden");

    socket.on("message", (message) => {
        console.log("Nachricht:", message.toString());

        socket.send(
            "Server erhalten: " + message.toString()
        );
    });

    socket.on("close", () => {
        console.log("Client getrennt");
    });
});

server.listen(3000, () => {
    console.log("Cipher Backend läuft auf Port 3000");
});