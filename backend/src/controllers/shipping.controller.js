const prisma = require("../config/prisma");
const { cleanText, parseBoolean, toId } = require("../utils/helpers");
const { getFreeShippingConfig } = require("../utils/shipping");

const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const sendError = (res, error, fallback) => {
  if (error.status) {
    return res.status(error.status).json({ success: false, message: error.message });
  }
  console.error(fallback, error);
  return res.status(500).json({ success: false, message: fallback });
};

const readPrice = (value) => {
  const price = Number(value);
  if (value === undefined || value === "" || Number.isNaN(price) || price < 0 || price > 100000) {
    throw httpError(400, "Shipping price must be a number between 0 and 100000");
  }
  return Math.round(price * 100) / 100;
};

// ======================================
// PUBLIC: store configuration used by the cart / checkout
//   GET /api/store/config
// ======================================

const getStoreConfig = async (req, res) => {
  try {
    const zones = await prisma.shippingZone.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true, nameAr: true, nameEn: true, price: true },
    });

    const freeShipping = await getFreeShippingConfig();

    res.json({
      success: true,
      shipping: {
        zones,
        freeShippingThreshold: freeShipping.enabled ? freeShipping.threshold : 0,
        freeShippingEnabled: freeShipping.enabled,
      },
      auth: {
        // empty = Google sign-in is switched off (the button is hidden)
        googleClientId: process.env.GOOGLE_CLIENT_ID || "",
      },
      payment: {
        methods: ["CASH_ON_DELIVERY", "VODAFONE_CASH"],
        vodafoneCashNumber: process.env.VODAFONE_CASH_NUMBER || "01023603882",
      },
    });
  } catch (error) {
    sendError(res, error, "Failed to load store configuration");
  }
};

// ======================================
// ADMIN: manage shipping zones (governorates + prices)
// ======================================

const getZones = async (req, res) => {
  try {
    const zones = await prisma.shippingZone.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });
    const freeShipping = await getFreeShippingConfig();

    res.json({
      success: true,
      zones,
      freeShippingThreshold: freeShipping.enabled ? freeShipping.threshold : 0,
      freeShippingEnabled: freeShipping.enabled,
    });
  } catch (error) {
    sendError(res, error, "Failed to fetch shipping zones");
  }
};

const createZone = async (req, res) => {
  try {
    const nameAr = cleanText(req.body.nameAr, 191);
    const nameEn = cleanText(req.body.nameEn, 191) || nameAr;

    if (!nameAr) throw httpError(400, "Arabic name is required");

    const price = readPrice(req.body.price);

    const duplicate = await prisma.shippingZone.findFirst({
      where: { OR: [{ nameAr }, { nameEn }] },
    });
    if (duplicate) throw httpError(409, "This governorate already exists");

    const last = await prisma.shippingZone.aggregate({ _max: { sortOrder: true } });

    const zone = await prisma.shippingZone.create({
      data: {
        nameAr,
        nameEn,
        price,
        isActive: parseBoolean(req.body.isActive, true),
        sortOrder: (last._max.sortOrder || 0) + 1,
      },
    });

    res.status(201).json({ success: true, message: "Shipping zone created", zone });
  } catch (error) {
    sendError(res, error, "Failed to create shipping zone");
  }
};

const updateZone = async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) throw httpError(400, "Invalid shipping zone ID");

    const existing = await prisma.shippingZone.findUnique({ where: { id } });
    if (!existing) throw httpError(404, "Shipping zone not found");

    const data = {};

    if (req.body.nameAr !== undefined) {
      data.nameAr = cleanText(req.body.nameAr, 191);
      if (!data.nameAr) throw httpError(400, "Arabic name is required");
    }
    if (req.body.nameEn !== undefined) {
      data.nameEn = cleanText(req.body.nameEn, 191) || data.nameAr || existing.nameAr;
    }
    if (req.body.price !== undefined) data.price = readPrice(req.body.price);
    if (req.body.isActive !== undefined) data.isActive = parseBoolean(req.body.isActive, true);

    if (data.nameAr || data.nameEn) {
      const duplicate = await prisma.shippingZone.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(data.nameAr ? [{ nameAr: data.nameAr }] : []),
            ...(data.nameEn ? [{ nameEn: data.nameEn }] : []),
          ],
        },
      });
      if (duplicate) throw httpError(409, "This governorate already exists");
    }

    const zone = await prisma.shippingZone.update({ where: { id }, data });

    res.json({ success: true, message: "Shipping zone updated", zone });
  } catch (error) {
    sendError(res, error, "Failed to update shipping zone");
  }
};

// Old orders keep their own copy of the governorate name and price, so a zone
// can always be deleted safely.
const deleteZone = async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) throw httpError(400, "Invalid shipping zone ID");

    const existing = await prisma.shippingZone.findUnique({ where: { id } });
    if (!existing) throw httpError(404, "Shipping zone not found");

    await prisma.shippingZone.delete({ where: { id } });

    res.json({ success: true, message: "Shipping zone deleted" });
  } catch (error) {
    sendError(res, error, "Failed to delete shipping zone");
  }
};

const updateFreeShipping = async (req, res) => {
  try {
    const enabled = req.body.enabled === true || req.body.enabled === "true";
    const threshold = Number(req.body.threshold);
    if (enabled && (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1000000)) {
      throw httpError(400, "Free shipping threshold must be greater than 0");
    }

    const setting = await prisma.storeSetting.upsert({
      where: { id: 1 },
      create: { id: 1, freeShippingEnabled: enabled, freeShippingThreshold: enabled ? threshold : 0 },
      update: { freeShippingEnabled: enabled, freeShippingThreshold: enabled ? threshold : 0 },
    });

    res.json({
      success: true,
      message: enabled ? "Free shipping settings updated" : "Free shipping disabled",
      freeShippingEnabled: setting.freeShippingEnabled,
      freeShippingThreshold: Number(setting.freeShippingThreshold),
    });
  } catch (error) {
    sendError(res, error, "Failed to update free shipping settings");
  }
};

module.exports = { getStoreConfig, getZones, createZone, updateZone, deleteZone, updateFreeShipping };
