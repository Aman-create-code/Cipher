const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocketServer } = require("ws");
const { Pool } = require("pg");
require("dotenv").config();


const app = express();

app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {
    res.send("Cipher Backend läuft");
});


const server = http.createServer(app);



const db = new Pool({

    connectionString:
        process.env.DATABASE_URL,

    ssl: {
        rejectUnauthorized: false
    }

});



// Datenbank vorbereiten
async function setupDatabase() {

    try {

        await db.query(`

            CREATE TABLE IF NOT EXISTS users (

                id TEXT PRIMARY KEY,

                public_key TEXT NOT NULL,

                created_at TIMESTAMP DEFAULT NOW()

            );

        `);


        console.log(
            "Datenbank bereit"
        );


    } catch(error) {

        console.log(
            "Datenbank Fehler:",
            error.message
        );

    }

}


setupDatabase();



const wss = new WebSocketServer({

    server

});



// Online Nutzer
const onlineUsers = new Map();



wss.on("connection", (socket) => {


    console.log(
        "Client verbunden"
    );


    let userID = null;



    socket.on("message", async(raw) => {


        try {


            const data =
                JSON.parse(
                    raw.toString()
                );



            // Nutzer registrieren
            if(data.type === "register") {


                userID = data.id;


                onlineUsers.set(
                    userID,
                    socket
                );



                await db.query(

                    `
                    INSERT INTO users
                    (
                        id,
                        public_key
                    )

                    VALUES
                    (
                        $1,
                        $2
                    )

                    ON CONFLICT(id)

                    DO UPDATE SET
                    public_key = $2
                    `,

                    [
                        data.id,
                        data.publicKey
                    ]

                );



                console.log(
                    "User registriert:",
                    userID
                );


                return;

            }




            // Public Key holen
            if(data.type === "getKey") {


                const result =
                    await db.query(

                    `
                    SELECT public_key
                    FROM users
                    WHERE id = $1
                    `,

                    [
                        data.target
                    ]

                );



                if(result.rows.length > 0) {


                    socket.send(

                        JSON.stringify({

                            type:
                            "publicKey",


                            publicKey:
                            result.rows[0].public_key

                        })

                    );


                }


                return;

            }





            // Nachricht weiterleiten
            if(data.type === "message") {


                const receiver =
                    onlineUsers.get(
                        data.to
                    );



                if(receiver) {


                    receiver.send(

                        JSON.stringify({

                            type:
                            "message",


                            encrypted:
                            data.encrypted,


                            iv:
                            data.iv,


                            from:
                            userID

                        })

                    );


                    console.log(
                        "Nachricht weitergeleitet"
                    );


                } else {


                    socket.send(

                        JSON.stringify({

                            type:
                            "error",


                            message:
                            "Empfänger offline"

                        })

                    );


                }


                return;

            }



        } catch(error) {


            console.log(
                "Fehler:",
                error.message
            );


        }


    });




    socket.on("close", () => {


        if(userID) {


            onlineUsers.delete(
                userID
            );


            console.log(
                "Client getrennt:",
                userID
            );


        }


    });



});





const PORT =
    process.env.PORT || 3000;



server.listen(PORT, () => {


    console.log(
        "Cipher Backend läuft auf Port",
        PORT
    );


});