const express = require("express");

const {
  getAllOrders,
  getAdminOrderById,
  updateOrderStatus,
  getOrderStats,
  verifyPayment,
} = require("../controllers/admin.order.controller");

const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");

const router = express.Router();

// All admin order routes require the ADMIN role.
router.use(authMiddleware, adminMiddleware);

router.get("/", getAllOrders);
router.get("/stats", getOrderStats);
router.get("/:id", getAdminOrderById);
router.put("/:id/status", updateOrderStatus);
router.put("/:id/payment/verify", verifyPayment);

module.exports = router;
