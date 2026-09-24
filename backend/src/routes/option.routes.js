const express = require("express");

const {
  getSizes,
  createSize,
  updateSize,
  deleteSize,
  getColors,
  createColor,
  updateColor,
  deleteColor,
  getScents,
  createScent,
  updateScent,
  deleteScent,
} = require("../controllers/option.controller");

const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

// Sizes
router.get("/sizes", getSizes);
router.post("/sizes", createSize);
router.put("/sizes/:id", updateSize);
router.delete("/sizes/:id", deleteSize);

// Colors
router.get("/colors", getColors);
router.post("/colors", createColor);
router.put("/colors/:id", updateColor);
router.delete("/colors/:id", deleteColor);

// Scents
router.get("/scents", getScents);
router.post("/scents", createScent);
router.put("/scents/:id", updateScent);
router.delete("/scents/:id", deleteScent);
module.exports = router;
