import { PrismaClient } from "@prisma/client";
import { slugify } from "../utils/slugify.js";

const prisma = new PrismaClient();

function normalizeCategory(body) {
  const name = body.name?.trim();
  return {
    name,
    slug: body.slug ? slugify(body.slug) : slugify(name || ""),
    description: body.description?.trim() || null
  };
}

export async function listCategories(req, res, next) {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    return res.json(categories);
  } catch (error) {
    return next(error);
  }
}

export async function createCategory(req, res, next) {
  try {
    const data = normalizeCategory(req.body);
    if (!data.name || !data.slug) {
      return res.status(400).json({ message: "Nombre de categoría obligatorio." });
    }

    const category = await prisma.category.create({ data });
    return res.status(201).json(category);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Ya existe una categoría con ese slug." });
    }
    return next(error);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const id = Number(req.params.id);
    const data = normalizeCategory(req.body);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }
    if (!data.name || !data.slug) {
      return res.status(400).json({ message: "Nombre de categoría obligatorio." });
    }

    const category = await prisma.category.update({ where: { id }, data });
    return res.json(category);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Categoría no encontrada." });
    }
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Ya existe una categoría con ese slug." });
    }
    return next(error);
  }
}

export async function deleteCategory(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    await prisma.post.updateMany({ where: { category_id: id }, data: { category_id: null } });
    await prisma.category.delete({ where: { id } });
    return res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Categoría no encontrada." });
    }
    return next(error);
  }
}
