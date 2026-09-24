import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout";
import api from "../services/api";
import { useCart } from "../context/CartContext";
import { useStore } from "../context/StoreContext";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

const isValidEgyptianPhone = (value) => /^(010|011|012|015)\d{8}$/.test(String(value || "").replace(/\s+/g, ""));
const pick = (en, ar, language) => (language === "ar" ? ar : en);

export default function Checkout() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();
  const { cartItems, totalPrice, refreshCart } = useCart();
  const { config, reload } = useStore();
  const { language, isArabic, money, zoneName } = useLanguage();

  const [form, setForm] = useState({ name: user?.name || "", phone: user?.phone || "", address: "", zoneId: "" });
  const [paymentMethod, setPaymentMethod] = useState("CASH_ON_DELIVERY");
  const [senderPhone, setSenderPhone] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [paymentProof, setPaymentProof] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [placedOrder, setPlacedOrder] = useState(null);

  useEffect(() => {
    if (!isLoggedIn) navigate("/login", { state: { from: "/checkout" }, replace: true });
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (user) setForm((prev) => ({ ...prev, name: prev.name || user.name || "", phone: prev.phone || user.phone || "" }));
  }, [user]);

  const selectedZone = useMemo(() => config.zones.find((z) => String(z.id) === String(form.zoneId)) || null, [config.zones, form.zoneId]);
  const shippingCost = selectedZone
    ? (config.freeShippingEnabled && config.freeShippingThreshold > 0 && totalPrice >= config.freeShippingThreshold ? 0 : Number(selectedZone.price))
    : 0;
  const grandTotal = totalPrice + shippingCost;
  const hasUnavailable = cartItems.some((item) => !item.available);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!cartItems.length) return setError(pick("Your cart is empty.", "سلة المشتريات فاضية.", language));
    if (hasUnavailable) return setError(pick("Remove unavailable products first.", "احذفي المنتجات غير المتاحة الأول.", language));
    if (form.name.trim().length < 2) return setError(pick("Please enter your full name.", "اكتبي الاسم بالكامل.", language));
    if (!isValidEgyptianPhone(form.phone)) return setError(pick("Please enter a valid Egyptian phone number.", "اكتبي رقم موبايل مصري صحيح.", language));
    if (form.address.trim().length < 8) return setError(pick("Please enter a complete address.", "اكتبي العنوان بالتفصيل.", language));
    if (!form.zoneId) return setError(pick("Please select your governorate.", "اختاري المحافظة.", language));
    if (paymentMethod === "VODAFONE_CASH") {
      if (!isValidEgyptianPhone(senderPhone)) return setError(pick("Please enter the Vodafone Cash sender number.", "اكتبي رقم الموبايل اللي تم التحويل منه بشكل صحيح.", language));
      if (transactionId.trim().length < 4) return setError(pick("Please enter the transaction ID.", "اكتبي رقم العملية.", language));
      if (!paymentProof) return setError(pick("Please upload the payment proof.", "ارفعي صورة إثبات الدفع.", language));
    }

    try {
      setSubmitting(true);
      const payload = new FormData();
      payload.append("customerName", form.name.trim());
      payload.append("customerPhone", form.phone.replace(/\s+/g, ""));
      payload.append("address", form.address.trim());
      payload.append("governorateId", String(form.zoneId));
      payload.append("paymentMethod", paymentMethod);
      if (paymentMethod === "VODAFONE_CASH") {
        payload.append("senderPhone", senderPhone.replace(/\s+/g, ""));
        payload.append("transactionId", transactionId.trim());
        payload.append("paymentProofImage", paymentProof);
      }
      const { data } = await api.post("/orders", payload);
      setPlacedOrder(data.order);
      await refreshCart();
      await reload();
    } catch (err) {
      setError(err?.response?.data?.message || pick("Something went wrong while placing your order.", "حصلت مشكلة أثناء تأكيد الطلب.", language));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoggedIn) return null;

  if (placedOrder) {
    return <PageLayout><main className="page-shell"><section className="checkout-success">
      <h1>{pick("Order placed successfully", "تم تأكيد الطلب بنجاح", language)}</h1>
      <p>{pick("Your order has been received successfully.", "تم استلام طلبك بنجاح.", language)}</p>
      <p><strong>{pick("Order number:", "رقم الطلب:", language)}</strong> {placedOrder.orderNumber}</p>
      <button type="button" className="btn btn-primary" onClick={() => navigate("/profile")}>{pick("View My Orders", "شوفي طلباتي", language)}</button>
    </section></main></PageLayout>;
  }

  return <PageLayout><main className="page-shell checkout-page">
    <div className="checkout-container">
      <section className="checkout-main">
        <div className="checkout-header"><h1>{pick("Checkout", "تأكيد الطلب", language)}</h1><p>{pick("Complete your information to place your order.", "كملي بياناتك علشان تأكدي الطلب.", language)}</p></div>
        {error && <div className="checkout-error" role="alert">{error}</div>}
        <form className="checkout-form" onSubmit={submit}>
          <div className="checkout-section">
            <h2>{pick("Delivery Details", "بيانات التوصيل", language)}</h2>
            <div className="checkout-field"><label>{pick("Full Name", "الاسم بالكامل", language)}</label><input value={form.name} onChange={(e) => update("name", e.target.value)} required /></div>
            <div className="checkout-field"><label>{pick("Phone Number", "رقم الموبايل", language)}</label><input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="01xxxxxxxxx" required /></div>
            <div className="checkout-field"><label>{pick("Address", "العنوان بالتفصيل", language)}</label><textarea rows={4} value={form.address} onChange={(e) => update("address", e.target.value)} required /></div>
            <div className="checkout-field"><label>{pick("Governorate", "المحافظة", language)}</label><select value={form.zoneId} onChange={(e) => update("zoneId", e.target.value)} required><option value="">{pick("Select your governorate", "اختاري المحافظة", language)}</option>{config.zones.map((zone) => <option key={zone.id} value={zone.id}>{zoneName(zone)}</option>)}</select></div>
          </div>
          <div className="checkout-section">
            <h2>{pick("Payment Method", "طريقة الدفع", language)}</h2>
            <div className="payment-options">
              <label className="payment-option"><input type="radio" name="payment" checked={paymentMethod === "CASH_ON_DELIVERY"} onChange={() => setPaymentMethod("CASH_ON_DELIVERY")} /><span>{pick("Cash on Delivery", "الدفع عند الاستلام", language)}</span></label>
              <label className="payment-option"><input type="radio" name="payment" checked={paymentMethod === "VODAFONE_CASH"} onChange={() => setPaymentMethod("VODAFONE_CASH")} /><span>{pick("Vodafone Cash", "فودافون كاش", language)}</span></label>
            </div>
            {paymentMethod === "VODAFONE_CASH" && <div className="vodafone-payment-fields">
              <div className="checkout-payment-note">{pick(`Transfer to: ${config.vodafoneCashNumber}`, `حوّلي على رقم فودافون كاش: ${config.vodafoneCashNumber}`, language)}</div>
              <div className="checkout-field"><label>{pick("Sender Phone", "رقم الموبايل اللي تم التحويل منه", language)}</label><input value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} placeholder="01xxxxxxxxx" /></div>
              <div className="checkout-field"><label>{pick("Transaction ID", "رقم العملية", language)}</label><input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} /></div>
              <div className="checkout-field"><label>{pick("Payment Proof", "إثبات الدفع", language)}</label><input type="file" accept="image/*" onChange={(e) => setPaymentProof(e.target.files?.[0] || null)} /></div>
            </div>}
          </div>
          <button className="btn btn-primary checkout-submit" type="submit" disabled={submitting || hasUnavailable}>{submitting ? pick("Placing your order...", "جاري تأكيد الطلب...", language) : pick("Place Order", "تأكيد الطلب", language)}</button>
        </form>
      </section>
      <aside className="checkout-summary">
        <h2>{pick("Your Order", "طلبك", language)}</h2>
        {cartItems.map((item) => <div className="checkout-item" key={item.key}><div className="checkout-item-info"><strong>{isArabic ? item.product.nameAr || item.product.name : item.product.name}</strong><small>{[item.size && `${pick("Size", "المقاس", language)}: ${item.size}`, item.color && `${pick("Color", "اللون", language)}: ${item.colorObj ? (isArabic ? item.colorObj.nameAr || item.colorObj.name : item.colorObj.name) : item.color}`, item.scent && `${pick("Scent", "الرائحة", language)}: ${item.scentObj ? (isArabic ? item.scentObj.nameAr || item.scentObj.name : item.scentObj.name) : item.scent}`].filter(Boolean).join(" · ")}</small><small>{item.quantity} × {money(item.product.price)}</small></div><strong>{money(item.product.price * item.quantity)}</strong></div>)}
        <div className="checkout-summary-row"><span>{pick("Subtotal", "الإجمالي الفرعي", language)}</span><strong>{money(totalPrice)}</strong></div>
        <div className="checkout-summary-row"><span>{pick("Shipping", "الشحن", language)}</span><strong>{shippingCost === 0 && selectedZone ? pick("Free", "مجاني", language) : money(shippingCost)}</strong></div>
        {config.freeShippingEnabled && config.freeShippingThreshold > 0 && totalPrice < config.freeShippingThreshold && <p>{pick(`Add ${money(config.freeShippingThreshold - totalPrice)} more for free shipping.`, `ضيفي ${money(config.freeShippingThreshold - totalPrice, true)} كمان علشان الشحن يبقى مجاني.`, language)}</p>}
        <div className="checkout-summary-total"><span>{pick("Total", "الإجمالي النهائي", language)}</span><strong>{money(grandTotal)}</strong></div>
      </aside>
    </div>
  </main></PageLayout>;
}
