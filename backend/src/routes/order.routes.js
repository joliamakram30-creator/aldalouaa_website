const express = require("express");

const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelMyOrder,
} = require("../controllers/order.controller");

const authMiddleware = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

const router = express.Router();

router.use(authMiddleware);

// "paymentProofImage" is required (validated in the controller) for
// Vodafone Cash and ignored for Cash on Delivery.
router.post("/", upload.single("paymentProofImage"), createOrder);

router.get("/my-orders", getMyOrders);
router.get("/:id", getOrderById);
router.put("/:id/cancel", cancelMyOrder);

module.exports = router;
