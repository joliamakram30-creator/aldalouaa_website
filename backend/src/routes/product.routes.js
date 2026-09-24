const express = require("express");
const { getProducts, getProductById } = require("../controllers/product.controller");

const router = express.Router();

// Public, read-only. Creating / editing / deleting products is done by admins
// through /api/admin/products.
router.get("/", getProducts);
router.get("/:id", getProductById);

module.exports = router;
