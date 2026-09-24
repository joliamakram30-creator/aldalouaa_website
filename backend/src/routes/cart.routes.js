const express = require("express");

const {
  getCart,
  addToCart,
  mergeCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} = require("../controllers/cart.controller");

const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

// All cart routes require login (guests keep their cart in the browser
// and it is merged into the account cart right after login).
router.use(authMiddleware);

router.get("/", getCart);
router.post("/", addToCart);
router.post("/merge", mergeCart);
router.put("/items/:itemId", updateCartItem);
router.delete("/items/:itemId", removeFromCart);
router.delete("/", clearCart);

module.exports = router;
