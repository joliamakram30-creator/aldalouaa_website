import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, ImagePlus, Image as ImageIcon } from "lucide-react";
import api, { assetUrl } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";
import { apiErrorMessage } from "../../utils/apiErrors";
import { MAX_IMAGE_BYTES, IMAGE_TYPES } from "../../utils/format";
import { PageHeader, Alert, Modal, Loading, Field } from "../ui";

function AdminCategories() {
  const { isArabic, pick } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [editing, setEditing] = useState(null); // null | "new" | category

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/categories");
      setCategories(data.categories);
    } catch (err) {
      setNotice({ type: "error", text: apiErrorMessage(err, isArabic) });
    } finally {
      setLoading(false);
    }
  }, [isArabic]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(category) {
    if (!window.confirm(pick(`Delete category "${category.name}"?`, `حذف قسم "${category.nameAr || category.name}"؟`))) return;
    try {
      await api.delete(`/categories/${category.id}`);
      setNotice({ type: "success", text: pick("Category deleted.", "تم حذف القسم.") });
      load();
    } catch (err) {
      setNotice({ type: "error", text: apiErrorMessage(err, isArabic, pick("Could not delete the category.", "مقدرناش نحذف القسم."))
        .replace("Cannot delete a category that contains products", pick("Cannot delete a category that contains products", "مينفعش تحذفي قسم فيه منتجات، انقلي المنتجات الأول.")) });
    }
  }

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader
        eyebrow={pick("CATALOG", "الكتالوج")}
        title={pick("Categories", "الأقسام")}
        subtitle={pick(`${categories.length} categories`, `${categories.length} قسم`)}
        action={
          <button className="admin-primary-btn" onClick={() => setEditing("new")}>
            <Plus size={16} style={{ verticalAlign: "-3px" }} /> {pick("Add Category", "إضافة قسم")}
          </button>
        }
      />

      <Alert type={notice?.type} onClose={() => setNotice(null)}>
        {notice?.text}
      </Alert>

      <div className="adm-cat-grid" style={{ marginTop: 20 }}>
        {categories.map((c) => (
          <div className="adm-cat" key={c.id}>
            {c.image ? (
              <img src={assetUrl(c.image)} alt="" />
            ) : (
              <div className="adm-cat-empty">
                <ImageIcon size={28} />
              </div>
            )}
            <div className="adm-cat-body">
              <strong>{isArabic ? c.nameAr || c.name : c.name}</strong>
              <small>
                {(isArabic ? c.name : c.nameAr) || ""} · {c._count?.products ?? 0} {pick("products", "منتج")}
              </small>
              <div className="adm-cat-actions">
                <button className="adm-btn" onClick={() => setEditing(c)}>
                  <Pencil size={14} /> {pick("Edit", "تعديل")}
                </button>
                <button className="adm-btn adm-btn-danger" onClick={() => remove(c)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {categories.length === 0 && <div className="adm-empty">{pick("No categories yet.", "مفيش أقسام لسه.")}</div>}

      {editing && (
        <CategoryForm
          category={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(text) => {
            setEditing(null);
            setNotice({ type: "success", text });
            load();
          }}
        />
      )}
    </div>
  );
}

function CategoryForm({ category, onClose, onSaved }) {
  const { isArabic, pick } = useLanguage();
  const isEdit = Boolean(category);
  const [name, setName] = useState(category?.name || "");
  const [nameAr, setNameAr] = useState(category?.nameAr || "");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(category?.image ? assetUrl(category.image) : "");
  const [removeImage, setRemoveImage] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const input = useRef(null);

  function pickFile(selected) {
    if (!selected) return;
    if (!IMAGE_TYPES.includes(selected.type)) return setError(pick("Please choose a JPG, PNG, WEBP or GIF image.", "اختاري صورة JPG أو PNG أو WEBP أو GIF."));
    if (selected.size > MAX_IMAGE_BYTES) return setError(pick("The image must be 5 MB or smaller.", "حجم الصورة لازم يكون 5 ميجا أو أقل."));
    setError("");
    if (file) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setRemoveImage(false);
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!name.trim() && !nameAr.trim()) return setError(pick("Please enter the category name.", "من فضلك اكتبي اسم القسم."));

    const payload = new FormData();
    payload.append("name", name.trim());
    payload.append("nameAr", nameAr.trim());
    if (file) payload.append("image", file);
    if (removeImage && !file) payload.append("removeImage", "true");

    setSaving(true);
    try {
      if (isEdit) await api.put(`/categories/${category.id}`, payload);
      else await api.post("/categories", payload);
      onSaved(isEdit ? pick("Category updated.", "تم تعديل القسم.") : pick("Category added.", "تمت إضافة القسم."));
    } catch (err) {
      setError(apiErrorMessage(err, isArabic));
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? pick("Edit category", "تعديل القسم") : pick("Add category", "إضافة قسم")} onClose={onClose}>
      <form onSubmit={submit}>
        <Alert type="error" onClose={() => setError("")}>
          {error}
        </Alert>

        <div className="adm-grid-2">
          <Field label={pick("Name (English)", "الاسم (إنجليزي)")}>
            <input value={name} onChange={(e) => setName(e.target.value)} dir="ltr" maxLength={191} />
          </Field>
          <Field label={pick("Name (Arabic)", "الاسم (عربي)")}>
            <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" maxLength={191} />
          </Field>
        </div>

        <Field label={pick("Category picture", "صورة القسم")}>
          <div className="adm-images" style={{ gridTemplateColumns: "repeat(2, minmax(0, 140px))" }}>
            {preview && !removeImage && (
              <div className="adm-image cover">
                <img src={preview} alt="" />
              </div>
            )}
            <label className="adm-add-image">
              <ImagePlus size={24} />
              <span>{preview && !removeImage ? pick("Change picture", "تغيير الصورة") : pick("Add picture", "إضافة صورة")}</span>
              <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => pickFile(e.target.files?.[0])} />
            </label>
          </div>
          {isEdit && category.image && !file && (
            <label className="adm-check" style={{ marginTop: 8, width: "fit-content" }}>
              <input type="checkbox" checked={removeImage} onChange={(e) => setRemoveImage(e.target.checked)} />
              {pick("Remove current picture", "حذف الصورة الحالية")}
            </label>
          )}
        </Field>

        <div className="adm-form-footer">
          <button type="button" className="admin-secondary-btn" onClick={onClose}>
            {pick("Cancel", "إلغاء")}
          </button>
          <button type="submit" className="admin-primary-btn" disabled={saving}>
            {saving ? pick("Saving...", "جاري الحفظ...") : pick("Save", "حفظ")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default AdminCategories;
