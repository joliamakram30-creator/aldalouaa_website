import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, X, Eye } from "lucide-react";
import api, { assetUrl } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";
import { apiErrorMessage } from "../../utils/apiErrors";
import { useCityLabel } from "../../hooks/useCityLabel";
import { ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS, label } from "../../utils/labels";
import { PageHeader, Alert, Modal, Loading, Pill } from "../ui";
import { money } from "../../utils/money";

const NEXT_STATUS = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

const PAGE_SIZE = 15;

function AdminOrders() {
  const { isArabic, pick, formatDate, nameOf, colorLabel } = useLanguage();
  const [params] = useSearchParams();
  const cityLabel = useCityLabel();

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalResults: 0 });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [selected, setSelected] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    paymentMethod: "",
    paymentStatus: params.get("paymentStatus") || "",
    dateFrom: "",
    dateTo: "",
  });
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 350);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const load = useCallback(async () => {
    try {
      const query = { page, limit: PAGE_SIZE };
      if (debouncedSearch.trim()) query.search = debouncedSearch.trim();
      ["status", "paymentMethod", "paymentStatus", "dateFrom", "dateTo"].forEach((key) => {
        if (filters[key]) query[key] = filters[key];
      });
      const { data } = await api.get("/admin/orders", { params: query });
      setOrders(data.orders);
      setPagination(data.pagination);
      // keep an open detail window in sync
      setSelected((current) => (current ? data.orders.find((o) => o.id === current.id) || current : current));
    } catch (err) {
      setNotice({ type: "error", text: apiErrorMessage(err, isArabic) });
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filters, isArabic]);

  useEffect(() => {
    load();
  }, [load]);

  function setFilter(key, value) {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div>
      <PageHeader
        eyebrow={pick("SALES", "المبيعات")}
        title={pick("Orders", "الطلبات")}
        subtitle={pick(`${pagination.totalResults} orders`, `${pagination.totalResults} طلب`)}
      />

      <Alert type={notice?.type} onClose={() => setNotice(null)}>
        {notice?.text}
      </Alert>

      <div className="adm-filters">
        <input
          type="search"
          value={filters.search}
          onChange={(e) => setFilter("search", e.target.value)}
          placeholder={pick("Search by order #, customer, phone, city...", "ابحثي برقم الطلب أو الاسم أو الموبايل أو المحافظة...")}
        />
        <select value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
          <option value="">{pick("All order statuses", "كل حالات الطلب")}</option>
          {Object.keys(ORDER_STATUS).map((s) => (
            <option key={s} value={s}>
              {label(ORDER_STATUS, s, isArabic)}
            </option>
          ))}
        </select>
        <select value={filters.paymentMethod} onChange={(e) => setFilter("paymentMethod", e.target.value)}>
          <option value="">{pick("All payment methods", "كل طرق الدفع")}</option>
          {Object.keys(PAYMENT_METHOD).map((s) => (
            <option key={s} value={s}>
              {label(PAYMENT_METHOD, s, isArabic)}
            </option>
          ))}
        </select>
        <select value={filters.paymentStatus} onChange={(e) => setFilter("paymentStatus", e.target.value)}>
          <option value="">{pick("All payment statuses", "كل حالات الدفع")}</option>
          {Object.keys(PAYMENT_STATUS).map((s) => (
            <option key={s} value={s}>
              {label(PAYMENT_STATUS, s, isArabic)}
            </option>
          ))}
        </select>
        <input type="date" value={filters.dateFrom} onChange={(e) => setFilter("dateFrom", e.target.value)} title={pick("From", "من")} />
        <input type="date" value={filters.dateTo} onChange={(e) => setFilter("dateTo", e.target.value)} title={pick("To", "إلى")} />
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>{pick("Order", "الطلب")}</th>
                <th>{pick("Customer", "العميلة")}</th>
                <th>{pick("Governorate", "المحافظة")}</th>
                <th>{pick("Total", "الإجمالي")}</th>
                <th>{pick("Payment", "الدفع")}</th>
                <th>{pick("Status", "الحالة")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="adm-clickable" onClick={() => setSelected(order)}>
                  <td>
                    <strong dir="ltr">{order.orderNumber}</strong>
                    <small>{formatDate(order.createdAt)}</small>
                  </td>
                  <td>
                    <strong>{order.customerName}</strong>
                    <small dir="ltr">{order.customerPhone}</small>
                  </td>
                  <td>{cityLabel(order.city)}</td>
                  <td>
                    <strong>{money(order.totalAmount, isArabic)}</strong>
                    <small>
                      {order.items.length} {order.items.length === 1 ? pick("item", "منتج") : pick("items", "منتجات")}
                    </small>
                  </td>
                  <td>
                    <strong>{label(PAYMENT_METHOD, order.payment?.method, isArabic)}</strong>
                    <Pill kind={`pay-${order.payment?.status}`}>{label(PAYMENT_STATUS, order.payment?.status, isArabic)}</Pill>
                  </td>
                  <td>
                    <Pill kind={`status-${order.status}`}>{label(ORDER_STATUS, order.status, isArabic)}</Pill>
                  </td>
                  <td>
                    <button className="adm-btn" onClick={() => setSelected(order)}>
                      <Eye size={14} /> {pick("View", "عرض")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <div className="adm-empty">{pick("No orders found.", "مفيش طلبات.")}</div>}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="adm-pager">
          <span>
            {pick("Page", "صفحة")} {pagination.currentPage} / {pagination.totalPages}
          </span>
          <div className="adm-actions">
            <button className="adm-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              {pick("Previous", "السابق")}
            </button>
            <button className="adm-btn" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>
              {pick("Next", "التالي")}
            </button>
          </div>
        </div>
      )}

      {selected && (
        <OrderDetail
          order={selected}
          onClose={() => setSelected(null)}
          onChanged={load}
          setNotice={setNotice}
          nameOf={nameOf}
          colorLabel={colorLabel}
        />
      )}
    </div>
  );
}

function OrderDetail({ order, onClose, onChanged, setNotice, nameOf, colorLabel }) {
  const { isArabic, pick, formatDate } = useLanguage();
  const cityLabel = useCityLabel();
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const payment = order.payment;
  const pendingVodafone = payment?.method === "VODAFONE_CASH" && payment.status === "PENDING_VERIFICATION";

  async function run(request, okText) {
    setBusy(true);
    setError("");
    try {
      await request();
      setNotice({ type: "success", text: okText });
      await onChanged();
    } catch (err) {
      setError(apiErrorMessage(err, isArabic));
    } finally {
      setBusy(false);
    }
  }

  const changeStatus = (status) => {
    if (status === "CANCELLED" && !window.confirm(pick("Cancel this order? The stock will be returned.", "إلغاء الطلب؟ هيتم إرجاع المخزون."))) return;
    run(() => api.put(`/admin/orders/${order.id}/status`, { status }), pick("Order status updated.", "تم تحديث حالة الطلب."));
  };

  const verify = (action) => {
    if (action === "REJECT" && !window.confirm(pick("Reject the payment? The order will be cancelled.", "رفض الدفع؟ هيتم إلغاء الطلب."))) return;
    run(
      () => api.put(`/admin/orders/${order.id}/payment/verify`, { action, notes }),
      action === "APPROVE" ? pick("Payment approved.", "تم قبول الدفع.") : pick("Payment rejected.", "تم رفض الدفع.")
    );
  };

  return (
    <Modal title={`${pick("Order", "طلب")} ${order.orderNumber}`} onClose={onClose} wide>
      <Alert type="error" onClose={() => setError("")}>
        {error}
      </Alert>

      <div className="adm-status-row">
        <Pill kind={`status-${order.status}`}>{label(ORDER_STATUS, order.status, isArabic)}</Pill>
        <small>{formatDate(order.createdAt)}</small>
        <span style={{ marginInlineStart: "auto" }} />
        {NEXT_STATUS[order.status].map((next) => (
          <button
            key={next}
            className={`adm-btn ${next === "CANCELLED" ? "adm-btn-danger" : "adm-btn-primary"}`}
            disabled={busy || (pendingVodafone && next !== "CANCELLED")}
            onClick={() => changeStatus(next)}
          >
            {label(ORDER_STATUS, next, isArabic)}
          </button>
        ))}
      </div>
      {pendingVodafone && <p className="adm-hint">{pick("Approve or reject the Vodafone Cash payment below before processing the order.", "اقبلي أو ارفضي دفعة فودافون كاش تحت قبل ما تنفذي الطلب.")}</p>}

      {pendingVodafone && (
        <div className="adm-pay-panel">
          <strong>{pick("Vodafone Cash payment waiting for your review", "دفعة فودافون كاش في انتظار مراجعتك")}</strong>
          <p className="adm-hint">
            {pick("Check the screenshot and your Vodafone Cash wallet, then approve or reject.", "راجعي الصورة ومحفظة فودافون كاش، وبعدها اقبلي أو ارفضي.")}
          </p>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={pick("Note for the customer (optional, shown if rejected)", "ملاحظة للعميلة (اختياري، بتظهر لو اترفض)")} />
          <div className="adm-actions">
            <button className="adm-btn adm-btn-ok" disabled={busy} onClick={() => verify("APPROVE")}>
              <Check size={14} /> {pick("Approve payment", "قبول الدفع")}
            </button>
            <button className="adm-btn adm-btn-danger" disabled={busy} onClick={() => verify("REJECT")}>
              <X size={14} /> {pick("Reject payment", "رفض الدفع")}
            </button>
          </div>
        </div>
      )}

      <div className="adm-detail-grid">
        <div className="adm-box">
          <h4>{pick("Customer & delivery", "العميلة والتوصيل")}</h4>
          <p>
            <b>{order.customerName}</b>
          </p>
          <p dir="ltr" style={{ textAlign: isArabic ? "right" : "left" }}>{order.customerPhone}</p>
          <p>
            <b>{cityLabel(order.city)}</b>
          </p>
          <p>{order.address}</p>
          {order.user && (
            <p className="adm-hint">
              {pick("Account", "الحساب")}: {order.user.name} — {order.user.email}
            </p>
          )}
        </div>

        <div className="adm-box">
          <h4>{pick("Payment", "الدفع")}</h4>
          <p>
            <b>{label(PAYMENT_METHOD, payment?.method, isArabic)}</b>{" "}
            <Pill kind={`pay-${payment?.status}`}>{label(PAYMENT_STATUS, payment?.status, isArabic)}</Pill>
          </p>
          {payment?.method === "VODAFONE_CASH" && (
            <>
              <p>
                {pick("Paid from", "دفعت من")}: <b dir="ltr">{payment.senderPhone}</b>
              </p>
              <p>
                {pick("Transaction ID", "رقم العملية")}: <b dir="ltr">{payment.transactionId}</b>
              </p>
              {payment.reviewNotes && (
                <p>
                  {pick("Review note", "ملاحظة المراجعة")}: {payment.reviewNotes}
                </p>
              )}
              {payment.proofImage && (
                <a href={assetUrl(payment.proofImage)} target="_blank" rel="noreferrer">
                  <img className="adm-proof" src={assetUrl(payment.proofImage)} alt={pick("Payment proof", "إثبات الدفع")} />
                </a>
              )}
            </>
          )}
        </div>
      </div>

      <ul className="adm-items">
        {order.items.map((item) => (
          <li key={item.id}>
            {item.product?.image && <img src={assetUrl(item.product.image)} alt="" />}
            <div>
              <b>{item.product ? nameOf(item.product) : item.productName}</b>
              <small>
                {[item.size && `${pick("Size", "المقاس")}: ${item.size}`, item.color && `${pick("Color", "اللون")}: ${colorLabel({ name: item.color })}`, item.scent && `${pick("Scent", "الرائحة")}: ${item.scent}`].filter(Boolean).join(" · ")}
              </small>
            </div>
            <span>
              {item.quantity} × {money(item.price, isArabic)}
            </span>
            <b>{money(Number(item.price) * item.quantity, isArabic)}</b>
          </li>
        ))}
      </ul>

      <div className="adm-totals">
        <div>
          <span>{pick("Subtotal", "المجموع")}</span>
          <span>{money(order.subtotal, isArabic)}</span>
        </div>
        <div>
          <span>
            {pick("Shipping", "الشحن")} ({cityLabel(order.city)})
          </span>
          <span>{Number(order.shippingCost) ? money(order.shippingCost, isArabic) : pick("Free", "مجاني")}</span>
        </div>
        <div className="adm-grand">
          <span>{pick("Total", "الإجمالي")}</span>
          <span>{money(order.totalAmount, isArabic)}</span>
        </div>
      </div>
    </Modal>
  );
}

export default AdminOrders;
