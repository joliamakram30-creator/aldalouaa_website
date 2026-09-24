const express = require("express");

const {
  getFavorites,
  addToFavorites,
  mergeFavorites,
  removeFromFavorites,
  clearFavorites,
} = require("../controllers/favorite.controller");

const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getFavorites);
router.post("/", addToFavorites);
router.post("/merge", mergeFavorites);
router.delete("/:productId", removeFromFavorites);
router.delete("/", clearFavorites);

module.exports = router;
