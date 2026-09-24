const prisma = require("../config/prisma");
const { toCents, fromCents } = require("./helpers");

const envFallback = () => {
  const raw = process.env.FREE_SHIPPING_THRESHOLD;
  if (raw === undefined || raw === "") return { enabled: true, threshold: 2000 };
  const value = Number(raw);
  return Number.isFinite(value) && value > 0
    ? { enabled: true, threshold: value }
    : { enabled: false, threshold: 0 };
};

const getFreeShippingConfig = async () => {
  const setting = await prisma.storeSetting.findUnique({ where: { id: 1 } });
  if (!setting) return envFallback();
  return {
    enabled: Boolean(setting.freeShippingEnabled),
    threshold: Number(setting.freeShippingThreshold || 0),
  };
};

const calculateShipping = async (zone, subtotal) => {
  const config = await getFreeShippingConfig();
  if (config.enabled && config.threshold > 0 && toCents(subtotal) >= toCents(config.threshold)) return 0;
  return fromCents(toCents(zone.price));
};

module.exports = { calculateShipping, getFreeShippingConfig };
