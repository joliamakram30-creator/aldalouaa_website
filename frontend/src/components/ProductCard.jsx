import { useState } from "react";
import { Heart, ShoppingBag, Check } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useFavorites } from "../context/FavoritesContext";
import { useCart } from "../context/CartContext";
import { useLanguage } from "../context/LanguageContext";

function ProductCard({ product }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const { nameOf, categoryLabel, money, pick, t } = useLanguage();
  const [added, setAdded] = useState(false);

  const fav = isFavorite(product.id);
  const soldOut = product.stock < 1;
  const needsOptions = product.sizes.length > 0 || product.colors.length > 0;
  const discount =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round((1 - product.price / product.oldPrice) * 100)
      : 0;

  // Products with sizes/colours must be configured on their own page.
  async function handleQuickAdd() {
    if (soldOut) return;
    if (needsOptions) {
      navigate(`/product/${product.id}`);
      return;
    }
    const result = await addToCart(product, { quantity: 1 });
    if (result.ok) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1600);
    } else {
      navigate(`/product/${product.id}`);
    }
  }

  return (
    <article className="product-card">
      <Link to={`/product/${product.id}`} className="product-image">
        {product.img ? <img src={product.img} alt={nameOf(product)} loading="lazy" /> : <div className="product-image-empty" />}
        {discount > 0 && !soldOut && <span className="product-badge">-{discount}%</span>}
        {soldOut && <span className="sold-out-badge">{t("soldOut")}</span>}
      </Link>

      <button
        className={`product-wish ${fav ? "active" : ""}`}
        onClick={() => toggleFavorite(product)}
        aria-label={t("toggleFavorite")}
      >
        <Heart size={17} fill={fav ? "currentColor" : "none"} />
      </button>

      <div className="product-info">
        <span className="product-category">{categoryLabel(product.category)}</span>
        <Link to={`/product/${product.id}`}>
          <h3>{nameOf(product)}</h3>
        </Link>
        <div className="product-bottom">
          <div className="product-price">
            {product.oldPrice && product.oldPrice > product.price && <s>{money(product.oldPrice)}</s>}
            <strong>{money(product.price)}</strong>
          </div>
          <button
            className="quick-add"
            onClick={handleQuickAdd}
            disabled={soldOut}
            title={needsOptions ? pick("Choose options", "اختاري المقاس واللون") : t("addToCart")}
            aria-label={t("addToCart")}
          >
            {added ? <Check size={16} /> : <ShoppingBag size={16} />}
          </button>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
