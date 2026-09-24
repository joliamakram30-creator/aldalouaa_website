import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import api from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";
import { apiErrorMessage } from "../../utils/apiErrors";
import { PageHeader, Alert, Loading } from "../ui";
import { money } from "../../utils/money";

function AdminShipping() {
  const { isArabic, pick } = useLanguage();
  const [zones, setZones] = useState([]);
  const [threshold, setThreshold] = useState(0);
  const [freeEnabled, setFreeEnabled] = useState(false);
  const [thresholdDraft, setThresholdDraft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [drafts, setDrafts] = useState({}); // id -> edited price text
  const [newZone, setNewZone] = useState({ nameAr: "", nameEn: "", price: "" });

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/shipping");
      setZones(data.zones);
      setThreshold(data.freeShippingThreshold);
      setFreeEnabled(Boolean(data.freeShippingEnabled));
      setThresholdDraft(data.freeShippingThreshold || 0);
      setDrafts({});
    } catch (err) {
      setNotice({ type: "error", text: apiErrorMessage(err, isArabic) });
    } finally {
      setLoading(false);
    }
  }, [isArabic]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(request, okText) {
    try {
      await request();
      setNotice({ type: "success", text: okText });
      await load();
      return true;
    } catch (err) {
      setNotice({ type: "error", text: apiErrorMessage(err, isArabic) });
      return false;
    }
  }


  async function saveFreeShipping() {
    const value = Number(thresholdDraft);
    if (freeEnabled && (!Number.isFinite(value) || value <= 0)) {
      return setNotice({ type: "error", text: pick("Enter a valid free-shipping threshold.", "اكتبي حد صحيح للشحن المجاني.") });
    }
    await run(
      () => api.put("/admin/shipping/free-shipping", { enabled: freeEnabled, threshold: value }),
      freeEnabled ? pick("Free shipping settings updated.", "تم تحديث إعدادات الشحن المجاني.") : pick("Free shipping disabled.", "تم إلغاء الشحن المجاني.")
    );
  }

  const savePrice = (zone) => {
    const price = Number(drafts[zone.id]);
    if (Number.isNaN(price) || price < 0) return setNotice({ type: "error", text: pick("Enter a valid price.", "اكتبي سعر صحيح.") });
    run(() => api.put(`/admin/shipping/${zone.id}`, { price }), pick("Shipping price updated.", "تم تحديث سعر الشحن."));
  };

  async function addZone(e) {
    e.preventDefault();
    const price = Number(newZone.price);
    if (!newZone.nameAr.trim() || newZone.price === "" || Number.isNaN(price) || price < 0) {
      return setNotice({ type: "error", text: pick("Enter the governorate name (Arabic) and a price.", "اكتبي اسم المحافظة بالعربي والسعر.") });
    }
    if (await run(() => api.post("/admin/shipping", { ...newZone, price }), pick("Governorate added.", "تمت إضافة المحافظة."))) {
      setNewZone({ nameAr: "", nameEn: "", price: "" });
    }
  }

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader
        eyebrow={pick("STORE SETTINGS", "إعدادات المتجر")}
        title={pick("Shipping", "الشحن")}
        subtitle={pick("The shipping price of each governorate. Customers pick their governorate at checkout.", "سعر الشحن لكل محافظة. العميلة بتختار محافظتها في إتمام الطلب.")}
      />

      <Alert type={notice?.type} onClose={() => setNotice(null)}>
        {notice?.text}
      </Alert>

      <div className="adm-card" style={{ marginBottom: 18 }}>
        <h3>{pick("Free shipping", "الشحن المجاني")}</h3>
        <p style={{ margin: "4px 0 14px" }}>
          {freeEnabled ? pick("Orders reaching the threshold ship free.", "الطلبات اللي بتوصل للحد المحدد شحنها مجاني.") : pick("Free shipping is currently disabled.", "الشحن المجاني متوقف حاليًا.")}
        </p>
        <div className="adm-filters" style={{ margin: 0 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={freeEnabled} onChange={(e) => setFreeEnabled(e.target.checked)} />
            {pick("Enable free shipping", "تفعيل الشحن المجاني")}
          </label>
          <input type="number" min="1" step="1" value={thresholdDraft} onChange={(e) => setThresholdDraft(e.target.value)} disabled={!freeEnabled} style={{ width: 180 }} />
          <span>{pick("EGP minimum", "ج.م حد أدنى")}</span>
          <button type="button" className="adm-btn adm-btn-primary" onClick={saveFreeShipping}><Save size={14} /> {pick("Save", "حفظ")}</button>
        </div>
        <small className="adm-hint">{freeEnabled && threshold > 0 ? pick(`Current: ${money(threshold, false)}.`, `الحالي: ${money(threshold, true)}.`) : pick("You can turn it off completely.", "تقدري تلغيه خالص.")}</small>
      </div>

      <form className="adm-filters" onSubmit={addZone}>
        <input className="adm-grow" value={newZone.nameAr} onChange={(e) => setNewZone({ ...newZone, nameAr: e.target.value })} placeholder={pick("New governorate (Arabic)", "محافظة جديدة (عربي)")} dir="rtl" maxLength={100} />
        <input className="adm-grow" value={newZone.nameEn} onChange={(e) => setNewZone({ ...newZone, nameEn: e.target.value })} placeholder={pick("Name (English, optional)", "الاسم (إنجليزي، اختياري)")} dir="ltr" maxLength={100} />
        <input type="number" min="0" step="1" value={newZone.price} onChange={(e) => setNewZone({ ...newZone, price: e.target.value })} placeholder={pick("Price (EGP)", "السعر (ج.م)")} style={{ width: 130 }} />
        <button className="adm-btn adm-btn-primary" type="submit">
          <Plus size={14} /> {pick("Add", "إضافة")}
        </button>
      </form>

      <div className="adm-table-wrap">
        <table className="adm-table" style={{ minWidth: 560 }}>
          <thead>
            <tr>
              <th>{pick("Governorate", "المحافظة")}</th>
              <th>{pick("Shipping price (EGP)", "سعر الشحن (ج.م)")}</th>
              <th>{pick("Available", "متاحة")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {zones.map((zone) => {
              const draft = drafts[zone.id];
              const dirty = draft !== undefined && Number(draft) !== Number(zone.price);
              return (
                <tr key={zone.id}>
                  <td>
                    <strong>{isArabic ? zone.nameAr : zone.nameEn}</strong>
                    <small>{isArabic ? zone.nameEn : zone.nameAr}</small>
                  </td>
                  <td>
                    <input
                      className="adm-price-input"
                      type="number"
                      min="0"
                      step="1"
                      value={draft ?? Number(zone.price)}
                      onChange={(e) => setDrafts({ ...drafts, [zone.id]: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && dirty && savePrice(zone)}
                    />{" "}
                    {dirty && (
                      <button className="adm-btn adm-btn-ok" onClick={() => savePrice(zone)}>
                        <Save size={14} /> {pick("Save", "حفظ")}
                      </button>
                    )}
                  </td>
                  <td>
                    <label className="adm-switch" title={pick("Show at checkout", "تظهر في إتمام الطلب")}>
                      <input
                        type="checkbox"
                        checked={zone.isActive}
                        onChange={(e) => run(() => api.put(`/admin/shipping/${zone.id}`, { isActive: e.target.checked }), pick("Updated.", "تم التحديث."))}
                      />
                      <span />
                    </label>
                  </td>
                  <td>
                    <button
                      className="adm-btn adm-btn-danger"
                      onClick={() => window.confirm(pick(`Delete ${zone.nameEn}?`, `حذف ${zone.nameAr}؟`)) && run(() => api.delete(`/admin/shipping/${zone.id}`), pick("Governorate deleted.", "تم حذف المحافظة."))}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {zones.length === 0 && <div className="adm-empty">{pick("No governorates yet.", "مفيش محافظات لسه.")}</div>}
      </div>
    </div>
  );
}

export default AdminShipping;
