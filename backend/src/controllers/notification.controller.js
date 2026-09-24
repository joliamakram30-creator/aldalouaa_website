const prisma = require("../config/prisma");

const getNotifications = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { adminId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.notification.count({ where: { adminId, isRead: false } }),
    ]);
    res.json({ success: true, notifications, unreadCount });
  } catch (error) {
    console.error("Get Notifications Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
};

const markAllRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { adminId: req.user.userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Mark Notifications Read Error:", error);
    res.status(500).json({ success: false, message: "Failed to update notifications" });
  }
};

const markRead = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Invalid notification ID" });
    await prisma.notification.updateMany({ where: { id, adminId: req.user.userId }, data: { isRead: true } });
    res.json({ success: true });
  } catch (error) {
    console.error("Mark Notification Read Error:", error);
    res.status(500).json({ success: false, message: "Failed to update notification" });
  }
};

module.exports = { getNotifications, markAllRead, markRead };
