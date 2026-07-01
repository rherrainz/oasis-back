import request from "supertest";
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
});
