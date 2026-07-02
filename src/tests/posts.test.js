import jwt from "jsonwebtoken";
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

const postRecord = {
  id: 1,
  title: "Node y React",
  slug: "node-y-react",
  excerpt: "Post de prueba",
  content: "Contenido sobre API con Node",
  cover_image_url: "https://example.com/cover.jpg",
  published: true,
  created_at: new Date("2026-07-01T12:00:00Z").toISOString(),
  updated_at: new Date("2026-07-01T12:00:00Z").toISOString(),
  author: { id: 1, name: "Rodrigo Herrainz", email: "rodrigo@example.com", role: "admin" },
  category: { id: 1, name: "Backend", slug: "backend", description: null },
  tags: [{ tag: { id: 1, name: "API", slug: "api" } }]
};

function adminToken() {
  return jwt.sign({ userId: 1, email: "rodrigo@example.com", role: "admin" }, "test-secret");
}

describe("post endpoints", () => {
  beforeEach(() => {
    resetPrismaMock();
  });

  it("returns public posts from GET /api/posts", async () => {
    prismaMock.post.findMany.mockResolvedValue([postRecord]);

    const response = await request(app).get("/api/posts").expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].tags).toEqual([{ id: 1, name: "API", slug: "api" }]);
    expect(prismaMock.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ published: true }) })
    );
  });

  it("returns a public post by slug from GET /api/posts/:slug", async () => {
    prismaMock.post.findFirst.mockResolvedValue(postRecord);

    const response = await request(app).get("/api/posts/node-y-react").expect(200);

    expect(response.body.slug).toBe("node-y-react");
    expect(response.body.author.name).toBe("Rodrigo Herrainz");
    expect(response.body.category.slug).toBe("backend");
  });

  it("passes search, category, tag and author filters to Prisma", async () => {
    prismaMock.post.findMany.mockResolvedValue([]);

    await request(app)
      .get("/api/posts?search=node&category=backend&tag=api&author=rodrigo")
      .expect(200);

    const prismaCall = prismaMock.post.findMany.mock.calls[0][0];
    expect(prismaCall.where.published).toBe(true);
    expect(JSON.stringify(prismaCall.where)).toContain("node");
    expect(JSON.stringify(prismaCall.where)).toContain("backend");
    expect(JSON.stringify(prismaCall.where)).toContain("api");
    expect(JSON.stringify(prismaCall.where)).toContain("rodrigo");
  });

  it("creates a post with a valid JWT", async () => {
    prismaMock.tag.upsert.mockResolvedValue({ id: 1, name: "API", slug: "api" });
    prismaMock.post.create.mockResolvedValue({
      ...postRecord,
      tags: [{ tag: { id: 1, name: "API", slug: "api" } }]
    });

    const response = await request(app)
      .post("/api/admin/posts")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({
        title: "Node y React",
        excerpt: "Post de prueba",
        content: "Contenido",
        cover_image_url: "https://example.com/cover.jpg",
        author_id: 1,
        category_id: 1,
        published: true,
        tags: "api"
      })
      .expect(201);

    expect(response.body.title).toBe("Node y React");
    expect(prismaMock.tag.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "api" } })
    );
    expect(prismaMock.post.create).toHaveBeenCalled();
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 1,
          userEmail: "rodrigo@example.com",
          action: "POST_CREATED",
          entity: "Post",
          entityId: 1,
          detail: "Post creado: Node y React"
        })
      })
    );
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "POST_PUBLISHED",
          entity: "Post",
          entityId: 1,
          detail: "Post publicado: Node y React"
        })
      })
    );
  });
});
