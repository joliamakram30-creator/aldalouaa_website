const prisma = require("../config/prisma");
const { releaseOrderStock } = require("../utils/stock");
const { toId, cleanText } = require("../utils/helpers");

const ORDER_STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
const PAYMENT_METHODS = ["CASH_ON_DELIVERY", "VODAFONE_CASH"];
const PAYMENT_STATUSES = ["UNPAID", "PENDING_VERIFICATION", "PAID", "REJECTED"];

const ALLOWED_TRANSITIONS = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

const adminOrderInclude = {
  user: { select: { id: true, name: true, email: true, phone: true } },
  items: {
    include: {
      product: { select: { id: true, name: true, nameAr: true, image: true } },
    },
  },
  payment: true,
};

// ======================================
// GET ALL ORDERS
// Search + filters (status / payment method / payment status / dates) + pagination
// ======================================

const getAllOrders = async (req, res) => {
  try {
    const { search = "", status, paymentMethod, paymentStatus, dateFrom, dateTo } = req.query;

    const currentPage = Math.max(Number(req.query.page) || 1, 1);
    const itemsPerPage = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const skip = (currentPage - 1) * itemsPerPage;

    if (status && !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid order status", allowedStatuses: ORDER_STATUSES });
    }
    if (paymentMethod && !PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: "Invalid payment method", allowedPaymentMethods: PAYMENT_METHODS });
    }
    if (paymentStatus && !PAYMENT_STATUSES.includes(paymentStatus)) {
      return res.status(400).json({ success: false, message: "Invalid payment status", allowedPaymentStatuses: PAYMENT_STATUSES });
    }

    const where = {};

    if (status) where.status = status;

    if (paymentMethod || paymentStatus) {
      where.payment = {
        ...(paymentMethod ? { method: paymentMethod } : {}),
        ...(paymentStatus ? { status: paymentStatus } : {}),
      };
    }

    const term = cleanText(search, 100);
    if (term) {
      where.OR = [
        { orderNumber: { contains: term } },
        { customerName: { contains: term } },
        { customerPhone: { contains: term } },
        { city: { contains: term } },
        { user: { name: { contains: term } } },
        { user: { email: { contains: term } } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};

      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (Number.isNaN(fromDate.getTime())) {
          return res.status(400).json({ success: false, message: "Invalid dateFrom" });
        }
        where.createdAt.gte = fromDate;
      }

      if (dateTo) {
        const toDate = new Date(dateTo);
        if (Number.isNaN(toDate.getTime())) {
          return res.status(400).json({ success: false, message: "Invalid dateTo" });
        }
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const [totalResults, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: adminOrderInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take: itemsPerPage,
      }),
    ]);

    const totalPages = Math.ceil(totalResults / itemsPerPage);

    res.json({
      success: true,
      pagination: {
        currentPage,
        itemsPerPage,
        totalResults,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
      orders,
    });
  } catch (error) {
    console.error("Get All Orders Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
};

// ======================================
// GET ORDER BY ID
// ======================================

const getAdminOrderById = async (req, res) => {
  try {
    const orderId = toId(req.params.id);
    if (!orderId) {
      return res.status(400).json({ success: false, message: "Invalid order ID" });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: adminOrderInclude,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error("Get Admin Order Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch order" });
  }
};

// ======================================
// UPDATE ORDER STATUS
// - CANCELLED gives the reserved stock back (exactly once)
// - DELIVERED marks a cash-on-delivery payment as PAID (cash was collected)
// ======================================

const updateOrderStatus = async (req, res) => {
  try {
    const orderId = toId(req.params.id);
    const { status } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: "Invalid order ID" });
    }

    if (!status || !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid order status", allowedStatuses: ORDER_STATUSES });
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!existingOrder) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const currentStatus = existingOrder.status;

    if (currentStatus === status) {
      return res.status(400).json({ success: false, message: `Order is already ${status}` });
    }

    if (!ALLOWED_TRANSITIONS[currentStatus].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change order status from ${currentStatus} to ${status}`,
        currentStatus,
        allowedNextStatuses: ALLOWED_TRANSITIONS[currentStatus],
      });
    }

    // Vodafone Cash money has not been checked yet -> do not fulfil the order.
    if (
      existingOrder.payment?.method === "VODAFONE_CASH" &&
      existingOrder.payment.status === "PENDING_VERIFICATION" &&
      status !== "CANCELLED"
    ) {
      return res.status(400).json({
        success: false,
        message: "Approve or reject the Vodafone Cash payment first",
      });
    }

    const order = await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status } });

      if (status === "CANCELLED") {
        await releaseOrderStock(tx, orderId);
      }

      if (
        status === "DELIVERED" &&
        existingOrder.payment?.method === "CASH_ON_DELIVERY" &&
        existingOrder.payment.status !== "PAID"
      ) {
        await tx.payment.update({
          where: { orderId },
          data: { status: "PAID", reviewedAt: new Date(), reviewedBy: req.user.userId },
        });
      }

      return tx.order.findUnique({ where: { id: orderId }, include: adminOrderInclude });
    });

    res.json({ success: true, message: "Order status updated successfully", order });
  } catch (error) {
    console.error("Update Order Status Error:", error);
    res.status(500).json({ success: false, message: "Failed to update order status" });
  }
};

// ======================================
// ORDER STATISTICS
// Sales = money actually received (payment PAID) on non-cancelled orders.
// ======================================

const getOrderStats = async (req, res) => {
  try {
    const grouped = await prisma.order.groupBy({ by: ["status"], _count: { _all: true } });
    const counts = Object.fromEntries(grouped.map((row) => [row.status, row._count._all]));
    const totalOrders = grouped.reduce((sum, row) => sum + row._count._all, 0);

    const sales = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { status: { not: "CANCELLED" }, payment: { status: "PAID" } },
    });

    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerPhone: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        payment: { select: { method: true, status: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({
      success: true,
      stats: {
        totalOrders,
        pendingOrders: counts.PENDING || 0,
        confirmedOrders: counts.CONFIRMED || 0,
        processingOrders: counts.PROCESSING || 0,
        shippedOrders: counts.SHIPPED || 0,
        deliveredOrders: counts.DELIVERED || 0,
        cancelledOrders: counts.CANCELLED || 0,
        totalSales: sales._sum.totalAmount || 0,
        recentOrders,
      },
    });
  } catch (error) {
    console.error("Get Order Stats Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch order statistics" });
  }
};

// ======================================
// VERIFY VODAFONE CASH PAYMENT
// action = "APPROVE" | "REJECT"
// ======================================

const verifyPayment = async (req, res) => {
  try {
    const orderId = toId(req.params.id);
    const { action } = req.body;
    const notes = cleanText(req.body.notes, 1000) || null;

    if (!orderId) {
      return res.status(400).json({ success: false, message: "Invalid order ID" });
    }

    if (!["APPROVE", "REJECT"].includes(action)) {
      return res.status(400).json({ success: false, message: "action must be APPROVE or REJECT" });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order || !order.payment) {
      return res.status(404).json({ success: false, message: "Order or payment not found" });
    }

    if (order.payment.method !== "VODAFONE_CASH") {
      return res.status(400).json({ success: false, message: "This order is not paid via Vodafone Cash" });
    }

    if (order.payment.status !== "PENDING_VERIFICATION") {
      return res.status(400).json({
        success: false,
        message: `Payment already ${order.payment.status}, nothing to verify`,
      });
    }

    const newStatus = action === "APPROVE" ? "PAID" : "REJECTED";

    const updatedPayment = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { orderId },
        data: {
          status: newStatus,
          reviewedBy: req.user.userId,
          reviewedAt: new Date(),
          reviewNotes: notes,
        },
      });

      if (action === "APPROVE" && order.status === "PENDING") {
        await tx.order.update({ where: { id: orderId }, data: { status: "CONFIRMED" } });
      }

      if (action === "REJECT") {
        // A rejected payment means the order can't be fulfilled as-is: cancel it and
        // hand the reserved stock back (exactly once). The customer can order again.
        if (order.status !== "CANCELLED") {
          await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
        }
        await releaseOrderStock(tx, orderId);
      }

      return payment;
    });

    res.json({
      success: true,
      message: `Payment ${newStatus === "PAID" ? "approved" : "rejected"} successfully`,
      payment: updatedPayment,
    });
  } catch (error) {
    console.error("Verify Payment Error:", error);
    res.status(500).json({ success: false, message: "Failed to verify payment" });
  }
};

module.exports = {
  getAllOrders,
  getAdminOrderById,
  updateOrderStatus,
  getOrderStats,
  verifyPayment,
};
