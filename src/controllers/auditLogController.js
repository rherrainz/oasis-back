import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger.js";

const prisma = new PrismaClient();

function parseDate(value, endOfDay = false) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setUTCHours(23, 59, 59, 999);
  }

  return date;
}

export async function listAuditLogs(req, res, next) {
  try {
    const { action, entity, userEmail, from, to } = req.query;
    const where = {};

    if (action) where.action = String(action);
    if (entity) where.entity = String(entity);
    if (userEmail) where.userEmail = { contains: String(userEmail), mode: "insensitive" };

    const fromDate = parseDate(from);
    const toDate = parseDate(to, true);

    if (from && !fromDate) {
      return res.status(400).json({ message: "Fecha desde inválida." });
    }
    if (to && !toDate) {
      return res.status(400).json({ message: "Fecha hasta inválida." });
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200
    });

    return res.json(logs);
  } catch (error) {
    logger.error({ err: error }, "Error de base de datos al consultar auditoría");
    return next(error);
  }
}
