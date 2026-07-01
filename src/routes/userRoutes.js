const express = require("express");
const { createUser } = require("../controllers/userController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", requireAuth, createUser);

module.exports = router;
