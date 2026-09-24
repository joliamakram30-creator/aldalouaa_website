import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import api, { assetUrl } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";
import { apiErrorMessage } from "../../utils/apiErrors";
import { ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS, label } from "../../utils/labels";
import { PageHeader, Alert, Loading, Pill } from "../ui";
import { money } from "../../utils/money";

function AdminDashboard() {
  const { isArabic, pick, formatDate, nameOf } = useLanguage();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/admin/dashboard")
      .then((res) => setData(res.data.dashboard))
      .catch((err) => setError(apiErrorMessage(err, isArabic)));
  }, [isArabic]);

  if (!data && !error) return <Loading />;
  if (!data) return <Alert type="error">{error}</Alert>;

  const { overview, orders, payments, recentOrders, lowStockProducts } = data;
  const maxOrders = Math.max(1, ...Object.values(orders));

  return (
    <div>
      <PageHeader eyebrow={pick("OVERVIEW", "نظرة عامة")} title={pick("Dashboard", "لوحة التحكم")} subtitle={pick("How your store is doing.", "أداء المتجر.")} />

      {payments.pendingVerification > 0 && (
        <div className="adm-card adm-card-alert" style={{ marginBottom: 18, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <AlertTriangle size={22} color="#b8860b" />
          <div style={{ flex: 1 }}>
            <strong>
              {pick(
                `${payments.pendingVerification} Vodafone Cash payment(s) waiting for your review`,
                `${payments.pendingVerification} دفعة فودافون كاش في انتظار مراجعتك`
              )}
            </strong>
          </div>
          <Link className="adm-btn adm-btn-primary" to="/admin/orders?paymentStatus=PENDING_VERIFICATION">
            {pick("Review now", "راجعي دلوقتي")}
          </Link>
        </div>
      )}

      <div className="adm-cards">
        <div className="adm-card">
          <h3>{pick("Sales (paid orders)", "المبيعات (طلبات مدفوعة)")}</h3>
          <div className="adm-big">{money(overview.totalSales, isArabic)}</div>
          <small>
            {pick("Still to collect:", "لسه هتتحصل:")} {money(overview.pendingRevenue, isArabic)}
          </small>
        </div>
        <div className="adm-card">
          <h3>{pick("Orders", "الطلبات")}</h3>
          <div className="adm-big">{overview.totalOrders}</div>
          <small>
            {orders.pending} {pick("pending", "قيد الانتظار")}
          </small>
        </div>
        <div className="adm-card">
          <h3>{pick("Products", "المنتجات")}</h3>
          <div className="adm-big">{overview.totalProducts}</div>
          <small>
            {overview.activeProducts} {pick("visible", "ظاهر")} · {overview.outOfStock} {pick("sold out", "نفدت")}
          </small>
        </div>
        <div className="adm-card">
          <h3>{pick("Customers", "العملاء")}</h3>
          <div className="adm-big">{overview.totalUsers}</div>
          <small>
            {overview.totalCategories} {pick("categories", "أقسام")}
          </small>
        </div>
      </div>

      <div className="adm-two-col">
        <div className="adm-card">
          <h2 className="adm-section-title">{pick("Recent orders", "آخر الطلبات")}</h2>
          {recentOrders.length === 0 ? (
            <div className="adm-empty">{pick("No orders yet.", "مفيش طلبات لسه.")}</div>
          ) : (
            <ul className="adm-list">
              {recentOrders.map((order) => (
                <li key={order.id}>
                  <div>
                    <strong dir="ltr">{order.orderNumber}</strong>
                    <br />
                    <small className="adm-hint">
                      {order.customerName} · {formatDate(order.createdAt)}
                    </small>
                  </div>
                  <div style={{ textAlign: "end" }}>
                    <b>{money(order.totalAmount, isArabic)}</b>
                    <br />
                    <small className="adm-hint">{label(PAYMENT_METHOD, order.payment?.method, isArabic)}</small>
                  </div>
                  <div>
                    <Pill kind={`status-${order.status}`}>{label(ORDER_STATUS, order.status, isArabic)}</Pill>
                    <br />
                    <Pill kind={`pay-${order.payment?.status}`}>{label(PAYMENT_STATUS, order.payment?.status, isArabic)}</Pill>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p style={{ margin: "14px 0 0" }}>
            <Link to="/admin/orders">{pick("All orders →", "كل الطلبات ←")}</Link>
          </p>
        </div>

        <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
          <div className="adm-card">
            <h2 className="adm-section-title">{pick("Orders by status", "الطلبات حسب الحالة")}</h2>
            <div className="adm-bars">
              {Object.entries(orders).map(([key, count]) => (
                <div className="adm-bar-row" key={key}>
                  <span>{label(ORDER_STATUS, key.toUpperCase(), isArabic)}</span>
                  <div className="adm-bar">
                    <span style={{ width: `${(count / maxOrders) * 100}%` }} />
                  </div>
                  <b>{count}</b>
                </div>
              ))}
            </div>
          </div>

          <div className="adm-card">
            <h2 className="adm-section-title">{pick("Payment methods chosen", "طرق الدفع المختارة")}</h2>
            <ul className="adm-list">
              <li>
                <span>{label(PAYMENT_METHOD, "CASH_ON_DELIVERY", isArabic)}</span>
                <b>{payments.cashOnDelivery}</b>
              </li>
              <li>
                <span>{label(PAYMENT_METHOD, "VODAFONE_CASH", isArabic)}</span>
                <b>{payments.vodafoneCash}</b>
              </li>
            </ul>
          </div>

          <div className="adm-card">
            <h2 className="adm-section-title">{pick("Low stock", "مخزون قليل")}</h2>
            {lowStockProducts.length === 0 ? (
              <small className="adm-hint">{pick("All products are well stocked.", "كل المنتجات مخزونها كويس.")}</small>
            ) : (
              <ul className="adm-list">
                {lowStockProducts.map((p) => (
                  <li key={p.id}>
                    <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
                      {p.image && <img src={assetUrl(p.image)} alt="" style={{ width: 34, height: 42, objectFit: "cover", borderRadius: 6 }} />}
                      {nameOf(p)}
                    </span>
                    <Pill kind={p.stock === 0 ? "pill-bad" : "status-PENDING"}>{p.stock}</Pill>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
