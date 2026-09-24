
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Plus,
  Pencil,
  Trash2,
  Star,
  Eye,
  EyeOff,
  ImagePlus,
  X,
  ArrowLeft,
  ArrowRight,
  Image as ImageIcon,
} from "lucide-react";

import api, { assetUrl } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";
import { apiErrorMessage } from "../../utils/apiErrors";
import {
  MAX_IMAGE_BYTES,
  IMAGE_TYPES,
  sortSizes,
} from "../../utils/format";
import {
  PageHeader,
  Alert,
  Modal,
  Loading,
  Field,
  Pill,
} from "../ui";
import { money } from "../../utils/money";

const MAX_IMAGES = 10;

const emptyForm = {
  name: "",
  nameAr: "",
  description: "",
  descriptionAr: "",
  price: "",
  oldPrice: "",
  stock: "0",
  categoryId: "",
  isActive: true,
  isFeatured: false,
  sizeIds: [],
  colorIds: [],
  scentIds: [],
};

function AdminProducts() {
  const { isArabic, pick, colorLabel } = useLanguage();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);
  const [scents, setScents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [editing, setEditing] = useState(null);

  // ============================================================
  // LOAD PRODUCTS + OPTIONS
  // ============================================================

  const load = useCallback(async () => {
    try {
      const [
        productsResponse,
        categoriesResponse,
        sizesResponse,
        colorsResponse,
        scentsResponse,
      ] = await Promise.all([
        api.get("/admin/products"),
        api.get("/categories"),
        api.get("/admin/options/sizes"),
        api.get("/admin/options/colors"),
        api.get("/admin/options/scents"),
      ]);

      setProducts(productsResponse.data.products || []);
      setCategories(categoriesResponse.data.categories || []);
      setSizes(sizesResponse.data.sizes || []);
      setColors(colorsResponse.data.colors || []);
      setScents(scentsResponse.data.scents || []);
    } catch (err) {
      console.error("Admin Products Load Error:", err);

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

  // ============================================================
  // FILTER PRODUCTS
  // ============================================================

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((p) => {
      if (
        term &&
        !`${p.name} ${p.nameAr || ""}`
          .toLowerCase()
          .includes(term)
      ) {
        return false;
      }

      if (
        categoryFilter &&
        String(p.categoryId) !== categoryFilter
      ) {
        return false;
      }

      if (statusFilter === "active" && !p.isActive) {
        return false;
      }

      if (statusFilter === "inactive" && p.isActive) {
        return false;
      }

      if (statusFilter === "low" && p.stock > 5) {
        return false;
      }

      return true;
    });
  }, [
    products,
    search,
    categoryFilter,
    statusFilter,
  ]);

  // ============================================================
  // ACTION
  // ============================================================

  async function act(promise, okText) {
    try {
      await promise;

      if (okText) {
        setNotice({
          type: "success",
          text: okText,
        });
      }

      await load();
    } catch (err) {
      console.error("Admin Product Action Error:", err);

      setNotice({
        type: "error",
        text: apiErrorMessage(err, isArabic),
      });
    }
  }

  // ============================================================
  // DELETE PRODUCT
  // ============================================================

  function remove(product) {
    const ok = window.confirm(
      pick(
        `Delete "${product.name}" permanently?`,
        `متأكدة إنك عايزة تمسحي "${
          product.nameAr || product.name
        }" نهائيًا؟`
      )
    );

    if (ok) {
      act(
        api.delete(`/admin/products/${product.id}`),
        pick(
          "Product deleted.",
          "تم حذف المنتج."
        )
      );
    }
  }

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return <Loading />;
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div>
      <PageHeader
        eyebrow={pick("CATALOG", "الكتالوج")}
        title={pick("Products", "المنتجات")}
        subtitle={pick(
          `${products.length} products in your store`,
          `${products.length} منتج في المتجر`
        )}
        action={
          <button
            className="admin-primary-btn"
            onClick={() => setEditing("new")}
          >
            <Plus
              size={16}
              style={{
                verticalAlign: "-3px",
              }}
            />

            {pick(
              "Add Product",
              "إضافة منتج"
            )}
          </button>
        }
      />

      <Alert
        type={notice?.type}
        onClose={() => setNotice(null)}
      >
        {notice?.text}
      </Alert>

      {/* ======================================================
          FILTERS
      ======================================================= */}

      <div className="adm-filters">
        <input
          type="search"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder={pick(
            "Search products...",
            "ابحثي عن منتج..."
          )}
        />

        <select
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value)
          }
        >
          <option value="">
            {pick(
              "All categories",
              "كل الأقسام"
            )}
          </option>

          {categories.map((c) => (
            <option
              key={c.id}
              value={c.id}
            >
              {isArabic
                ? c.nameAr || c.name
                : c.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
        >
          <option value="">
            {pick(
              "All statuses",
              "كل الحالات"
            )}
          </option>

          <option value="active">
            {pick(
              "Active",
              "مفعّل"
            )}
          </option>

          <option value="inactive">
            {pick(
              "Hidden",
              "مخفي"
            )}
          </option>

          <option value="low">
            {pick(
              "Low stock (5 or less)",
              "مخزون قليل (5 أو أقل)"
            )}
          </option>
        </select>
      </div>

      {/* ======================================================
          PRODUCTS TABLE
      ======================================================= */}

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>
                {pick(
                  "Product",
                  "المنتج"
                )}
              </th>

              <th>
                {pick(
                  "Category",
                  "القسم"
                )}
              </th>

              <th>
                {pick(
                  "Price",
                  "السعر"
                )}
              </th>

              <th>
                {pick(
                  "Stock",
                  "المخزون"
                )}
              </th>

              <th>
                {pick(
                  "Status",
                  "الحالة"
                )}
              </th>

              <th>
                {pick(
                  "Actions",
                  "إجراءات"
                )}
              </th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((p) => {
              const cover =
                p.images?.[0]?.url ||
                p.image;

              return (
                <tr key={p.id}>
                  <td>
                    <div className="adm-cell-product">
                      {cover ? (
                        <img
                          className="adm-thumb"
                          src={assetUrl(cover)}
                          alt=""
                        />
                      ) : (
                        <div className="adm-thumb-empty">
                          <ImageIcon size={20} />
                        </div>
                      )}

                      <div>
                        <strong>
                          {isArabic
                            ? p.nameAr ||
                              p.name
                            : p.name}
                        </strong>

                        <small>
                          {(isArabic
                            ? p.name
                            : p.nameAr) ||
                            ""}

                          {p.images?.length
                            ? ` · ${
                                p.images.length
                              } ${pick(
                                "photos",
                                "صور"
                              )}`
                            : ""}
                        </small>
                      </div>
                    </div>
                  </td>

                  <td>
                    {p.category
                      ? isArabic
                        ? p.category.nameAr ||
                          p.category.name
                        : p.category.name
                      : "-"}
                  </td>

                  <td>
                    <strong>
                      {money(
                        p.price,
                        isArabic
                      )}
                    </strong>

                    {p.oldPrice && (
                      <small
                        style={{
                          textDecoration:
                            "line-through",
                        }}
                      >
                        {money(
                          p.oldPrice,
                          isArabic
                        )}
                      </small>
                    )}
                  </td>

                  <td>
                    <Pill
                      kind={
                        p.stock === 0
                          ? "pill-bad"
                          : p.stock <= 5
                          ? "status-PENDING"
                          : "pill-ok"
                      }
                    >
                      {p.stock}
                    </Pill>
                  </td>

                  <td>
                    <Pill
                      kind={
                        p.isActive
                          ? "pill-ok"
                          : "pill-muted"
                      }
                    >
                      {p.isActive
                        ? pick(
                            "Active",
                            "مفعّل"
                          )
                        : pick(
                            "Hidden",
                            "مخفي"
                          )}
                    </Pill>

                    {p.isFeatured && (
                      <small>
                        <Star
                          size={12}
                          style={{
                            verticalAlign:
                              "-2px",
                          }}
                        />{" "}
                        {pick(
                          "Featured",
                          "مميز"
                        )}
                      </small>
                    )}
                  </td>

                  <td>
                    <div className="adm-actions">
                      <button
                        className="adm-btn"
                        onClick={() =>
                          setEditing(p)
                        }
                      >
                        <Pencil size={14} />

                        {pick(
                          "Edit",
                          "تعديل"
                        )}
                      </button>

                      <button
                        className="adm-btn"
                        title={pick(
                          "Hide from store",
                          "إخفاء من المتجر"
                        )}
                        onClick={() =>
                          act(
                            api.put(
                              `/admin/products/${p.id}/status`
                            )
                          )
                        }
                      >
                        {p.isActive ? (
                          <EyeOff size={14} />
                        ) : (
                          <Eye size={14} />
                        )}
                      </button>

                      <button
                        className="adm-btn"
                        title={pick(
                          "Toggle featured",
                          "تمييز المنتج"
                        )}
                        onClick={() =>
                          act(
                            api.put(
                              `/admin/products/${p.id}/featured`
                            )
                          )
                        }
                      >
                        <Star
                          size={14}
                          fill={
                            p.isFeatured
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>

                      <button
                        className="adm-btn adm-btn-danger"
                        onClick={() =>
                          remove(p)
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="adm-empty">
            {products.length
              ? pick(
                  "No products match your filters.",
                  "مفيش منتجات مطابقة."
                )
              : pick(
                  "No products yet. Click “Add Product” to create the first one.",
                  "لسه مفيش منتجات. دوسي على «إضافة منتج» علشان تضيفي أول منتج."
                )}
          </div>
        )}
      </div>

      {/* ======================================================
          PRODUCT FORM
      ======================================================= */}

      {editing && (
        <ProductForm
          product={
            editing === "new"
              ? null
              : editing
          }
          categories={categories}
          sizes={sizes}
          colors={colors}
          scents={scents}
          onClose={() =>
            setEditing(null)
          }
          onSaved={async (text) => {
            setEditing(null);

            setNotice({
              type: "success",
              text,
            });

            await load();
          }}
          colorLabel={colorLabel}
        />
      )}
    </div>
  );
}

/* ============================================================
   ADD / EDIT FORM
   ============================================================ */

function ProductForm({
  product,
  categories,
  sizes,
  colors,
  scents,
  onClose,
  onSaved,
  colorLabel,
}) {
  const { isArabic, pick } =
    useLanguage();

  const isEdit = Boolean(product);

  const fileInput = useRef(null);
  const counter = useRef(0);

  // ==========================================================
  // FORM
  // ==========================================================

  const [form, setForm] = useState(() =>
    product
      ? {
          name: product.name || "",
          nameAr:
            product.nameAr || "",
          description:
            product.description || "",
          descriptionAr:
            product.descriptionAr ||
            "",
          price: String(
            product.price
          ),
          oldPrice:
            product.oldPrice
              ? String(
                  product.oldPrice
                )
              : "",
          stock: String(
            product.stock
          ),
          categoryId: String(
            product.categoryId
          ),
          isActive:
            product.isActive,
          isFeatured:
            product.isFeatured,

          sizeIds:
            product.sizes?.map(
              (s) => s.sizeId
            ) || [],

          colorIds:
            product.colors?.map(
              (c) => c.colorId
            ) || [],

          scentIds:
            product.scents?.map(
              (s) => s.scentId
            ) || [],
        }
      : {
          ...emptyForm,
          sizeIds: [],
          colorIds: [],
          scentIds: [],
        }
  );

  // ==========================================================
  // IMAGES
  // ==========================================================

  const [images, setImages] =
    useState(() =>
      (product?.images || []).map(
        (image) => ({
          key: `old-${image.id}`,
          id: image.id,
          url: assetUrl(
            image.url
          ),
        })
      )
    );

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  // ==========================================================
  // CLEANUP IMAGE PREVIEWS
  // ==========================================================

  const imagesRef =
    useRef(images);

  useEffect(() => {
    imagesRef.current =
      images;
  }, [images]);

  useEffect(
    () => () =>
      imagesRef.current.forEach(
        (image) => {
          if (image.file) {
            URL.revokeObjectURL(
              image.url
            );
          }
        }
      ),
    []
  );

  // ==========================================================
  // FORM HELPERS
  // ==========================================================

  const set = (
    field,
    value
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleId = (
    field,
    id
  ) => {
    setForm((prev) => ({
      ...prev,

      [field]: prev[field].includes(
        id
      )
        ? prev[field].filter(
            (x) => x !== id
          )
        : [
            ...prev[field],
            id,
          ],
    }));
  };

  // ==========================================================
  // ADD FILES
  // ==========================================================

  function addFiles(fileList) {
    setError("");

    const incoming =
      Array.from(
        fileList || []
      );

    const accepted = [];

    for (const file of incoming) {
      if (
        !IMAGE_TYPES.includes(
          file.type
        )
      ) {
        setError(
          pick(
            `"${file.name}" is not a JPG, PNG, WEBP or GIF image.`,
            `"${file.name}" مش صورة JPG أو PNG أو WEBP أو GIF.`
          )
        );

        continue;
      }

      if (
        file.size >
        MAX_IMAGE_BYTES
      ) {
        setError(
          pick(
            `"${file.name}" is bigger than 5 MB.`,
            `"${file.name}" حجمها أكبر من 5 ميجا.`
          )
        );

        continue;
      }

      accepted.push({
        key: `new-${counter.current++}`,
        url: URL.createObjectURL(
          file
        ),
        file,
      });
    }

    setImages((prev) => {
      const room =
        MAX_IMAGES -
        prev.length;

      if (
        accepted.length >
        room
      ) {
        setError(
          pick(
            `You can add up to ${MAX_IMAGES} photos.`,
            `تقدري تضيفي لحد ${MAX_IMAGES} صور.`
          )
        );

        accepted
          .slice(room)
          .forEach(
            (image) =>
              URL.revokeObjectURL(
                image.url
              )
          );
      }

      return [
        ...prev,
        ...accepted.slice(
          0,
          Math.max(
            room,
            0
          )
        ),
      ];
    });

    if (fileInput.current) {
      fileInput.current.value =
        "";
    }
  }

  // ==========================================================
  // REMOVE IMAGE
  // ==========================================================

  function removeImage(key) {
    setImages((prev) => {
      const target =
        prev.find(
          (image) =>
            image.key === key
        );

      if (target?.file) {
        URL.revokeObjectURL(
          target.url
        );
      }

      return prev.filter(
        (image) =>
          image.key !== key
      );
    });
  }

  // ==========================================================
  // MOVE IMAGE
  // ==========================================================

  function moveImage(
    index,
    direction
  ) {
    setImages((prev) => {
      const next = [
        ...prev,
      ];

      const target =
        index + direction;

      if (
        target < 0 ||
        target >= next.length
      ) {
        return prev;
      }

      [
        next[index],
        next[target],
      ] = [
        next[target],
        next[index],
      ];

      return next;
    });
  }

  // ==========================================================
  // MAKE COVER
  // ==========================================================

  function makeCover(index) {
    setImages((prev) => {
      const next = [
        ...prev,
      ];

      const [picked] =
        next.splice(
          index,
          1
        );

      return [
        picked,
        ...next,
      ];
    });
  }

  // ==========================================================
  // SUBMIT
  // ==========================================================

  async function submit(e) {
    e.preventDefault();

    setError("");

    const price = Number(
      form.price
    );

    const oldPrice =
      form.oldPrice === ""
        ? null
        : Number(
            form.oldPrice
          );

    if (
      !form.name.trim() &&
      !form.nameAr.trim()
    ) {
      return setError(
        pick(
          "Please enter the product name.",
          "من فضلك اكتبي اسم المنتج."
        )
      );
    }

    if (!form.categoryId) {
      return setError(
        pick(
          "Please choose a category.",
          "من فضلك اختاري القسم."
        )
      );
    }

    if (!(price > 0)) {
      return setError(
        pick(
          "Price must be greater than 0.",
          "السعر لازم يكون أكبر من صفر."
        )
      );
    }

    if (
      oldPrice !== null &&
      !(oldPrice > price)
    ) {
      return setError(
        pick(
          "Old price must be higher than the current price.",
          "السعر القديم لازم يكون أكبر من السعر الحالي."
        )
      );
    }

    if (
      !Number.isInteger(
        Number(form.stock)
      ) ||
      Number(form.stock) < 0
    ) {
      return setError(
        pick(
          "Stock must be a whole number.",
          "المخزون لازم يكون رقم صحيح."
        )
      );
    }

    // ========================================================
    // FORMDATA
    // ========================================================

    const payload =
      new FormData();

    payload.append(
      "name",
      form.name.trim()
    );

    payload.append(
      "nameAr",
      form.nameAr.trim()
    );

    payload.append(
      "description",
      form.description.trim()
    );

    payload.append(
      "descriptionAr",
      form.descriptionAr.trim()
    );

    payload.append(
      "price",
      String(price)
    );

    payload.append(
      "oldPrice",
      oldPrice === null
        ? ""
        : String(oldPrice)
    );

    payload.append(
      "stock",
      String(
        Number(form.stock)
      )
    );

    payload.append(
      "categoryId",
      form.categoryId
    );

    payload.append(
      "isActive",
      String(form.isActive)
    );

    payload.append(
      "isFeatured",
      String(form.isFeatured)
    );

    // OPTIONS
    payload.append(
      "sizeIds",
      JSON.stringify(
        form.sizeIds
      )
    );

    payload.append(
      "colorIds",
      JSON.stringify(
        form.colorIds
      )
    );

    payload.append(
      "scentIds",
      JSON.stringify(
        form.scentIds
      )
    );

    // ========================================================
    // IMAGES
    // ========================================================

    const existing =
      images.filter(
        (image) => image.id
      );

    const fresh =
      images.filter(
        (image) => image.file
      );

    if (isEdit) {
      payload.append(
        "existingImageIds",
        JSON.stringify(
          existing.map(
            (image) =>
              image.id
          )
        )
      );
    }

    payload.append(
      "imageOrder",
      JSON.stringify(
        images.map(
          (image) =>
            image.id
              ? image.id
              : `new:${fresh.indexOf(
                  image
                )}`
        )
      )
    );

    fresh.forEach(
      (image) => {
        payload.append(
          "images",
          image.file
        );
      }
    );

    // ========================================================
    // SAVE
    // ========================================================

    setSaving(true);

    try {
      if (isEdit) {
        await api.put(
          `/admin/products/${product.id}`,
          payload
        );
      } else {
        await api.post(
          "/admin/products",
          payload
        );
      }

      await onSaved(
        isEdit
          ? pick(
              "Product updated.",
              "تم تعديل المنتج."
            )
          : pick(
              "Product added.",
              "تمت إضافة المنتج."
            )
      );
    } catch (err) {
      console.error(
        "Save Product Error:",
        err
      );

      setError(
        apiErrorMessage(
          err,
          isArabic
        )
      );

      setSaving(false);
    }
  }

  // ==========================================================
  // FORM UI
  // ==========================================================

  return (
    <Modal
      title={
        isEdit
          ? pick(
              "Edit product",
              "تعديل المنتج"
            )
          : pick(
              "Add product",
              "إضافة منتج"
            )
      }
      onClose={onClose}
      wide
    >
      <form
        onSubmit={submit}
      >
        <Alert
          type="error"
          onClose={() =>
            setError("")
          }
        >
          {error}
        </Alert>

        {/* ==================================================
            PHOTOS
        =================================================== */}

        <Field
          label={pick(
            `Photos (${images.length}/${MAX_IMAGES})`,
            `الصور (${images.length}/${MAX_IMAGES})`
          )}
          hint={pick(
            "The first photo is the cover shown in the store. Add as many as you like.",
            "أول صورة هي الصورة الرئيسية في المتجر. تقدري تضيفي أكتر من صورة."
          )}
        >
          <div className="adm-images">
            {images.map(
              (
                image,
                index
              ) => (
                <div
                  key={
                    image.key
                  }
                  className={`adm-image ${
                    index === 0
                      ? "cover"
                      : ""
                  }`}
                >
                  <img
                    src={
                      image.url
                    }
                    alt=""
                  />

                  {index ===
                    0 && (
                    <span className="adm-image-badge">
                      {pick(
                        "Cover",
                        "الرئيسية"
                      )}
                    </span>
                  )}

                  {image.file &&
                    index !==
                      0 && (
                      <span className="adm-image-badge new">
                        {pick(
                          "New",
                          "جديدة"
                        )}
                      </span>
                    )}

                  <div className="adm-image-tools">
                    <button
                      type="button"
                      onClick={() =>
                        moveImage(
                          index,
                          isArabic
                            ? 1
                            : -1
                        )
                      }
                      disabled={
                        isArabic
                          ? index ===
                            images.length -
                              1
                          : index ===
                            0
                      }
                      title={pick(
                        "Move earlier",
                        "تقديم"
                      )}
                    >
                      <ArrowLeft
                        size={14}
                      />
                    </button>

                    {index !==
                      0 && (
                      <button
                        type="button"
                        onClick={() =>
                          makeCover(
                            index
                          )
                        }
                        title={pick(
                          "Make cover",
                          "اجعلها الرئيسية"
                        )}
                      >
                        <Star
                          size={14}
                        />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        moveImage(
                          index,
                          isArabic
                            ? -1
                            : 1
                        )
                      }
                      disabled={
                        isArabic
                          ? index ===
                            0
                          : index ===
                            images.length -
                              1
                      }
                      title={pick(
                        "Move later",
                        "تأخير"
                      )}
                    >
                      <ArrowRight
                        size={14}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        removeImage(
                          image.key
                        )
                      }
                      title={pick(
                        "Remove",
                        "حذف"
                      )}
                    >
                      <X
                        size={14}
                      />
                    </button>
                  </div>
                </div>
              )
            )}

            {images.length <
              MAX_IMAGES && (
              <label className="adm-add-image">
                <ImagePlus
                  size={24}
                />

                <span>
                  {pick(
                    "Add photos",
                    "إضافة صور"
                  )}
                </span>

                <input
                  ref={
                    fileInput
                  }
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  multiple
                  onChange={(e) =>
                    addFiles(
                      e.target
                        .files
                    )
                  }
                />
              </label>
            )}
          </div>
        </Field>

        {/* ==================================================
            NAMES
        =================================================== */}

        <div className="adm-grid-2">
          <Field
            label={pick(
              "Name (English)",
              "الاسم (إنجليزي)"
            )}
          >
            <input
              value={
                form.name
              }
              onChange={(e) =>
                set(
                  "name",
                  e.target
                    .value
                )
              }
              maxLength={191}
              dir="ltr"
            />
          </Field>

          <Field
            label={pick(
              "Name (Arabic)",
              "الاسم (عربي)"
            )}
          >
            <input
              value={
                form.nameAr
              }
              onChange={(e) =>
                set(
                  "nameAr",
                  e.target
                    .value
                )
              }
              maxLength={191}
              dir="rtl"
            />
          </Field>
        </div>

        {/* ==================================================
            DESCRIPTIONS
        =================================================== */}

        <div className="adm-grid-2">
          <Field
            label={pick(
              "Description (English)",
              "الوصف (إنجليزي)"
            )}
          >
            <textarea
              rows={3}
              value={
                form.description
              }
              onChange={(e) =>
                set(
                  "description",
                  e.target
                    .value
                )
              }
              dir="ltr"
            />
          </Field>

          <Field
            label={pick(
              "Description (Arabic)",
              "الوصف (عربي)"
            )}
          >
            <textarea
              rows={3}
              value={
                form.descriptionAr
              }
              onChange={(e) =>
                set(
                  "descriptionAr",
                  e.target
                    .value
                )
              }
              dir="rtl"
            />
          </Field>
        </div>

        {/* ==================================================
            PRICE / STOCK
        =================================================== */}

        <div className="adm-grid-3">
          <Field
            label={pick(
              "Price (EGP)",
              "السعر (ج.م)"
            )}
          >
            <input
              type="number"
              min="0"
              step="0.01"
              value={
                form.price
              }
              onChange={(e) =>
                set(
                  "price",
                  e.target
                    .value
                )
              }
              required
            />
          </Field>

          <Field
            label={pick(
              "Old price (optional)",
              "السعر قبل الخصم (اختياري)"
            )}
          >
            <input
              type="number"
              min="0"
              step="0.01"
              value={
                form.oldPrice
              }
              onChange={(e) =>
                set(
                  "oldPrice",
                  e.target
                    .value
                )
              }
            />
          </Field>

          <Field
            label={pick(
              "Stock quantity",
              "الكمية في المخزون"
            )}
          >
            <input
              type="number"
              min="0"
              step="1"
              value={
                form.stock
              }
              onChange={(e) =>
                set(
                  "stock",
                  e.target
                    .value
                )
              }
              required
            />
          </Field>
        </div>

        {/* ==================================================
            CATEGORY
        =================================================== */}

        <Field
          label={pick(
            "Category",
            "القسم"
          )}
        >
          <select
            value={
              form.categoryId
            }
            onChange={(e) =>
              set(
                "categoryId",
                e.target
                  .value
              )
            }
            required
          >
            <option value="">
              {pick(
                "Choose a category",
                "اختاري القسم"
              )}
            </option>

            {categories.map(
              (c) => (
                <option
                  key={c.id}
                  value={c.id}
                >
                  {isArabic
                    ? c.nameAr ||
                      c.name
                    : c.name}
                </option>
              )
            )}
          </select>
        </Field>

        {/* ==================================================
            SIZES
        =================================================== */}

        <Field
          label={pick(
            "Available sizes",
            "المقاسات المتاحة"
          )}
          hint={
            sizes.length ===
            0
              ? pick(
                  "Add sizes from “Sizes, Colors & Scents”.",
                  "ضيفي المقاسات من «المقاسات والألوان والروائح»."
                )
              : undefined
          }
        >
          <div className="adm-checks">
            {sortSizes(
              sizes.map(
                (s) => s.name
              )
            )
              .map((name) =>
                sizes.find(
                  (s) =>
                    s.name ===
                    name
                )
              )
              .map(
                (size) => (
                  <label
                    key={
                      size.id
                    }
                    className={`adm-check ${
                      form.sizeIds.includes(
                        size.id
                      )
                        ? "on"
                        : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.sizeIds.includes(
                        size.id
                      )}
                      onChange={() =>
                        toggleId(
                          "sizeIds",
                          size.id
                        )
                      }
                    />

                    {size.name}
                  </label>
                )
              )}
          </div>
        </Field>

        {/* ==================================================
            COLORS
        =================================================== */}

        <Field
          label={pick(
            "Available colors",
            "الألوان المتاحة"
          )}
          hint={
            colors.length ===
            0
              ? pick(
                  "Add colors from “Sizes, Colors & Scents”.",
                  "ضيفي الألوان من «المقاسات والألوان والروائح»."
                )
              : undefined
          }
        >
          <div className="adm-checks">
            {colors.map(
              (color) => (
                <label
                  key={
                    color.id
                  }
                  className={`adm-check ${
                    form.colorIds.includes(
                      color.id
                    )
                      ? "on"
                      : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.colorIds.includes(
                      color.id
                    )}
                    onChange={() =>
                      toggleId(
                        "colorIds",
                        color.id
                      )
                    }
                  />

                  <span
                    className="adm-swatch"
                    style={{
                      background:
                        color.hexCode ||
                        "#ddd",
                    }}
                  />

                  {colorLabel(
                    color
                  )}
                </label>
              )
            )}
          </div>
        </Field>

        {/* ==================================================
            SCENTS
        =================================================== */}

        <Field
          label={pick(
            "Available scents",
            "الروائح المتاحة"
          )}
          hint={
            scents.length ===
            0
              ? pick(
                  "Add scents from “Sizes, Colors & Scents”.",
                  "ضيفي الروائح من «المقاسات والألوان والروائح»."
                )
              : undefined
          }
        >
          <div className="adm-checks">
            {scents.map(
              (scent) => (
                <label
                  key={
                    scent.id
                  }
                  className={`adm-check ${
                    form.scentIds.includes(
                      scent.id
                    )
                      ? "on"
                      : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.scentIds.includes(
                      scent.id
                    )}
                    onChange={() =>
                      toggleId(
                        "scentIds",
                        scent.id
                      )
                    }
                  />

                  {isArabic
                    ? scent.nameAr ||
                      scent.name
                    : scent.name}
                </label>
              )
            )}
          </div>
        </Field>

        {/* ==================================================
            STATUS
        =================================================== */}

        <div
          className="adm-checks"
          style={{
            marginTop: 6,
          }}
        >
          <label
            className={`adm-check ${
              form.isActive
                ? "on"
                : ""
            }`}
          >
            <input
              type="checkbox"
              checked={
                form.isActive
              }
              onChange={(e) =>
                set(
                  "isActive",
                  e.target
                    .checked
                )
              }
            />

            {pick(
              "Visible in the store",
              "ظاهر في المتجر"
            )}
          </label>

          <label
            className={`adm-check ${
              form.isFeatured
                ? "on"
                : ""
            }`}
          >
            <input
              type="checkbox"
              checked={
                form.isFeatured
              }
              onChange={(e) =>
                set(
                  "isFeatured",
                  e.target
                    .checked
                )
              }
            />

            {pick(
              "Featured on the homepage",
              "مميز في الصفحة الرئيسية"
            )}
          </label>
        </div>

        {/* ==================================================
            FOOTER
        =================================================== */}

        <div className="adm-form-footer">
          <button
            type="button"
            className="admin-secondary-btn"
            onClick={
              onClose
            }
          >
            {pick(
              "Cancel",
              "إلغاء"
            )}
          </button>

          <button
            type="submit"
            className="admin-primary-btn"
            disabled={
              saving
            }
          >
            {saving
              ? pick(
                  "Saving...",
                  "جاري الحفظ..."
                )
              : isEdit
              ? pick(
                  "Save changes",
                  "حفظ التعديلات"
                )
              : pick(
                  "Add product",
                  "إضافة المنتج"
                )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default AdminProducts;

