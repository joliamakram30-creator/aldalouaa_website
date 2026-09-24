const crypto = require("crypto");

// ======================================
// generateOrderNumber
// ======================================
// Human-friendly, customer-facing order reference, separate from the
// internal auto-increment `id`. Format: ORD-YYYYMMDD-XXXXXX
//
// Collisions are extremely unlikely (1 in 900,000 per day) but not
// impossible, so callers that persist this value behind a UNIQUE
// constraint should catch Prisma's P2002 and retry with a fresh number
// (see order.controller.js createOrder).
// ======================================

const generateOrderNumber = () => {
  const now = new Date();

  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");

  const randomPart = crypto.randomInt(100000, 999999);

  return `ORD-${datePart}-${randomPart}`;
};

module.exports = { generateOrderNumber };
