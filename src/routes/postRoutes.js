const express = require("express");
const {
  listPublishedPosts,
  getPublishedPostBySlug,
  listAllPosts,
  createPost,
  updatePost,
  deletePost,
  uploadCoverImage
} = require("../controllers/postController");
const { requireAuth } = require("../middleware/authMiddleware");
const { upload } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.get("/posts", listPublishedPosts);
router.get("/posts/:slug", getPublishedPostBySlug);
router.get("/admin/posts", requireAuth, listAllPosts);
router.post("/admin/posts", requireAuth, createPost);
router.put("/admin/posts/:id", requireAuth, updatePost);
router.delete("/admin/posts/:id", requireAuth, deletePost);
router.post("/admin/upload", requireAuth, upload.single("image"), uploadCoverImage);

module.exports = router;
