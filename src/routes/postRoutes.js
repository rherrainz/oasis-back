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
import { requireAuth } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.get("/posts", listPublishedPosts);
router.get("/posts/:slug", getPublishedPostBySlug);
router.get("/admin/posts", requireAuth, listAllPosts);
router.post("/admin/posts", requireAuth, createPost);
router.put("/admin/posts/:id", requireAuth, updatePost);
router.delete("/admin/posts/:id", requireAuth, deletePost);
router.post("/admin/upload", requireAuth, upload.single("image"), uploadCoverImage);

export default router;
