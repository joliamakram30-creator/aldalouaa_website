import { useCallback, useEffect, useRef, useState } from "react";
import { UserCircle, LogOut, Bell, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

function AdminHeader() {
  const { t, toggleLanguage, pick, formatDate } = useLanguage();
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const previousUnread = useRef(null);
  const audioRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/notifications");
      setNotifications(data.notifications || []);
      setUnread(data.unreadCount || 0);
      const nextUnread = data.unreadCount || 0;

      // First poll establishes a baseline so old unread notifications do not
      // pop up. Every increase after that means a genuinely new notification.
      if (
        previousUnread.current !== null &&
        nextUnread > previousUnread.current
      ) {
        try { audioRef.current?.play?.(); } catch { /* browser may block autoplay */ }

        if ("Notification" in window && Notification.permission === "granted") {
          const newest = data.notifications?.find((item) => !item.isRead) || data.notifications?.[0];
          if (newest) {
            const browserNotification = new Notification(
              newest.title || "AL-DALOUAA",
              { body: newest.message || "You have a new notification." }
            );
            browserNotification.onclick = () => {
              window.focus();
              if (newest.link) nav(newest.link);
              browserNotification.close();
            };
          }
        }
      }

      previousUnread.current = nextUnread;
    } catch {
      // Notifications must never break the admin panel.
    }
  }, [nav]);

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 10000);
    return () => clearInterval(timer);
  }, [loadNotifications]);

  const requestBrowserNotifications = async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      try { await Notification.requestPermission(); } catch { /* ignore */ }
    }
  };

  const markAllRead = async () => {
    try {
      await api.put("/admin/notifications/read-all");
      setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
      setUnread(0);
      previousUnread.current = 0;
    } catch { /* ignore */ }
  };

  const openNotification = async (item) => {
    try { if (!item.isRead) await api.put(`/admin/notifications/${item.id}/read`); } catch { /* ignore */ }
    if (!item.isRead) {
      setNotifications((items) => items.map((n) => n.id === item.id ? { ...n, isRead: true } : n));
      setUnread((value) => Math.max(0, value - 1));
    }
    setOpen(false);
    if (item.link) nav(item.link);
  };

  return (
    <header className="admin-header">
      <audio ref={audioRef} preload="auto" src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=" />
      <div className="admin-header-left">
        <h1>{pick("Admin Dashboard", "لوحة تحكم الأدمن")}</h1>
        <p>{pick("Manage your AL-DALOUAA store", "إدارة متجر الدلوعة")}</p>
      </div>
      <div className="admin-header-right">
        <button className="language-toggle admin-language-toggle" onClick={toggleLanguage}>{t("language")}</button>
        <div className="admin-notification-wrap">
          <button className="admin-icon-button admin-notification-button" title={pick("Notifications", "الإشعارات")} onClick={() => { setOpen((v) => !v); requestBrowserNotifications(); }}>
            <Bell size={19} />
            {unread > 0 && <span className="admin-notification-badge">{unread > 99 ? "99+" : unread}</span>}
          </button>
          {open && <div className="admin-notification-menu">
            <div className="admin-notification-head"><strong>{pick("Notifications", "الإشعارات")}</strong><button type="button" onClick={markAllRead}><CheckCheck size={15} /> {pick("Read all", "قراءة الكل")}</button></div>
            {notifications.length === 0 ? <div className="admin-notification-empty">{pick("No notifications yet.", "مفيش إشعارات لسه.")}</div> : notifications.map((item) => <button type="button" className={`admin-notification-item ${item.isRead ? "read" : "unread"}`} key={item.id} onClick={() => openNotification(item)}><strong>{item.title}</strong><span>{item.message}</span><small>{formatDate(item.createdAt)}</small></button>)}
          </div>}
        </div>
        <div className="admin-profile"><UserCircle size={38} /><div><strong>{user?.name}</strong><span>{pick("Administrator", "مسؤول المتجر")}</span></div></div>
        <button className="admin-icon-button" title={pick("Log out", "تسجيل الخروج")} onClick={() => { logout(); nav("/login"); }}><LogOut size={19} /></button>
      </div>
    </header>
  );
}
export default AdminHeader;
