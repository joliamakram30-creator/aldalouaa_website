
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Heart, Minus, Plus, Check } from "lucide-react";

import PageLayout from "../components/PageLayout";
import ProductsSection from "../components/ProductsSection";
import StoreState from "../components/StoreState";

import { useStore } from "../context/StoreContext";
import { useLanguage } from "../context/LanguageContext";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { apiErrorMessage } from "../utils/apiErrors";

const MAX_PER_LINE = 20;

function ProductDetails() {
  const { id } = useParams();
  const { products, loading, error } = useStore();
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const {
    t,
    isArabic,
    pick,
    nameOf,
    descOf,
    categoryLabel,
    colorLabel,
    money,
  } = useLanguage();

  const product = products.find(
    (item) => String(item.id) === String(id)
  );

  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedScent, setSelectedScent] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [formError, setFormError] = useState("");

  // Different product => start from a clean selection
  useEffect(() => {
    setActiveImage(0);
    setSelectedSize("");
    setSelectedColor("");
    setSelectedScent("");
    setQuantity(1);
    setFormError("");
    setAdded(false);

    window.scrollTo({ top: 0 });
  }, [id]);

  if (loading || error) {
    return (
      <PageLayout>
        <main>
          <StoreState />
        </main>
      </PageLayout>
    );
  }

  if (!product) {
    return (
      <PageLayout>
        <main>
          <div className="coming-soon">
            <h1>{t("productNotFound")}</h1>
            <p>
              <Link to="/">{t("backHome")}</Link>
            </p>
          </div>
        </main>
      </PageLayout>
    );
  }

  const images = product.images.length
    ? product.images
    : [product.img];

  const soldOut = product.stock < 1;

  const maxQuantity = Math.max(
    1,
    Math.min(product.stock, MAX_PER_LINE)
  );

  const favorited = isFavorite(product.id);
  const description = descOf(product);

  // Make sure old products that don't have scents don't crash the page
  const scents = product.scents || [];

  const relatedProducts = products
    .filter(
      (item) =>
        item.category?.id === product.category?.id &&
        item.id !== product.id
    )
    .slice(0, 4);

  async function handleAddToCart() {
    setFormError("");

    if (product.sizes.length > 0 && !selectedSize) {
      setFormError(
        pick(
          "Please select a size.",
          "من فضلك اختاري المقاس."
        )
      );
      return;
    }

    if (product.colors.length > 0 && !selectedColor) {
      setFormError(
        pick(
          "Please select a color.",
          "من فضلك اختاري اللون."
        )
      );
      return;
    }

    if (scents.length > 0 && !selectedScent) {
      setFormError(
        pick(
          "Please select a scent.",
          "من فضلك اختاري الرائحة."
        )
      );
      return;
    }

    const result = await addToCart(product, {
      size: selectedSize,
      color: selectedColor,
      scent: selectedScent,
      quantity,
    });

    if (!result.ok) {
      setFormError(
        result.error
          ? apiErrorMessage(result.error, isArabic)
          : isArabic
          ? "الكمية المتاحة من المنتج ده محدودة."
          : result.message
      );
      return;
    }

    setAdded(true);

    setTimeout(() => {
      setAdded(false);
    }, 2000);
  }

  return (
    <PageLayout>
      <main>
        <div className="product-details">

          {/* GALLERY */}
          <div className="pd-gallery">
            <div className="pd-main-image">
              {images[activeImage] ? (
                <img
                  src={images[activeImage]}
                  alt={nameOf(product)}
                />
              ) : (
                <div className="product-image-empty" />
              )}
            </div>

            {images.length > 1 && (
              <div className="pd-thumbnails">
                {images.map((img, index) => (
                  <button
                    key={index}
                    type="button"
                    className={
                      index === activeImage ? "active" : ""
                    }
                    onClick={() => setActiveImage(index)}
                  >
                    <img
                      src={img}
                      alt={`${nameOf(product)} ${index + 1}`}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* INFO */}
          <div className="pd-info">
            <span className="hero-eyebrow">
              {categoryLabel(product.category)}
            </span>

            <h1>{nameOf(product)}</h1>

            <div className="pd-price">
              {product.oldPrice &&
                product.oldPrice > product.price && (
                  <s>{money(product.oldPrice)}</s>
                )}

              <strong>{money(product.price)}</strong>
            </div>

            {soldOut && (
              <div className="pd-stock pd-stock-out">
                {t("soldOut")}
              </div>
            )}

            {!soldOut && product.stock <= 5 && (
              <div className="pd-stock">
                {pick(
                  `Only ${product.stock} left in stock`,
                  `متبقي ${product.stock} فقط في المخزون`
                )}
              </div>
            )}

            {/* COLORS */}
            {product.colors.length > 0 && (
              <div className="pd-option-group pd-color-group">
                <div className="pd-option-heading">
                  <span className="pd-option-label">
                    {t("color")}
                  </span>

                  {selectedColor && (
                    <span className="pd-selected-option">
                      {colorLabel(
                        product.colors.find(
                          (c) =>
                            c.name === selectedColor
                        )
                      )}
                    </span>
                  )}
                </div>

                <div className="pd-color-options">
                  {product.colors.map((color) => {
                    const isSelected =
                      selectedColor === color.name;

                    return (
                      <button
                        key={color.name}
                        type="button"
                        className={`pd-color-circle ${
                          isSelected ? "active" : ""
                        }`}
                        onClick={() =>
                          setSelectedColor(color.name)
                        }
                        title={colorLabel(color)}
                        aria-label={colorLabel(color)}
                      >
                        <span
                          className="pd-color-fill"
                          style={{
                            backgroundColor:
                              color.hex || "#f5f5f5",
                          }}
                        />

                        {isSelected && (
                          <span className="pd-color-check">
                            <Check
                              size={15}
                              strokeWidth={3}
                            />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SIZES */}
            {product.sizes.length > 0 && (
              <div className="pd-option-group">
                <div className="pd-option-heading">
                  <span className="pd-option-label">
                    {t("size")}
                  </span>

                  {selectedSize && (
                    <span className="pd-selected-option">
                      {selectedSize}
                    </span>
                  )}
                </div>

                <div className="pd-sizes">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={`pd-size ${
                        selectedSize === size
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setSelectedSize(size)
                      }
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SCENTS */}
            {scents.length > 0 && (
              <div className="pd-option-group">
                <div className="pd-option-heading">
                  <span className="pd-option-label">
                    {pick("Scent", "الرائحة")}
                  </span>

                  {selectedScent && (
                    <span className="pd-selected-option">
                      {(() => {
                        const selected = scents.find(
                          (scent) =>
                            scent.name ===
                            selectedScent
                        );

                        return isArabic
                          ? selected?.nameAr ||
                              selected?.name
                          : selected?.name;
                      })()}
                    </span>
                  )}
                </div>

                <div className="pd-sizes">
                  {scents.map((scent) => {
                    const isSelected =
                      selectedScent === scent.name;

                    const scentName = isArabic
                      ? scent.nameAr || scent.name
                      : scent.name;

                    return (
                      <button
                        key={scent.id}
                        type="button"
                        className={`pd-size ${
                          isSelected ? "active" : ""
                        }`}
                        onClick={() =>
                          setSelectedScent(scent.name)
                        }
                      >
                        {scentName}

                        {isSelected && (
                          <Check
                            size={14}
                            style={{
                              marginInlineStart: 6,
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* QUANTITY */}
            {!soldOut && (
              <div className="pd-option-group">
                <span className="pd-option-label">
                  {t("quantity")}
                </span>

                <div className="pd-quantity">
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) =>
                        Math.max(1, q - 1)
                      )
                    }
                    aria-label={t("decrease")}
                  >
                    <Minus size={16} />
                  </button>

                  <span>{quantity}</span>

                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) =>
                        Math.min(
                          maxQuantity,
                          q + 1
                        )
                      )
                    }
                    disabled={quantity >= maxQuantity}
                    aria-label={t("increase")}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            )}

            {formError && (
              <div className="auth-error">
                {formError}
              </div>
            )}

            <div className="pd-actions">
              <button
                type="button"
                className={`btn btn-primary pd-add-btn ${
                  added ? "added" : ""
                }`}
                onClick={handleAddToCart}
                disabled={soldOut}
              >
                {soldOut ? (
                  t("soldOut")
                ) : added ? (
                  <>
                    <Check size={17} />
                    {t("addedToCart")}
                  </>
                ) : (
                  t("addToCart")
                )}
              </button>

              <button
                type="button"
                className={`pd-fav-btn ${
                  favorited ? "active" : ""
                }`}
                onClick={() =>
                  toggleFavorite(product)
                }
                aria-label={t("addToWishlist")}
                title={t("addToWishlist")}
              >
                <Heart
                  size={21}
                  fill={
                    favorited
                      ? "currentColor"
                      : "none"
                  }
                />
              </button>
            </div>

            {description && (
              <p className="pd-description">
                {description}
              </p>
            )}
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <ProductsSection
            eyebrow={t("youMayLike")}
            title={t("related")}
            products={relatedProducts}
          />
        )}
      </main>
    </PageLayout>
  );
}

export default ProductDetails;

