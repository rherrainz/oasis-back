import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { AUDIT_ACTIONS, auditFromRequest } from "../utils/auditLogger.js";
import { logger } from "../utils/logger.js";

const prisma = new PrismaClient();

export async function createUser(req, res, next) {
  try {
    const { name, email, password, role = "author" } = req.body;

    if (!name || !email || !password) {
      logger.warn({ admin: req.admin?.email, email }, "Fallo de validación al crear usuario");
      return res.status(400).json({ message: "Nombre, email y contraseña son obligatorios." });
    }

    if (password.length < 6) {
      logger.warn({ admin: req.admin?.email, email }, "Fallo de validación por contraseña corta");
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres." });
    }

    if (!["admin", "author"].includes(role)) {
      logger.warn({ admin: req.admin?.email, email, role }, "Fallo de validación por rol inválido");
      return res.status(400).json({ message: "Rol inválido." });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: "Ya existe un usuario con ese email." });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password_hash, role },
      select: { id: true, name: true, email: true, role: true, created_at: true }
    });

    await auditFromRequest(req, {
      action: AUDIT_ACTIONS.USER_CREATED,
      entity: "User",
      entityId: user.id,
      detail: `Usuario creado: ${user.email}`
    });

    return res.status(201).json(user);
  } catch (error) {
    logger.error({ err: error }, "Error de base de datos al crear usuario");
    return next(error);
  }
}
