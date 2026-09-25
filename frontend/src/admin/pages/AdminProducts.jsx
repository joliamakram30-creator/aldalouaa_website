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

if (loading) {
return <Loading />;
}

return ( <div>
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
)} </button>
}
/>

  <Alert
    type={notice?.type}
    onClose={() => setNotice(null)}
  >
    {notice?.text}
  </Alert>

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
        {pick("Active", "مفعّل")}
      </option>

      <option value="inactive">
        {pick("Hidden", "مخفي")}
      </option>

      <option value="low">
        {pick(
          "Low stock (5 or less)",
          "مخزون قليل (5 أو أقل)"
        )}
      </option>
    </select>
  </div>

  <div className="adm-table-wrap">
    <table className="adm-table">
      <thead>
        <tr>
          <th>
            {pick("Product", "المنتج")}
          </th>

          <th>
            {pick("Category", "القسم")}
          </th>

          <th>
            {pick("Price", "السعر")}
          </th>

          <th>
            {pick("Stock", "المخزون")}
          </th>

          <th>
            {pick("Status", "الحالة")}
          </th>

          <th>
            {pick("Actions", "إجراءات")}
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
                        ? p.nameAr || p.name
                        : p.name}
                    </strong>

                    <small>
                      {(isArabic
                        ? p.name
                        : p.nameAr) || ""}

                      {p.images?.length
                        ? ` · ${p.images.length} ${pick(
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
                      ? "pill-warn"
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

function variantKey(sizeId, colorId) {
return `${sizeId || "null"}-${colorId || "null"}`;
}

function scentKey(scentId) {
return String(scentId);
}

function normalizeStock(value) {
const number = Number(value);

if (!Number.isInteger(number) || number < 0) {
return 0;
}

return number;
}

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

const [form, setForm] = useState(() =>
product
? {
name: product.name || "",
nameAr:
product.nameAr || "",
description:
product.description || "",
descriptionAr:
product.descriptionAr || "",
price: String(product.price),
oldPrice:
product.oldPrice
? String(product.oldPrice)
: "",
stock: String(product.stock || 0),
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

const [variantStocks, setVariantStocks] =
useState(() => {
const map = {};

  if (product?.variants) {
    product.variants.forEach(
      (variant) => {
        map[
          variantKey(
            variant.sizeId,
            variant.colorId
          )
        ] = normalizeStock(
          variant.stock
        );
      }
    );
  }

  return map;
});

const [scentStocks, setScentStocks] =
useState(() => {
const map = {};

  if (product?.scents) {
    product.scents.forEach(
      (productScent) => {
        map[
          scentKey(
            productScent.scentId
          )
        ] = normalizeStock(
          productScent.stock
        );
      }
    );
  }

  return map;
});

const [images, setImages] =
useState(() =>
(product?.images || []).map(
(image) => ({
key: `old-${image.id}`,
id: image.id,
url: assetUrl(image.url),
})
)
);

const [saving, setSaving] =
useState(false);

const [error, setError] =
useState("");

const imagesRef =
useRef(images);

useEffect(() => {
imagesRef.current = images;
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

const set = (field, value) => {
setForm((prev) => ({
...prev,
[field]: value,
}));
};

const toggleId = (field, id) => {
setForm((prev) => ({
...prev,
[field]: prev[field].includes(id)
? prev[field].filter(
(x) => x !== id
)
: [...prev[field], id],
}));
};

const selectedSizes = useMemo(() => {
return sortSizes(
form.sizeIds
.map((id) =>
sizes.find(
(size) =>
size.id === id
)
)
.filter(Boolean)
.map((size) => size.name)
)
.map((name) =>
sizes.find(
(size) =>
size.name === name
)
)
.filter(Boolean);
}, [form.sizeIds, sizes]);

const selectedColors = useMemo(() => {
return form.colorIds
.map((id) =>
colors.find(
(color) =>
color.id === id
)
)
.filter(Boolean);
}, [form.colorIds, colors]);

const selectedScents = useMemo(() => {
return form.scentIds
.map((id) =>
scents.find(
(scent) =>
scent.id === id
)
)
.filter(Boolean);
}, [form.scentIds, scents]);

function getVariantStock(sizeId, colorId) {
return normalizeStock(
variantStocks[
variantKey(
sizeId,
colorId
)
]
);
}

function setVariantStock(
sizeId,
colorId,
value
) {
setVariantStocks((prev) => ({
...prev,
[variantKey(
sizeId,
colorId
)]: value,
}));
}

function getScentStock(scentId) {
return normalizeStock(
scentStocks[
scentKey(scentId)
]
);
}

function setScentStock(
scentId,
value
) {
setScentStocks((prev) => ({
...prev,
[scentKey(scentId)]: value,
}));
}

const calculatedVariantStock =
useMemo(() => {
if (
selectedSizes.length === 0 ||
selectedColors.length === 0
) {
return 0;
}

  return selectedSizes.reduce(
    (sizeTotal, size) =>
      sizeTotal +
      selectedColors.reduce(
        (colorTotal, color) =>
          colorTotal +
          getVariantStock(
            size.id,
            color.id
          ),
        0
      ),
    0
  );
},
[
  selectedSizes,
  selectedColors,
  variantStocks,
]);

function addFiles(fileList) {
setError("");

const incoming =
  Array.from(fileList || []);

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

  if (file.size > MAX_IMAGE_BYTES) {
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
    url: URL.createObjectURL(file),
    file,
  });
}

setImages((prev) => {
  const room =
    MAX_IMAGES - prev.length;

  if (accepted.length > room) {
    setError(
      pick(
        `You can add up to ${MAX_IMAGES} photos.`,
        `تقدري تضيفي لحد ${MAX_IMAGES} صور.`
      )
    );

    accepted
      .slice(room)
      .forEach((image) =>
        URL.revokeObjectURL(
          image.url
        )
      );
  }

  return [
    ...prev,
    ...accepted.slice(
      0,
      Math.max(room, 0)
    ),
  ];
});

if (fileInput.current) {
  fileInput.current.value = "";
}
}

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

function moveImage(index, direction) {
setImages((prev) => {
const next = [...prev];
const target = index + direction;

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

function makeCover(index) {
setImages((prev) => {
const next = [...prev];

  const [picked] =
    next.splice(index, 1);

  return [
    picked,
    ...next,
  ];
});
}

async function submit(e) {
e.preventDefault();

setError("");

const price = Number(form.price);

const oldPrice =
  form.oldPrice === ""
    ? null
    : Number(form.oldPrice);

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

const hasSizeColorVariants =
  selectedSizes.length > 0 &&
  selectedColors.length > 0;

let totalProductStock = 0;

if (hasSizeColorVariants) {
  totalProductStock =
    calculatedVariantStock;
} else {
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

  totalProductStock =
    Number(form.stock);
}

const variants = [];

if (hasSizeColorVariants) {
  selectedSizes.forEach(
    (size) => {
      selectedColors.forEach(
        (color) => {
          variants.push({
            sizeId: size.id,
            colorId: color.id,
            stock:
              getVariantStock(
                size.id,
                color.id
              ),
          });
        }
      );
    }
  );
}

const scentStockPayload =
  selectedScents.map(
    (scent) => ({
      scentId: scent.id,
      stock:
        getScentStock(
          scent.id
        ),
    })
  );

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
  String(totalProductStock)
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

payload.append(
  "variants",
  JSON.stringify(
    variants
  )
);

payload.append(
  "scentStocks",
  JSON.stringify(
    scentStockPayload
  )
);

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
> <form onSubmit={submit}>
<Alert
type="error"
onClose={() =>
setError("")
}
>
{error} </Alert>

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
                      : index === 0
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
                      ? index === 0
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
                  e.target.files
                )
              }
            />
          </label>
        )}
      </div>
    </Field>

    <div className="adm-grid-2">
      <Field
        label={pick(
          "Name (English)",
          "الاسم (إنجليزي)"
        )}
      >
        <input
          value={form.name}
          onChange={(e) =>
            set(
              "name",
              e.target.value
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
          value={form.nameAr}
          onChange={(e) =>
            set(
              "nameAr",
              e.target.value
            )
          }
          maxLength={191}
          dir="rtl"
        />
      </Field>
    </div>

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
              e.target.value
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
              e.target.value
            )
          }
          dir="rtl"
        />
      </Field>
    </div>

    <div className="adm-grid-2">
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
          value={form.price}
          onChange={(e) =>
            set(
              "price",
              e.target.value
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
              e.target.value
            )
          }
        />
      </Field>
    </div>

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
            e.target.value
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

    <Field
      label={pick(
        "Available sizes",
        "المقاسات المتاحة"
      )}
      hint={
        sizes.length === 0
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
          .filter(Boolean)
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

    <Field
      label={pick(
        "Available colors",
        "الألوان المتاحة"
      )}
      hint={
        colors.length === 0
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

    {selectedSizes.length >
      0 &&
      selectedColors.length >
        0 && (
        <Field
          label={pick(
            "Size × Color stock",
            "مخزون المقاس × اللون"
          )}
          hint={pick(
            "Each size/color combination has its own stock. Scent stock is managed separately below.",
            "كل تركيبة مقاس/لون ليها مخزون مستقل. مخزون الروائح بيتحدد بشكل منفصل تحت."
          )}
        >
          <div
            style={{
              overflowX:
                "auto",
              marginTop: 8,
            }}
          >
            <table
              className="adm-table"
              style={{
                minWidth: 620,
              }}
            >
              <thead>
                <tr>
                  <th>
                    {pick(
                      "Size",
                      "المقاس"
                    )}
                  </th>

                  {selectedColors.map(
                    (color) => (
                      <th
                        key={
                          color.id
                        }
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: 7,
                          }}
                        >
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
                        </div>
                      </th>
                    )
                  )}

                  <th>
                    {pick(
                      "Size total",
                      "إجمالي المقاس"
                    )}
                  </th>
                </tr>
              </thead>

              <tbody>
                {selectedSizes.map(
                  (size) => {
                    const sizeTotal =
                      selectedColors.reduce(
                        (
                          total,
                          color
                        ) =>
                          total +
                          getVariantStock(
                            size.id,
                            color.id
                          ),
                        0
                      );

                    return (
                      <tr
                        key={
                          size.id
                        }
                      >
                        <td>
                          <strong>
                            {
                              size.name
                            }
                          </strong>
                        </td>

                        {selectedColors.map(
                          (
                            color
                          ) => (
                            <td
                              key={
                                color.id
                              }
                            >
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={getVariantStock(
                                  size.id,
                                  color.id
                                )}
                                onChange={(
                                  e
                                ) =>
                                  setVariantStock(
                                    size.id,
                                    color.id,
                                    e.target
                                      .value
                                  )
                                }
                                style={{
                                  width: 90,
                                  maxWidth:
                                    "100%",
                                }}
                              />
                            </td>
                          )
                        )}

                        <td>
                          <Pill kind="pill-ok">
                            {
                              sizeTotal
                            }
                          </Pill>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>

              <tfoot>
                <tr>
                  <th>
                    {pick(
                      "Total",
                      "الإجمالي"
                    )}
                  </th>

                  {selectedColors.map(
                    (color) => {
                      const colorTotal =
                        selectedSizes.reduce(
                          (
                            total,
                            size
                          ) =>
                            total +
                            getVariantStock(
                              size.id,
                              color.id
                            ),
                          0
                        );

                      return (
                        <th
                          key={
                            color.id
                          }
                        >
                          {
                            colorTotal
                          }
                        </th>
                      );
                    }
                  )}

                  <th>
                    <Pill
                      kind={
                        calculatedVariantStock ===
                        0
                          ? "pill-bad"
                          : "pill-ok"
                      }
                    >
                      {
                        calculatedVariantStock
                      }
                    </Pill>
                  </th>
                </tr>
              </tfoot>
            </table>
          </div>

          <div
            style={{
              marginTop: 10,
              padding: 12,
              borderRadius: 10,
              background:
                "rgba(0,0,0,.035)",
              fontSize: 13,
            }}
          >
            <strong>
              {pick(
                "Product stock:",
                "مخزون المنتج:"
              )}{" "}
              {calculatedVariantStock}
            </strong>

            <div
              style={{
                marginTop: 4,
                opacity: 0.7,
              }}
            >
              {pick(
                "Automatically calculated from all Size × Color combinations. Scent stock is NOT included.",
                "بيتحسب تلقائي من إجمالي كل تركيبات المقاس × اللون. مخزون الروائح مش داخل في الرقم ده."
              )}
            </div>
          </div>
        </Field>
      )}

    {!(
      selectedSizes.length > 0 &&
      selectedColors.length > 0
    ) && (
      <Field
        label={pick(
          "Stock quantity",
          "الكمية في المخزون"
        )}
        hint={pick(
          "Used only for products that do not use a Size × Color stock matrix.",
          "بيستخدم فقط للمنتجات اللي مش بتستخدم جدول مخزون المقاس × اللون."
        )}
      >
        <input
          type="number"
          min="0"
          step="1"
          value={form.stock}
          onChange={(e) =>
            set(
              "stock",
              e.target.value
            )
          }
          required
        />
      </Field>
    )}

    <Field
      label={pick(
        "Available scents",
        "الروائح المتاحة"
      )}
      hint={
        scents.length === 0
          ? pick(
              "Add scents from “Sizes, Colors & Scents”.",
              "ضيفي الروائح من «المقاسات والألوان والروائح»."
            )
          : pick(
              "Choose the scents first, then set each scent's stock below. Scent stock is independent from Size × Color stock.",
              "اختاري الروائح الأول، وبعدها حددي مخزون كل ريحة تحت. مخزون الريحة مستقل عن مخزون المقاس × اللون."
            )
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

    {selectedScents.length >
      0 && (
      <Field
        label={pick(
          "Scent stock",
          "مخزون الروائح"
        )}
        hint={pick(
          "Scent stock is completely independent. It is not multiplied by sizes or colors.",
          "مخزون كل ريحة مستقل تمامًا. مش بيتضرب في عدد المقاسات أو الألوان."
        )}
      >
        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginTop: 8,
          }}
        >
          {selectedScents.map(
            (scent) => {
              const stock =
                getScentStock(
                  scent.id
                );

              return (
                <div
                  key={
                    scent.id
                  }
                  style={{
                    padding: 14,
                    border:
                      "1px solid rgba(0,0,0,.10)",
                    borderRadius: 12,
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      gap: 10,
                      marginBottom:
                        10,
                    }}
                  >
                    <strong>
                      {isArabic
                        ? scent.nameAr ||
                          scent.name
                        : scent.name}
                    </strong>

                    <Pill
                      kind={
                        stock === 0
                          ? "pill-bad"
                          : "pill-ok"
                      }
                    >
                      {stock === 0
                        ? pick(
                            "Sold out",
                            "نفد"
                          )
                        : pick(
                            `${stock} available`,
                            `${stock} متاح`
                          )}
                    </Pill>
                  </div>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={stock}
                    onChange={(e) =>
                      setScentStock(
                        scent.id,
                        e.target.value
                      )
                    }
                    style={{
                      width:
                        "100%",
                    }}
                  />
                </div>
              );
            }
          )}
        </div>
      </Field>
    )}

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
              e.target.checked
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
              e.target.checked
            )
          }
        />

        {pick(
          "Featured on the homepage",
          "مميز في الصفحة الرئيسية"
        )}
      </label>
    </div>

    <div className="adm-form-footer">
      <button
        type="button"
        className="admin-secondary-btn"
        onClick={onClose}
      >
        {pick(
          "Cancel",
          "إلغاء"
        )}
      </button>

      <button
        type="submit"
        className="admin-primary-btn"
        disabled={saving}
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