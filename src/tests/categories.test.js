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
});
