import { NavLink } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { LayoutDashboard, ShoppingBag, ClipboardList, Users, FolderTree, ArrowLeft, SlidersHorizontal, Truck } from "lucide-react";

function AdminSidebar() {
  const { pick } = useLanguage();

  const links = [
    { to: "/admin", end: true, icon: LayoutDashboard, text: pick("Dashboard", "لوحة التحكم") },
    { to: "/admin/products", icon: ShoppingBag, text: pick("Products", "المنتجات") },
    { to: "/admin/orders", icon: ClipboardList, text: pick("Orders", "الطلبات") },
    { to: "/admin/users", icon: Users, text: pick("Customers", "العملاء") },
    { to: "/admin/categories", icon: FolderTree, text: pick("Categories", "الأقسام") },
    { to: "/admin/options", icon: SlidersHorizontal, text: pick("Sizes & Colors", "المقاسات والألوان") },
    { to: "/admin/shipping", icon: Truck, text: pick("Shipping", "الشحن") },
  ];

  return (
    <aside className="admin-sidebar">
      <div className="admin-logo">
        <div className="admin-logo-mark">D</div>
        <div>
          <h2>AL-DALOUAA</h2>
          <span>{pick("Admin Panel", "لوحة الأدمن")}</span>
        </div>
      </div>

      <nav className="admin-nav">
        <p className="admin-nav-title">{pick("MAIN MENU", "القائمة الرئيسية")}</p>

        {links.map(({ to, end, icon: Icon, text }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}>
            <Icon size={20} />
            <span>{text}</span>
          </NavLink>
        ))}
      </nav>

      <div className="admin-sidebar-bottom">
        <NavLink to="/" className="admin-back-link">
          <ArrowLeft size={18} />
          <span>{pick("Back to Store", "العودة للمتجر")}</span>
        </NavLink>
      </div>
    </aside>
  );
}

export default AdminSidebar;
