import { PrismaClient } from "@prisma/client";
import cloudinary from "../config/cloudinary.js";
import { slugify } from "../utils/slugify.js";

const prisma = new PrismaClient();

function normalizePostInput(body) {
  const title = body.title?.trim();
  return {
    title,
    slug: body.slug ? slugify(body.slug) : slugify(title || ""),
    excerpt: body.excerpt?.trim(),
    content: body.content?.trim(),
    cover_image_url: body.cover_image_url?.trim(),
    author: body.author?.trim(),
    published: body.published === true || body.published === "true"
  };
}

function validatePostInput(data) {
  const requiredFields = ["title", "slug", "excerpt", "content", "cover_image_url", "author"];
  return requiredFields.filter((field) => !data[field]);
}

export async function listPublishedPosts(req, res, next) {
  try {
    const posts = await prisma.post.findMany({
      where: { published: true },
      orderBy: { created_at: "desc" }
    });
    return res.json(posts);
  } catch (error) {
    return next(error);
  }
}

export async function getPublishedPostBySlug(req, res, next) {
  try {
    const post = await prisma.post.findFirst({
      where: { slug: req.params.slug, published: true }
    });

    if (!post) {
      return res.status(404).json({ message: "Post no encontrado." });
    }

    return res.json(post);
  } catch (error) {
    return next(error);
  }
}

export async function listAllPosts(req, res, next) {
  try {
    const posts = await prisma.post.findMany({ orderBy: { created_at: "desc" } });
    return res.json(posts);
  } catch (error) {
    return next(error);
  }
}

export async function createPost(req, res, next) {
  try {
    const data = normalizePostInput(req.body);
    const missingFields = validatePostInput(data);

    if (missingFields.length > 0) {
      return res.status(400).json({ message: "Faltan campos obligatorios.", fields: missingFields });
    }

    const post = await prisma.post.create({ data });
    return res.status(201).json(post);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Ya existe un post con ese slug." });
    }

    return next(error);
  }
}

export async function updatePost(req, res, next) {
  try {
    const id = Number(req.params.id);
    const data = normalizePostInput(req.body);
    const missingFields = validatePostInput(data);

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    if (missingFields.length > 0) {
      return res.status(400).json({ message: "Faltan campos obligatorios.", fields: missingFields });
    }

    const post = await prisma.post.update({ where: { id }, data });
    return res.json(post);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Post no encontrado." });
    }

    if (error.code === "P2002") {
      return res.status(409).json({ message: "Ya existe un post con ese slug." });
    }

    return next(error);
  }
}

export async function deletePost(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    await prisma.post.delete({ where: { id } });
    return res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Post no encontrado." });
    }

    return next(error);
  }
}

export async function uploadCoverImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Archivo de imagen requerido." });
    }

    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "oasisjs-blogger",
      resource_type: "image"
    });

    return res.status(201).json({ url: result.secure_url });
  } catch (error) {
    return next(error);
  }
}
