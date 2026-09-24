
import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";

import api from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";
import { apiErrorMessage } from "../../utils/apiErrors";
import { sortSizes } from "../../utils/format";
import { PageHeader, Alert, Loading } from "../ui";

function AdminOptions() {
  const { isArabic, pick, colorLabel } = useLanguage();

  // =========================
  // OPTIONS DATA
  // =========================
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);
  const [scents, setScents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);

  // =========================
  // SIZE STATE
  // =========================
  const [sizeName, setSizeName] = useState("");

  // =========================
  // COLOR STATE
  // =========================
  const [color, setColor] = useState({
    name: "",
    nameAr: "",
    hexCode: "#d94f70",
  });

  const [editingColor, setEditingColor] = useState(null);

  // =========================
  // SCENT STATE
  // =========================
  const [scent, setScent] = useState({
    name: "",
    nameAr: "",
  });

  const [editingScent, setEditingScent] = useState(null);

  // =========================
  // LOAD ALL OPTIONS
  // =========================
  const load = useCallback(async () => {
    try {
      const [sizesResponse, colorsResponse, scentsResponse] =
        await Promise.all([
          api.get("/admin/options/sizes"),
          api.get("/admin/options/colors"),
          api.get("/admin/options/scents"),
        ]);

      setSizes(sizesResponse.data.sizes || []);
      setColors(colorsResponse.data.colors || []);
      setScents(scentsResponse.data.scents || []);
    } catch (err) {
      console.error("Admin Options Load Error:", err);

      setNotice({
        type: "error",
        text: apiErrorMessage(err, isArabic),
      });
    } finally {
      setLoading(false);
    }
  }, [isArabic]);

  useEffect(() => {
    load();
  }, [load]);

  // =========================
  // COMMON REQUEST HELPER
  // =========================
  async function run(request, okText) {
    try {
      await request();

      if (okText) {
        setNotice({
          type: "success",
          text: okText,
        });
      }

      await load();

      return true;
    } catch (err) {
      console.error("Admin Options Action Error:", err);

      setNotice({
        type: "error",
        text: apiErrorMessage(err, isArabic),
      });

      return false;
    }
  }

  // =========================
  // ADD SIZE
  // =========================
  async function addSize(e) {
    e.preventDefault();

    const name = sizeName.trim();

    if (!name) return;

    const success = await run(
      () => api.post("/admin/options/sizes", { name }),
      pick("Size added.", "تمت إضافة المقاس.")
    );

    if (success) {
      setSizeName("");
    }
  }

  // =========================
  // ADD COLOR
  // =========================
  async function addColor(e) {
    e.preventDefault();

    const name = color.name.trim();
    const nameAr = color.nameAr.trim();

    if (!name && !nameAr) return;

    const success = await run(
      () =>
        api.post("/admin/options/colors", {
          name,
          nameAr,
          hexCode: color.hexCode,
        }),
      pick("Color added.", "تمت إضافة اللون.")
    );

    if (success) {
      setColor({
        name: "",
        nameAr: "",
        hexCode: "#d94f70",
      });
    }
  }

  // =========================
  // SAVE COLOR
  // =========================
  async function saveColor() {
    if (!editingColor) return;

    const name = String(editingColor.name || "").trim();
    const nameAr = String(editingColor.nameAr || "").trim();

    if (!name && !nameAr) return;

    const success = await run(
      () =>
        api.put(`/admin/options/colors/${editingColor.id}`, {
          ...editingColor,
          name,
          nameAr,
        }),
      pick("Color updated.", "تم تعديل اللون.")
    );

    if (success) {
      setEditingColor(null);
    }
  }

  // =========================
  // ADD SCENT
  // =========================
  async function addScent(e) {
    e.preventDefault();

    const name = scent.name.trim();
    const nameAr = scent.nameAr.trim();

    if (!name && !nameAr) return;

    const success = await run(
      () =>
        api.post("/admin/options/scents", {
          name,
          nameAr,
        }),
      pick("Scent added.", "تمت إضافة الرائحة.")
    );

    if (success) {
      setScent({
        name: "",
        nameAr: "",
      });
    }
  }

  // =========================
  // SAVE SCENT
  // =========================
  async function saveScent() {
    if (!editingScent) return;

    const name = String(editingScent.name || "").trim();
    const nameAr = String(editingScent.nameAr || "").trim();

    if (!name && !nameAr) return;

    const success = await run(
      () =>
        api.put(`/admin/options/scents/${editingScent.id}`, {
          ...editingScent,
          name,
          nameAr,
        }),
      pick("Scent updated.", "تم تعديل الرائحة.")
    );

    if (success) {
      setEditingScent(null);
    }
  }

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return <Loading />;
  }

  // =========================
  // PAGE
  // =========================
  return (
    <div>
      <PageHeader
        eyebrow={pick("CATALOG", "الكتالوج")}
        title={pick(
          "Sizes, Colors & Scents",
          "المقاسات والألوان والروائح"
        )}
        subtitle={pick(
          "These options can be attached to any product.",
          "الاختيارات دي تقدري تربطيها بأي منتج."
        )}
      />

      <Alert
        type={notice?.type}
        onClose={() => setNotice(null)}
      >
        {notice?.text}
      </Alert>

      <div
        className="adm-two-col"
        style={{
          marginTop: 20,
        }}
      >
        {/* =====================================================
            SIZES
        ====================================================== */}
        <div className="adm-card">
          <h2 className="adm-section-title">
            {pick("Sizes", "المقاسات")}
          </h2>

          <form
            className="adm-filters"
            style={{
              margin: "0 0 14px",
            }}
            onSubmit={addSize}
          >
            <input
              className="adm-grow"
              value={sizeName}
              onChange={(e) => setSizeName(e.target.value)}
              placeholder={pick(
                "e.g. S, M, L, 38, Free Size",
                "مثال: S, M, L, 38, فري سايز"
              )}
              maxLength={50}
            />

            <button
              className="adm-btn adm-btn-primary"
              type="submit"
            >
              <Plus size={14} />
              {pick("Add", "إضافة")}
            </button>
          </form>

          <ul className="adm-list">
            {sortSizes(
              sizes.map((s) => s.name)
            )
              .map((name) =>
                sizes.find((s) => s.name === name)
              )
              .map((size) => (
                <li key={size.id}>
                  <b>{size.name}</b>

                  <button
                    type="button"
                    className="adm-btn adm-btn-danger"
                    onClick={() =>
                      window.confirm(
                        pick(
                          `Delete size ${size.name}?`,
                          `حذف المقاس ${size.name}؟`
                        )
                      ) &&
                      run(
                        () =>
                          api.delete(
                            `/admin/options/sizes/${size.id}`
                          ),
                        pick(
                          "Size deleted.",
                          "تم حذف المقاس."
                        )
                      )
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}

            {sizes.length === 0 && (
              <li className="adm-hint">
                {pick(
                  "No sizes yet.",
                  "مفيش مقاسات لسه."
                )}
              </li>
            )}
          </ul>
        </div>

        {/* =====================================================
            COLORS
        ====================================================== */}
        <div className="adm-card">
          <h2 className="adm-section-title">
            {pick("Colors", "الألوان")}
          </h2>

          <form
            onSubmit={addColor}
            style={{
              display: "grid",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <div
              className="adm-filters"
              style={{ margin: 0 }}
            >
              <input
                className="adm-grow"
                value={color.name}
                onChange={(e) =>
                  setColor({
                    ...color,
                    name: e.target.value,
                  })
                }
                placeholder={pick(
                  "Name (English)",
                  "الاسم (إنجليزي)"
                )}
                dir="ltr"
                maxLength={50}
              />

              <input
                className="adm-grow"
                value={color.nameAr}
                onChange={(e) =>
                  setColor({
                    ...color,
                    nameAr: e.target.value,
                  })
                }
                placeholder={pick(
                  "Name (Arabic)",
                  "الاسم (عربي)"
                )}
                dir="rtl"
                maxLength={50}
              />
            </div>

            <div
              className="adm-filters"
              style={{ margin: 0 }}
            >
              <input
                type="color"
                value={color.hexCode}
                onChange={(e) =>
                  setColor({
                    ...color,
                    hexCode: e.target.value,
                  })
                }
                style={{
                  width: 60,
                  padding: 3,
                  height: 40,
                }}
              />

              <button
                className="adm-btn adm-btn-primary"
                type="submit"
              >
                <Plus size={14} />
                {pick(
                  "Add color",
                  "إضافة لون"
                )}
              </button>
            </div>
          </form>

          <ul className="adm-list">
            {colors.map((c) =>
              editingColor?.id === c.id ? (
                <li key={c.id}>
                  <div
                    className="adm-filters"
                    style={{
                      margin: 0,
                      flex: 1,
                    }}
                  >
                    <input
                      type="color"
                      value={
                        editingColor.hexCode ||
                        "#d94f70"
                      }
                      onChange={(e) =>
                        setEditingColor({
                          ...editingColor,
                          hexCode: e.target.value,
                        })
                      }
                      style={{
                        width: 50,
                        padding: 2,
                      }}
                    />

                    <input
                      className="adm-grow"
                      value={editingColor.name}
                      onChange={(e) =>
                        setEditingColor({
                          ...editingColor,
                          name: e.target.value,
                        })
                      }
                      dir="ltr"
                    />

                    <input
                      className="adm-grow"
                      value={
                        editingColor.nameAr || ""
                      }
                      onChange={(e) =>
                        setEditingColor({
                          ...editingColor,
                          nameAr: e.target.value,
                        })
                      }
                      dir="rtl"
                    />
                  </div>

                  <div className="adm-actions">
                    <button
                      type="button"
                      className="adm-btn adm-btn-ok"
                      onClick={saveColor}
                    >
                      <Check size={14} />
                    </button>

                    <button
                      type="button"
                      className="adm-btn"
                      onClick={() =>
                        setEditingColor(null)
                      }
                    >
                      <X size={14} />
                    </button>
                  </div>
                </li>
              ) : (
                <li key={c.id}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span
                      className="adm-swatch"
                      style={{
                        background:
                          c.hexCode || "#ddd",
                        width: 20,
                        height: 20,
                      }}
                    />

                    <b>{colorLabel(c)}</b>

                    <small className="adm-hint">
                      {isArabic
                        ? c.name
                        : c.nameAr}
                    </small>
                  </span>

                  <div className="adm-actions">
                    <button
                      type="button"
                      className="adm-btn"
                      onClick={() =>
                        setEditingColor({
                          id: c.id,
                          name: c.name,
                          nameAr: c.nameAr || "",
                          hexCode:
                            c.hexCode ||
                            "#d94f70",
                        })
                      }
                    >
                      <Pencil size={14} />
                    </button>

                    <button
                      type="button"
                      className="adm-btn adm-btn-danger"
                      onClick={() =>
                        window.confirm(
                          pick(
                            `Delete color ${c.name}?`,
                            `حذف اللون ${colorLabel(c)}؟`
                          )
                        ) &&
                        run(
                          () =>
                            api.delete(
                              `/admin/options/colors/${c.id}`
                            ),
                          pick(
                            "Color deleted.",
                            "تم حذف اللون."
                          )
                        )
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              )
            )}

            {colors.length === 0 && (
              <li className="adm-hint">
                {pick(
                  "No colors yet.",
                  "مفيش ألوان لسه."
                )}
              </li>
            )}
          </ul>
        </div>

        {/* =====================================================
            SCENTS
        ====================================================== */}
        <div className="adm-card">
          <h2 className="adm-section-title">
            {pick("Scents", "الروائح")}
          </h2>

          <form
            onSubmit={addScent}
            style={{
              display: "grid",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <div
              className="adm-filters"
              style={{ margin: 0 }}
            >
              <input
                className="adm-grow"
                value={scent.name}
                onChange={(e) =>
                  setScent({
                    ...scent,
                    name: e.target.value,
                  })
                }
                placeholder={pick(
                  "Name (English)",
                  "الاسم (إنجليزي)"
                )}
                dir="ltr"
                maxLength={50}
              />

              <input
                className="adm-grow"
                value={scent.nameAr}
                onChange={(e) =>
                  setScent({
                    ...scent,
                    nameAr: e.target.value,
                  })
                }
                placeholder={pick(
                  "Name (Arabic)",
                  "الاسم (عربي)"
                )}
                dir="rtl"
                maxLength={50}
              />
            </div>

            <div
              className="adm-filters"
              style={{ margin: 0 }}
            >
              <button
                className="adm-btn adm-btn-primary"
                type="submit"
              >
                <Plus size={14} />
                {pick(
                  "Add scent",
                  "إضافة رائحة"
                )}
              </button>
            </div>
          </form>

          <ul className="adm-list">
            {scents.map((s) =>
              editingScent?.id === s.id ? (
                <li key={s.id}>
                  <div
                    className="adm-filters"
                    style={{
                      margin: 0,
                      flex: 1,
                    }}
                  >
                    <input
                      className="adm-grow"
                      value={editingScent.name}
                      onChange={(e) =>
                        setEditingScent({
                          ...editingScent,
                          name: e.target.value,
                        })
                      }
                      placeholder={pick(
                        "Name (English)",
                        "الاسم (إنجليزي)"
                      )}
                      dir="ltr"
                      maxLength={50}
                    />

                    <input
                      className="adm-grow"
                      value={
                        editingScent.nameAr || ""
                      }
                      onChange={(e) =>
                        setEditingScent({
                          ...editingScent,
                          nameAr: e.target.value,
                        })
                      }
                      placeholder={pick(
                        "Name (Arabic)",
                        "الاسم (عربي)"
                      )}
                      dir="rtl"
                      maxLength={50}
                    />
                  </div>

                  <div className="adm-actions">
                    <button
                      type="button"
                      className="adm-btn adm-btn-ok"
                      onClick={saveScent}
                    >
                      <Check size={14} />
                    </button>

                    <button
                      type="button"
                      className="adm-btn"
                      onClick={() =>
                        setEditingScent(null)
                      }
                    >
                      <X size={14} />
                    </button>
                  </div>
                </li>
              ) : (
                <li key={s.id}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <b>
                      {isArabic
                        ? s.nameAr || s.name
                        : s.name}
                    </b>

                    <small className="adm-hint">
                      {isArabic
                        ? s.name
                        : s.nameAr || ""}
                    </small>
                  </span>

                  <div className="adm-actions">
                    <button
                      type="button"
                      className="adm-btn"
                      onClick={() =>
                        setEditingScent({
                          id: s.id,
                          name: s.name,
                          nameAr:
                            s.nameAr || "",
                        })
                      }
                    >
                      <Pencil size={14} />
                    </button>

                    <button
                      type="button"
                      className="adm-btn adm-btn-danger"
                      onClick={() =>
                        window.confirm(
                          pick(
                            `Delete scent ${s.name}?`,
                            `هل تريدين حذف الرائحة ${
                              s.nameAr || s.name
                            }؟`
                          )
                        ) &&
                        run(
                          () =>
                            api.delete(
                              `/admin/options/scents/${s.id}`
                            ),
                          pick(
                            "Scent deleted.",
                            "تم حذف الرائحة."
                          )
                        )
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              )
            )}

            {scents.length === 0 && (
              <li className="adm-hint">
                {pick(
                  "No scents yet.",
                  "لا توجد روائح حتى الآن."
                )}
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default AdminOptions;

