const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentification requise" });
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { userId, establishmentId, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session invalide ou expirée" });
  }
}

// Restreint l'accès à certains rôles (ex: requireRole("ADMIN", "MANAGER"))
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Accès refusé pour ce rôle" });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
