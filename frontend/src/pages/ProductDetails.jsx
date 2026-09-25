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

  useEffect(() => {
    setActiveImage(0);
    setSelectedSize("");
    setSelectedColor("");
    setSelectedScent("");
    setQuantity(1);
    setFormError("");
    setAdded(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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

  const images = product.images?.length
    ? product.images
    : product.img
    ? [product.img]
    : [];

  const favorited = isFavorite(product.id);
  const description = descOf(product);

  const variants = Array.isArray(product.variants)
    ? product.variants
    : [];

  const productScents = Array.isArray(product.scents)
    ? product.scents
    : [];

  const requiresSize = (product.sizes?.length || 0) > 0;

  const requiresColor = (product.colors?.length || 0) > 0;

  const requiresScent = productScents.length > 0;

  const hasVariants = variants.length > 0;

  const selectedVariant = hasVariants
    ? variants.find((variant) => {
        const variantSize = variant.size?.name || null;

        const variantColor = variant.color?.name || null;

        return (
          variantSize === (selectedSize || null) &&
          variantColor === (selectedColor || null)
        );
      }) || null
    : null;

  const variantSelectionComplete =
    (!requiresSize || !!selectedSize) &&
    (!requiresColor || !!selectedColor);

  const variantStock =
    hasVariants && variantSelectionComplete && selectedVariant
      ? Math.max(0, Number(selectedVariant.stock || 0))
      : !hasVariants
      ? Math.max(0, Number(product.stock || 0))
      : 0;

  const selectedProductScent = selectedScent
    ? productScents.find(
        (productScent) => productScent.scent?.name === selectedScent
      )
    : null;

  const scentStock = selectedScent
    ? Math.max(0, Number(selectedProductScent?.stock || 0))
    : 0;

  const scentSelectionComplete = !requiresScent || !!selectedScent;

  const selectedScentSoldOut =
    requiresScent &&
    !!selectedScent &&
    (!selectedProductScent || scentStock < 1);

  const allScentsSoldOut =
    requiresScent &&
    productScents.length > 0 &&
    productScents.every(
      (productScent) => Number(productScent.stock || 0) <= 0
    );

  const productStock = Math.max(0, Number(product.stock || 0));

  const productSoldOut = !hasVariants && productStock < 1;

  const allVariantsSoldOut =
    hasVariants &&
    variants.length > 0 &&
    variants.every((variant) => Number(variant.stock || 0) <= 0);

  const selectedVariantSoldOut =
    hasVariants &&
    variantSelectionComplete &&
    (!selectedVariant || variantStock < 1);

  const soldOut =
    productSoldOut ||
    allVariantsSoldOut ||
    allScentsSoldOut ||
    selectedVariantSoldOut ||
    selectedScentSoldOut;

  let availableStock = 0;

  if (hasVariants) {
    if (variantSelectionComplete) {
      if (requiresScent) {
        if (scentSelectionComplete) {
          availableStock = Math.min(variantStock, scentStock);
        }
      } else {
        availableStock = variantStock;
      }
    }
  } else {
    if (requiresScent) {
      if (scentSelectionComplete) {
        availableStock = Math.min(productStock, scentStock);
      }
    } else {
      availableStock = productStock;
    }
  }

  const maxQuantity =
    availableStock > 0 ? Math.min(availableStock, MAX_PER_LINE) : 1;

  const relatedProducts = products
    .filter(
      (item) =>
        item.category?.id === product.category?.id &&
        item.id !== product.id
    )
    .slice(0, 4);

  function isColorSoldOut(colorName) {
    if (!hasVariants) {
      return false;
    }

    const matchingVariants = variants.filter((variant) => {
      const variantColor = variant.color?.name || null;

      const variantSize = variant.size?.name || null;

      if (variantColor !== colorName) {
        return false;
      }

      if (selectedSize) {
        return variantSize === selectedSize;
      }

      return true;
    });

    if (!matchingVariants.length) {
      return true;
    }

    return matchingVariants.every(
      (variant) => Number(variant.stock || 0) <= 0
    );
  }

  function isSizeSoldOut(sizeName) {
    if (!hasVariants) {
      return false;
    }

    const matchingVariants = variants.filter((variant) => {
      const variantSize = variant.size?.name || null;

      const variantColor = variant.color?.name || null;

      if (variantSize !== sizeName) {
        return false;
      }

      if (selectedColor) {
        return variantColor === selectedColor;
      }

      return true;
    });

    if (!matchingVariants.length) {
      return true;
    }

    return matchingVariants.every(
      (variant) => Number(variant.stock || 0) <= 0
    );
  }

  function isScentSoldOut(productScent) {
    return Number(productScent?.stock || 0) <= 0;
  }

  function getScentName(productScent) {
    return productScent?.scent?.name || productScent?.name || "";
  }

  function getScentLabel(productScent) {
    const scent = productScent?.scent || productScent;

    if (!scent) {
      return "";
    }

    return isArabic ? scent.nameAr || scent.name || "" : scent.name || "";
  }

  function handleColorChange(colorName) {
    setFormError("");
    setAdded(false);
    setSelectedColor(colorName);
    setQuantity(1);
  }

  function handleSizeChange(sizeName) {
    setFormError("");
    setAdded(false);
    setSelectedSize(sizeName);
    setQuantity(1);
  }

  function handleScentChange(scentName) {
    setFormError("");
    setAdded(false);
    setSelectedScent(scentName);
    setQuantity(1);
  }

  async function handleAddToCart() {
    setFormError("");
    setAdded(false);

    if (requiresSize && !selectedSize) {
      setFormError(
        pick("Please select a size.", "من فضلك اختاري المقاس.")
      );

      return;
    }

    if (requiresColor && !selectedColor) {
      setFormError(
        pick("Please select a color.", "من فضلك اختاري اللون.")
      );

      return;
    }

    if (requiresScent && !selectedScent) {
      setFormError(
        pick("Please select a scent.", "من فضلك اختاري الرائحة.")
      );

      return;
    }

    if (hasVariants) {
      if (!selectedVariant) {
        setFormError(
          pick(
            "This size and color combination is not available.",
            "تركيبة المقاس واللون دي غير متاحة."
          )
        );

        return;
      }

      if (variantStock < 1) {
        setFormError(
          pick(
            "This combination is sold out.",
            "التركيبة دي خلصت من المخزون."
          )
        );

        return;
      }

      if (quantity > variantStock) {
        setFormError(
          pick(
            "The selected quantity is not available.",
            "الكمية المختارة مش متاحة."
          )
        );

        setQuantity(
          Math.max(1, Math.min(variantStock, MAX_PER_LINE))
        );

        return;
      }
    } else {
      if (productStock < 1) {
        setFormError(
          pick("This product is sold out.", "المنتج ده خلص من المخزون.")
        );

        return;
      }

      if (quantity > productStock) {
        setFormError(
          pick(
            "The selected quantity is not available.",
            "الكمية المختارة مش متاحة."
          )
        );

        setQuantity(
          Math.max(1, Math.min(productStock, MAX_PER_LINE))
        );

        return;
      }
    }

    if (requiresScent) {
      if (!selectedProductScent) {
        setFormError(
          pick("This scent is not available.", "الرائحة دي غير متاحة.")
        );

        return;
      }

      if (scentStock < 1) {
        setFormError(
          pick("This scent is sold out.", "الرائحة دي خلصت من المخزون.")
        );

        return;
      }

      if (quantity > scentStock) {
        setFormError(
          pick(
            "The selected quantity is not available for this scent.",
            "الكمية المختارة مش متاحة من الرائحة دي."
          )
        );

        setQuantity(
          Math.max(1, Math.min(scentStock, MAX_PER_LINE))
        );

        return;
      }
    }

    if (availableStock < 1 || quantity > availableStock) {
      setFormError(
        pick(
          "The selected quantity is not available.",
          "الكمية المختارة مش متاحة."
        )
      );

      setQuantity(
        Math.max(1, Math.min(Math.max(1, availableStock), MAX_PER_LINE))
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

  const addToCartDisabled =
    soldOut ||
    (hasVariants && !variantSelectionComplete) ||
    (requiresScent && !scentSelectionComplete);

  return (
    <PageLayout>
      <main>
        <div className="product-details">
          <div className="pd-gallery">
            <div className="pd-main-image">
              {images[activeImage] ? (
                <img src={images[activeImage]} alt={nameOf(product)} />
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
                    className={index === activeImage ? "active" : ""}
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

          <div className="pd-info">
            <span className="hero-eyebrow">
              {categoryLabel(product.category)}
            </span>

            <h1>{nameOf(product)}</h1>

            <div className="pd-price">
              {product.oldPrice && product.oldPrice > product.price && (
                <s>{money(product.oldPrice)}</s>
              )}

              <strong>{money(product.price)}</strong>
            </div>

            {soldOut && (
              <div className="pd-stock pd-stock-out">{t("soldOut")}</div>
            )}

            {product.colors?.length > 0 && (
              <div className="pd-option-group pd-color-group">
                <div className="pd-option-heading">
                  <span className="pd-option-label">{t("color")}</span>

                  {selectedColor && (
                    <span className="pd-selected-option">
                      {colorLabel(
                        product.colors.find(
                          (color) => color.name === selectedColor
                        )
                      )}
                    </span>
                  )}
                </div>

                <div className="pd-color-options">
                  {product.colors.map((color) => {
                    const isSelected = selectedColor === color.name;

                    const colorSoldOut = isColorSoldOut(color.name);

                    return (
                      <button
                        key={color.name}
                        type="button"
                        className={`pd-color-circle ${
                          isSelected ? "active" : ""
                        } ${colorSoldOut ? "sold-out" : ""}`}
                        onClick={() =>
                          !colorSoldOut && handleColorChange(color.name)
                        }
                        title={
                          colorSoldOut
                            ? `${colorLabel(color)} - ${t("soldOut")}`
                            : colorLabel(color)
                        }
                        aria-label={colorLabel(color)}
                        disabled={colorSoldOut}
                      >
                        <span
                          className="pd-color-fill"
                          style={{
                            backgroundColor: color.hex || "#f5f5f5",
                          }}
                        />

                        {isSelected && !colorSoldOut && (
                          <span className="pd-color-check">
                            <Check size={15} strokeWidth={3} />
                          </span>
                        )}

                        {colorSoldOut && (
                          <span className="pd-color-sold-line" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {product.sizes?.length > 0 && (
              <div className="pd-option-group">
                <div className="pd-option-heading">
                  <span className="pd-option-label">{t("size")}</span>

                  {selectedSize && (
                    <span className="pd-selected-option">
                      {selectedSize}
                    </span>
                  )}
                </div>

                <div className="pd-sizes">
                  {product.sizes.map((size) => {
                    const sizeSoldOut = isSizeSoldOut(size);

                    return (
                      <button
                        key={size}
                        type="button"
                        className={`pd-size ${
                          selectedSize === size ? "active" : ""
                        } ${sizeSoldOut ? "sold-out" : ""}`}
                        onClick={() =>
                          !sizeSoldOut && handleSizeChange(size)
                        }
                        disabled={sizeSoldOut}
                      >
                        {size}

                        {sizeSoldOut && (
                          <span className="pd-size-sold-label">
                            {t("soldOut")}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {productScents.length > 0 && (
              <div className="pd-option-group">
                <div className="pd-option-heading">
                  <span className="pd-option-label">
                    {pick("Scent", "الرائحة")}
                  </span>

                  {selectedScent && (
                    <span className="pd-selected-option">
                      {getScentLabel(selectedProductScent)}
                    </span>
                  )}
                </div>

                <div className="pd-sizes">
                  {productScents.map((productScent) => {
                    const scent = productScent?.scent;

                    if (!scent) {
                      return null;
                    }

                    const scentName = getScentName(productScent);

                    const scentLabel = getScentLabel(productScent);

                    const isSelected = selectedScent === scentName;

                    const scentSoldOut = isScentSoldOut(productScent);

                    return (
                      <button
                        key={scent.id}
                        type="button"
                        className={`pd-size ${
                          isSelected ? "active" : ""
                        } ${scentSoldOut ? "sold-out" : ""}`}
                        onClick={() =>
                          !scentSoldOut && handleScentChange(scentName)
                        }
                        disabled={scentSoldOut}
                        title={
                          scentSoldOut
                            ? `${scentLabel} - ${t("soldOut")}`
                            : scentLabel
                        }
                      >
                        {scentLabel}

                        {scentSoldOut ? (
                          <span className="pd-size-sold-label">
                            {t("soldOut")}
                          </span>
                        ) : (
                          isSelected && (
                            <Check
                              size={14}
                              style={{ marginInlineStart: 6 }}
                            />
                          )
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!soldOut &&
              (!hasVariants || variantSelectionComplete) &&
              (!requiresScent || scentSelectionComplete) &&
              availableStock > 0 && (
                <div className="pd-option-group">
                  <span className="pd-option-label">{t("quantity")}</span>

                  <div className="pd-quantity">
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((q) => Math.max(1, q - 1))
                      }
                      aria-label={t("decrease")}
                    >
                      <Minus size={16} />
                    </button>

                    <span>{quantity}</span>

                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((q) => Math.min(maxQuantity, q + 1))
                      }
                      disabled={quantity >= maxQuantity}
                      aria-label={t("increase")}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              )}

            {formError && <div className="auth-error">{formError}</div>}

            <div className="pd-actions">
              <button
                type="button"
                className={`btn btn-primary pd-add-btn ${
                  added ? "added" : ""
                }`}
                onClick={handleAddToCart}
                disabled={addToCartDisabled}
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
                className={`pd-fav-btn ${favorited ? "active" : ""}`}
                onClick={() => toggleFavorite(product)}
                aria-label={t("addToWishlist")}
                title={t("addToWishlist")}
              >
                <Heart
                  size={21}
                  fill={favorited ? "currentColor" : "none"}
                />
              </button>
            </div>

            {description && (
              <p className="pd-description">{description}</p>
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