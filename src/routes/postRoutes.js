import express from "express";
import {
  listPublishedPosts,
  getPublishedPostBySlug,
  listAllPosts,
  createPost,
  updatePost,
  deletePost,
  uploadCoverImage
} from "../controllers/postController.js";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from "../controllers/categoryController.js";
import { listAuthors, listTags } from "../controllers/taxonomyController.js";
import { listAuditLogs } from "../controllers/auditLogController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.get("/posts", listPublishedPosts);
router.get("/posts/:slug", getPublishedPostBySlug);
router.get("/categories", listCategories);
router.get("/tags", listTags);
router.get("/authors", listAuthors);
router.get("/admin/posts", requireAuth, listAllPosts);
router.post("/admin/posts", requireAuth, createPost);
router.put("/admin/posts/:id", requireAuth, updatePost);
router.delete("/admin/posts/:id", requireAuth, deletePost);
router.post("/admin/upload", requireAuth, upload.single("image"), uploadCoverImage);
router.get("/admin/categories", requireAuth, listCategories);
router.post("/admin/categories", requireAuth, requireRole("admin"), createCategory);
router.put("/admin/categories/:id", requireAuth, requireRole("admin"), updateCategory);
router.delete("/admin/categories/:id", requireAuth, requireRole("admin"), deleteCategory);
router.get("/admin/tags", requireAuth, listTags);
router.get("/admin/authors", requireAuth, listAuthors);
router.get("/admin/audit-logs", requireAuth, requireRole("admin"), listAuditLogs);

export default router;
