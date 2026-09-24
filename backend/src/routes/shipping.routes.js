const express = require("express");

const {
  getStoreConfig,
  getZones,
  createZone,
  updateZone,
  deleteZone,
  updateFreeShipping,
} = require("../controllers/shipping.controller");

const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");

// Public: GET /api/store/config
const storeRouter = express.Router();
storeRouter.get("/config", getStoreConfig);

// Admin: /api/admin/shipping
const adminRouter = express.Router();
adminRouter.use(authMiddleware, adminMiddleware);
adminRouter.get("/", getZones);
adminRouter.put("/free-shipping", updateFreeShipping);
adminRouter.post("/", createZone);
adminRouter.put("/:id", updateZone);
adminRouter.delete("/:id", deleteZone);

module.exports = { storeRouter, adminRouter };
