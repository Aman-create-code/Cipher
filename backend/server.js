const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocketServer } = require("ws");
const { Pool } = require("pg");
require("dotenv").config();


const app = express();

app.use(cors());
app.use(express.json());


app.get("/", (req,res)=>{
    res.send("Cipher Backend läuft");
});


const server = http.createServer(app);


const wss = new WebSocketServer({
    server
});


const db = new Pool({
    connectionString:
        process.env.DATABASE_URL,
    ssl:{
        rejectUnauthorized:false
    }
});


async function setup(){

    await db.query(`

    CREATE TABLE IF NOT EXISTS users(

        id TEXT PRIMARY KEY,

        public_key TEXT NOT NULL

    );

    `);

}


setup();


const onlineUsers = new Map();



wss.on("connection",(socket)=>{


let userID=null;



socket.on("message",async(raw)=>{


try{


const data =
JSON.parse(raw.toString());



if(data.type==="register"){


userID=data.id;


onlineUsers.set(
userID,
socket
);



await db.query(

`
INSERT INTO users(id,public_key)

VALUES($1,$2)

ON CONFLICT(id)

DO UPDATE SET public_key=$2
`,
[
data.id,
data.publicKey
]

);


console.log(
"User:",
userID
);


return;

}





if(data.type==="getKey"){


const result =
await db.query(

"SELECT public_key FROM users WHERE id=$1",

[data.target]

);



if(result.rows.length){


socket.send(JSON.stringify({

type:"publicKey",

publicKey:
result.rows[0].public_key

}));


}


return;

}





if(data.type==="message"){



const receiver =
onlineUsers.get(data.to);



if(receiver){


receiver.send(JSON.stringify({

type:"message",

encrypted:
data.encrypted,

iv:
data.iv,

from:userID

}));


}


}



}catch(e){

console.log(
e.message
);

}



});




socket.on("close",()=>{


if(userID){

onlineUsers.delete(
userID
);

}


});



});



const PORT =
process.env.PORT || 3000;


server.listen(PORT,()=>{

console.log(
"Cipher Backend läuft auf",
PORT
);

});