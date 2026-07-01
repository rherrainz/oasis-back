import express from "express";
import { createUser } from "../controllers/userController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", requireAuth, requireRole("admin"), createUser);

export default router;
