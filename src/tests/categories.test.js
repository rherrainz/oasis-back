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

describe("category endpoints", () => {
  beforeEach(() => {
    resetPrismaMock();
  });

  it("returns public categories", async () => {
    prismaMock.category.findMany.mockResolvedValue([
      { id: 1, name: "Backend", slug: "backend", description: "API" }
    ]);

    const response = await request(app).get("/api/categories").expect(200);

    expect(response.body[0].slug).toBe("backend");
  });

  it("creates an audit log when an admin creates a category", async () => {
    prismaMock.category.create.mockResolvedValue({
      id: 2,
      name: "Frontend",
      slug: "frontend",
      description: "UI"
    });

    const response = await request(app)
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ name: "Frontend", description: "UI" })
      .expect(201);

    expect(response.body.slug).toBe("frontend");
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 1,
          userEmail: "admin@example.com",
          action: "CATEGORY_CREATED",
          entity: "Category",
          entityId: 2,
          detail: "Categoría creada: Frontend"
        })
      })
    );
  });
});
