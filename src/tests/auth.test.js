import request from "supertest";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock, resetPrismaMock } from "./prismaMock.js";

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(function PrismaClient() {
    return prismaMock;
  })
}));

process.env.JWT_SECRET = "test-secret";
process.env.ADMIN_KEY = "admin-test-key";
process.env.FRONTEND_URL = "http://localhost:5173";

const { default: app } = await import("../app.js");

function adminToken() {
  return jwt.sign({ userId: 1, email: "admin@example.com", role: "admin" }, "test-secret");
}

describe("auth endpoints", () => {
  beforeEach(() => {
    resetPrismaMock();
  });

  it("logs in with ADMIN_KEY and returns a JWT", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ adminKey: "admin-test-key" })
      .expect(200);

    expect(response.body.token).toBeTruthy();
    expect(response.body.admin.role).toBe("admin");
  });

  it("blocks administrative routes without JWT", async () => {
    const response = await request(app).get("/api/admin/posts").expect(401);

    expect(response.body.message).toContain("Token");
  });

  it("returns audit logs to admin users", async () => {
    prismaMock.auditLog.findMany.mockResolvedValue([
      {
        id: 1,
        userId: 1,
        userEmail: "admin@example.com",
        action: "POST_CREATED",
        entity: "Post",
        entityId: 12,
        detail: "Post creado: Introducción a Node.js",
        ipAddress: "127.0.0.1",
        userAgent: "vitest",
        createdAt: new Date("2026-07-01T20:00:00.000Z").toISOString()
      }
    ]);

    const response = await request(app)
      .get("/api/admin/audit-logs?action=POST_CREATED")
      .set("Authorization", `Bearer ${adminToken()}`)
      .expect(200);

    expect(response.body[0].action).toBe("POST_CREATED");
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ action: "POST_CREATED" }),
        orderBy: { createdAt: "desc" },
        take: 200
      })
    );
  });
});
