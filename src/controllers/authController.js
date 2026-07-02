import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AUDIT_ACTIONS, createAuditLog, getRequestMetadata } from "../utils/auditLogger.js";
import { logger } from "../utils/logger.js";

const prisma = new PrismaClient();

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "8h" });
}

export async function login(req, res, next) {
  try {
    const { email, password, adminKey } = req.body;
    const requestMetadata = getRequestMetadata(req);

    if (adminKey) {
      if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
        logger.warn({ ip: requestMetadata.ipAddress }, "Login fallido con clave de administrador");
        await createAuditLog({
          ...requestMetadata,
          action: AUDIT_ACTIONS.LOGIN_FAILED,
          entity: "Auth",
          detail: "Clave de administrador incorrecta"
        });
        return res.status(401).json({ message: "Clave de administrador incorrecta." });
      }

      const token = signToken({ type: "admin-key", role: "admin" });
      await createAuditLog({
        ...requestMetadata,
        action: AUDIT_ACTIONS.LOGIN_SUCCESS,
        entity: "Auth",
        detail: "Login con clave de administrador"
      });
      return res.json({ token, admin: { name: "Administrador inicial", email: null, role: "admin" } });
    }

    if (!email || !password) {
      logger.warn({ ip: requestMetadata.ipAddress }, "Login fallido por datos incompletos");
      return res.status(400).json({ message: "Email y contraseña son obligatorios." });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      logger.warn({ email, ip: requestMetadata.ipAddress }, "Login fallido por usuario inexistente");
      await createAuditLog({
        ...requestMetadata,
        userEmail: email,
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        entity: "Auth",
        detail: "Credenciales incorrectas"
      });
      return res.status(401).json({ message: "Credenciales incorrectas." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      logger.warn({ userId: user.id, email: user.email, ip: requestMetadata.ipAddress }, "Login fallido por contraseña incorrecta");
      await createAuditLog({
        ...requestMetadata,
        userId: user.id,
        userEmail: user.email,
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        entity: "Auth",
        detail: "Credenciales incorrectas"
      });
      return res.status(401).json({ message: "Credenciales incorrectas." });
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    await createAuditLog({
      ...requestMetadata,
      userId: user.id,
      userEmail: user.email,
      action: AUDIT_ACTIONS.LOGIN_SUCCESS,
      entity: "Auth",
      detail: `Login exitoso: ${user.email}`
    });
    return res.json({
      token,
      admin: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return next(error);
  }
}
