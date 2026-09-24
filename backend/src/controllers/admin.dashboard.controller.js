const prisma = require("../config/prisma");

// ======================================
// ADMIN DASHBOARD
// Sales = money actually received: payment PAID on non-cancelled orders
// (Vodafone Cash once approved, cash on delivery once delivered).
// ======================================

const getDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      totalProducts,
      activeProducts,
      totalCategories,
      statusGroups,
      sales,
      pendingRevenue,
      pendingVerification,
      methodGroups,
      recentOrders,
      lowStockProducts,
      outOfStock,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.category.count(),
      prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: { not: "CANCELLED" }, payment: { status: "PAID" } },
      }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          status: { not: "CANCELLED" },
          payment: { status: { in: ["UNPAID", "PENDING_VERIFICATION"] } },
        },
      }),
      prisma.payment.count({ where: { status: "PENDING_VERIFICATION" } }),
      prisma.payment.groupBy({
        by: ["method"],
        where: { order: { status: { not: "CANCELLED" } } },
        _count: { _all: true },
      }),
      prisma.order.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          status: true,
          customerName: true,
          customerPhone: true,
          city: true,
          createdAt: true,
          payment: { select: { method: true, status: true } },
          user: { select: { id: true, name: true, email: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.product.findMany({
        where: { stock: { lte: 5 }, isActive: true },
        orderBy: { stock: "asc" },
        take: 10,
        select: {
          id: true,
          name: true,
          nameAr: true,
          price: true,
          stock: true,
          image: true,
          category: { select: { id: true, name: true, nameAr: true } },
        },
      }),
      prisma.product.count({ where: { stock: 0, isActive: true } }),
    ]);

    const counts = Object.fromEntries(statusGroups.map((row) => [row.status, row._count._all]));
    const totalOrders = statusGroups.reduce((sum, row) => sum + row._count._all, 0);
    const methods = Object.fromEntries(methodGroups.map((row) => [row.method, row._count._all]));

    res.json({
      success: true,
      dashboard: {
        overview: {
          totalUsers,
          totalProducts,
          activeProducts,
          totalCategories,
          totalOrders,
          totalSales: Number(sales._sum.totalAmount || 0),
          pendingRevenue: Number(pendingRevenue._sum.totalAmount || 0),
          outOfStock,
        },

        orders: {
          pending: counts.PENDING || 0,
          confirmed: counts.CONFIRMED || 0,
          processing: counts.PROCESSING || 0,
          shipped: counts.SHIPPED || 0,
          delivered: counts.DELIVERED || 0,
          cancelled: counts.CANCELLED || 0,
        },

        payments: {
          pendingVerification,
          cashOnDelivery: methods.CASH_ON_DELIVERY || 0,
          vodafoneCash: methods.VODAFONE_CASH || 0,
        },

        recentOrders,
        lowStockProducts,
      },
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch dashboard data" });
  }
};

module.exports = { getDashboard };
