const express = require("express");
const { getDashboard } = require("../controllers/admin.dashboard.controller");
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");

const router = express.Router();

router.get("/", authMiddleware, adminMiddleware, getDashboard);

module.exports = router;
