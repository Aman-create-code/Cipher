import { useEffect, useState } from "react";
import "./App.css";


const BACKEND =
  "wss://cipher-khfp.onrender.com";



function createID() {

  let id = localStorage.getItem("cipher_id");

  if(id) return id;


  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";


  id = "";

  for(let i=0;i<32;i++){

    id += chars[
      Math.floor(
        Math.random()*chars.length
      )
    ];

  }


  localStorage.setItem(
    "cipher_id",
    id
  );


  return id;

}



// ---------- IndexedDB ----------


function openDB(){

  return new Promise<IDBDatabase>((resolve)=>{

    const request =
      indexedDB.open(
        "CipherDB",
        1
      );


    request.onupgradeneeded =
    ()=>{

      request.result.createObjectStore(
        "messages",
        {
          autoIncrement:true
        }
      );

    };


    request.onsuccess =
    ()=>{

      resolve(
        request.result
      );

    };


  });

}



async function saveMessage(
  message:string
){

  const db =
    await openDB();


  const tx =
    db.transaction(
      "messages",
      "readwrite"
    );


  tx.objectStore(
    "messages"
  ).add({

    message,

    time:
    Date.now()

  });

}



// ---------- Crypto ----------


async function getKey(){

  const password =
    "cipher-local-key";


  const hash =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder()
      .encode(password)
    );


  return crypto.subtle.importKey(
    "raw",
    hash,
    {
      name:"AES-GCM"
    },
    false,
    [
      "encrypt",
      "decrypt"
    ]
  );

}



async function encrypt(
  text:string
){

  const key =
    await getKey();


  const iv =
    crypto.getRandomValues(
      new Uint8Array(12)
    );


  const encrypted =
    await crypto.subtle.encrypt(
      {
        name:"AES-GCM",
        iv
      },
      key,
      new TextEncoder()
      .encode(text)
    );


  return {

    data:
    btoa(
      String.fromCharCode(
        ...new Uint8Array(encrypted)
      )
    ),


    iv:
    btoa(
      String.fromCharCode(
        ...iv
      )
    )

  };

}



async function decrypt(
 data:string,
 iv:string
){

  const key =
    await getKey();


  const decrypted =
    await crypto.subtle.decrypt(
      {
        name:"AES-GCM",
        iv:
        Uint8Array.from(
          atob(iv),
          c=>c.charCodeAt(0)
        )
      },
      key,
      Uint8Array.from(
        atob(data),
        c=>c.charCodeAt(0)
      )
    );


  return new TextDecoder()
  .decode(decrypted);

}





function App(){


const [id] =
useState(createID());


const [ws,setWS] =
useState<WebSocket|null>(null);


const [target,setTarget] =
useState("");


const [text,setText] =
useState("");


const [messages,setMessages] =
useState<string[]>([]);




useEffect(()=>{


const socket =
new WebSocket(
BACKEND
);



socket.onopen = ()=>{


socket.send(JSON.stringify({

type:"register",

id

}));


console.log(
"verbunden"
);


};




socket.onmessage =
async(e)=>{


const data =
JSON.parse(e.data);



if(data.type==="message"){


const msg =
await decrypt(
data.encrypted,
data.iv
);



setMessages(old=>[
...old,
msg
]);



await saveMessage(
msg
);


}


};



setWS(socket);



return ()=>socket.close();



},[id]);






async function send(){


if(!ws) return;


const encrypted =
await encrypt(
text
);



ws.send(JSON.stringify({

type:"message",

to:target,


encrypted:
encrypted.data,


iv:
encrypted.iv


}));


setText("");

}





return (

<div className="container">


<h1>
Cipher
</h1>


<p>
Deine ID:
</p>


<div className="idbox">
{id}
</div>



<input

placeholder="Empfänger ID"

value={target}

onChange={
e=>setTarget(
e.target.value
)
}

/>



<input

placeholder="Nachricht"

value={text}

onChange={
e=>setText(
e.target.value
)
}

/>



<button
onClick={send}
>
Senden
</button>



<h2>
Nachrichten
</h2>


{
messages.map(
(m,i)=>(

<p key={i}>
{m}
</p>

)
)
}



</div>

);


}


export default App;