import jwt from "jsonwebtoken";
import { logger } from "../utils/logger.js";

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logger.warn({ path: req.originalUrl, ip: req.ip }, "Token de autorización requerido");
    return res.status(401).json({ message: "Token de autorización requerido." });
  }

  const token = authHeader.split(" ")[1];

  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (error) {
    logger.warn({ err: error, path: req.originalUrl, ip: req.ip }, "Token inválido o expirado");
    return res.status(401).json({ message: "Token inválido o expirado." });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      logger.warn(
        { path: req.originalUrl, role: req.admin?.role, requiredRoles: roles, ip: req.ip },
        "Acceso rechazado por rol insuficiente"
      );
      return res.status(403).json({ message: "No tenés permisos para realizar esta acción." });
    }

    return next();
  };
}
