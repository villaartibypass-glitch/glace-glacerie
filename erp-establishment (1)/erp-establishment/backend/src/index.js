require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const posRoutes = require("./routes/pos");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/pos", posRoutes);

// Sert l'application React construite (frontend/dist) : un seul processus,
// un seul port, accessible depuis un simple navigateur sur ce PC.
const frontendDist = path.join(__dirname, "..", "..", "frontend", "dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Erreur serveur" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`ERP disponible sur http://localhost:${PORT}`);
});
