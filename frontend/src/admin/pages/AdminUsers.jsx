import { useCallback, useEffect, useState } from "react";
import { Eye, Trash2, ShieldCheck, ShieldOff } from "lucide-react";
import api, { assetUrl } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { apiErrorMessage } from "../../utils/apiErrors";
import { useCityLabel } from "../../hooks/useCityLabel";
import { ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS, label } from "../../utils/labels";
import { PageHeader, Alert, Modal, Loading, Pill } from "../ui";
import { money } from "../../utils/money";

function AdminUsers() {
  const { isArabic, pick, formatDate, nameOf } = useLanguage();
  const { user: me } = useAuth();

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [debounced, setDebounced] = useState("");
  const [detailId, setDetailId] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/users", { params: { search: debounced || undefined, role: role || undefined, limit: 100 } });
      setUsers(data.users);
      setTotal(data.totalUsers);
    } catch (err) {
      setNotice({ type: "error", text: apiErrorMessage(err, isArabic) });
    } finally {
      setLoading(false);
    }
  }, [debounced, role, isArabic]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeRole(user) {
    const next = user.role === "ADMIN" ? "USER" : "ADMIN";
    const ok = window.confirm(
      next === "ADMIN"
        ? pick(`Make ${user.name} an admin? She will have full access to this panel.`, `تخلي ${user.name} أدمن؟ هيبقى عندها صلاحية كاملة على لوحة التحكم.`)
        : pick(`Remove admin access from ${user.name}?`, `تشيلي صلاحية الأدمن من ${user.name}؟`)
    );
    if (!ok) return;
    try {
      await api.put(`/admin/users/${user.id}/role`, { role: next });
      setNotice({ type: "success", text: pick("Role updated.", "تم تحديث الصلاحية.") });
      load();
    } catch (err) {
      setNotice({ type: "error", text: apiErrorMessage(err, isArabic) });
    }
  }

  async function remove(user) {
    if (!window.confirm(pick(`Delete ${user.name}'s account?`, `حذف حساب ${user.name}؟`))) return;
    try {
      await api.delete(`/admin/users/${user.id}`);
      setNotice({ type: "success", text: pick("User deleted.", "تم حذف الحساب.") });
      load();
    } catch (err) {
      setNotice({ type: "error", text: apiErrorMessage(err, isArabic) });
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow={pick("CUSTOMERS", "العملاء")}
        title={pick("Customers", "العملاء")}
        subtitle={pick(`${total} accounts`, `${total} حساب`)}
      />

      <Alert type={notice?.type} onClose={() => setNotice(null)}>
        {notice?.text}
      </Alert>

      <div className="adm-filters">
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={pick("Search by name, email or phone...", "ابحثي بالاسم أو الإيميل أو الموبايل...")} />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">{pick("All roles", "كل الصلاحيات")}</option>
          <option value="USER">{pick("Customers", "عملاء")}</option>
          <option value="ADMIN">{pick("Admins", "أدمن")}</option>
        </select>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>{pick("Customer", "العميلة")}</th>
                <th>{pick("Phone", "الموبايل")}</th>
                <th>{pick("Orders", "الطلبات")}</th>
                <th>{pick("Total spent", "إجمالي المشتريات")}</th>
                <th>{pick("Payment methods used", "طرق الدفع المستخدمة")}</th>
                <th>{pick("Joined", "انضمت")}</th>
                <th>{pick("Actions", "إجراءات")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>
                      {u.name} {u.role === "ADMIN" && <Pill kind="pill-info">{pick("Admin", "أدمن")}</Pill>}
                    </strong>
                    <small dir="ltr" style={{ textAlign: isArabic ? "right" : "left" }}>{u.email}</small>
                  </td>
                  <td dir="ltr" style={{ textAlign: isArabic ? "right" : "left" }}>{u.phone || "-"}</td>
                  <td>{u._count.orders}</td>
                  <td>{money(u.totalSpent, isArabic)}</td>
                  <td>
                    {Object.keys(u.paymentMethods).length === 0 && "-"}
                    {Object.entries(u.paymentMethods).map(([method, count]) => (
                      <div key={method}>
                        <Pill kind={method === "VODAFONE_CASH" ? "pill-info" : "pill-muted"}>
                          {label(PAYMENT_METHOD, method, isArabic)} × {count}
                        </Pill>
                      </div>
                    ))}
                  </td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td>
                    <div className="adm-actions">
                      <button className="adm-btn" onClick={() => setDetailId(u.id)}>
                        <Eye size={14} /> {pick("Details", "التفاصيل")}
                      </button>
                      {u.id !== me?.id && (
                        <>
                          <button className="adm-btn" onClick={() => changeRole(u)} title={u.role === "ADMIN" ? pick("Remove admin", "إزالة الأدمن") : pick("Make admin", "تعيين كأدمن")}>
                            {u.role === "ADMIN" ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                          </button>
                          <button className="adm-btn adm-btn-danger" onClick={() => remove(u)}>
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <div className="adm-empty">{pick("No customers found.", "مفيش عملاء.")}</div>}
        </div>
      )}

      {detailId && <UserDetail id={detailId} onClose={() => setDetailId(null)} nameOf={nameOf} />}
    </div>
  );
}

function UserDetail({ id, onClose, nameOf }) {
  const { isArabic, pick, formatDate } = useLanguage();
  const cityLabel = useCityLabel();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("orders");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/admin/users/${id}`)
      .then(({ data }) => setUser(data.user))
      .catch((err) => setError(apiErrorMessage(err, isArabic)));
  }, [id, isArabic]);

  return (
    <Modal title={user ? user.name : pick("Customer", "العميلة")} onClose={onClose} wide>
      <Alert type="error">{error}</Alert>
      {!user && !error && <Loading />}

      {user && (
        <>
          <div className="adm-detail-grid">
            <div className="adm-box">
              <h4>{pick("Account", "الحساب")}</h4>
              <p dir="ltr" style={{ textAlign: isArabic ? "right" : "left" }}>{user.email}</p>
              <p dir="ltr" style={{ textAlign: isArabic ? "right" : "left" }}>{user.phone || "-"}</p>
              <p className="adm-hint">
                {pick("Joined", "انضمت")} {formatDate(user.createdAt)}
              </p>
            </div>
            <div className="adm-box">
              <h4>{pick("Summary", "ملخص")}</h4>
              <p>
                {pick("Orders", "الطلبات")}: <b>{user.orders.length}</b>
              </p>
              <p>
                {pick("Total spent", "إجمالي المشتريات")}: <b>{money(user.totalSpent, isArabic)}</b>
              </p>
              <p>
                {pick("Favorites", "المفضلة")}: <b>{user.wishlist.length}</b> · {pick("Cart items", "في السلة")}: <b>{user.cart?.items.length || 0}</b>
              </p>
            </div>
          </div>

          <div className="adm-tabs">
            {[
              ["orders", pick("Orders & payments", "الطلبات والدفع")],
              ["favorites", pick("Favorites", "المفضلة")],
              ["cart", pick("Cart", "السلة")],
            ].map(([key, text]) => (
              <button key={key} className={tab === key ? "on" : ""} onClick={() => setTab(key)}>
                {text}
              </button>
            ))}
          </div>

          {tab === "orders" &&
            (user.orders.length === 0 ? (
              <div className="adm-empty">{pick("No orders yet.", "مفيش طلبات لسه.")}</div>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table" style={{ minWidth: 640 }}>
                  <thead>
                    <tr>
                      <th>{pick("Order", "الطلب")}</th>
                      <th>{pick("Payment method", "طريقة الدفع")}</th>
                      <th>{pick("Payment status", "حالة الدفع")}</th>
                      <th>{pick("Status", "الحالة")}</th>
                      <th>{pick("Total", "الإجمالي")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.orders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <strong dir="ltr">{order.orderNumber}</strong>
                          <small>
                            {formatDate(order.createdAt)} · {cityLabel(order.city)}
                          </small>
                        </td>
                        <td>
                          <strong>{label(PAYMENT_METHOD, order.payment?.method, isArabic)}</strong>
                          {order.payment?.transactionId && <small dir="ltr">#{order.payment.transactionId}</small>}
                        </td>
                        <td>
                          <Pill kind={`pay-${order.payment?.status}`}>{label(PAYMENT_STATUS, order.payment?.status, isArabic)}</Pill>
                        </td>
                        <td>
                          <Pill kind={`status-${order.status}`}>{label(ORDER_STATUS, order.status, isArabic)}</Pill>
                        </td>
                        <td>{money(order.totalAmount, isArabic)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {tab === "favorites" &&
            (user.wishlist.length === 0 ? (
              <div className="adm-empty">{pick("No favorites.", "مفيش مفضلات.")}</div>
            ) : (
              <ul className="adm-items">
                {user.wishlist.map((entry) => (
                  <li key={entry.id}>
                    {entry.product.image && <img src={assetUrl(entry.product.image)} alt="" />}
                    <div>
                      <b>{nameOf(entry.product)}</b>
                    </div>
                    <b>{money(entry.product.price, isArabic)}</b>
                  </li>
                ))}
              </ul>
            ))}

          {tab === "cart" &&
            (!user.cart || user.cart.items.length === 0 ? (
              <div className="adm-empty">{pick("The cart is empty.", "السلة فاضية.")}</div>
            ) : (
              <ul className="adm-items">
                {user.cart.items.map((item) => (
                  <li key={item.id}>
                    {item.product.image && <img src={assetUrl(item.product.image)} alt="" />}
                    <div>
                      <b>{nameOf(item.product)}</b>
                      <small>{[item.size, item.color].filter(Boolean).join(" · ")}</small>
                    </div>
                    <span>× {item.quantity}</span>
                    <b>{money(Number(item.product.price) * item.quantity, isArabic)}</b>
                  </li>
                ))}
              </ul>
            ))}
        </>
      )}
    </Modal>
  );
}

export default AdminUsers;
