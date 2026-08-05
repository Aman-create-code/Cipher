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

// Speichert: User-ID → WebSocket-Verbindung
const users = new Map();

wss.on("connection", (socket) => {
    console.log("Neuer Client verbunden");

    let userID = null;

    socket.on("message", (data) => {
        try {
            const message = JSON.parse(data.toString());

            // Benutzer registrieren
            if (message.type === "register") {
                userID = message.id;

                users.set(userID, socket);

                console.log("User registriert:", userID);
            }

            // Nachricht weiterleiten
            if (message.type === "message") {
                const receiver = users.get(message.to);

                if (receiver) {
                    receiver.send(JSON.stringify({
                        type: "message",
                        from: userID,
                        text: message.text
                    }));

                    console.log(
                        "Nachricht gesendet von",
                        userID,
                        "an",
                        message.to
                    );

                } else {
                    socket.send(JSON.stringify({
                        type: "error",
                        message: "Benutzer nicht online"
                    }));
                }
            }

        } catch (error) {
            console.log("Fehler:", error);
        }
    });


    socket.on("close", () => {
        if (userID) {
            users.delete(userID);
            console.log("User getrennt:", userID);
        }
    });
});


server.listen(3000, () => {
    console.log("Cipher Backend läuft auf Port 3000");
});