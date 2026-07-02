import { PrismaClient } from "@prisma/client";
import { logger } from "./logger.js";

const prisma = new PrismaClient();

export const AUDIT_ACTIONS = Object.freeze({
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILED: "LOGIN_FAILED",
  USER_CREATED: "USER_CREATED",
  POST_CREATED: "POST_CREATED",
  POST_UPDATED: "POST_UPDATED",
  POST_DELETED: "POST_DELETED",
  POST_PUBLISHED: "POST_PUBLISHED",
  POST_UNPUBLISHED: "POST_UNPUBLISHED",
  CATEGORY_CREATED: "CATEGORY_CREATED",
  CATEGORY_UPDATED: "CATEGORY_UPDATED",
  CATEGORY_DELETED: "CATEGORY_DELETED",
  IMAGE_UPLOADED: "IMAGE_UPLOADED"
});

export function getRequestMetadata(req) {
  return {
    ipAddress: req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || null,
    userAgent: req.get("user-agent") || null
  };
}

export function getAuditActor(req) {
  return {
    userId: req.admin?.userId || null,
    userEmail: req.admin?.email || null
  };
}

export async function createAuditLog({
  userId,
  userEmail,
  action,
  entity,
  entityId,
  detail,
  ipAddress,
  userAgent
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: userId || null,
        userEmail: userEmail || null,
        action,
        entity,
        entityId: entityId || null,
        detail: detail || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null
      }
    });
  } catch (error) {
    logger.error({ err: error, action, entity, entityId }, "No se pudo crear el registro de auditoría");
    return null;
  }
}

export async function auditFromRequest(req, event) {
  return createAuditLog({
    ...getAuditActor(req),
    ...getRequestMetadata(req),
    ...event
  });
}
