import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export async function createUser(req, res, next) {
  try {
    const { name, email, password, role = "author" } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Nombre, email y contraseña son obligatorios." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres." });
    }

    if (!["admin", "author"].includes(role)) {
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

    return res.status(201).json(user);
  } catch (error) {
    return next(error);
  }
}
