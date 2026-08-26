// Ce petit serveur tourne EN LOCAL sur le PC branché à l'imprimante Xprinter.
// Le frontend (navigateur) ne peut pas parler USB/ESC-POS directement : il envoie
// le texte du reçu ici en HTTP, et ce bridge se charge de l'impression physique.
//
// Installation : cd print-bridge && npm install && npm start
// Brancher la Xprinter en USB avant de lancer.

const express = require("express");
const escpos = require("escpos");
escpos.USB = require("escpos-usb");

const app = express();
app.use(express.text({ type: "*/*" }));

app.post("/print", (req, res) => {
  const text = req.body;

  try {
    const device = new escpos.USB();
    const printer = new escpos.Printer(device);

    device.open(() => {
      printer
        .align("ct")
        .text(text)
        .cut()
        .close();
    });

    res.json({ printed: true });
  } catch (err) {
    console.error("Erreur impression :", err.message);
    res.status(500).json({ error: "Impression impossible - imprimante non détectée ?" });
  }
});

const PORT = 9100;
app.listen(PORT, () => {
  console.log(`Print bridge en écoute sur http://localhost:${PORT}`);
});
