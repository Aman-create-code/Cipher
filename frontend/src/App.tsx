import { useState } from "react";
import "./App.css";

function generateID() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";

  for (let i = 0; i < 32; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }

  return id;
}

function App() {
  const [myID] = useState(generateID());
  const [addID, setAddID] = useState("");
  const [contacts, setContacts] = useState<string[]>([]);

  function addContact() {
    if (addID.trim() !== "") {
      setContacts([...contacts, addID]);
      setAddID("");
    }
  }

  function copyID() {
    navigator.clipboard.writeText(myID);
  }

  return (
    <div className="container">

      <h1>Cipher</h1>
      <p className="subtitle">
        Private Nachrichten ohne Account
      </p>

      <section className="card">
        <h2>Deine ID</h2>

        <div className="idbox">
          {myID}
        </div>

        <button onClick={copyID}>
          ID kopieren
        </button>
      </section>


      <section className="card">
        <h2>Person hinzufügen</h2>

        <input
          placeholder="ID eingeben..."
          value={addID}
          onChange={(e) => setAddID(e.target.value)}
        />

        <button onClick={addContact}>
          Hinzufügen
        </button>

      </section>


      <section className="card">
        <h2>Kontakte</h2>

        {contacts.length === 0 ? (
          <p>Keine Kontakte</p>
        ) : (
          contacts.map((contact, index) => (
            <div className="contact" key={index}>
              {contact}
            </div>
          ))
        )}

      </section>

    </div>
  );
}

export default App;