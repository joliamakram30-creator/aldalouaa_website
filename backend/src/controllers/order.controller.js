const prisma = require("../config/prisma");
const { uploadImage, deleteImage } = require("../services/storage");
const { calculateShipping } = require("../utils/shipping");
const { generateOrderNumber } = require("../utils/orderNumber");
const { releaseOrderStock } = require("../utils/stock");
const {
  normalizeEgyptPhone,
  cleanText,
  toCents,
  fromCents,
  toId,
} = require("../utils/helpers");

// Card (Visa / Mastercard) payment has been removed completely.
const ALLOWED_PAYMENT_METHODS = ["CASH_ON_DELIVERY", "VODAFONE_CASH"];

// Payment.status an order starts with:
// - CASH_ON_DELIVERY: nothing is paid yet -> UNPAID (becomes PAID on delivery)
// - VODAFONE_CASH: customer already sent proof -> waiting for admin review
const getInitialPaymentStatus = (method) =>
  method === "VODAFONE_CASH" ? "PENDING_VERIFICATION" : "UNPAID";

const orderItemProduct = {
  select: { id: true, name: true, nameAr: true, image: true },
};

const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

// ======================================
// CREATE ORDER / CHECKOUT
// ======================================
// The frontend NEVER sends prices or totals. Subtotal, shipping and total are
// computed here from the cart, the product prices and the governorate's
// shipping price that are stored in the database.
// ======================================

const createOrder = async (req, res) => {
  let proofUpload = null;

  try {
    const userId = req.user.userId;

    const customerName = cleanText(req.body.customerName, 100);
    const address = cleanText(req.body.address, 500);
    const customerPhone = normalizeEgyptPhone(req.body.customerPhone);
    const paymentMethod = req.body.paymentMethod;
    const zoneId = toId(req.body.governorateId);

    if (customerName.length < 2) throw httpError(400, "Please enter your full name");
    if (!customerPhone) throw httpError(400, "Please enter a valid Egyptian mobile number (01XXXXXXXXX)");
    if (address.length < 8) throw httpError(400, "Please enter your full delivery address");
    if (!zoneId) throw httpError(400, "Please select your governorate");

    if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
      throw httpError(400, "Invalid or missing payment method");
    }

    const zone = await prisma.shippingZone.findUnique({ where: { id: zoneId } });
    if (!zone || !zone.isActive) {
      throw httpError(400, "Delivery is not available to the selected governorate");
    }

    // ---- Vodafone Cash needs proof up front ----
    let senderPhone = null;
    let transactionId = null;

    if (paymentMethod === "VODAFONE_CASH") {
      senderPhone = normalizeEgyptPhone(req.body.senderPhone);
      transactionId = cleanText(req.body.transactionId, 64);

      if (!senderPhone) throw httpError(400, "Please enter the Vodafone Cash number you paid from");
      if (transactionId.length < 4) throw httpError(400, "Please enter the transaction ID");
      if (!req.file) throw httpError(400, "Payment proof screenshot is required for Vodafone Cash");
    }

    // ---- cart ----
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                sizes: { include: { size: true } },
                colors: { include: { color: true } },
                scents: { include: { scent: true } },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw httpError(400, "Your cart is empty");
    }

    // ---- validate products, options and stock (the DB is the source of truth) ----
    for (const item of cart.items) {
      const product = item.product;

      if (!product || !product.isActive) {
        throw httpError(400, `${product?.nameAr || product?.name || "A product"} is no longer available`);
      }

      if (item.quantity > product.stock) {
        throw httpError(400, `Not enough stock for ${product.nameAr || product.name}`);
      }

      const sizeNames = product.sizes.map((entry) => entry.size.name);
      const colorNames = product.colors.map((entry) => entry.color.name);
      const scentNames = product.scents.map((entry) => entry.scent.name);

      if (
        (sizeNames.length > 0 && !sizeNames.includes(item.size)) ||
        (colorNames.length > 0 && !colorNames.includes(item.color)) ||
        (scentNames.length > 0 && !scentNames.includes(item.scent))
      ) {
        throw httpError(
          400,
          `Please choose the size/color/scent again for ${product.nameAr || product.name}`
        );
      }
    }

    // ---- prices ----
    const subtotalCents = cart.items.reduce(
      (total, item) => total + toCents(item.product.price) * item.quantity,
      0
    );
    const subtotal = fromCents(subtotalCents);
    const shippingCost = await calculateShipping(zone, subtotal);
    const totalAmount = fromCents(subtotalCents + toCents(shippingCost));

    // ---- payment proof upload (outside the DB transaction: external call) ----
    if (paymentMethod === "VODAFONE_CASH") {
      proofUpload = await uploadImage(req.file, "proofs");
    }

    // ---- order + payment + stock + clear cart, atomically ----
    // orderNumber is random; on the (very rare) unique collision we retry.
    let order = null;
    let attemptsLeft = 3;

    while (attemptsLeft > 0) {
      const orderNumber = generateOrderNumber();

      try {
        order = await prisma.$transaction(async (tx) => {
          const newOrder = await tx.order.create({
            data: {
              orderNumber,
              subtotal,
              shippingCost,
              totalAmount,
              customerName,
              customerPhone,
              address,
              city: zone.nameAr,
              userId,

              items: {
                create: cart.items.map((item) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  price: item.product.price,
                  productName: item.product.name,
                  size: item.size || null,
                  color: item.color || null,
                  scent: item.scent || null,
                })),
              },

              payment: {
                create: {
                  method: paymentMethod,
                  status: getInitialPaymentStatus(paymentMethod),
                  senderPhone,
                  transactionId,
                  proofImage: proofUpload?.url || null,
                },
              },
            },
          });

          // Re-check stock atomically and decrement it.
          for (const item of cart.items) {
            const updated = await tx.product.updateMany({
              where: { id: item.productId, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } },
            });

            if (updated.count === 0) {
              throw httpError(400, `Not enough stock for ${item.product.nameAr || item.product.name}`);
            }
          }

          await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

          // Notifications are intentionally NOT written inside this transaction.
          // A notification/table problem must never roll back a successful customer order.

          return tx.order.findUnique({
            where: { id: newOrder.id },
            include: {
              items: { include: { product: orderItemProduct } },
              payment: true,
            },
          });
        });

        break;
      } catch (txError) {
        const isOrderNumberCollision =
          txError.code === "P2002" &&
          JSON.stringify(txError.meta || {}).includes("orderNumber");

        attemptsLeft -= 1;

        if (!isOrderNumberCollision || attemptsLeft === 0) {
          throw txError;
        }
      }
    }

    // Best-effort admin notification AFTER the order is committed.
    // Checkout remains successful even if the notification subsystem is unavailable.
    try {
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true },
      });

      if (admins.length) {
        await prisma.notification.createMany({
          data: admins.map((admin) => ({
            adminId: admin.id,
            type: "ORDER",
            title: "New order",
            message: `New order ${order.orderNumber} from ${customerName} — ${totalAmount} EGP`,
            link: `/admin/orders?search=${encodeURIComponent(order.orderNumber)}`,
          })),
        });
      }
    } catch (notificationError) {
      console.error("Create Admin Order Notification Error:", notificationError);
    }

    res.status(201).json({
      success: true,
      message:
        paymentMethod === "VODAFONE_CASH"
          ? "Order created. Your payment is pending verification by the admin."
          : "Order created successfully",
      order,
    });
  } catch (error) {
    if (proofUpload) await deleteImage(proofUpload.key);

    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    console.error("Create Order Error:", error);
    res.status(500).json({ success: false, message: "Failed to create order" });
  }
};

// ======================================
// GET MY ORDERS
// ======================================

const getMyOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.userId },
      include: {
        items: { include: { product: orderItemProduct } },
        payment: {
          select: { method: true, status: true, senderPhone: true, transactionId: true, reviewNotes: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, orders });
  } catch (error) {
    console.error("Get My Orders Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
};

// ======================================
// GET SINGLE ORDER
// ======================================

const getOrderById = async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(404).json({ success: false, message: "Order not found" });

    const order = await prisma.order.findFirst({
      where: { id, userId: req.user.userId },
      include: {
        items: { include: { product: orderItemProduct } },
        payment: true,
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error("Get Order Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch order" });
  }
};

// ======================================
// CANCEL MY ORDER
// Only a cash-on-delivery order that is still PENDING can be cancelled by the
// customer. Vodafone Cash orders involve money already sent, so those are
// handled by the store admin.
// ======================================

const cancelMyOrder = async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(404).json({ success: false, message: "Order not found" });

    const order = await prisma.order.findFirst({
      where: { id, userId: req.user.userId },
      include: { payment: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status !== "PENDING" || order.payment?.method !== "CASH_ON_DELIVERY") {
      return res.status(400).json({
        success: false,
        message: "This order can no longer be cancelled online. Please contact the store.",
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id }, data: { status: "CANCELLED" } });
      await releaseOrderStock(tx, id);
    });

    res.json({ success: true, message: "Order cancelled successfully" });
  } catch (error) {
    console.error("Cancel Order Error:", error);
    res.status(500).json({ success: false, message: "Failed to cancel order" });
  }
};

module.exports = { createOrder, getMyOrders, getOrderById, cancelMyOrder };
