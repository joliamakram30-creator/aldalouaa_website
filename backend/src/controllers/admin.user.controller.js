const prisma = require("../config/prisma");
const { toId, cleanText } = require("../utils/helpers");

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  createdAt: true,
  updatedAt: true,
};

// ======================================
// GET ALL USERS
// Each user comes with: number of orders, total spent, last order date and
// the payment methods that customer has chosen so far.
// ======================================

const getAllUsers = async (req, res) => {
  try {
    const search = cleanText(req.query.search, 100);
    const role = ["USER", "ADMIN"].includes(req.query.role) ? req.query.role : undefined;

    const currentPage = Math.max(Number(req.query.page) || 1, 1);
    const itemsPerPage = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);

    const where = {
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    };

    const [totalUsers, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: { ...userSelect, _count: { select: { orders: true, wishlist: true } } },
        orderBy: { createdAt: "desc" },
        skip: (currentPage - 1) * itemsPerPage,
        take: itemsPerPage,
      }),
    ]);

    const ids = users.map((user) => user.id);

    const stats = ids.length
      ? await prisma.order.groupBy({
          by: ["userId"],
          where: { userId: { in: ids } },
          _max: { createdAt: true },
        })
      : [];

    const spent = ids.length
      ? await prisma.order.groupBy({
          by: ["userId"],
          where: { userId: { in: ids }, status: { not: "CANCELLED" } },
          _sum: { totalAmount: true },
        })
      : [];

    const payments = ids.length
      ? await prisma.payment.findMany({
          where: { order: { userId: { in: ids } } },
          select: { method: true, order: { select: { userId: true } } },
        })
      : [];

    const methodsByUser = {};
    for (const payment of payments) {
      const userId = payment.order.userId;
      methodsByUser[userId] = methodsByUser[userId] || {};
      methodsByUser[userId][payment.method] = (methodsByUser[userId][payment.method] || 0) + 1;
    }

    const lastOrderByUser = Object.fromEntries(stats.map((row) => [row.userId, row._max.createdAt]));
    const spentByUser = Object.fromEntries(spent.map((row) => [row.userId, row._sum.totalAmount]));

    res.json({
      success: true,
      totalUsers,
      pagination: {
        currentPage,
        itemsPerPage,
        totalPages: Math.ceil(totalUsers / itemsPerPage),
      },
      users: users.map((user) => ({
        ...user,
        totalSpent: spentByUser[user.id] || 0,
        lastOrderAt: lastOrderByUser[user.id] || null,
        // e.g. { CASH_ON_DELIVERY: 2, VODAFONE_CASH: 1 }
        paymentMethods: methodsByUser[user.id] || {},
      })),
    });
  } catch (error) {
    console.error("Get All Users Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

// ======================================
// GET USER BY ID - everything about one customer
// ======================================

const getUserById = async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        ...userSelect,
        orders: {
          orderBy: { createdAt: "desc" },
          include: {
            payment: {
              select: { method: true, status: true, senderPhone: true, transactionId: true, proofImage: true },
            },
            items: {
              include: { product: { select: { id: true, name: true, nameAr: true, image: true } } },
            },
          },
        },
        wishlist: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            createdAt: true,
            product: { select: { id: true, name: true, nameAr: true, price: true, image: true } },
          },
        },
        cart: {
          select: {
            items: {
              select: {
                id: true,
                quantity: true,
                size: true,
                color: true,
                product: { select: { id: true, name: true, nameAr: true, price: true, image: true } },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const totalSpent = user.orders
      .filter((order) => order.status !== "CANCELLED")
      .reduce((sum, order) => sum + Math.round(Number(order.totalAmount) * 100), 0) / 100;

    res.json({ success: true, user: { ...user, totalSpent } });
  } catch (error) {
    console.error("Get User Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch user" });
  }
};

// ======================================
// UPDATE USER ROLE
// ======================================

const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const allowedRoles = ["USER", "ADMIN"];

    if (!role || !allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role", allowedRoles });
    }

    const userId = toId(req.params.id);
    if (!userId) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (userId === req.user.userId) {
      return res.status(400).json({ success: false, message: "You cannot change your own role" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: userSelect,
    });

    res.json({ success: true, message: "User role updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Update User Role Error:", error);
    res.status(500).json({ success: false, message: "Failed to update user role" });
  }
};

// ======================================
// DELETE USER
// ======================================

const deleteUser = async (req, res) => {
  try {
    const userId = toId(req.params.id);
    if (!userId) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (userId === req.user.userId) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { _count: { select: { orders: true } } },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user._count.orders > 0) {
      return res.status(400).json({ success: false, message: "Cannot delete a user with existing orders" });
    }

    await prisma.$transaction([
      prisma.cart.deleteMany({ where: { userId } }),
      prisma.wishlist.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete User Error:", error);
    res.status(500).json({ success: false, message: "Failed to delete user" });
  }
};

module.exports = { getAllUsers, getUserById, updateUserRole, deleteUser };
