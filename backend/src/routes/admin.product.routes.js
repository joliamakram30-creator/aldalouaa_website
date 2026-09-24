const express = require("express");

const {
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
  toggleFeaturedStatus,
} = require("../controllers/admin.product.controller");

const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const upload = require("../middleware/upload.middleware");

const router = express.Router();

// Every route here needs a logged-in ADMIN.
router.use(authMiddleware, adminMiddleware);

router.get("/", getAdminProducts);

// "images" = one or many image files (up to 10, the first one is the cover)
router.post("/", upload.array("images", 10), createProduct);
router.put("/:id", upload.array("images", 10), updateProduct);

router.delete("/:id", deleteProduct);
router.put("/:id/status", toggleProductStatus);
router.put("/:id/featured", toggleFeaturedStatus);

module.exports = router;
