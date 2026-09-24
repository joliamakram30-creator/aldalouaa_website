import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { User, Package, Heart, Lock, LogOut, ArrowLeft, LayoutDashboard } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import api, { assetUrl } from "../services/api";
import { apiErrorMessage } from "../utils/apiErrors";
import { normalizeEgyptPhone } from "../utils/format";
import { useCityLabel } from "../hooks/useCityLabel";
import { ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS, label } from "../utils/labels";

function FormMessage({ message }) {
  if (!message) return null;
  return <div className={message.type === "ok" ? "form-success" : "auth-error"}>{message.text}</div>;
}

function Profile() {
  const { user, isLoggedIn, isAdmin, loading: authLoading, logout, updateProfile, refreshUser } = useAuth();
  const { favorites } = useFavorites();
  const { t, isArabic, pick, money, formatDate, nameOf, colorLabel } = useLanguage();
  const cityLabel = useCityLabel();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();

  const tab = ["profile", "orders", "password"].includes(params.get("tab")) ? params.get("tab") : "profile";
  const setTab = (next) => setParams(next === "profile" ? {} : { tab: next });

  // ---- personal info ----
  const [info, setInfo] = useState({ name: user?.name || "", phone: user?.phone || "" });
  const [infoMsg, setInfoMsg] = useState(null);
  const [savingInfo, setSavingInfo] = useState(false);

  useEffect(() => {
    if (user) setInfo({ name: user.name || "", phone: user.phone || "" });
  }, [user]);

  async function saveInfo(e) {
    e.preventDefault();
    setInfoMsg(null);

    if (info.name.trim().length < 2) {
      return setInfoMsg({ type: "error", text: pick("Please enter your name.", "من فضلك اكتبي اسمك.") });
    }
    if (info.phone.trim() && !normalizeEgyptPhone(info.phone)) {
      return setInfoMsg({ type: "error", text: pick("Enter a valid Egyptian mobile number (01XXXXXXXXX).", "اكتبي رقم موبايل مصري صحيح (01XXXXXXXXX).") });
    }

    setSavingInfo(true);
    try {
      await updateProfile({ name: info.name.trim(), phone: info.phone.trim() });
      setInfoMsg({ type: "ok", text: pick("Saved successfully.", "تم الحفظ بنجاح.") });
    } catch (err) {
      setInfoMsg({ type: "error", text: apiErrorMessage(err, isArabic) });
    } finally {
      setSavingInfo(false);
    }
  }

  // ---- orders ----
  const [orders, setOrders] = useState(null);
  const [ordersError, setOrdersError] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const { data } = await api.get("/orders/my-orders");
      setOrders(data.orders);
      setOrdersError(false);
    } catch {
      setOrdersError(true);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && tab === "orders") loadOrders();
  }, [isLoggedIn, tab, loadOrders]);

  async function cancelOrder(order) {
    if (!window.confirm(pick("Cancel this order?", "متأكدة إنك عايزة تلغي الطلب ده؟"))) return;
    try {
      await api.put(`/orders/${order.id}/cancel`);
      loadOrders();
    } catch (err) {
      window.alert(apiErrorMessage(err, isArabic));
    }
  }

  // ---- password ----
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState(null);
  const [savingPw, setSavingPw] = useState(false);

  async function savePassword(e) {
    e.preventDefault();
    setPwMsg(null);

    if (user.passwordSet !== false && !pw.current) return setPwMsg({ type: "error", text: pick("Enter your current password.", "اكتبي كلمة المرور الحالية.") });
    if (pw.next.length < 8) return setPwMsg({ type: "error", text: t("passwordLength") });
    if (pw.next !== pw.confirm) return setPwMsg({ type: "error", text: t("passwordMismatch") });

    setSavingPw(true);
    try {
      await api.put("/auth/password", { currentPassword: pw.current, newPassword: pw.next });
      await refreshUser();
      setPw({ current: "", next: "", confirm: "" });
      setPwMsg({ type: "ok", text: pick("Password updated.", "تم تحديث كلمة المرور.") });
    } catch (err) {
      setPwMsg({ type: "error", text: apiErrorMessage(err, isArabic) });
    } finally {
      setSavingPw(false);
    }
  }

  if (authLoading) {
    return (
      <div className="app">
        <Navbar />
        <div className="store-state">
          <div className="store-spinner" />
        </div>
      </div>
    );
  }

  if (!isLoggedIn) return <Navigate to="/login" state={{ from: "/profile" }} replace />;

  return (
    <div className="app">
      <Navbar />
      <div className="profile-page">
        <Link to="/" className="back-to-shop">
          <ArrowLeft size={18} />
          {t("backToShop")}
        </Link>

        <div className="profile-container">
          <aside className="profile-sidebar">
            <div className="profile-user">
              <div className="profile-avatar">
                <User size={30} />
              </div>
              <div>
                <h3>{user.name}</h3>
                <p>{user.email}</p>
              </div>
            </div>

            <nav className="profile-menu">
              <button className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}>
                <User size={18} />
                {t("personalInfo")}
              </button>
              <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>
                <Package size={18} />
                {t("myOrders")}
              </button>
              <button onClick={() => nav("/favorites")}>
                <Heart size={18} />
                {t("favorites")} {favorites.length > 0 && `(${favorites.length})`}
              </button>
              <button className={tab === "password" ? "active" : ""} onClick={() => setTab("password")}>
                <Lock size={18} />
                {t("changePassword")}
              </button>
              {isAdmin && (
                <button onClick={() => nav("/admin")}>
                  <LayoutDashboard size={18} />
                  {pick("Admin Panel", "لوحة التحكم")}
                </button>
              )}
              <button
                className="logout-button"
                onClick={() => {
                  logout();
                  nav("/");
                }}
              >
                <LogOut size={18} />
                {t("logout")}
              </button>
            </nav>
          </aside>

          <main className="profile-content">
            {tab === "profile" && (
              <section>
                <h1>{t("personalInfo")}</h1>
                <p className="profile-subtitle">{t("managePersonal")}</p>

                <form className="profile-card" onSubmit={saveInfo}>
                  <FormMessage message={infoMsg} />
                  <div className="form-group">
                    <label>{t("fullName")}</label>
                    <input type="text" value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} placeholder={t("yourFullName")} />
                  </div>
                  <div className="form-group">
                    <label>{t("email")}</label>
                    <input type="email" value={user.email} disabled dir="ltr" />
                  </div>
                  <div className="form-group">
                    <label>{t("phone")}</label>
                    <input type="tel" dir="ltr" value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} placeholder="01XXXXXXXXX" />
                  </div>
                  <button className="save-button" type="submit" disabled={savingInfo}>
                    {t("saveChanges")}
                  </button>
                </form>
              </section>
            )}

            {tab === "orders" && (
              <section>
                <h1>{t("myOrders")}</h1>
                <p className="profile-subtitle">{t("trackOrders")}</p>

                {ordersError && <div className="auth-error">{pick("Could not load your orders.", "مقدرناش نحمل طلباتك.")}</div>}
                {orders === null && !ordersError && <div className="store-spinner" />}

                {orders && orders.length === 0 && (
                  <div className="empty-state compact">
                    <h2>{t("noOrders")}</h2>
                    <p>{t("ordersAppear")}</p>
                    <button className="btn btn-primary" onClick={() => nav("/shop")}>
                      {t("startShopping")}
                    </button>
                  </div>
                )}

                <div className="my-orders">
                  {orders?.map((order) => {
                    const canCancel = order.status === "PENDING" && order.payment?.method === "CASH_ON_DELIVERY";
                    return (
                      <article className="my-order" key={order.id}>
                        <header>
                          <div>
                            <strong dir="ltr">{order.orderNumber}</strong>
                            <small>{formatDate(order.createdAt)}</small>
                          </div>
                          <span className={`status-pill status-${order.status}`}>{label(ORDER_STATUS, order.status, isArabic)}</span>
                        </header>

                        <ul className="my-order-items">
                          {order.items.map((item) => (
                            <li key={item.id}>
                              {item.product?.image && <img src={assetUrl(item.product.image)} alt="" />}
                              <div>
                                <b>{item.product ? nameOf(item.product) : item.productName}</b>
                                <small>
                                  {[
                                    item.size ? `${pick("Size", "المقاس")}: ${item.size}` : "",
                                    item.color ? `${pick("Color", "اللون")}: ${colorLabel({ name: item.color })}` : "",
                                    item.scent ? `${pick("Scent", "الرائحة")}: ${item.scent}` : "",
                                  ].filter(Boolean).join(" · ")}
                                  {" × "}
                                  {item.quantity}
                                </small>
                              </div>
                              <span>{money(Number(item.price) * item.quantity)}</span>
                            </li>
                          ))}
                        </ul>

                        <footer>
                          <div className="my-order-meta">
                            <span>
                              {pick("Payment", "الدفع")}: <b>{label(PAYMENT_METHOD, order.payment?.method, isArabic)}</b>{" "}
                              <span className={`status-pill pay-${order.payment?.status}`}>{label(PAYMENT_STATUS, order.payment?.status, isArabic)}</span>
                            </span>
                            <span>
                              {pick("Shipping to", "الشحن إلى")}: <b>{cityLabel(order.city)}</b> ({Number(order.shippingCost) ? money(order.shippingCost) : t("free")})
                            </span>
                            {order.payment?.status === "REJECTED" && order.payment.reviewNotes && (
                              <span className="my-order-note">{order.payment.reviewNotes}</span>
                            )}
                          </div>
                          <div className="my-order-total">
                            {t("total")}: <strong>{money(order.totalAmount)}</strong>
                          </div>
                          {canCancel && (
                            <button className="btn btn-outline btn-small" onClick={() => cancelOrder(order)}>
                              {pick("Cancel order", "إلغاء الطلب")}
                            </button>
                          )}
                        </footer>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {tab === "password" && (
              <section>
                <h1>{t("changePassword")}</h1>
                <p className="profile-subtitle">{t("secureAccount")}</p>

                <form className="profile-card" onSubmit={savePassword}>
                  <FormMessage message={pwMsg} />
                  {user.passwordSet === false ? (
                    <p className="profile-subtitle" style={{ margin: 0 }}>
                      {pick(
                        "You signed in with Google. You can set a password to also log in with your email.",
                        "سجلتي دخول بجوجل. تقدري تحطي كلمة مرور علشان تدخلي كمان بالإيميل."
                      )}
                    </p>
                  ) : (
                    <div className="form-group">
                      <label>{t("currentPassword")}</label>
                      <input type="password" autoComplete="current-password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
                    </div>
                  )}
                  <div className="form-group">
                    <label>{t("newPassword")}</label>
                    <input type="password" autoComplete="new-password" required value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} placeholder={t("atLeast6")} />
                  </div>
                  <div className="form-group">
                    <label>{t("confirmNewPassword")}</label>
                    <input type="password" autoComplete="new-password" required value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
                  </div>
                  <button className="save-button" type="submit" disabled={savingPw}>
                    {t("updatePassword")}
                  </button>
                </form>
              </section>
            )}
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Profile;
