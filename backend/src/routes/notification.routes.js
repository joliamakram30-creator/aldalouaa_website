const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const { getNotifications, markAllRead, markRead } = require("../controllers/notification.controller");

const router = express.Router();
router.use(authMiddleware, adminMiddleware);
router.get("/", getNotifications);
router.put("/read-all", markAllRead);
router.put("/:id/read", markRead);
module.exports = router;
