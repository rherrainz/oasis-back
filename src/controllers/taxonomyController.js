import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function listTags(req, res, next) {
  try {
    const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
    return res.json(tags);
  } catch (error) {
    return next(error);
  }
}

export async function listAuthors(req, res, next) {
  try {
    const authors = await prisma.user.findMany({
      where: { role: { in: ["admin", "author"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true }
    });
    return res.json(authors);
  } catch (error) {
    return next(error);
  }
}
