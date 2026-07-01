import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "8h" });
}

export async function login(req, res, next) {
  try {
    const { email, password, adminKey } = req.body;

    if (adminKey) {
      if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({ message: "Clave de administrador incorrecta." });
      }

      const token = signToken({ type: "admin-key" });
      return res.json({ token, admin: { name: "Administrador inicial", email: null } });
    }

    if (!email || !password) {
      return res.status(400).json({ message: "Email y contraseña son obligatorios." });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Credenciales incorrectas." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Credenciales incorrectas." });
    }

    const token = signToken({ userId: user.id, email: user.email });
    return res.json({
      token,
      admin: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    return next(error);
  }
}
