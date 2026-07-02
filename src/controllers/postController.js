import { PrismaClient } from "@prisma/client";
import cloudinary from "../config/cloudinary.js";
import { slugify } from "../utils/slugify.js";
import { AUDIT_ACTIONS, auditFromRequest } from "../utils/auditLogger.js";
import { logger } from "../utils/logger.js";

const prisma = new PrismaClient();

const postInclude = {
  author: { select: { id: true, name: true, email: true, role: true } },
  category: true,
  tags: { include: { tag: true } }
};

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeTags(value) {
  const source = Array.isArray(value) ? value : String(value || "").split(",");
  return [...new Set(source.map((item) => item.trim()).filter(Boolean))]
    .map((name) => ({ name, slug: slugify(name) }))
    .filter((tag) => tag.slug);
}

function normalizePostInput(body) {
  const title = body.title?.trim();
  return {
    title,
    slug: body.slug ? slugify(body.slug) : slugify(title || ""),
    excerpt: body.excerpt?.trim(),
    content: body.content?.trim(),
    cover_image_url: body.cover_image_url?.trim(),
    author_id: parseId(body.author_id ?? body.authorId),
    category_id: parseId(body.category_id ?? body.categoryId),
    published: body.published === true || body.published === "true",
    tags: normalizeTags(body.tags)
  };
}

function validatePostInput(data) {
  const requiredFields = ["title", "slug", "excerpt", "content", "cover_image_url", "author_id"];
  return requiredFields.filter((field) => !data[field]);
}

function serializePost(post) {
  return {
    ...post,
    tags: post.tags?.map((item) => item.tag) || []
  };
}

function buildPostWhere(query, publishedOnly = false) {
  const where = {};
  const and = [];
  const { search, category, tag, author, status } = query;

  if (publishedOnly) {
    where.published = true;
  } else if (status === "published") {
    where.published = true;
  } else if (status === "draft") {
    where.published = false;
  }

  if (category) {
    and.push({
      category: {
        is: {
          OR: [
            { slug: { equals: category } },
            { name: { contains: category, mode: "insensitive" } }
          ]
        }
      }
    });
  }

  if (tag) {
    and.push({
      tags: {
        some: {
          tag: {
            OR: [
              { slug: { equals: tag } },
              { name: { contains: tag, mode: "insensitive" } }
            ]
          }
        }
      }
    });
  }

  if (author) {
    and.push({
      author: {
        is: {
          OR: [
            { name: { contains: author, mode: "insensitive" } },
            { email: { contains: author, mode: "insensitive" } }
          ]
        }
      }
    });
  }

  if (search) {
    and.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { excerpt: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { author: { is: { name: { contains: search, mode: "insensitive" } } } },
        { category: { is: { name: { contains: search, mode: "insensitive" } } } },
        { tags: { some: { tag: { name: { contains: search, mode: "insensitive" } } } } }
      ]
    });
  }

  if (and.length > 0) {
    where.AND = and;
  }

  return where;
}

async function resolveTagConnections(tags) {
  const tagRecords = await Promise.all(
    tags.map((tag) =>
      prisma.tag.upsert({
        where: { slug: tag.slug },
        update: { name: tag.name },
        create: tag
      })
    )
  );

  return tagRecords.map((tag) => ({ tag: { connect: { id: tag.id } } }));
}

async function assertAuthorCanEditPost(admin, postId) {
  if (admin.role === "admin") return true;

  const post = await prisma.post.findUnique({ where: { id: postId }, select: { author_id: true } });
  return post?.author_id === admin.userId;
}

export async function listPublishedPosts(req, res, next) {
  try {
    const posts = await prisma.post.findMany({
      where: buildPostWhere(req.query, true),
      include: postInclude,
      orderBy: { created_at: "desc" }
    });
    return res.json(posts.map(serializePost));
  } catch (error) {
    return next(error);
  }
}

export async function getPublishedPostBySlug(req, res, next) {
  try {
    const post = await prisma.post.findFirst({
      where: { slug: req.params.slug, published: true },
      include: postInclude
    });

    if (!post) {
      return res.status(404).json({ message: "Post no encontrado." });
    }

    return res.json(serializePost(post));
  } catch (error) {
    return next(error);
  }
}

export async function listAllPosts(req, res, next) {
  try {
    const where = buildPostWhere(req.query, false);
    if (req.admin.role === "author") {
      where.author_id = req.admin.userId;
    }

    const posts = await prisma.post.findMany({
      where,
      include: postInclude,
      orderBy: { created_at: "desc" }
    });
    return res.json(posts.map(serializePost));
  } catch (error) {
    return next(error);
  }
}

export async function createPost(req, res, next) {
  try {
    const data = normalizePostInput(req.body);
    if (req.admin.role === "author") {
      data.author_id = req.admin.userId;
    }

    const missingFields = validatePostInput(data);

    if (missingFields.length > 0) {
      logger.warn({ fields: missingFields, admin: req.admin?.email }, "Fallo de validación al crear post");
      return res.status(400).json({ message: "Faltan campos obligatorios.", fields: missingFields });
    }

    const tagConnections = await resolveTagConnections(data.tags);
    const post = await prisma.post.create({
      data: {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        content: data.content,
        cover_image_url: data.cover_image_url,
        author_id: data.author_id,
        category_id: data.category_id,
        published: data.published,
        tags: { create: tagConnections }
      },
      include: postInclude
    });
    await auditFromRequest(req, {
      action: AUDIT_ACTIONS.POST_CREATED,
      entity: "Post",
      entityId: post.id,
      detail: `Post creado: ${post.title}`
    });
    if (post.published) {
      await auditFromRequest(req, {
        action: AUDIT_ACTIONS.POST_PUBLISHED,
        entity: "Post",
        entityId: post.id,
        detail: `Post publicado: ${post.title}`
      });
    }
    return res.status(201).json(serializePost(post));
  } catch (error) {
    if (error.code === "P2002") {
      logger.warn({ err: error, admin: req.admin?.email }, "Slug duplicado al crear post");
      return res.status(409).json({ message: "Ya existe un post con ese slug." });
    }

    if (error.code === "P2003") {
      logger.warn({ err: error, admin: req.admin?.email }, "Autor o categoría inválidos al crear post");
      return res.status(400).json({ message: "Autor o categoría inválidos." });
    }

    logger.error({ err: error }, "Error de base de datos al crear post");
    return next(error);
  }
}

export async function updatePost(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      logger.warn({ id: req.params.id, admin: req.admin?.email }, "ID inválido al actualizar post");
      return res.status(400).json({ message: "ID inválido." });
    }

    if (!(await assertAuthorCanEditPost(req.admin, id))) {
      return res.status(403).json({ message: "No podés editar posts de otros autores." });
    }

    const data = normalizePostInput(req.body);
    if (req.admin.role === "author") {
      data.author_id = req.admin.userId;
    }

    const missingFields = validatePostInput(data);
    if (missingFields.length > 0) {
      logger.warn({ fields: missingFields, postId: id, admin: req.admin?.email }, "Fallo de validación al actualizar post");
      return res.status(400).json({ message: "Faltan campos obligatorios.", fields: missingFields });
    }

    const previousPost = await prisma.post.findUnique({
      where: { id },
      select: { published: true, title: true }
    });
    const tagConnections = await resolveTagConnections(data.tags);
    const post = await prisma.post.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        content: data.content,
        cover_image_url: data.cover_image_url,
        author_id: data.author_id,
        category_id: data.category_id,
        published: data.published,
        tags: {
          deleteMany: {},
          create: tagConnections
        }
      },
      include: postInclude
    });
    await auditFromRequest(req, {
      action: AUDIT_ACTIONS.POST_UPDATED,
      entity: "Post",
      entityId: post.id,
      detail: `Post actualizado: ${post.title}`
    });
    if (previousPost && previousPost.published !== post.published) {
      await auditFromRequest(req, {
        action: post.published ? AUDIT_ACTIONS.POST_PUBLISHED : AUDIT_ACTIONS.POST_UNPUBLISHED,
        entity: "Post",
        entityId: post.id,
        detail: `${post.published ? "Post publicado" : "Post despublicado"}: ${post.title}`
      });
    }
    return res.json(serializePost(post));
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Post no encontrado." });
    }

    if (error.code === "P2002") {
      logger.warn({ err: error, postId: req.params.id, admin: req.admin?.email }, "Slug duplicado al actualizar post");
      return res.status(409).json({ message: "Ya existe un post con ese slug." });
    }

    if (error.code === "P2003") {
      logger.warn({ err: error, postId: req.params.id, admin: req.admin?.email }, "Autor o categoría inválidos al actualizar post");
      return res.status(400).json({ message: "Autor o categoría inválidos." });
    }

    logger.error({ err: error }, "Error de base de datos al actualizar post");
    return next(error);
  }
}

export async function deletePost(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      logger.warn({ id: req.params.id, admin: req.admin?.email }, "ID inválido al eliminar post");
      return res.status(400).json({ message: "ID inválido." });
    }

    if (!(await assertAuthorCanEditPost(req.admin, id))) {
      return res.status(403).json({ message: "No podés eliminar posts de otros autores." });
    }

    const post = await prisma.post.findUnique({ where: { id }, select: { title: true } });
    await prisma.post.delete({ where: { id } });
    await auditFromRequest(req, {
      action: AUDIT_ACTIONS.POST_DELETED,
      entity: "Post",
      entityId: id,
      detail: `Post eliminado: ${post?.title || id}`
    });
    return res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Post no encontrado." });
    }

    logger.error({ err: error }, "Error de base de datos al eliminar post");
    return next(error);
  }
}

export async function uploadCoverImage(req, res, next) {
  try {
    if (!req.file) {
      logger.warn({ admin: req.admin?.email }, "Fallo de validación al subir imagen");
      return res.status(400).json({ message: "Archivo de imagen requerido." });
    }

    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "oasisjs-blogger",
      resource_type: "image"
    });

    await auditFromRequest(req, {
      action: AUDIT_ACTIONS.IMAGE_UPLOADED,
      entity: "Image",
      detail: `Imagen subida: ${result.secure_url}`
    });
    return res.status(201).json({ url: result.secure_url });
  } catch (error) {
    logger.error({ err: error }, "Fallo al subir imagen a Cloudinary");
    return next(error);
  }
}
