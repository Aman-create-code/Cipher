import { useEffect, useState } from "react";
import "./App.css";

const SERVER = "wss://cipher-khfp.onrender.com";


let socket: WebSocket | null = null;

let myPrivateKey: CryptoKey | null = null;

const sharedKeys = new Map<string, CryptoKey>();


// ---------- ID ----------

function getID() {

  let id = localStorage.getItem("cipher_id");

  if (!id) {

    id = crypto.randomUUID();

    localStorage.setItem(
      "cipher_id",
      id
    );
  }

  return id;
}


// ---------- IndexedDB ----------

function saveLocal(message:string){

  const request =
    indexedDB.open(
      "CipherMessages",
      1
    );


  request.onupgradeneeded = ()=>{

    request.result.createObjectStore(
      "messages",
      {
        autoIncrement:true
      }
    );

  };


  request.onsuccess = ()=>{

    const db =
      request.result;


    db.transaction(
      "messages",
      "readwrite"
    )
    .objectStore(
      "messages"
    )
    .add({

      message,

      time:
      Date.now()

    });

  };

}



// ---------- Crypto ----------


async function createECDH(){

 return crypto.subtle.generateKey(

 {
   name:"ECDH",
   namedCurve:"P-256"
 },

 true,

 [
  "deriveKey"
 ]

 );

}



async function exportPublic(
key:CryptoKey
){

 const data =
 await crypto.subtle.exportKey(
  "spki",
  key
 );


 return btoa(
 String.fromCharCode(
 ...new Uint8Array(data)
 )
 );

}



async function importPublic(
key:string
){

 const data =
 Uint8Array.from(
 atob(key),
 c=>c.charCodeAt(0)
 );


 return crypto.subtle.importKey(

 "spki",

 data,

 {
  name:"ECDH",
  namedCurve:"P-256"
 },

 true,

 []

 );

}



async function createSharedKey(
privateKey:CryptoKey,
publicKey:CryptoKey
){

 return crypto.subtle.deriveKey(

 {
  name:"ECDH",
  public:publicKey
 },

 privateKey,

 {
  name:"AES-GCM",
  length:256
 },

 false,

 [
  "encrypt",
  "decrypt"
 ]

 );

}



async function encrypt(
key:CryptoKey,
text:string
){

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
key:CryptoKey,
data:string,
iv:string
){

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



// ---------- APP ----------


function App(){


const [id] =
useState(getID());


const [target,setTarget] =
useState("");


const [text,setText] =
useState("");


const [list,setList] =
useState<string[]>([]);



useEffect(()=>{


async function start(){


const keys =
await createECDH();


myPrivateKey =
keys.privateKey;


const publicKey =
await exportPublic(
keys.publicKey
);



socket =
new WebSocket(
SERVER
);



socket.onopen = ()=>{


socket!.send(JSON.stringify({

type:"register",

id,

publicKey

}));


};



socket.onmessage =
async(event)=>{


const data =
JSON.parse(
event.data
);



if(data.type==="publicKey"){


const contactPublic =
await importPublic(
data.publicKey
);



const shared =
await createSharedKey(
myPrivateKey!,
contactPublic
);



sharedKeys.set(
target,
shared
);


sendEncrypted();



}




if(data.type==="message"){



const key =
sharedKeys.get(
data.from
);



if(!key) return;



const msg =
await decrypt(
key,
data.encrypted,
data.iv
);



setList(
old=>[
...old,
msg
]
);



saveLocal(msg);



}


};



}


start();


},[]);



let waitingText="";



async function sendEncrypted(){


if(!socket) return;



const key =
sharedKeys.get(
target
);



if(!key) return;



const encrypted =
await encrypt(
key,
waitingText
);



socket.send(JSON.stringify({

type:"message",

to:target,

encrypted:
encrypted.data,

iv:
encrypted.iv

}));


waitingText="";


}




async function send(){


if(!socket) return;


waitingText=text;



const key =
sharedKeys.get(
target
);



if(key){

sendEncrypted();

}

else{


socket.send(JSON.stringify({

type:"getKey",

target

}));

}


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
e=>setTarget(e.target.value)
}

/>



<input

placeholder="Nachricht"

value={text}

onChange={
e=>setText(e.target.value)
}

/>



<button onClick={send}>
Senden
</button>



<h2>
Nachrichten
</h2>


{
list.map(
(m,i)=>
<p key={i}>
{m}
</p>
)
}



</div>

);


}


export default App;